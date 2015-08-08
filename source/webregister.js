/*
 *  Charon: A game authentication server
 *  Copyright (C) 2014  Alex Mayfield
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* jshint node: true */
"use strict";

var Promise = require('bluebird');

var express = require('express');

var error = require('./error');
var webform = require('./webform');

function WebRegister(dbconn, mailer, recaptcha) {
	// Initialize a routes instance.
	var routes = express.Router();

	// Assign our dependencies.
	this.dbconn = dbconn;
	this.mailer = mailer;
	this.recaptcha = recaptcha;

	// Divvy up our routes.
	routes.get('/', this.register.bind(this));
	routes.post('/', this.registerPost.bind(this));
	routes.get('/:token', this.registerVerify.bind(this));

	return routes;
}

// Render a registration form
WebRegister.prototype.register = function(req, res) {
	req.body._csrf = req.csrfToken();
	res.render('register.swig', {
		data: req.body, errors: {},
		recaptcha_public_key: this.recaptcha ? this.recaptcha.publickey : null
	});
};

// Process a registration form
WebRegister.prototype.registerPost = function(req, res, next) {
	var self = this;

	webform.registerForm(
		this.dbconn, this.recaptcha, req.body, req.ip
	).then(function() {
		if (self.mailer) {
			// Do E-mail verification of new accounts if we have a mailer
			return self.dbconn.addUser(
				req.body.username, req.body.password, req.body.email
			).then(function(user) {
				return Promise.all([user, self.dbconn.newVerify(user)]);
			}).spread(function(user, verify) {
				// Send the password verify email
				return Promise.all([user, self.mailer.sendRendered({
					to: user.email,
					subject: "New User Verification",
					template: 'verify.swig'
				}, {
					username: user.Profile.username,
					token: verify.token
				})]);
			}).spread(function(user, _) {
				// Render the page that notifies the user that they got a
				// verification email.
				res.render('registerNotify.swig', {
					user: user
				});
			});
		} else {
			// Don't do E-mail verification of new accounts if there's no mailer
			return self.dbconn.addUser(
				req.body.username, req.body.password, req.body.email, 'USER'
			).then(function(user) {
				return Promise.all([user, user.getProfile()]);
			}).spread(function(user, profile) {
				// Log the user in
				req.session.user = {
					id: user.id,
					username: user.username,
					profile_username: profile.username,
					gravatar: user.getGravatar(),
					access: user.access
				};

				res.render('registerSuccess.swig');
			});
		}
	}).catch(error.FormValidation, function(e) {
		req.body._csrf = req.csrfToken();
		res.render('register.swig', {
			data: req.body, errors: e.invalidFields,
			recaptcha_public_key: self.recaptcha ? self.recaptcha.publickey : null
		});
	}).catch(next);
};

// Process a registration verification token
WebRegister.prototype.registerVerify = function(req, res, next) {
	var self = this;

	this.dbconn.findVerify(req.params.token)
	.then(function(verify) {
		return Promise.all([verify, verify.getUser()]);
	}).spread(function(verify, user) {
		// Enable the user
		return Promise.all([verify, user.updateAttributes({
			active: true,
			access: 'USER'
		})]);
	}).spread(function(verify, user) {
		return Promise.all([verify, user, user.getProfile()]);
	}).spread(function(verify, user, profile) {
		// Log the user in
		req.session.user = {
			id: user.id,
			username: user.username,
			profile_username: profile.username,
			gravatar: user.getGravatar(),
			access: user.access
		};

		// Consume the verification token
		return verify.destroy();
	}).then(function() {
		res.render('registerVerify.swig');
	}).catch(error.VerifyNotFound, function(e) {
		throw new error.NotFound('Verify token does not exist');
	}).catch(next);
};

module.exports = WebRegister;

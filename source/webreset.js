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

function WebReset(dbconn, mailer) {
	// Initialize a routes instance.
	var routes = express.Router();

	// Assign mailer
	this.dbconn = dbconn;
	this.mailer = mailer;

	routes.get('/', this.getReset.bind(this));
	routes.post('/', this.postReset.bind(this));
	routes.get('/:token', this.getResetToken.bind(this));
	routes.post('/:token', this.postResetToken.bind(this));

	return routes;
};

// Password reset request form
WebReset.prototype.getReset = function(req, res) {
	req.body._csrf = req.csrfToken();
	res.render('reset.swig', {
		data: req.body, errors: {},
	});
};
WebReset.prototype.postReset = function(req, res, next) {
	var self = this;

	webform.resetForm(req.body).then(function() {
		return self.dbconn.User.find({
			where: {email: req.body.email},
			include: [self.dbconn.Profile]
		});
	}).then(function(user) {
		if (user) {
			// Create the password reset database entry
			return self.dbconn.newReset(user).then(function(reset) {
				// Send the password reset email
				return self.mailer.sendRendered({
					to: user.email,
					subject: "Password Reset",
					template: 'reset.swig'
				}, {
					username: user.profile.username,
					token: reset.token
				});
			}).then(function() {
				// Render the page
				req.body._csrf = req.csrfToken();
				res.render('reset.swig', {
					data: req.body, success: true
				});
			}).catch(next);
		} else {
			// Pretend we sent an e-mail and render the page
			req.body._csrf = req.csrfToken();
			res.render('reset.swig', {
				data: req.body, success: true
			});
		}
	}).catch(error.FormValidation, function(e) {
		// Render the page with errors
		req.body._csrf = req.csrfToken();
		res.render('reset.swig', {
			data: req.body, errors: e.invalidFields
		});
	}).catch(next);
};

// Password reset form
WebReset.prototype.getResetToken = function(req, res, next) {
	this.dbconn.findReset(req.params.token).then(function(reset) {
		req.body._csrf = req.csrfToken();
		res.render('resetToken.swig', {
			data: req.body
		});
	}).catch(error.ResetNotFound, function(e) {
		throw new error.NotFound('Reset token does not exist');
	}).catch(next);
};
WebReset.prototype.postResetToken = function(req, res, next) {
};

module.exports = WebReset

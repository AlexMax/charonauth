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
var _ = require('lodash');

var express = require('express');

var countries = require('./countries');
var error = require('./error');
var webform = require('./webform');

module.exports = function(dbconn) {
	// Initialize a routes instance.
	var routes = express.Router();

	// Get a list of all users.
	routes.get('/', function(req, res) {
		dbconn.User.findAll({
			where: {active: true, visible_profile: true},
			include: [dbconn.Profile]
		}).then(function(users) {
			res.render('getUsers.swig', {
				users: users
			});
		}).done();
	});

	// Get information on a specific user.
	routes.get('/:id', function(req, res) {
		dbconn.User.find({
			where: {username: req.params.id.toLowerCase()}
		}).then(function(user) {
			if (_.isNull(user)) {
				throw new error.NotFound('User not found');
			}

			// Profile visibility is affected by two factors, if the profile is
			// active and if it is set to be visible.
			if (user.active === false || user.visible_profile === false) {
				if (!("user" in req.session)) {
					throw new error.Forbidden('Can not view profile as anonymous user');
				} else if (user.id === req.session.user.id && user.active === false) {
					throw new error.Forbidden('Can not view profile as your account is not active');
				} else if (user.id !== req.session.user.id && _.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
					throw new error.Forbidden('Can not view profile with given access');
				}
			}

			// User is allowed to see the profile, so obtain the profile.
			return Promise.all([user, user.getProfile()]);
		}).spread(function(user, profile) {
			res.render('getUser.swig', {
				user: user,
				profile: profile
			});
		}).done();
	});

	// Govern access to the user edit page.
	routes.use('/:id/edit', function(req, res, next) {
		dbconn.User.find({
			where: {username: req.params.id.toLowerCase()}
		}).then(function(user) {
			if (_.isNull(user)) {
				throw new error.NotFound('User not found');
			}

			if (!("user" in req.session)) {
				throw new error.Forbidden('Can not edit profile as anonymous user');
			} else if (_.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
				// Operators can always edit profiles.
			} else if (user.id === req.session.user.id) {
				// Users can always edit the own profiles.
			} else {
				throw new error.Forbidden('Can not edit profile as current user');
			}

			// User is allowed to edit the profile, so continue.
			next();
		}).done();
	});

	// Edit a specific user.
	routes.get('/:id/edit', function(req, res) {
		dbconn.User.find({
			where: {username: req.params.id.toLowerCase()},
			include: [dbconn.Profile]
		}).then(function(user) {
			req.body._csrf = req.csrfToken();
			req.body.user = user;
			req.body.profile = user.profile;

			// Admin has a different form than a user.
			if (_.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
				res.render('adminEditUser.swig', {
					data: req.body, errors: {},
					countries: countries.countries
				});
			} else {
				res.render('editUser.swig', {
					data: req.body, errors: {},
					countries: countries.countries
				});
			}
		}).done();
	});

	// Process an edit user submission.
	routes.post('/:id/edit', function(req, res) {
		console.log(req.body);

		if (_.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
			// Admin form submussion.
			webform.userForm(dbconn, req.body)
			.catch(error.FormValidation, function(e) {
				req.body._csrf = req.csrfToken();
				res.render('adminEditUser.swig', {
					data: req.body, errors: e.invalidFields,
					countries: countries.countries
				});
			}).done();
		} else {
			// User form submission.
			webform.userForm(dbconn, req.body)
			.catch(error.FormValidation, function(e) {
				req.body._csrf = req.csrfToken();
				res.render('editUser.swig', {
					data: req.body, errors: e.invalidFields,
					countries: countries.countries
				});
			}).done();
		}
	});

	return routes;
};

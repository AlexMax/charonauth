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

var domain = require('domain');
var express = require('express');
var Sequelize = require('sequelize');

var access = require('./access');
var countries = require('./countries');
var error = require('./error');
var webform = require('./webform');

function WebUsers(dbconn) {
	// Initialize a routes instance.
	var routes = express.Router();

	// Assign our dependencies.
	this.dbconn = dbconn;

	// Divvy up our routes.
	routes.get('/', this.getUsers.bind(this));
	routes.get('/:id', this.getUser.bind(this));

	routes.use('/:id/:verb(edit|settings)', this.editUserAccess.bind(this));
	routes.use('/:id/actions', this.userActionsAccess.bind(this));
	routes.use('/:id/actions/:aid', this.userActionsAccess.bind(this));

	routes.get('/:id/edit', this.editUser.bind(this));
	routes.post('/:id/edit', this.editUserPost.bind(this));

	routes.get('/:id/settings', this.editSettings.bind(this));
	routes.post('/:id/settings', this.editSettingsPost.bind(this));

	routes.get('/:id/actions', this.getActions.bind(this));
	routes.get('/:id/actions/:aid', this.getAction.bind(this));

	return routes;
}

// Get a list of all users.
WebUsers.prototype.getUsers = function(req, res, next) {
	var self = this;

	// Pagination
	var limit = ("l" in req.query && isFinite(req.query.l)) ? req.query.l : 10;
	var page = ("p" in req.query && isFinite(req.query.p)) ? req.query.p : 1;
	var offset = (page - 1) * limit;

	// Default search parameters
	var params = {
		where: {active: true},
		include: [
			{model: this.dbconn.Profile, where: {visible: true}}
		]
	};

	// Administrators have the ability to look at inactive and invalid
	// accounts.  However, the users we are allowed to see depends on our
	// access level.
	var filter = 'active';
	if ("user" in req.session && "f" in req.query) {
		switch (req.query.f) {
			case 'unverified':
			filter = req.query.f;
			params.where = Sequelize.and(
				{active: false},
				{access: 'UNVERIFIED'}
			);
			break;
			case 'inactive':
			filter = req.query.f;
			params.where = Sequelize.and(
				{active: false},
				['access != \'UNVERIFIED\'']
			);
			break;
		}
	}

	var total = 0;
	this.dbconn.User.count(params).then(function(count) {
		total = count;
		params.offset = offset;
		params.limit = limit;
		return self.dbconn.User.findAll(params)
	}).then(function(users) {
		res.render('getUsers.swig', {
			users: users,
			total: total,
			page: page,
			limit: limit,
			filter: filter
		});
	}).catch(next);
};

// Get information on a specific user.
WebUsers.prototype.getUser = function(req, res, next) {
	var self = this;

	this.dbconn.User.findOne({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		if (_.isNull(user)) {
			throw new error.NotFound('User not found');
		}

		// Check for profile visibility
		if (user.active === false || user.Profile.visible === false) {
			if (!("user" in req.session)) {
				throw new error.Forbidden('Can not view profile as anonymous user');
			} else if (user.active === false &&
								 !access.canViewUserInactive(req.session.user, user)) {
				throw new error.Forbidden('Can not view inactive profile with given access');
			} else if (user.Profile.visible === false && req.session.user.id !== user.id &&
								 !access.canViewUserInvisible(req.session.user, user)) {
				throw new error.Forbidden('Can not view invisible profile with given access');
			}
		}

		// Find the latest authentication
		return Promise.all([user, self.dbconn.Action.find({
			where: {UserId: user.id, type: 'auth'},
			order: 'createdAt DESC'
		})]);
	}).spread(function(user, action) {
		// We may not be able to see the latest authentication.
		var lastplayed;
		if (action && user.Profile.visible_lastseen) {
			lastplayed = action.createdAt;
		}

		// Tab permissions
		var tabs = access.userTabPerms(req.session.user, user);

		res.render('getUser.swig', {
			tabs: tabs, user: user, lastplayed: lastplayed
		});
	}).catch(next);
};

// Govern access to the user modification pages.
WebUsers.prototype.editUserAccess = function(req, res, next) {
	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()}
	}).then(function(user) {
		if (_.isNull(user)) {
			throw new error.NotFound('User not found');
		}

		if (!("user" in req.session)) {
			throw new error.Forbidden('Can not edit profile as anonymous user');
		} else if (access.canEditUser(req.session.user, user)) {
			// Operators can edit user, and users can edit themselves.
		} else {
			throw new error.Forbidden('Can not edit profile as current user');
		}

		// User is allowed to edit the profile, so continue.
		next();
	}).catch(next);
};

// Govern access to the user action pages.
WebUsers.prototype.userActionsAccess = function(req, res, next) {
	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()}
	}).then(function(user) {
		if (_.isNull(user)) {
			throw new error.NotFound('User not found');
		}

		if (!("user" in req.session)) {
			throw new error.Forbidden('Can not edit profile as anonymous user');
		} else if (access.canSeeUserActions(req.session.user, user)) {
			// Operators can edit user, and users can edit themselves.
		} else {
			throw new error.Forbidden('Can not edit profile as current user');
		}

		// User is allowed to edit the profile, so continue.
		next();
	}).catch(next);
};

// Edit a user's profile
WebUsers.prototype.editUser = function(req, res, next) {
	this.dbconn.User.findOne({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		req.body._csrf = req.csrfToken();
		req.body.profile = user.Profile;

		// Tab permissions
		var tabs = access.userTabPerms(req.session.user, user);

		res.render('editUser.swig', {
			data: req.body, user: user, errors: {},
			countries: countries.countries, tabs: tabs
		});
	}).catch(next);
};

// Process a profile edit submission
WebUsers.prototype.editUserPost = function(req, res, next) {
	var self = this;

	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		// User submitted "profile" form
		return webform.profileForm(self.dbconn, req.body.profile, user.username)
		.then(function() {
			// Persist all profile data
			user.Profile.updateAttributes({
				visible: "visible" in req.body.profile ? true : false,
				visible_lastseen: "visible_lastseen" in req.body.profile ? true : false,
				gravatar: _.isEmpty(req.body.profile.gravatar) ? null : req.body.profile.gravatar,
				username: req.body.profile.username,
				clan: req.body.profile.clan,
				clantag: req.body.profile.clantag,
				country: req.body.profile.country,
				location: req.body.profile.location,
				contactinfo: req.body.profile.contactinfo,
				message: req.body.profile.message
			});
			return user.Profile.save();
		}).then(function(profile) {
			// If we're modifying our own data, update the session
			if (user.id === req.session.user.id) {
				req.session.user.profile_username = user.Profile.username;
			}

			// Render the page
			req.body._csrf = req.csrfToken();
			res.render('editUser.swig', {
				data: req.body, user: user, success: true, errors: {},
				countries: countries.countries
			});
		}).catch(error.FormValidation, function(e) {
			// Render the page with errors
			req.body._csrf = req.csrfToken();
			res.render('editUser.swig', {
				data: req.body, user: user,
				errors: {profile: e.invalidFields},
				countries: countries.countries
			});
		});
	}).catch(next);
};

// Edit a user's settings
WebUsers.prototype.editSettings = function(req, res, next) {
	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		if (access.canAdminEditUser(req.session.user, user)) {
			req.body._csrf = req.csrfToken();
			req.body.user = {
				active: user.active,
				username: user.Profile.username,
				email: user.email,
				access: user.access
			};

			// Tab permissions
			var tabs = access.userTabPerms(req.session.user, user);

			res.render('editSettingsAdmin.swig', {
				data: req.body, user: user, errors: {}, tabs: tabs,
				accesses: access.validLevelSet(req.session.user.access, user.access)
			});
		} else {
			// Tab permissions
			var tabs = access.userTabPerms(req.session.user, user);

			req.body._csrf = req.csrfToken();
			res.render('editSettings.swig', {
				data: req.body, user: user, errors: {}, tabs: tabs
			});
		}
	}).catch(next);
};

// Process a user settings submission
WebUsers.prototype.editSettingsPost = function(req, res, next) {
	var self = this;

	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		if (access.canAdminEditUser(req.session.user.access, user.access)) {
			// User submitted admin "user" form
			return webform.userAdminForm(self.dbconn, req.body.user, user.username, user.email, req.session.user.access, user.access)
			.then(function() {
				// If we have a new password, persist it
				if ('password' in req.body.user && !_.isEmpty(req.body.user.password)) {
					user.setPassword(req.body.user.password);
				}

				// Persist all of our other settings
				user.updateAttributes({
					active: "active" in req.body.user ? true : false,
					username: req.body.user.username.toLowerCase(),
					email: req.body.user.email,
					access: req.body.user.access
				});

				return user.save();
			}).then(function() {
				// Grab the profile so we can save the new cased username
				return user.getProfile();
			}).then(function(profile) {
				// Persist the new cased username
				profile.username = req.body.user.username;
				return profile.save();
			}).then(function(profile) {
				// Delete the password, since we don't need it anymore.
				delete req.body.user.password;

				// If we're modifying our own data, update the session
				if (user.id === req.session.user.id) {
					req.session.user.username = user.username;
					req.session.user.profile_username = profile.username;
					req.session.user.gravatar = user.getGravatar();
					req.session.user.access = user.access;
				}

				// Render the page
				req.body._csrf = req.csrfToken();
				res.render('editSettingsAdmin.swig', {
					data: req.body, user: user, success: true, errors: {},
					accesses: access.validLevelSet(req.session.user.access, user.access)
				});
			}).catch(error.FormValidation, function(e) {
				// Render the page with errors
				req.body._csrf = req.csrfToken();
				res.render('editSettingsAdmin.swig', {
					data: req.body, user: user,
					errors: {user: e.invalidFields},
					accesses: access.validLevelSet(req.session.user.access, user.access)
				});
			});
		} else {
			// User submitted "user" form
			return webform.userForm(self.dbconn, req.body.user, user.username)
			.then(function() {
				// If we have a new password, persist it
				if ('password' in req.body.user && !_.isEmpty(req.body.user.password)) {
					user.setPassword(req.body.user.password);
				}

				// If we have a new e-mail address, persist it
				if ('email' in req.body.user && !_.isEmpty(req.body.user.email)) {
					user.email = req.body.user.email;
				}

				return user.save();
			}).then(function() {
				// Remove user form data, since we don't need it anymore
				delete req.body.user;

				// If we're modifying our own data, update the session
				if (user.id === req.session.user.id) {
					req.session.user.gravatar = user.getGravatar();
				}

				// Render the page
				req.body._csrf = req.csrfToken();
				req.body.profile = user.Profile;
				res.render('editSettings.swig', {
					data: req.body, user: user, success: true, errors: {}
				});
			}).catch(error.FormValidation, function(e) {
				// Render the page with errors
				req.body._csrf = req.csrfToken();
				req.body.profile = user.Profile;
				res.render('editSettings.swig', {
					data: req.body, user: user,
					errors: {user: e.invalidFields}
				});
			});
		}
	}).catch(next);
};

// Get a complete list of actions associated with a user.
WebUsers.prototype.getActions = function(req, res, next) {
	var username = req.params.id.toLowerCase();

	this.dbconn.Action.findAll({
		include: [{
			model: this.dbconn.User,
			where: {username: username}
		}],
		order: 'Action.createdAt DESC'
	}).then(function(actions) {
		// Tab permissions
		var tabs = access.userTabPerms(req.session.user, user);

		res.render('getUserActions.swig', {
			actions: actions,
			tabs: tabs,
			username: username
		});
	}).catch(next);
};

WebUsers.prototype.getAction = function(req, res, next) {
	var username = req.params.id.toLowerCase();
	var actionID = req.params.aid;

	this.dbconn.Action.find({
		where: {id: actionID},
		include: [{
			model: this.dbconn.User,
			as: "User"
		}, {
			model: this.dbconn.User,
			as: "Whom"
		}]
	}).then(function(action) {
		res.render('getUserAction.swig', {
			action: action,
			username: username
		});
	}).catch(next);
};

module.exports = WebUsers;

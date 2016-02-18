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
var paginator = require('./paginator');
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
	var qinfo = paginator.qinfo(req);

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
		params.offset = qinfo.offset;
		params.limit = qinfo.limit;
		return self.dbconn.User.findAll(params)
	}).then(function(users) {
		var pinfo = paginator.pinfo(qinfo.page, total, qinfo.limit, { f: filter });
		res.render('getUsers.swig', {
			users: users,
			filter: filter,
			pinfo: pinfo
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

// Render the "Edit User Profile" form
function renderEditUser(req, res, options) {
	options = _.assign({
		errors: {},
		success: false,
		user: null,
	}, options);

	req.body._csrf = req.csrfToken();
	var tabs = access.userTabPerms(req.session.user, options.user);

	// Render the page
	res.render('editUser.swig', _.assign({
		data: req.body, countries: countries.countries, tabs: tabs
	}, options));
}

// Edit a user's profile
WebUsers.prototype.editUser = function(req, res, next) {
	this.dbconn.User.findOne({
		where: {username: req.params.id.toLowerCase()},
		include: [this.dbconn.Profile]
	}).then(function(user) {
		req.body.profile = user.Profile;

		renderEditUser(req, res, {
			user: user,
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

			renderEditUser(req, res, {
				user: user, success: true
			});
		}).catch(error.FormValidation, function(e) {
			renderEditUser(req, res, {
				user: user, errors: { profile: e.invalidFields },
			});
		});
	}).catch(next);
};

// Render the administrative "Edit User Settings" form
function renderEditSettingsAdmin(req, res, options) {
	options = _.assign({
		errors: {},
		success: false,
		user: null,
	}, options);

	req.body._csrf = req.csrfToken();
	var tabs = access.userTabPerms(req.session.user, options.user);
	var accesses = access.validLevelSet(req.session.user.access, options.user.access);

	// Render the page
	res.render('editSettingsAdmin.swig', _.assign({
		data: req.body, accesses: accesses, tabs: tabs,
	}, options));
}

// Render the "Edit User Settings" form
function renderEditSettings(req, res, options) {
	options = _.assign({
		errors: {},
		success: false,
		user: null,
	}, options);

	req.body._csrf = req.csrfToken();
	var tabs = access.userTabPerms(req.session.user, options.user);

	// Render the page
	res.render('editSettings.swig', _.assign({
		data: req.body, tabs: tabs,
	}, options));
}

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

			renderEditSettingsAdmin(req, res, {
				user: user
			});
		} else {
			renderEditSettings(req, res, {
				user: user
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
		if (access.canAdminEditUser(req.session.user, user)) {
			// User submitted admin "user" form
			return webform.userAdminForm(self.dbconn, req.body.user, user.username, user.email, req.session.user.access, user.access)
			.then(function() {
				// Persist almost all of settings
				user.updateAttributes({
					active: "active" in req.body.user ? true : false,
					username: req.body.user.username.toLowerCase(),
					email: req.body.user.email,
					access: req.body.user.access
				});

				// If we have a new password, persist it - must be done after
				// username change or else the new password won't work
				if ('password' in req.body.user && !_.isEmpty(req.body.user.password)) {
					user.setPassword(req.body.user.password);
				}

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

				renderEditSettingsAdmin(req, res, {
					user: user, success: true
				});
			}).catch(error.FormValidation, function(e) {
				renderEditSettingsAdmin(req, res, {
					user: user, errors: { user: e.invalidFields }
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

				req.body.profile = user.Profile;
				renderEditSettings(req, res, {
					user: user, success: true
				});
			}).catch(error.FormValidation, function(e) {
				req.body.profile = user.Profile;
				renderEditSettings(req, res, {
					user: user, errors: { user: e.invalidFields }
				});
			});
		}
	}).catch(next);
};

// Get a complete list of actions associated with a user.
WebUsers.prototype.getActions = function(req, res, next) {
	var self = this;

	var tabs = null;
	var params = {};
	var total = 0;

	var username = req.params.id.toLowerCase();
	var qinfo = paginator.qinfo(req);

	this.dbconn.User.find({
		where: {username: username},
	}).then(function(user) {
		// Tab permissions
		tabs = access.userTabPerms(req.session.user, user);

		// Default action query parameters
		params = {
			include: [{
				model: self.dbconn.User,
				where: {username: username}
			}],
			order: 'Action.createdAt DESC'
		};
		return self.dbconn.Action.count(params);
	}).then(function(count) {
		total = count;
		params.offset = qinfo.offset;
		params.limit = qinfo.limit;
		return self.dbconn.Action.findAll(params);
	}).then(function(actions) {
		var pinfo = paginator.pinfo(qinfo.page, total, qinfo.limit);
		res.render('getUserActions.swig', {
			actions: actions,
			tabs: tabs,
			username: username,
			pinfo: pinfo
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

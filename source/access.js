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

var _ = require('lodash');

// A list of valid access levels
var levels = ['OWNER', 'MASTER', 'OP', 'USER', 'UNVERIFIED'];
module.exports.levels = levels;

// Determine if a level is valid or not
module.exports.validLevel = function(level) {
	return _.contains(levels, level.toUpperCase());
};

// Determine what levels a user can set a target to
module.exports.validLevelSet = function(userAccess, targetAccess) {
	var levels = ['USER'];

	if (targetAccess === 'UNVERIFIED') {
		// If a user is not verified, allow an administrator to verify
		// them, but users should never be "unverified".
		levels.push('UNVERIFIED');
	}

	if (_.contains(['OWNER', 'MASTER'], userAccess)) {
		// Owners and Masters can hand out Operator privileges.
		levels.unshift('OP');
	}

	if (userAccess === 'OWNER') {
		// Owners can hand out any privilege they want.
		levels.unshift('MASTER');
		levels.unshift('OWNER');
	}

	return levels;
};

// A set of defaults for access control
function defaultAccess(user, target) {
	if (!(_.isObject(user) && "access" in user)) {
		return false;
	}

	switch (user.access) {
		case 'OWNER':
		// Owners can do everthing.
		return true;
		case 'MASTER':
		// Masters can do anything to operators, but not other masters or owners.
		return !_.contains(['OWNER', 'MASTER'], target.access);
		case 'OP':
		// Operators can do anything to any non-operator user.
		return !_.contains(['OWNER', 'MASTER', 'OP'], target.access);
		default:
		// Everybody else can do nothing.
		return false;
	}
}

function editAccess(user, target) {
	var sameUser = false;
	if (_.isObject(user) && "id" in user && user.id === target.id) {
		sameUser = true;
	}
	return defaultAccess(user, target) || sameUser;
}

function userTabPerms(user, target) {
		// Designate if we can see the edit tabs
		var edit = false;
		if (editAccess(user, target)) {
			edit = true;
		}

		// Designate if we can see the actions tab
		var actions = false;
		if (defaultAccess(user, target)) {
			actions = true;
		}

		return {
			'edit': edit,
			'actions': actions,
		};
}

// Populate tab permissions
module.exports.userTabPerms = userTabPerms;

// Govern who is allowed to edit a user
module.exports.canEditUser = editAccess;

// Govern who is allowed to see the admin settings page
module.exports.canAdminEditUser = defaultAccess;

// Govern who is allowed to see the "Actions" of a user
module.exports.canSeeUserActions = defaultAccess;

// Goven who is allowed to view invisible profiles
module.exports.canViewUserInvisible = defaultAccess;

// Govern who is allowed to view inactive profiles
module.exports.canViewUserInactive = defaultAccess;

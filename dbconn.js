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
var crypto = require('crypto');
var Sequelize = require('sequelize');
var srp = require('srp');

var error = require('./error');

// DBConn
//
// Handles communication with the database.

// Constructor
var DBConn = function(config) {
	var self = this;

	config.database.options.logging = config.database.options.logging || false;

	return new Promise(function(resolve, reject) {
		try {
			self.db = new Sequelize(config.database.uri, config.database.options);
			resolve();
		} catch (e) {
			reject(e);
		}
	}).then(function() {
		return self.db.authenticate();
	}).then(function() {
		// Session is used for authentication sessions
		self.Session = self.db.define('Session', {
			session: Sequelize.INTEGER,
			ephemeral: Sequelize.BLOB,
			secret: Sequelize.BLOB
		});

		// User is used for user information vital for a functioning user
		self.User = self.db.define('User', {
			username: Sequelize.STRING,
			email: Sequelize.STRING,
			verifier: Sequelize.BLOB,
			salt: Sequelize.BLOB,
			access: Sequelize.ENUM('OWNER', 'MASTER', 'OP', 'USER', 'UNVERIFIED')
		});

		// Verify is used to store user verification attempts
		self.Verify = self.db.define('Verify', {
			token: Sequelize.STRING
		});

		// Reset is used to store password reset attempts
		self.Reset = self.db.define('Reset', {
			token: Sequelize.STRING
		});

		// Profile is used for incidental user information.
		self.Profile = self.db.define('Profile', {
			clan: Sequelize.STRING,
			clantag: Sequelize.STRING,
			contactinfo: Sequelize.STRING,
			country: Sequelize.STRING,
			location: Sequelize.STRING,
			message: Sequelize.STRING,
			prettyname: Sequelize.STRING
		}, { timestamps: false });

		self.User.hasMany(self.Session);
		self.Session.belongsTo(self.User);

		self.User.hasOne(self.Verify);
		self.Verify.belongsTo(self.User);

		self.User.hasOne(self.Profile);
		self.Profile.belongsTo(self.User);

		// FIXME: Don't do this automatically
		return self.db.sync();
	}).then(function() {
		return self;
	});
};

DBConn.prototype.addUser = function(username, password, email, access) {
	var usernameBuffer = new Buffer(username.toLowerCase(), 'ascii');
	var passwordBuffer = new Buffer(password, 'ascii');

	var params = srp.params['2048'];
	var salt = crypto.randomBytes(4);
	var verifier = srp.computeVerifier(params, salt, usernameBuffer, passwordBuffer);

	return Promise.all([
		this.User.create({
			username: username,
			verifier: verifier,
			salt: salt,
			email: email,
			access: access || 'UNVERIFIED'
		}),
		this.Profile.create()
	]).spread(function(user, profile) {
		return user.setProfile(profile);
	}).then(function(profile) {
		return profile.getUser();
	});
};
DBConn.prototype.findUser = function(username) {
	return this.User.find({ where: { username: username.toLowerCase() }})
	.then(function(data) {
		if (data === null) {
			throw new error.UserNotFound("User not found");
		} else {
			return data;
		}
	});
};
DBConn.prototype.newSession = function(username) {
	var self = this;

	return Promise.all([
		this.findUser(username),
		new Promise(function(resolve, reject) {
			var sessionBuffer = crypto.randomBytes(4);
			var sessionID = sessionBuffer.readUInt32LE(0);
			resolve(sessionID);
		}).then(function(sessionID) {
			return self.Session.create({ session: sessionID });
		})
	]).spread(function(user, session) {
		return session.setUser(user);
	});
};
DBConn.prototype.findSession = function(session, timeout) {
	return this.Session.find({ where: { session: session }})
	.then(function(sess) {
		if (sess === null) {
			throw new Error("Session not found");
		}

		// A session that is expired is not a valid session.
		var diff = sess.createdAt.getSecondsBetween(new Date());
		if (diff > timeout) {
			throw new Error('Session has expired');
		}

		// Get data associated with session.
		return [sess, sess.getUser()];
	}).spread(function(sess, user) {
		if (user === null) {
			throw new Error("Session is not attached to User");
		} else if (user.access === "UNVERIFIED") {
			throw new Error("Session belongs to UNVERIFIED User");
		}

		return sess;
	});
};
DBConn.prototype.setEphemeral = function(session, ephemeral, secret, callback) {
	return this.Session.find({
		where: ['session = ? AND ephemeral IS NULL AND secret IS NULL', session]
	}).then(function(sess) {
		if (sess === null) {
			throw new Error("Session not found");
		}

		return sess.updateAttributes({
			ephemeral: ephemeral,
			secret: secret
		});
	});
};

module.exports = DBConn;

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

// DBConn
//
// Handles communication with the database.

// Constructor
var DBConn = function(config, callback) {
	var self = this;
	config.dbOptions.logging = config.dbOptions.logging || false;
	this.db = new Sequelize(config.dbConnection, config.dbOptions);
	this.db.authenticate().complete(function(error) {
		if (error) {
			callback.call(null, error);
		} else {
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

			self.db.sync().success(function() {
				callback.call(null, null, self);
			}).error(function(error) {
				callback.call(null, error);
			});
		}
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
DBConn.prototype.findUser = function(username, callback) {
	this.User.find({ where: { username: username }})
	.complete(function(err, data) {
		if (err) {
			callback(err);
		} else if (!data) {
			callback(new Error("User not found"));
		} else {
			callback(null, data);
		}
	});
};
DBConn.prototype.newSession = function(username, callback) {
	var self = this;

	// Find user by username first...
	this.User.find({ where: { username: username }})
	.error(function(err) {
		callback(err);
	})
	.success(function(user) {
		if (!user) {
			callback(new Error("User does not exist"));
			return;
		}

		// Now that we know we have a valid user, create a session
		var sessionBuffer = crypto.randomBytes(4);
		var sessionID = sessionBuffer.readUInt32LE(0);

		self.Session.create({ session: sessionID })
		.error(function(err) {
			callback(new Error('Session could not be created'));
		})
		.success(function(sess) {
			// With a created session, link the user to the session
			sess.setUser(user)
			.error(function(err) {
				callback(err);
			})
			.success(function() {
				callback(null, {
					session: sess.session,
					username: user.username,
					salt: user.salt
				});
			});
		});
	});
};
DBConn.prototype.findSession = function(session, timeout, callback) {
	this.Session.find({ where: { session: session }})
	.success(function(sess) {
		if (!sess) {
			callback(new Error("Session not found"));
			return;
		}

		// A session that is expired is not a valid session.
		var diff = sess.createdAt.getSecondsBetween(new Date());
		if (diff > timeout) {
			callback(new Error('Session has expired'));
			return;
		}

		// Get data associated with session.
		sess.getUser()
		.success(function(user) {
			callback(null, {
				ephemeral: sess.ephemeral,
				secret: sess.secret,
				session: sess.session,
				salt: user.salt,
				username: user.username,
				verifier: user.verifier
			});
		})
		.error(function(err) {
			callback(err);
		});
	})
	.error(function(err) {
		callback(err);
	});
};
DBConn.prototype.setEphemeral = function(session, ephemeral, secret, callback) {
	this.Session.find({ where: ['session = ? AND ephemeral IS NULL AND secret IS NULL', session] })
	.complete(function(err, data) {
		if (err) {
			callback(err);
		} else if (!data) {
			callback(new Error("Session not found"));
		} else {
			data.updateAttributes({ ephemeral: ephemeral, secret: secret })
			.complete(function(err) {
				if (err) {
					callback(err);
				} else {
					callback(null, true);
				}
			});
		}
	});
};

module.exports = DBConn;

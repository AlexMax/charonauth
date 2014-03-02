/* jshint node: true */
"use strict";

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
			callback.call(self, error);
		} else {
			self.Session = self.db.define('Session', {
				session: Sequelize.INTEGER,
				ephemeral: Sequelize.BLOB
			});
			self.User = self.db.define('User', {
				username: Sequelize.STRING,
				verifier: Sequelize.BLOB,
				salt: Sequelize.BLOB
			});

			self.User.hasMany(self.Session);
			self.Session.belongsTo(self.User);

			self.db.sync().success(function() {
				callback.call(self);
			}).error(function(error) {
				callback.call(self, error);
			});
		}
	});
};
DBConn.prototype = {
	addUser: function(username, password, callback) {
		var usernameBuffer = new Buffer(username, 'ascii');
		var passwordBuffer = new Buffer(password, 'ascii');

		var params = srp.params['2048'];
		var salt = crypto.randomBytes(4);
		var verifier = srp.computeVerifier(params, salt, usernameBuffer, passwordBuffer);

		this.User.create({
			username: username, verifier: verifier, salt: salt
		}).success(function() {
			callback(null);
		}).error(function(err) {
			callback(err);
		});
	},
	findUser: function(username, callback) {
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
	},
	newSession: function(username, callback) {
		var self = this;

		// Find user by username first...
		this.User.find({ where: { username: username }})
		.error(function(err) {
			callback(new Error("User does not exist"));
		})
		.success(function(user) {
			// Now that we know we have a valid user, create a session
			var sessionBuffer = crypto.randomBytes(4);
			var sessionID = sessionBuffer.readUInt32LE(0);

			self.Session.create({ session: sessionID })
			.error(function(err) {
				callback(new Error('Session could not be created'));
			})
			.success(function(session) {
				// With a created session, link the user to the session
				session.setUser(user).complete(function(err) {
					if (err) {
						callback(new Error('Could not link Session to User'));
					} else {
						callback(null, {
							session: session,
							user: user
						});
					}
				});
			});
		});
	},
	findSession: function(session, timeout, callback) {
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

			// Get user data associated with session.
			sess.getUser()
			.success(function(user) {
				callback(null, {
					session: sess.session,
					verifier: user.verifier
				});
			})
			.error(function(err) {
				callback(err);
			});
		})
		.error(function(error) {
			callback(err);
		});
	},
	setEphemeral: function(session, ephemeral, callback) {
		this.Session.find({ where: ['session = ? AND ephemeral IS NULL', session] })
		.complete(function(err, data) {
			if (err) {
				callback(err);
			} else if (!data) {
				callback(new Error("Session not found"));
			} else {
				data.updateAttributes({ ephemeral: ephemeral })
				.complete(function(err) {
					if (err) {
						callback(err);
					} else {
						callback(null, true);
					}
				});
			}
		});
	}
};

module.exports = DBConn;

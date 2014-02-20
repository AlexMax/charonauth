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
	newSession: function(user, callback) {
		var sessionBuffer = crypto.randomBytes(4);
		var session = sessionBuffer.readUInt32LE(0);

		this.Session.create({ session: session })
		.error(function(err) {
			callback(new Error('Session could not be created'));
		})
		.complete(function(err, sess) {
			sess.setUser(user).complete(function(err) {
				if (err) {
					callback(new Error('Could not link session to User'));
				} else {
					callback(null, sess);
				}
			});
		});
	}
};

module.exports = DBConn;

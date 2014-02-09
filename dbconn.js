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
	this.db = new Sequelize(config.dbConnection, config.dbOptions);
	this.db.authenticate().complete(function(error) {
		if (error) {
			callback.call(self, error);
		} else {
			self.Session = self.db.define('Session', {
				session: Sequelize.INTEGER,
				username: Sequelize.STRING
			});
			self.User = self.db.define('User', {
				username: Sequelize.STRING,
				verifier: Sequelize.BLOB,
				salt: Sequelize.BLOB
			});
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

		var params = srp.params["2048"];
		var salt = crypto.randomBytes(4);
		var verifier = srp.computeVerifier(params, salt, usernameBuffer, passwordBuffer);

		console.log(salt);
		console.log(verifier);
	},
	findUser: function(username, callback) {
		this.User.find({ where: { username: username }}, function(err, data) {
			if (err) {
				callback(err);
			} else if (!data) {
				callback(new Error("User not found"));
			} else {
				callback(null, data);
			}
		});
	}
};

module.exports = DBConn;

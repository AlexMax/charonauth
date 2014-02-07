/* jshint node: true */
"use strict";

var Sequelize = require('sequelize');

// DBConn
//
// Handles communication with the database.

// Constructor
var DBConn = function(config, callback) {
	var self = this;
	this.db = new Sequelize(config.connection);
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

module.exports = DBConn;

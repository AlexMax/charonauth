/* jshint node: true */
"use strict";

var consolidate = require('consolidate');
var express = require('express');

var DBConn = require('./dbconn');

function WebApp(config, callback) {
	if (!("dbConnection" in config)) {
		callback(new Error("Missing dbConnection in WebApp configuration."));
		return;
	}
	if (!("dbOptions" in config)) {
		callback(new Error("Missing dbOptions in WebApp configuration."));
		return;
	}
	if (!("webPort" in config)) {
		callback(new Error("Missing webPort in WebApp configuration."));
		return;
	}

	// Create database connection
	var self = this;
	this.dbconn = new DBConn({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions
	}, function(err, dbconn) {
		if (err) {
			callback(err);
			return;
		}

		self.app = express();

		// Template engine
		self.app.engine('hjs', consolidate.hogan);

		// Configuration
		self.app.set('view engine', 'hjs');

		// Top-level routes
		self.app.get('/login', self.login);
		self.app.get('/logout', self.logout);
		self.app.get('/register', self.register);

		// Users
		self.app.get('/users', self.getUsers.bind(self));
		self.app.post('/users', self.postUsers);

		// Start listening for connections
		self.app.listen(config.webPort, function() {
			callback(null, self);
		});
	});
}

// Top level controllers
WebApp.prototype.login = function(req, res) {
	res.render('login');
};
WebApp.prototype.logout = function(req, res) {
	res.render('logout');
};
WebApp.prototype.register = function(req, res) {
	res.render('register');
};

// Users controllers

// Get Users
WebApp.prototype.getUsers = function(req, res) {
	this.dbconn.User.findAll()
	.success(function(users) {
		res.render('layout', { users: users, partials: { body: 'users' }});
	});
};
// Create User
WebApp.prototype.postUsers = function(req, res) {

};
WebApp.prototype.getUser = function(req, res) {
	res.render('user');
};

module.exports = WebApp;

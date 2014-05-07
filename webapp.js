/* jshint node: true */
"use strict";

var bodyParser = require('body-parser');
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

		// Middleware
		self.app.use(express.static(__dirname + '/public'));
		self.app.use(bodyParser.urlencoded());

		// Template engine
		self.app.engine('hjs', consolidate.hogan);

		// Configuration
		self.app.set('view engine', 'hjs');

		// Top-level routes
		self.app.get('/', self.home.bind(self));
		self.app.get('/login', self.login.bind(self));
		self.app.get('/logout', self.logout.bind(self));
		self.app.all('/register', self.register.bind(self));

		// Users
		self.app.get('/users', self.getUsers.bind(self));
		self.app.all('/users/new', self.newUser.bind(self));
		self.app.get('/users/:id', self.getUser.bind(self));
		self.app.all('/users/:id/edit', self.editUser.bind(self));
		self.app.all('/users/:id/destroy', self.destroyUser.bind(self));

		// Start listening for connections
		self.app.listen(config.webPort, function() {
			callback(null, self);
		});
	});
}

// Top level controllers
WebApp.prototype.home = function(req, res) {
	res.render('layout', {
		partials: { body: 'home' }
	});
};
WebApp.prototype.login = function(req, res) {
	res.render('layout', {
		partials: { body: 'login' }
	});
};
WebApp.prototype.logout = function(req, res) {
	res.render('layout', {
		partials: { body: 'logout' }
	});
};
WebApp.prototype.register = function(req, res) {
	res.render('layout', {
		recaptcha_public_key: '6LdxD_MSAAAAAKJzPFhS7NuRzsDimgw6QLKgNmhY',
		partials: { body: 'register' }
	});
};

// Users controllers

WebApp.prototype.getUsers = function(req, res) {
	this.dbconn.User.findAll()
	.success(function(users) {
		res.render('layout', { users: users, partials: { body: 'getUsers' }});
	});
};
WebApp.prototype.newUser = function(req, res) {
	res.render('layout', {
		partials: { body: 'newUser' }
	});
};
WebApp.prototype.getUser = function(req, res) {
	res.render('layout', {
		partials: { body: 'getUser' }
	});
};
WebApp.prototype.editUser = function(req, res) {
	res.render('layout', {
		partials: { body: 'editUser' }
	});
};
WebApp.prototype.destroyUser = function(req, res) {
	res.render('layout', {
		partials: { body: 'destroyUser' }
	});
};

module.exports = WebApp;

/* jshint node: true */
"use strict";

var express = require('express');

function WebApp(config, callback) {
	this.app = express();

	// Configuration
	this.app.set('view engine', 'hbs');

	// Top-level routes
	this.app.get('/login', this.login);
	this.app.get('/logout', this.logout);
	this.app.get('/register', this.register);

	// Users
	this.app.get('/users', this.getUsers);
	this.app.post('/users', this.postUsers);

	// Start listening for connections
	this.app.listen(9000);
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
	res.render('users');
};
// Create User
WebApp.prototype.postUsers = function(req, res) {

};
WebApp.prototype.getUser = function(req, res) {
	res.render('user');
};

module.exports = WebApp;

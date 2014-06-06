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
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var consolidate = require('consolidate');
var csurf = require('csurf');
var express = require('express');
var session = require('express-session');
var fsSession = require('fs-session')({ session: session });
var _ = require('underscore');
var uuid = require('node-uuid');

var DBConn = require('./dbconn');
var gravatar = require('./gravatar');
var webforms = require('./webforms');

function WebApp(config, callback) {
	var self = this;

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
	if (!("webSecret" in config)) {
		callback(new Error("Missing webSecret in WebApp configuration."));
		return;
	}

	// Set ReCAPTCHA settings if present
	if ("recaptcha" in config) {
		if (!("privateKey" in config.recaptcha)) {
			callback(new Error("Missing privateKey in WebApp ReCAPTCHA configuration."));
			return;
		}

		if (!("publicKey" in config.recaptcha)) {
			callback(new Error("Missing publicKey in WebApp ReCAPTCHA configuration."));
			return;
		}

		this.recaptcha = {
			publicKey: config.recaptcha.publicKey,
			privateKey: config.recaptcha.privateKey
		};
	}

	// Create database connection
	new DBConn(config).then(function(dbconn) {
		self.dbconn = dbconn;

		self.app = express();

		// Middleware
		self.app.use(express.static(__dirname + '/public'));
		self.app.use(bodyParser.urlencoded());
		self.app.use(cookieParser());
		self.app.use(session({
			secret: config.webSecret,
			store: new fsSession()
		}));
		self.app.use(csurf());

		// Template engine
		self.app.engine('hjs', consolidate.hogan);

		// Configuration
		self.app.set('view engine', 'hjs');

		// Top-level routes
		self.app.get('/', self.home.bind(self));
		self.app.all('/login', self.login.bind(self));
		self.app.get('/logout', self.logout.bind(self));
		self.app.all('/register', self.register.bind(self));
		self.app.get('/register/:token', self.registerVerify.bind(self));
		self.app.all('/reset', self.reset.bind(self));
		self.app.get('/reset/:token', self.resetVerify.bind(self));

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

WebApp.prototype.render = function(req, res, layout, options) {
	res.render('layout', _.extend(options || {}, {
		session: req.session,
		partials: {
			body: layout,
			header: 'header'
		}
	}));
};

// Top level controllers
WebApp.prototype.home = function(req, res) {
	this.render(req, res, 'home');
};
WebApp.prototype.login = function(req, res) {
	var self = this;

	function render(data, errors) {
		data = data || {};
		errors = errors || {};

		data._csrf = req.csrfToken();
		self.render(req, res, 'login', {
			data: data, errors: errors,
		});
		return;
	}

	var data = req.body;
	if (!_.isEmpty(data)) {
		webforms.loginForm(data, this.dbconn.User, function(errors, user) {
			if (errors) {
				render(data, errors);
			} else {
				req.session.user = user;
				res.redirect('/');
			}
		});
	} else {
		render();
	}
};
WebApp.prototype.logout = function(req, res) {
	delete req.session.user;

	res.render('layout', {
		partials: { body: 'logout' }
	});
};
WebApp.prototype.register = function(req, res) {
	var self = this;

	function render(data, errors) {
		data = data || {};
		errors = errors || {};

		data._csrf = req.csrfToken();
		self.render(req, res, 'register', {
			data: data, errors: errors,
			recaptcha_public_key: self.recaptcha ? self.recaptcha.publicKey : null
		});
		return;
	}

	var data = req.body;
	if (!_.isEmpty(data)) {
		webforms.registerForm(
			data, req.ip,
			this.recaptcha ? this.recaptcha.privateKey : null,
			this.dbconn.User
		).then(function(errors) {
			if (errors) {
				render(data, errors);
			} else {
				return Promise.all([
					self.dbconn.addUser(data.username, data.password, data.email),
					self.dbconn.Verify.create({
						token: uuid.v4()
					})
				]).spread(function(user, verify) {
					return user.setVerify(verify);
				}).then(function(verify){
					return verify.getUser();
				});
			}
		}).then(function(user) {
			self.render(req, res, 'registerNotify', {
				email: user.email
			});
		});
	} else {
		render();
	}
};
WebApp.prototype.registerVerify = function(req, res) {
	var self = this;

	this.dbconn.Verify.find({
		where: {
			token: req.params.token
		}
	}).success(function(data) {
		if (data) {
			self.render(req, res, 'registerVerify');
		} else {
			res.send(404);
		}
	});
};
WebApp.prototype.reset = function(req, res) {

};
WebApp.prototype.resetVerify = function(req, res) {

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
	this.dbconn.User.find({
		include: [ this.dbconn.Profile ],
		where: { username: req.params.id }
	}).success(function(user) {
		res.render('layout', {
			user: user,
			gravatar: gravatar.image(user.email),
			partials: { body: 'getUser' }
		});
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

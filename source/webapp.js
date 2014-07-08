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
var _ = require('lodash');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var consolidate = require('consolidate');
var csurf = require('csurf');
var domain = require('domain');
var express = require('express');
var session = require('express-session');
var fsSession = require('fs-session')({ session: session });
var uuid = require('node-uuid');

var Config = require('./config');
var DBConn = require('./dbconn');
var error = require('./error');
var mock = require('./mock');
var Recaptcha = require('./recaptcha');
var webform = require('./webform');

// Handles user creation and administration through a web interface.
function WebApp(config, logger) {
	var self = this;

	return new Promise(function(resolve, reject) {
		// Attach a logger if we have one.
		if (logger) {
			self.log = logger;
		} else {
			self.log = mock.logger;
		}

		self.config = new Config(config, {
			web: {
				port: 8080,
				secret: undefined
			}
		});

		if (!self.config.get('web.port')) {
			reject(new Error("Missing port in web configuration."));
			return;
		}

		if (!self.config.get('web.secret')) {
			reject(new Error("Missing secret in web configuration."));
			return;
		}

		// If recaptcha config exists, initialize it
		if (self.config.get('web.recaptcha')) {
			self.recaptcha = new Recaptcha(self.config.get('web.recaptcha'));
		} else {
			self.recaptcha = undefined;
		}

		// Create database connection
		resolve(new DBConn(self.config.get('database')));
	}).then(function(dbconn) {
		self.dbconn = dbconn;

		// Create the express app
		self.app = express();
		self.app.listenAsync = Promise.promisify(self.app.listen);

		// Middleware
		self.app.use(function(req, res, next) {
			// Wrap every request in a domain, so any asynchronous
			// errors are properly taken care of.
			var appdomain = domain.create();

			appdomain.on('error', next);
			appdomain.add(req);
			appdomain.add(res);

			appdomain.run(next);
		});
		self.app.use(function(req, res, next) {
			// Write pageviews with the logger instance
			self.log.info(req.method + " " + req.originalUrl, {
				ip: req.ip,
			});
			next();
		});
		self.app.use(express.static(__dirname + '/../public'));
		self.app.use(bodyParser.urlencoded({
			extended: true
		}));
		self.app.use(cookieParser());
		self.app.use(session({
			secret: self.config.get('web.secret'),
			store: new fsSession()
		}));
		self.app.use(csurf());

		// Template engine
		self.app.engine('hjs', consolidate.hogan);

		// Configuration
		self.app.set('view engine', 'hjs');
		self.app.set('views', __dirname + '/../views');

		// Home
		self.app.get('/', self.home.bind(self));

		// Login/logut
		self.app.get('/login', self.getLogin.bind(self));
		self.app.post('/login', self.postLogin.bind(self));
		self.app.get('/logout', self.logout.bind(self));

		// Password reset
		self.app.get('/reset', self.getReset.bind(self));
		self.app.post('/reset', self.postReset.bind(self));
		self.app.get('/reset/:token', self.resetVerify.bind(self));

		// User registration
		self.app.get('/register', self.getRegister.bind(self));
		self.app.post('/register', self.postRegister.bind(self));
		self.app.get('/register/:token', self.registerVerify.bind(self));

		// Users
		self.app.get('/users', self.getUsers.bind(self));
		self.app.get('/users/:id', self.getUser.bind(self));
		self.app.all('/users/:id/edit', self.editUser.bind(self));
		self.app.all('/users/:id/destroy', self.destroyUser.bind(self));

		// Handle 404's
		self.app.use(function(req, res, next) {
			throw new error.NotFound('Page not found');
		});

		// Error Middleware
		self.app.use(function(err, req, res, next) {
			if (err.name === 'NotFoundError') {
				// Handle 404 errors
				res.statusCode = 404;
				res.render('error', {
					message: err.message,
					stack: err.stack
				});
				next();
			} else if (err.name === 'ForbiddenError') {
				// Handle 403 errors
				res.statusCode = 403;
				res.render('error', {
					message: err.message,
					stack: err.stack
				});
				next();
			} else {
				// An exception we didn't throw - must be our fault
				res.statusCode = 500;
				res.render('error', {
					message: err.message,
					stack: err.stack
				});
				next(err);
			}
		});
		self.app.use(function(err, req, res, next) {
			// Log any error we come across to disk
			self.log.warn(err.stack);
			next();
		});

		// Start listening for connections
		return self.app.listenAsync(config.web.port);
	}).then(function() {
		return self;
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

// Render a login form
WebApp.prototype.getLogin = function(req, res) {
	req.body._csrf = req.csrfToken();
	this.render(req, res, 'login', {
		data: req.body, errors: {},
	});
};

// Process a login form
WebApp.prototype.postLogin = function(req, res) {
	var self = this;

	webform.loginForm(this.dbconn, req.body)
	.then(function(user) {
		return Promise.all([user, user.getProfile()]);
	}).spread(function(user, profile) {
		req.session.user = {
			id: user.id,
			username: user.username,
			profile_username: profile.username,
			gravatar: user.getGravatar(),
			access: user.access
		};

		res.redirect('/');
	}).catch(error.FormValidation, function(e) {
		req.body._csrf = req.csrfToken();
		self.render(req, res, 'login', {
			data: req.body, errors: e.invalidFields
		});
	}).done();
};

WebApp.prototype.logout = function(req, res) {
	delete req.session.user;

	this.render(req, res, 'logout');
};

// Render a registration form
WebApp.prototype.getRegister = function(req, res) {
	req.body._csrf = req.csrfToken();
	this.render(req, res, 'register', {
		data: req.body, errors: {},
		recaptcha_public_key: this.recaptcha ? this.recaptcha.publickey : null
	});
};

// Process a registration form
WebApp.prototype.postRegister = function(req, res) {
	var self = this;

	webform.registerForm(
		this.dbconn, this.recaptcha, req.body, req.ip
	).then(function() {
		if (false) {
			// Do E-mail verification of new accounts
			return Promise.all([
				self.dbconn.addUser(req.body.username, req.body.password, req.body.email),
				self.dbconn.Verify.create({
					token: uuid.v4()
				})
			]).spread(function(user, verify) {
				return Promise.all([user, user.setVerify(verify)]);
			}).spread(function(user, _) {
				self.render(req, res, 'registerNotify', {
					user: user
				});
			});
		} else {
			// Don't do E-mail verification of new accounts
			return self.dbconn.addUser(req.body.username, req.body.password, req.body.email, 'USER')
			.then(function(user) {
				return Promise.all([user, user.getProfile()]);
			}).spread(function(user, profile) {
				req.session.user = {
					id: user.id,
					username: user.username,
					profile_username: profile.username,
					gravatar: user.getGravatar(),
					access: user.access
				};

				self.render(req, res, 'registerSuccess');
			});
		}
	}).catch(error.FormValidation, function(e) {
		req.body._csrf = req.csrfToken();
		self.render(req, res, 'register', {
			data: req.body, errors: e.invalidFields,
			recaptcha_public_key: self.recaptcha ? self.recaptcha.publickey : null
		});
	}).done();
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
			throw error.NotFound();
		}
	});
};
WebApp.prototype.getReset = function(req, res) {

};
WebApp.prototype.postReset = function(req, res) {

};
WebApp.prototype.resetVerify = function(req, res) {

};

// Get a list of all users
WebApp.prototype.getUsers = function(req, res) {
	var self = this;

	this.dbconn.User.findAll({
		where: {active: true, visible_profile: true},
		include: [this.dbconn.Profile]
	}).then(function(users) {
		self.render(req, res, 'getUsers', {
			users: users
		});
	}).done();
};

// Get information on a specific user
WebApp.prototype.getUser = function(req, res) {
	var self = this;

	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()}
	}).then(function(user) {
		if (_.isNull(user)) {
			throw new error.NotFound('User not found');
		}

		// Profile visibility is affected by two factors, if the profile is
		// active and if it is set to be visible
		if (user.active === false || user.visible_profile === false) {
			if (!("user" in req.session)) {
				throw new error.Forbidden('Can not view profile as anonymous user');
			} else if (user.id === req.session.user.id && user.active === false) {
				throw new error.Forbidden('Can not view profile as your account is not active');
			} else if (user.id !== req.session.user.id && _.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
				throw new error.Forbidden('Can not view profile with given access');
			}
		}

		// User is allowed to see the profile, so obtain the profile.
		return Promise.all([user, user.getProfile()]);
	}).spread(function(user, profile) {
		var can_edit = false;
		if (!("user" in req.session)) {
			// Anonymous users can never edit a profile
		} else if (_.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
			// Operators can always edit profiles
			can_edit = true;
		} else if (user.id === req.session.user.id) {
			// Users can always edit their own profiles
			can_edit = true;
		}

		self.render(req, res, 'getUser', {
			user: user,
			profile: profile,
			can_edit: can_edit
		});
	}).done();
};

// Edit a specific user
WebApp.prototype.editUser = function(req, res) {
	var self = this;

	this.dbconn.User.find({
		where: {username: req.params.id.toLowerCase()}
	}).then(function(user) {
		if (_.isNull(user)) {
			throw new error.NotFound('User not found');
		}

		var can_edit_admin = false;
		if (!("user" in req.session)) {
			throw new error.Forbidden('Can not edit profile as anonymous user');
		} else if (_.contains(['OWNER', 'MASTER', 'OP'], req.session.user.access)) {
			// Operators can always edit profiles, and can modify their access
			// level and visibility too.
			can_edit_admin = true;
		} else if (user.id === req.session.user.id) {
			// Users can always edit the own profiles
		} else {
			throw new error.Forbidden('Can not edit profile as current user');
		}

		// User is allowed to edit the profile, so obtain the profile.
		return Promise.all([user, user.getProfile(), can_edit_admin]);
	}).spread(function(user, profile, can_edit_admin) {
		self.render(req, res, 'editUser', {
			data: {
				user: user,
				profile: profile
			},
			can_edit_admin: can_edit_admin
		});
	}).done();
};

// Process an edit user submission
WebApp.prototype.postEditUser = function(req, res) {
	var self = this;

	new Promise(function(resolve, reject) {
		resolve();
	}).then(function() {
		return webform.userForm(this.dbconn, req.body);
	}).catch(error.FormValidation, function(e) {
		req.body._csrf = req.csrfToken();
	});
}

// Delete a specific user
WebApp.prototype.destroyUser = function(req, res) {
	res.render('layout', {
		partials: { body: 'destroyUser' }
	});
};

module.exports = WebApp;

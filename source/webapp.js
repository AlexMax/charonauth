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
var csurf = require('csurf');
var domain = require('domain');
var express = require('express');
var session = require('express-session');
var fsSession = require('fs-session')({ session: session });
var uuid = require('node-uuid');
var swig = require('swig');

var Config = require('./config');
var DBConn = require('./dbconn');
var error = require('./error');
var Mailer = require('./mailer');
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

		// If mail config exists, initialize it
		if (self.config.get('mail')) {
			self.mailer = new Mailer(self.config.get('mail'), logger);
		} else {
			self.mailer = undefined;
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

		// Middleware
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
			resave: false,
			saveUninitialized: false,
			secret: self.config.get('web.secret'),
			store: new fsSession()
		}));
		self.app.use(csurf());
		self.app.use(function(req, res, next) {
			// Allways supply session data to the template
			self.app.locals.session = req.session;
			next();
		});

		// Template engine
		self.app.engine('swig', swig.renderFile);
		self.app.set('views', __dirname + '/../views');
		self.app.set('view cache', false);

		// Home
		self.app.get('/', self.home.bind(self));

		// Login/logut
		self.app.get('/login', self.getLogin.bind(self));
		self.app.post('/login', self.postLogin.bind(self));
		self.app.get('/logout', self.logout.bind(self));

		// User registration
		self.app.use('/register', new (require('./webregister'))(self.dbconn, self.mailer, self.recaptcha));

		// Password reset
		self.app.use('/reset', new (require('./webreset'))(self.dbconn, self.mailer));

		// User and user profile viewing and modification
		self.app.use('/users', new (require('./webusers'))(self.dbconn));

		// Handle 404's
		self.app.use(function(req, res, next) {
			throw new error.NotFound('Page not found');
		});

		// Error Middleware
		self.app.use(function(err, req, res, next) {
			if (err.name === 'NotFoundError') {
				// Handle 404 errors
				res.statusCode = 404;
				res.render('error.swig', {
					status: res.statusCode,
					message: err.message,
					stack: err.stack
				});
			} else if (err.name === 'ForbiddenError') {
				// Handle 403 errors
				res.statusCode = 403;
				res.render('error.swig', {
					status: res.statusCode,
					message: err.message,
					stack: err.stack
				});
			} else {
				// An exception we didn't throw on purpose.
				res.statusCode = 500;
				res.render('error.swig', {
					status: res.statusCode,
					message: err.message,
					stack: err.stack,
					sql: err.sql
				});

				// Log an error.
				if (err.sql) {
					self.log.error(err.stack + "\n" + err.sql);
				} else {
					self.log.error(err.stack);
				}

				// Killing the webserver will kill the worker process.  Unexpected
				// exceptions leave the server in an inconsistent state, so we must
				// shut the server down or else we risk undefined behavior and memory
				// leaks.
				self.http.close();
			}
		});

		// Start listening for connections.
		self.http = self.app.listen(config.web.port);

		// If the webserver dies, restart the worker process.
		self.http.on('close', function() {
			process.exit(1);
		});

		return self;
	});
}

// Top level controllers
WebApp.prototype.home = function(req, res) {
	res.render('home.swig');
};

// Render a login form
WebApp.prototype.getLogin = function(req, res) {
	req.body._csrf = req.csrfToken();
	res.render('login.swig', {
		data: req.body, errors: {},
	});
};

// Process a login form
WebApp.prototype.postLogin = function(req, res, next) {
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
		res.render('login.swig', {
			data: req.body, errors: e.invalidFields
		});
	}).catch(next);
};

WebApp.prototype.logout = function(req, res) {
	delete req.session.user;

	res.render('logout.swig');
};

module.exports = WebApp;

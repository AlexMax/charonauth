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

var Sequelize = require('sequelize');
var validator = require('validator');

var error = require('./error');

function loginForm(dbconn, data) {
	return new Promise(function(resolve, reject) {
		var errors = {};

		if (!("login" in data) || validator.isNull(data.login)) {
			errors.login = "Login is required";
		}
		if (!("password" in data) || validator.isNull(data.password)) {
			errors.password = "Password is required";
		}

		if (!_.isEmpty(errors)) {
			reject(new error.FormValidation("Form validation failed", errors));
		} else {
			dbconn.verifyUser(data.login, data.password)
			.then(function(user) {
				resolve(user);
			}).catch(function(e) {
				reject(new error.FormValidation("Form validation failed", {form: "Login failed"}));
			});
		}
	});
}

function registerForm(dbconn, recaptcha, data, ip) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		var errors = {};

		// Validate Username
		if (!("username" in data) || validator.isNull(data.username)) {
			errors.username = "Username is required";
		} else if (!validator.isAlphanumeric(data.username)) {
			errors.username = "Username must be Alphanumeric (A-Z, 0-9)";
		} else {
			promises.push(new Promise(function (resolve, reject) {
				dbconn.User.find({ where: { username: data.username.toLowerCase() }})
				.success(function (data) {
					if (data) {
						errors.username = "Username is taken";
					}
					resolve();
				});
			}));
		}

		// Validate Password
		if (!("password" in data) || validator.isNull(data.password)) {
			errors.password = "Password is required";
		} else if (!validator.isAscii(data.password)) {
			errors.password = "Password must be plain ASCII characters";
		} else if (!validator.isLength(data.password, 8, 1024)) {
			errors.password = "Password must be between 8 and 1,024 characters";
		} else if (validator.matches(data.password, /^([A-Za-z ]+|[0-9 ]+)$/) && !validator.isLength(data.password, 20)) {
			errors.password = "Password must contain more than just letters or just numbers, unless your password is more than 20 characters";
		}

		// Validate password confirmation
		if (!("confirm" in data) || validator.isNull(data.confirm)) {
			errors.confirm = "Password Confirmation is required";
		} else if (data.password !== data.confirm) {
			errors.confirm = "Password Confirmation does not match";
		}

		// Validate E-Mail address
		if (!("email" in data) || validator.isNull(data.email)) {
			errors.email = "E-Mail is required";
		} else if (!validator.isEmail(data.email)) {
			errors.email = "E-Mail must be valid";
		} else {
			promises.push(new Promise(function (resolve, reject) {
				dbconn.User.find({ where: { email: data.email.toLowerCase() }})
				.success(function (data) {
					if (data) {
						errors.email = "E-Mail is already associated with a user";
					}
					resolve();
				});
			}));
		}

		// Validate ReCAPTCHA if we've got a private key for it
		if (recaptcha) {
			if (!("recaptcha_challenge_field" in data) || validator.isNull(data.recaptcha_challenge_field) ||
					!("recaptcha_response_field" in data) || validator.isNull(data.recaptcha_response_field)) {
				errors.captcha = "CAPTCHA is required";
			} else {
				promises.push(new Promise(function (resolve, reject) {
					recaptcha.verify(
						ip, data.recaptcha_challenge_field, data.recaptcha_response_field
					).then(function () {
						resolve();
					}).catch(function (error) {
						switch (error) {
						case "recaptcha-not-reachable":
							errors.captcha = "CAPTCHA service is not reachable";
							break;
						case 'incorrect-captcha-sol':
							errors.captcha = "CAPTCHA is incorrect";
							break;
						case 'captcha-timeout':
							errors.captcha = "CAPTCHA timed out";
							break;
						default:
							errors.captcha = "CAPTCHA service is misconfigured";
							break;
						}
						resolve();
					});
				}));
			}
		}

		if (!_.isEmpty(promises)) {
			Promise.all(promises).then(function() {
				if (_.isEmpty(errors)) {
					resolve();
				} else {
					reject(new error.FormValidation("Form validation failed", errors));
				}
			});
		} else {
			// We can't get to this point without at least one error.
			reject(new error.FormValidation("Form validation failed", errors));
		}
	});
}

function userForm(dbconn, data) {
	return new Promise(function(resolve, reject) {
		var profile_errors = {};

		if (!validator.isLength(data.profile.clan, 0, 100)) {
			profile_errors.clan = "Clan must be 100 characters or less";
		}

		if (!validator.isLength(data.profile.clantag, 0, 6)) {
			profile_errors.clantag = "Clan tag must be 6 characters or less";
		}

		if (!validator.isLength(data.profile.contactinfo, 0, 1000)) {
			profile_errors.contactinfo = "Contact Information must be 1,000 characters or less";
		}

		if (!validator.isLength(data.profile.location, 0, 100)) {
			profile_errors.location = "Location must be 100 characters or less";
		}

		if (!validator.isLength(data.profile.message, 0, 1000)) {
			profile_errors.message = "Message must be 1,000 characters or less";
		}

/*      clan: Sequelize.STRING,
      clantag: Sequelize.STRING,
      contactinfo: Sequelize.STRING,
      country: Sequelize.STRING,
      gravatar: Sequelize.ENUM(null, 'identicon', 'monsterid', 'wavatar', 'retro
      location: Sequelize.STRING,
      message: Sequelize.STRING,
      username: Sequelize.STRING*/
		reject(new error.FormValidation("Form validation failed", {
			profile: profile_errors
		}));
	});
}

module.exports.loginForm = loginForm;
module.exports.registerForm = registerForm;
module.exports.userForm = userForm;

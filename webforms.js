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
var querystring = require('querystring');
var request = require('request');
var Sequelize = require('sequelize');
var _ = require('underscore');
var validator = require('validator');

function verifyReCAPTCHA(privateKey, ip, challenge, response) {
	return new Promise(function (resolve, reject) {
		request.post(
			'http://www.google.com/recaptcha/api/verify',
			{
				form: {
					privatekey: privateKey,
					remoteip: ip,
					challenge: challenge,
					response: response
				}
			},
			function (err, response, body) {
				if (err) {
					reject('recaptcha-not-reachable');
					return;
				}
				var res = body.split('\n');
				if (res[0] === 'true') {
					resolve();
				} else {
					switch (res[1]) {
					case 'incorrect-captcha-sol':
					case 'captcha-timeout':
						reject(res[1]);
						break;
					default:
						reject(null);
						break;
					}
				}
			}
		);
	});
}

function loginForm(data, user, callback) {
	var errors = {};

	if (!("login" in data) || validator.isNull(data.login)) {
		errors.login = "Login is required";
	}
	if (!("password" in data) || validator.isNull(data.password)) {
		errors.password = "Password is required";
	}

	if (!_.isEmpty(errors)) {
		callback(errors);
		return;
	}

	user.find({
		where: Sequelize.or(
			{ username: data.login.toLowerCase() },
			{ email: data.login.toLowerCase() }
		)
	}).success(function(data) {
		if (!data) {
			callback({ form: "Login failed" });
			return;
		}

		// TODO: Check to see if password matches stored hashed verifier.

		callback(null, {
			id: data.id,
			username: data.username,
			email: data.email
		});
	});
}

function registerForm(data, ip, recaptchaPrivateKey, user, callback) {
	var promises = [];
	var errors = {};

	// Validate Username
	if (!("username" in data) || validator.isNull(data.username)) {
		errors.username = "Username is required";
	} else if (!validator.isAlphanumeric(data.username)) {
		errors.username = "Username must be Alphanumeric (A-Z, 0-9)";
	} else {
		promises.push(new Promise(function (resolve, reject) {
			user.find({ where: { username: data.username.toLowerCase() }})
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
	} else if (validator.matches(data.password, /^([A-Za-z ]+|[0-9]+)$/) && !validator.isLength(data.password, 20)) {
		errors.password = '"' +  data.password + '" is a really bad password, try another one';
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
			user.find({ where: { email: data.email.toLowerCase() }})
			.success(function (data) {
				if (data) {
					errors.email = "E-Mail is already associated with a user";
				}
				resolve();
			});
		}));
	}

	// Validate ReCAPTCHA if we've got a private key for it
	if (recaptchaPrivateKey) {
		if (!("recaptcha_challenge_field" in data) || validator.isNull(data.recaptcha_challenge_field) ||
		    !("recaptcha_response_field" in data) || validator.isNull(data.recaptcha_response_field)) {
			errors.captcha = "CAPTCHA is required";
		} else {
			promises.push(new Promise(function (resolve, reject) {
				verifyReCAPTCHA(
					recaptchaPrivateKey, ip, data.recaptcha_challenge_field, data.recaptcha_response_field
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
			callback(_.isEmpty(errors) ? null : errors);
		});
	} else {
		callback(_.isEmpty(errors) ? null : errors);
	}
}

module.exports.loginForm = loginForm;
module.exports.registerForm = registerForm;

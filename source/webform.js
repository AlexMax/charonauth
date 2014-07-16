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

var access = require('./access');
var countries = require('./countries');
var error = require('./error');

module.exports.loginForm = function(dbconn, data) {
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
};

module.exports.registerForm = function(dbconn, recaptcha, data, ip) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		var errors = {};

		// Validate Username
		if (!("username" in data) || validator.isNull(data.username)) {
			errors.username = "Username is required";
		} else if (!validator.isLength(data.username, 2, 12)) {
			errors.username = "Username must be between 2 and 12 characters";
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
		} else if (!validator.isLength(data.password, 8, 1000)) {
			errors.password = "Password must be between 8 and 1,000 characters";
		} else if (!validator.isAscii(data.password)) {
			errors.password = "Password must be plain ASCII characters";
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
};

module.exports.userForm = function(dbconn, data, username) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		var errors = {};

		// Validate current password
		if (!("current_password" in data) || validator.isNull(data.current_password)) {
			errors.current_password = "Current Password is required";
		} else if (validator.isNull(username)) {
			errors.current_password = "Current Password is missing session data";
		} else {
			promises.push(new Promise(function(resolve, reject) {
				dbconn.verifyUser(username, data.current_password)
				.then(function() {
					resolve();
				}).catch(function(e) {
					errors.current_password = "Current Password is incorrect";
					resolve();
				});
			}));
		}


		// Validate password, if set
		if ("password" in data && !validator.isNull(data.password)) {
			if (!validator.isAscii(data.password)) {
				errors.password = "Password must be plain ASCII characters";
			} else if (!validator.isLength(data.password, 8, 1000)) {
				errors.password = "Password must be between 8 and 1,000 characters";
			} else if (validator.matches(data.password, /^([A-Za-z ]+|[0-9 ]+)$/) && !validator.isLength(data.password, 20)) {
				errors.password = "Password must contain more than just letters or just numbers, unless your password is more than 20 characters";
			}

			if (!("confirm" in data) || validator.isNull(data.confirm)) {
				errors.confirm = "Password Confirmation is required";
			}
		}

		// Validate password confirmation, if set
		if ("confirm" in data && !validator.isNull(data.confirm)) {
			if (!("password" in data) || validator.isNull(data.password)) {
				errors.password = "Password is required";
			}

			if (data.password !== data.confirm) {
				errors.confirm = "Password Confirmation does not match";
			}
		}

		// Validate E-Mail address, if set
		if ("email" in data && !validator.isNull(data.email)) {
			if (!validator.isEmail(data.email)) {
				errors.email = "E-Mail must be valid";
			} else {
				promises.push(new Promise(function (resolve, reject) {
					dbconn.User.find({ where: { email: data.email.toLowerCase() }})
					.success(function(data) {
						if (data) {
							errors.email = "E-Mail is already associated with a user";
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
};

module.exports.userAdminForm = function(dbconn, data, username, email, userAccess, targetAccess) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		var errors = {};

		// Validate Username
		if (!("username" in data) || validator.isNull(data.username)) {
			errors.username = "Username is required";
		} else if (!validator.isLength(data.username, 2, 12)) {
			errors.username = "Username must be between 2 and 12 characters";
		} else if (!validator.isAlphanumeric(data.username)) {
			errors.username = "Username must be Alphanumeric (A-Z, 0-9)";
		} else if (data.username.toLowerCase() !== username) {
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

		// Validate password, if set
		if ("password" in data && !validator.isNull(data.password)) {
			if (!validator.isAscii(data.password)) {
				errors.password = "Password must be plain ASCII characters";
			} else if (!validator.isLength(data.password, 8, 1000)) {
				errors.password = "Password must be between 8 and 1,000 characters";
			} else if (validator.matches(data.password, /^([A-Za-z ]+|[0-9 ]+)$/) && !validator.isLength(data.password, 20)) {
				errors.password = "Password must contain more than just letters or just numbers, unless your password is more than 20 characters";
			}
		} else if (data.username.toLowerCase() !== username) {
			errors.password = "A new password must be set if the username is changed";
		}

		// Validate E-Mail address
		if (!("email" in data) || validator.isNull(data.email)) {
			errors.email = "E-Mail is required";
		} else if (!validator.isEmail(data.email)) {
			errors.email = "E-Mail must be valid";
		} else if (data.email.toLowerCase() !== email) {
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

		// Validate access level change
		if (!("access" in data) || validator.isNull(data.access)) {
			errors.access = "Access is required";
		} else if (!validator.isIn(data.access, access.validLevelSet(userAccess, targetAccess))) {
			errors.access = "Access must be valid selection";
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
			if (_.isEmpty(errors)) {
					resolve();
			} else {
				reject(new error.FormValidation("Form validation failed", errors));
			}
		}
	});
};

module.exports.profileForm = function(dbconn, data, username) {
	return new Promise(function(resolve, reject) {
		var errors = {};

		// All of the profile validations are optional, but the actual
		// object properties must actually exist or else something else
		// might break elsewhere.  This is only an issue if a malicious
		// user attempts to mess with form submission.

		if (!("clan" in data)) {
			errors.clan = "Clan is required";
		} else if (!validator.isLength(data.clan, 0, 100)) {
			errors.clan = "Clan must be 100 characters or less";
		}

		if (!("clantag" in data)) {
			errors.clantag = "Clan tag is required";
		} else if (!validator.isLength(data.clantag, 0, 6)) {
			errors.clantag = "Clan tag must be 6 characters or less";
		}

		if (!("contactinfo" in data)) {
			errors.contactinfo = "Contact Information is required";
		} else if (!validator.isLength(data.contactinfo, 0, 1000)) {
			errors.contactinfo = "Contact Information must be 1,000 characters or less";
		}

		if (!("country" in data)) {
			errors.country = "Country is required";
		} else if (!validator.isNull(data.country) && !countries.isCountryCode(data.country)) {
			errors.country = "Country must be valid selection";
		}

		if (!("gravatar" in data)) {
			errors.gravatar = "Gravatar is required";
		} else if (!validator.isIn(data.gravatar, ['', 'identicon', 'monsterid', 'wavatar', 'retro'])) {
			errors.gravatar = "Gravatar must be valid selection";
		}

		if (!("location" in data)) {
			errors.location = "Location is required";
		} else if (!validator.isLength(data.location, 0, 100)) {
			errors.location = "Location must be 100 characters or less";
		}

		if (!("message" in data)) {
			errors.message = "Message is required";
		} else if (!validator.isLength(data.message, 0, 1000)) {
			errors.message = "Message must be 1,000 characters or less";
		}

		if (!("username" in data)) {
			errors.username = "Username is required";
		} else if (!validator.equals(username, data.username.toLowerCase())) {
			errors.username = "You may only change the letter case of your username";
		}

		if (_.isEmpty(errors)) {
			resolve();
		} else {
			reject(new error.FormValidation("Form validation failed", errors));
		}
	});
};

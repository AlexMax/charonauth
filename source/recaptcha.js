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

var request = Promise.promisifyAll(require('request'));

var Config = require('./config');

// A reCAPTCHA verifier
function Recaptcha(config) {
	this.config = new Config(config, {
		privatekey: undefined,
		publickey: undefined
	});

	if (!this.config.get('privatekey')) {
		throw new Error("Missing privatekey in recaptcha configuration.");
	}
	if (!this.config.get('publickey')) {
		throw new Error("Missing publickey in recaptcha configuration.");
	}

	this.privatekey = this.config.get('privatekey');
	this.publickey = this.config.get('publickey');
}

// Verify a ReCAPTCHA form submission
Recaptcha.prototype.verify = function(ip, challenge, response) {
	var self = this;

	return new Promise(function(resolve, reject) {
		request.post(
			'http://www.google.com/recaptcha/api/verify',
			{
				form: {
					privatekey: self.privatekey,
					remoteip: ip,
					challenge: challenge,
					response: response
				}
			},
			function(err, response, body) {
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
};

module.exports = Recaptcha;

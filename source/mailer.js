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

var nodemailer = require('nodemailer');
var sendmailTransport = require('nodemailer-sendmail-transport');
var smtpTransport = require('nodemailer-smtp-transport');

var Config = require('./config');
var mock = require('./mock');
var swig = require('swig');

function Mailer(config, logger) {
		// Attach a logger if we have one.
		if (logger) {
			this.log = logger;
		} else {
			this.log = mock.logger;
		}

		this.config = new Config(config, {
			signature: "The Administration"
		});

		// Signature
		this.signature = this.config.get('signature');

		// "From:" header
		if (!this.config.get('from')) {
			throw new Error('Missing from in mailer configuration.');
		}
		this.from = this.config.get('from');

		// Baseurl to website
		if (!this.config.get('baseurl')) {
			throw new Error('Missing baseurl in mailer configuration.');
		}
		this.baseurl = this.config.get('baseurl');

		// Set up transport
		var transport = this.config.get('transport');
		if (transport === 'direct') {
			// Direct transport
			this.transport = nodemailer.createTransport();
		} else if (transport === 'sendmail') {
			// Sendmail transport
			this.transport = nodemailer.createTransport(sendmailTransport({
				path: this.config.get('sendmail.path')
			}));
		} else if (transport === 'smtp') {
			// SMTP transport		
			this.transport = nodemailer.createTransport(smtpTransport({
				host: this.config.get('smtp.host'),
				port: this.config.get('smtp.port'),
				secure: this.config.getBool('smtp.secure'),
				auth: {
					user: this.config.get('smtp.user'),
					pass: this.config.get('smtp.pass')
				}
			}));
		} else if (!transport) {
			throw new Error('Missing transport in mailer configuration.');
		} else {
			throw new Error('Invalid transport in mailer configuration.');
		}
}

// Send a templated e-mail using SWIG
Mailer.prototype.sendRendered = function(options, context) {
	var self = this;

	return new Promise(function(resolve, reject) {
		// Set default context variables
		context = context || {};
		context = _.merge({
			baseurl: self.baseurl,
			signature: self.signature
		}, context);

		swig.renderFile(
			__dirname + '/../views/email/' + options.template, context,
			function(err, output) {
				if (err) {
					reject(err);
				} else {
					resolve(output);
				}
			}
		);
	}).then(function(text) {
		return new Promise(function(resolve, reject) {
			// Send the mail
			self.transport.sendMail({
				from: self.from,
				to: options.to,
				subject: options.subject,
				text: text
			}, function(err, info) {
				if (err) {
					reject(err);
				} else {
					resolve(info);
				}
			});
		});
	});
};

module.exports = Mailer;

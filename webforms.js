/* jshint node: true */
"use strict";

var _ = require('underscore');
var forms = require('forms');
var fields = forms.fields;
var querystring = require('querystring');
var request = require('request');
var validators = forms.validators;

var recaptchaChallengeField = function(opts) {
	if (!opts) {
		opts = {};
	}

	var f = _.extend({}, opts);

	f.bind = function(raw_data) {
		var b = _.extend({}, f);

		b.data = raw_data;
		b.validate = function(form, callback) {
			callback(null, b);
		}

		return b;
	}
	f.toHTML = function() {
		return '';
	}

	return f;
}

var recaptchaResponseField = function(opts) {
	if (!opts) {
		opts = {};
	}

	if (!('recaptcha_private_key' in opts)) {
		throw new Error("Missing ReCAPTCHA private key");
	}
	if (!('recaptcha_public_key' in opts)) {
		throw new Error("Missing ReCAPTCHA public key");
	}
	if (!('recaptcha_ip' in opts)) {
		throw new Error("Missing ReCAPTCHA IP Address");
	}

	var f = _.extend({}, opts);

	f.parse = function(raw_data) {
		if (_.isUndefined(raw_data) || _.isNull(raw_data)) {
			return '';
		}
		return String(raw_data);
	};
	f.bind = function(raw_data) {
		var b = _.extend({}, f);

		b.value = raw_data;
		b.data = b.parse(raw_data);
		b.validate = function(form, callback) {
			if (b.data.length === 0) {
				b.error = "CAPTCHA is required";
				callback(b.error, b);
				return;
			}
			request.post(
				'http://www.google.com/recaptcha/api/verify',
				{
					form: {
						privatekey: b.recaptcha_private_key,
						remoteip: b.recaptcha_ip,
						challenge: form.data.recaptcha_challenge_field,
						response: b.data
					}
				},
				function (err, response, body) {
					if (err) {
						b.error = 'ReCAPTCHA service could not be reached.';
						b.re_error = 'recaptcha-not-reachable';
						callback(b.error, b);
						return;
					}
					var res = body.split('\n');
					if (res[0] === 'true') {
						callback(null, b);
					} else {
						switch (res[1]) {
						case 'incorrect-captcha-sol':
							b.error = 'CAPTCHA is incorrect.';
							break;
						case 'captcha-timeout':
							b.error = 'CATPCHA timed out.';
							break;
						default:
							b.error = 'ReCAPTCHA is misconfigured.';
							break;
						}
						b.re_error = res[1];
						callback(b.error, b);
					}	
				}
			);
		};

		return b;
	};
	f.toHTML = function() {
		var qs = {
			k: this.recaptcha_public_key
		};
		this.re_error ? qs.error = this.re_error : null;
		return '<script type="text/javascript" src="http://www.google.com/recaptcha/api/challenge?' + querystring.stringify(qs) + '"></script>';
	};

	return f;
}

var registerForm = function(opts) {
	if (!opts) {
		opts = {};
	}

	if (!('recaptcha_private_key' in opts)) {
		throw new Error("Missing ReCAPTCHA private key");
	}
	if (!('recaptcha_public_key' in opts)) {
		throw new Error("Missing ReCAPTCHA public key");
	}
	if (!('recaptcha_ip' in opts)) {
		throw new Error("Missing ReCAPTCHA IP Address");
	}

	return forms.create({
		username: fields.string({ required: true }),
		password: fields.password({ required: true }),
		confirm: fields.password({
			required: true,
			validators: [ validators.matchField('password') ]
		}),
		email: fields.email({ required: true }),
		aup: fields.boolean({
			label: "I have read and agree to the Acceptable Use Policy",
			required: true
		}),
		recaptcha_challenge_field: recaptchaChallengeField(),
		recaptcha_response_field: recaptchaResponseField({
			recaptcha_private_key: opts.recaptcha_private_key,
			recaptcha_public_key: opts.recaptcha_public_key,
			recaptcha_ip: opts.recaptcha_ip
		})
	}, { validatePastFirstError: true });
};


module.exports.registerForm = registerForm;

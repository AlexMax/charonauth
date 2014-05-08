/* jshint node: true */
"use strict";

var crypto = require('crypto');
var querystring = require('querystring');

function image(email, options) {
	var md5 = crypto.createHash('md5');
	var hash = md5.update(email.toLowerCase(), 'ascii').digest('hex');
	var qstring = querystring.stringify({
		d: 'identicon'
	});

	return {
		url: '//www.gravatar.com/avatar/' + hash + '?' + qstring,
		width: 80,
		height: 80
	};
}

exports.image = image;

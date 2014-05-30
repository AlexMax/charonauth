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

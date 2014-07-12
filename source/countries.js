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

var _ = require('lodash');

var countries = require('world-countries');

// An object that stores selected country data based using a
// two-letter country code for a key.
var cca2hash = {};

// Initialize the country data hash
for (var i = 0, len = countries.length;i < len;i++) {
	cca2hash[countries[i].cca2] = countries[i];
}

// Validates if the passed string is a valid country code
module.exports.isCountryCode = function(str) {
	var code = str.toUpperCase();
	if (code in cca2hash) {
		return true;
	} else {
		return false;
	}
}

// Gets country data by cca2
module.exports.getData = function(str) {
	var code = str.toUpperCase();
	if (code in cca2hash) {
		return cca2hash[code];
	} else {
		return null;
	}
}

module.exports.countries = countries;

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

// Configuration constructor takes two values, a plain object with
// the actual configuration values and defaults that represent the
// default configuration values.
function Config(values, defaults) {
	if (_.isUndefined(values) || _.isNull(values)) {
		values = {};
	} else if (!_.isObject(values)) {
		throw new Error('Can\'t create config with defaults of type ' + typeof values);
	}

	if (_.isUndefined(defaults) || _.isNull(defaults)) {
		defaults = {};
	} else if (!_.isObject(defaults)) {
		throw new Error('Can\'t create config with defaults of type ' + typeof defaults);
	}

	this.values = _.merge(values, defaults, _.defaults);
}

// Take a specific value out of the configuration given a
// period-delimited path and return that value.  If the path doesn't
// resolve to a nested object key, return undefined.
Config.prototype.get = function(key) {
	if (_.isUndefined(key)) {
		return this.values;
	}

	var nodes = key.split('.');
	var nodesLength = nodes.length;

	var loc = this.values;
	for (var i = 0;i < nodesLength;i++) {
		loc = loc[nodes[i]];
		if (_.isUndefined(loc)) {
			return undefined;
		}
	}

	return loc;
};

// A version of get that returns either boolean true or false.  Plus,
// this function tries to tries to pick up on falsy strings like "false"
// and "no" and return false in those instances.  Returns undefined if
// the key doesn't exist.
Config.prototype.getBool = function(key) {
	var value = this.get(key);
	if (_.isString(value)) {
		value = value.toLowerCase().substring(0, 1);
	}
	if (_.isUndefined(value)) {
		return undefined;
	} else if (value === "f" || value === "n" || value === "0" || value === "" ||
	           value === false || value === 0) {
		return false;
	} else {
		return true;
	}
};

// Set a specific value in the configuration, creating nested objects
// along the path if necessary.
Config.prototype.set = function(key, value) {
	var nodes = key.split('.');
	var nodesLength = nodes.length;

	var loc = this.values;
	for (var i = 0;i < nodesLength;i++) {
		if (i === nodesLength - 1) {
			loc[nodes[i]] = value;
		} else {
			if (!(nodes[i] in loc)) {
				loc[nodes[i]] = {};
			}
			loc = loc[nodes[i]];
		}
	}
};

module.exports = Config;

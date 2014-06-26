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
var winston = require('winston');

var config_defaults = {
	log: {
		file: undefined
	}
};

function Logger(config) {
	config = _.merge(config, config_defaults, _.defaults);

	this.logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)()
		]
	});

	this.log = this.logger.log;
	this.info = this.logger.info;
	this.error = this.logger.error;

	// Log to a file if supplied
	if (config.log.file) {
		this.logger.add(winston.transports.File, {
			filename: config.log.file,
			json: false,
			timestamp: true
		});
	}
}

module.exports = Logger;

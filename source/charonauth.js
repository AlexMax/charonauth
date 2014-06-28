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

var child_process = require('child_process');

module.exports = function(config) {
	var self = this;

	this.authmaster = child_process.fork(__dirname + '/authmaster');
	this.webmaster = child_process.fork(__dirname + '/webmaster');

	this.authmaster.on('exit', function(code, signal) {
		if (code === 2) {
			// Code 2 is returned when one of the workers that the master governs
			// fails to construct, usually due to a configuration error.
			self.webmaster.kill();
			process.exit(2);
		} else {
			process.stderr.write('Authentication master died, respawning...');
			self.authmaster = child_process.fork(__dirname + '/authmaster');
			self.authmaster.send({config: config});
		}
	});
	this.webmaster.on('exit', function(code, signal) {
		if (code === 2) {
			// Code 2 is returned when one of the workers that the master governs
			// fails to construct, usually due to a configuration error.
			self.authmaster.kill();
			process.exit(2);
		} else {
			process.stderr.write('Web master died, respawning...');
			self.webmaster = child_process.fork(__dirname + '/webmaster');
			self.webmaster.send({config: config});
		}
	});

	this.authmaster.send({config: config});
	this.webmaster.send({config: config});
};

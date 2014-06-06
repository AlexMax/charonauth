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

var cluster = require('cluster');
var config = require('config');
var winston = require('winston');

if (cluster.isMaster) {
	process.title = 'charonauth: web master';

	cluster.on('exit', function(worker, code, signal) {
		winston.error('Web worker ' + worker.process.pid + ' died, respawning...');
		cluster.fork();
	});

	var workers = config.webWorkers;
	winston.info('Forking ' + workers + ' web worker processes.');
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}
} else {
	process.title = 'charonauth: web worker';

	var WebApp = require('./webapp');

	var webapp = new WebApp(config, function(err) {
		if (err) {
			winston.error(err);
		} else {
			winston.info('Web worker ' + process.pid  + ' started.');
		}
	});
}

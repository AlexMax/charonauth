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

var Logger = require('./logger');

function master(msg) {
	if (!"config" in msg) {
		process.stderr.write("No configuration supplied for subprocess " + process.pid + ", aborting.");
		process.exit(255);
	}

	var config = msg.config;
	var log = new Logger(config);

	if (cluster.isMaster) {
		process.title = 'charonauth: web master';

		cluster.on('exit', function(worker, code, signal) {
			log.error('Web worker ' + worker.process.pid + ' died, respawning...');
			cluster.fork().send({config: config});
		});

		var workers = 1;
		if ("web" in config && "workers" in config.web) {
			workers = config.web.workers;
		}

		log.info('Forking ' + workers + ' web worker processes.');

		for (var i = 0;i < workers;i++) {
			cluster.fork().send({config: config});
		}
	} else {
		process.title = 'charonauth: web worker';

		var WebApp = require('./webapp');

		new WebApp(config, {logger: log}).then(function() {
			log.info('Web worker ' + process.pid + ' started.');
		}).catch(function(err) {
			log.error(err);
		});
	}
}

process.on('message', master);

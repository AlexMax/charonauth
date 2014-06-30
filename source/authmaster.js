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

var Config = require('./config');
var Logger = require('./logger');

function master(msg) {
	if (!("config" in msg)) {
		process.stderr.write("No configuration supplied for subprocess " + process.pid + ", aborting...\n");
		process.exit(1);
	}

	var config = new Config(msg.config);
	var log = new Logger(config.get('log'));

	if (cluster.isMaster && process.platform !== "win32") {
		// If this is the master, fork X children
		process.title = 'charonauth: auth master';

		cluster.on('exit', function(worker, code, signal) {
			if (code === 2) {
				// Code 2 is returned when the worker fails to construct, usually
				// due to a configuration error, which won't be fixed by simply
				// restarting it.
				log.error('Authentication worker ' + worker.process.pid + ' is shutting the entire server down.');
				process.exit(2);
			} else {
				log.warn('Authentication worker ' + worker.process.pid + ' died, respawning...');
				cluster.fork().send({config: config.get()});
			}
		});

		var workers = 1;
		if ("auth" in config && "workers" in config.auth) {
			workers = config.auth.workers;
		}

		log.info('Forking ' + workers + ' authentication worker processes.');

		for (var i = 0;i < workers;i++) {
			cluster.fork().send({config: config.get()});
		}
	} else {
		// If this is a worker, start an instance of the authapp
		process.title = 'charonauth: auth worker';

		// Windows platforms can't share dgram listeners using cluster.
		if (process.platform === "win32") {
			log.warn('Authentication forced to single process due to nodejs limitation.');
		}
		log.info('Authentication worker ' + process.pid + ' starting...');

		var AuthApp = require('./authapp');
		new AuthApp(config.get(), log).then(function() {
			log.info('Authentication worker ' + process.pid + ' started.');
		}).catch(function(err) {
			log.error(err.message);
			process.exit(2);
		});
	}
}

process.on('message', master);

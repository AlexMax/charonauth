/* jshint node: true */
"use strict";

var cluster = require('cluster');
var config = require('config');
var winston = require('winston');

if (cluster.isMaster) {
	process.title = 'charonauth: auth master';

	var workers = config.authWorkers;
	winston.info('Forking ' + workers + ' authentication worker processes.');
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}
} else {
	process.title = 'charonauth: auth worker';

	var UDPApp = require('./udpapp');

	var udpapp = new UDPApp({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions,
		dbImport: config.dbImport, /* FIXME: gross, handle database init stuff elsewhere */

		authPort: config.authPort
	}, function(err) {
		if (err) {
			winston.error(err);
		} else {
			winston.info('Authentication worker ' + process.pid + ' started.');
		}
	});
}

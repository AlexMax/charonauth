/* jshint node: true */
"use strict";

var cluster = require('cluster');
var config = require('config');
var winston = require('winston');

if (cluster.isMaster) {
	process.title = 'charonauth: web master';

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

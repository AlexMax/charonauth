/* jshint node: true */
"use strict";

var cluster = require('cluster');
var config = require('config');
var util = require('util');

if (cluster.isMaster) {
	var workers = config.webWorkers;
	util.log('Forking ' + workers + ' web worker processes.');
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}
} else {
	var WebApp = require('./webapp');

	var webapp = new WebApp({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions,
		webPort: config.webPort
	}, function(err) {
		if (err) {
			util.log(err);
		} else {
			util.log('Web worker started.');
		}
	});
}

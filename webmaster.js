/* jshint node: true */
"use strict";

var cluster = require('cluster');
var util = require('util');

if (cluster.isMaster) {
	var config = require('config');
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
} else {
	for (var i = 0;i < config.webWorkers;i++) {
		cluster.fork();
	}
}

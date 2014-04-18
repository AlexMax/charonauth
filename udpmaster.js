/* jshint node: true */
"use strict";

var cluster = require('cluster');
var util = require('util');

if (cluster.isMaster) {
	var config = require('config');
	var UDPApp = require('./udpapp');

	var udpapp = new UDPApp({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions,
		authPort: config.authPort
	}, function(err) {
		if (err) {
			util.log(err);
		} else {
			util.log('Authentication worker started.');
		}
	});
} else {
	for (var i = 0;i < config.authWorkers;i++) {
		cluster.fork();
	}
}

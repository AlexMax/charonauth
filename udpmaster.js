/* jshint node: true */
"use strict";

var cluster = require('cluster');
var config = require('config');
var util = require('util');

if (cluster.isMaster) {
	var workers = config.authWorkers;
	util.log('Forking ' + workers + ' authentication worker processes.');
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}
} else {
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
}

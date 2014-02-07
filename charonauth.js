/* jshint node: true */
"use strict";

var cluster = require('cluster');
var config = require('config');
var util = require('util');

// Worker count can be configured, defaults to the number of CPU cores.
var workers = config.workers || require('os').cpus().length;

if (!cluster.isMaster || workers <= 1) {
	if (workers <= 1) {
		util.log("Charon is starting in single-process mode.");
	} else {
		util.log("Worker process " + cluster.worker.id + " is starting.");
	}

	// Workers handle both the webapp and udp endpoint
	var WebApp = require('./webapp');
	var UDPApp = require('./udpapp');

	// Start the UDP endpoint
	var udpapp = new UDPApp({
		dbconn: config.dbconn,
		port: config.port
	}, function() {
		// TODO: Do something here...
	});
} else {
	util.log("Charon is starting.");

	util.log("Forking " + workers + " workers.");
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}
}

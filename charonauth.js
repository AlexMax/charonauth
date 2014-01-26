var cluster = require('cluster');
var config = require('config');
var util = require('util');

if (cluster.isMaster) {
	util.log("Charon is starting.");

	// Worker count can be configured, defaults to the number of CPU cores.
	var workers = config.workers || require('os').cpus().length;
	for (var i = 0;i < workers;i++) {
		cluster.fork();
	}

	util.log("Forked " + workers + " workers.");
} else {
	var dbfilename = config.dbfilename || 'charonauth.db';

	// Workers handle both the webapp and udp endpoint
	var WebApp = require('./webapp');
	var UDPApp = require('./udpapp');

	// Start the UDP endpoint
	var udpapp = new UDPApp({
		dbfilename: dbfilename,
		port: config.port || 16666
	});
}

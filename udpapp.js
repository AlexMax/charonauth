/* jshint node: true */
"use strict";

var async = require('async');
var crypto = require('crypto');
var dgram = require('dgram');
var srp = require('srp');
var util = require('util');

require('date-utils');

var DBConn = require('./dbconn');
var proto = require('./proto');

// UDPApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.

// Constructor
var UDPApp = function(config, callback) {
	if (typeof callback !== 'function') {
		callback = function() { };
	}

	if (!(this instanceof UDPApp)) {
		callback(new Error("Constructor called as function"));
		return;
	}
	if (!("dbConnection" in config)) {
		callback(new Error("Missing dbConnection in UDPApp configuration."));
		return;
	}
	if (!("dbOptions" in config)) {
		callback(new Error("Missing dbOptions in UDPApp configuration."));
		return;
	}
	if (!("port" in config)) {
		callback(new Error("Missing port in UDPApp configuration."));
		return;
	}

	// Create database connection
	var self = this;
	this.dbconn = new DBConn({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions
	}, function() {
		// Create socket server only if database connection is OK
		self.socket = dgram.createSocket('udp4');
		self.socket.on('message', self.router.bind(self));
		self.socket.bind(config.port);

		callback(null, self);
	});
};

// Object methods
UDPApp.prototype = {
	router: function(msg, rinfo) {
		if (msg.length < 4) {
			util.log("Message from " + rinfo.address + " is too small, discarding.");
			return;
		}

		var packetType = msg.readUInt32LE(0);
		if (packetType in UDPApp.prototype.routes) {
			UDPApp.prototype.routes[packetType].call(this, msg, rinfo);
		} else {
			util.log("Message from " + rinfo.address + " has an invalid packet type, discarding.");
		}
	},

	// Routes
	serverNegotiate: function(msg, rinfo) {
		var self = this;

		// Unmarshall the server negotiation packet
		var packet = proto.serverNegotiate.unmarshall(msg);
		var username = packet.username;

		// Create a new session for given user.
		this.dbconn.newSession(username, function(err, data) {
			if (err) {
				if (err) {
					var error = proto.userError.marshall({
						username: username,
						error: proto.USER_NO_EXIST
					});

					self.socket.send(error, 0, error.length, rinfo.port, rinfo.address);
					return;
				}

				throw err;
			}

			// Write the response packet
			var response = proto.authNegotiate.marshall({
				session: data.session,
				salt: data.salt,
				username: data.username
			});

			// Send the response packet to the sender
			self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
		});
	},
	serverEphemeral: function(msg, rinfo) {
		var self = this;

		// Unmarshall the server negotiation packet
		var packet = proto.serverEphemeral.unmarshall(msg);

		async.waterfall([
			function(next) {
				// Is the session we were passed an active and valid session?
				self.dbconn.findSession(packet.session, self.sessionTimeout, next);
			},
			function(session, next) {
				// Generate a secret key for use in the ephemeral value.
				srp.genKey(32, function(err, secret) {
					next(err, session, secret);
				});
			},
			function(session, secret, next) {
				// Try to generate the server's ephemeral value.
				var srpServer = new srp.Server(
					srp.params['2048'],
					session.verifier,
					secret
				);
				try {
					srpServer.setA(packet.ephemeral);
				} catch(e) {
					next(e);
				}
				var serverEphemeral = srpServer.computeB();
				self.dbconn.setEphemeral(packet.session, packet.ephemeral, function(err) {
					next(err, serverEphemeral);
				});
			},
			function(serverEphemeral, next) {
				// Write the response packet
				var response = proto.authEphemeral.marshall({
					session: packet.session,
					ephemeral: serverEphemeral
				});

				// Send the response packet to the sender
				self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
			}
		], function(error) {
			if (error) {
				// Error handling here
			}
		});
	},
	srpM: function(msg, rinfo) {
		util.log("SRP_M not implemented.");
	},
	routes: {}
};

// Attach functions to routes
UDPApp.prototype.routes[proto.SERVER_NEGOTIATE] = UDPApp.prototype.serverNegotiate;
UDPApp.prototype.routes[proto.SERVER_EPHEMERAL] = UDPApp.prototype.serverEphemeral;
UDPApp.prototype.routes[proto.SRP_M] = UDPApp.prototype.srpM;

module.exports = UDPApp;

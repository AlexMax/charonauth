/* jshint node: true */
"use strict";

var crypto = require('crypto');
var dgram = require('dgram');
var srp = require('srp');
var util = require('util');

var DBConn = require('./dbconn');
var proto = require('./proto');

// UDPApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.

// Constructor
var UDPApp = function(config, callback) {
	if (!(this instanceof UDPApp)) {
		callback.call(self, new Error("Constructor called as function"));
		return;
	}
	if (!("dbConnection" in config)) {
		callback.call(self, new Error("Missing dbConnection in UDPApp configuration."));
		return;
	}
	if (!("dbOptions" in config)) {
		callback.call(self, new Error("Missing dbOptions in UDPApp configuration."));
		return;
	}
	if (!("port" in config)) {
		callback.call(self, new Error("Missing port in UDPApp configuration."));
		return;
	}
	if (typeof callback !== 'function') {
		throw new Error("Missing callback function");
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

		callback.call(self);
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
		var packet = proto.clientNegotiate.unmarshall(msg);
		var username = packet.username;

		// Find the user contained therein
		this.dbconn.findUser(username, function(err, user) {
			if (err) {
				throw err;
				return;
			}

			// Create a new session
			self.dbconn.newSession(username, function(err, session) {
				// Write the response packet
				var response = proto.authServerNegotiate.marshall({
					session: session.session,
					salt: user.salt,
					username: user.username
				});

				// Send the response packet to the sender
				self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
			});
		});
	},
	srpA: function(msg, rinfo) {
		util.log("SRP_A not implemented.");
	},
	srpM: function(msg, rinfo) {
		util.log("SRP_M not implemented.");
	},
	routes: {}
};

// Attach functions to routes
UDPApp.prototype.routes[proto.SERVER_NEGOTIATE] = UDPApp.prototype.serverNegotiate;
UDPApp.prototype.routes[proto.SRP_A] = UDPApp.prototype.srpA;
UDPApp.prototype.routes[proto.SRP_M] = UDPApp.prototype.srpM;

module.exports = UDPApp;

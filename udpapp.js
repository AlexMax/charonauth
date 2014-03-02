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
		var packet = proto.serverNegotiate.unmarshall(msg);
		var username = packet.username;

		// Create a new session for given user.
		this.dbconn.newSession(username, function(err, sess) {
			// Write the response packet
			var response = proto.authNegotiate.marshall({
				session: sess.session.session,
				salt: sess.user.salt,
				username: sess.user.username
			});

			// Send the response packet to the sender
			self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
		});
	},
	serverEphemeral: function(msg, rinfo) {
		var self = this;

		// Unmarshall the server negotiation packet
		var packet = proto.serverEphemeral.unmarshall(msg);

		// Valid session?
		this.dbconn.findSession(packet.session, function(err, session) {
			if (err) {
				throw err;
				return;
			}

			var timeout = session.createdAt.clone().addMinutes(1);
			var diff = timeout.getSecondsBetween(new Date());

			if (diff > self.sessionTimeout) {
				throw new Error('Session has expired');
				return;
			}

			async.parallel({
				// Fetch the associated user with the session.
				user: function(callback) {
					session.getUser()
					.error(function(err) {
						callback(err);
					})
					.success(function(user) {
						callback(null, user);
					});
				},
				// Generate a secret to be used in the creation of the ephemeral value
				secret: function(callback) {
					srp.genKey(32, function(err, key) {
						if (err) {
							callback(err);
						} else {
							callback(null, key);
						}
					});
				}
			}, function(err, results) {
				if (err) {
					throw err;
					return;
				}

				// Do the first half of the serverside SRP dance.
				var srpServer = new srp.Server(srp.params['2048'], results.user.verifier, results.secret);
				try {
					srpServer.setA(packet.ephemeral);
				} catch (e) {
					// Auth server doesn't like "client" ephemeral A.
					throw err;
					return;
				}

				// Generate the "server" ephemeral (B).
				var ephemeral = srpServer.computeB();

				// Now that the ephemeral values have been generated successfully,
				// save the ephemeral value to the database.
				self.dbconn.setEphemeral(packet.session, packet.ephemeral, function(err) {
					if (err) {
						throw err;
						return;
					}

					// Write the response packet
					var response = proto.authEphemeral.marshall({
						session: packet.session,
						ephemeral: ephemeral
					});

					// Send the response packet to the sender
					self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
				});
			});
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

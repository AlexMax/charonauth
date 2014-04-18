/* jshint node: true */
"use strict";

var async = require('async');
var crypto = require('crypto');
var dgram = require('dgram');
var events = require('events');
var fs = require('fs');
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
	// UDPApp is an EventEmitter
	events.EventEmitter.call(this);

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
	if (!("authPort" in config)) {
		callback(new Error("Missing authPort in UDPApp configuration."));
		return;
	}

	// Create database connection
	var self = this;
	this.dbconn = new DBConn({
		dbConnection: config.dbConnection,
		dbOptions: config.dbOptions
	}, function(err, dbconn) {
		if (err) {
			callback(err);
			return;
		}

		// If we have an array of SQL files to import, import them.
		if ("dbImport" in config) {
			if (!util.isArray(config.dbImport)) {
				callback(new Error("dbImport is not an Array."));
				return;
			}

			// Load each of the provided SQL files
			async.map(
				config.dbImport,
				function(filename, call) {
					fs.readFile(filename, { encoding: 'utf8' }, function(err, data) {
						// Split multiple SQL statements into separate strings.
						// [AM] This is nowhere near foolproof, but its good enough for
						//      loading my SQL dumps for unit tests.
						var statements = data.split(';\n');
						
						// Remove empty strings from list
						for (var i = statements.length - 1;i >= 0;i--) {
							if (statements[i].length === 0) {
								statements.splice(i, 1);
							}
						}

						call(err, statements);
					});
				}, function(err, statements) {
					if (err) {
						callback(err);
						return;
					}

					// Run each statement in sequence.
					var statements = [].concat.apply([], statements);
					async.mapSeries(
						statements,
						function(statement, call) {
							dbconn.db.query(statement)
							.done(function(err, result) {
								call(err, result);
							})
						}, function(err, results) {
							listen();
						}
					);
				}
			);
		} else {
			listen();
		}

		// Start listening for UDP packets
		function listen() {
			self.socket = dgram.createSocket('udp4');
			self.socket.on('message', self.router.bind(self));
			self.socket.bind(config.authPort, function() {
				// We're finally done constructing at this point.
				callback(null, self);
			});
		}
	});
};

// Object methods
UDPApp.prototype = {
	router: function(msg, rinfo) {
		if (msg.length < 4) {
			this.emit('error', new Error('Message is too small'));
			return;
		}

		var packetType = msg.readUInt32LE(0);
		if (packetType in UDPApp.prototype.routes) {
			UDPApp.prototype.routes[packetType].call(this, msg, rinfo);
		} else {
			this.emit('error', new Error('Message has invalid packet type'));
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
				// FIXME: Specifically check for a "User does not exist" error.
				if (err) {
					var error = proto.userError.marshall({
						username: username,
						error: proto.USER_NO_EXIST
					});

					self.socket.send(error, 0, error.length, rinfo.port, rinfo.address);
					return;
				}

				self.emit('error', err);
				return;
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
					session.salt,
					new Buffer(session.username, 'ascii'),
					session.verifier,
					secret
				);
				try {
					srpServer.setA(packet.ephemeral);
				} catch(e) {
					next(e);
				}
				var serverEphemeral = srpServer.computeB();
				self.dbconn.setEphemeral(packet.session, packet.ephemeral, secret, function(err) {
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
		], function(err) {
			if (err) {
				self.emit('error', err);
			}
		});
	},
	serverProof: function(msg, rinfo) {
		var self = this;

		// Unmarshall the server negotiation packet
		var packet = proto.serverProof.unmarshall(msg);

		async.waterfall([
			function(next) {
				// Is the session we were passed an active and valid session?
				self.dbconn.findSession(packet.session, self.sessionTimeout, next);
			},
			function(session, next) {
				// Recreate the necessary SRP state to check the client's proof.
				var srpServer = new srp.Server(
					srp.params['2048'],
					session.salt,
					new Buffer(session.username, 'ascii'),
					session.verifier,
					session.secret
				);

				var proof = undefined;

				// Reset A so we can check the message.
				srpServer.setA(session.ephemeral);

				try {
					// Check the client's proof.  This will throw if it fails.
					proof = srpServer.checkM1(packet.proof);
				} catch(e) {
					// Authentication failed.
					var error = proto.sessionError.marshall({
						session: packet.session,
						error: proto.SESSION_AUTH_FAILED
					});

					self.socket.send(error, 0, error.length, rinfo.port, rinfo.address);
					return;
				}

				// Write the response packet
				var response = proto.authProof.marshall({
					session: packet.session,
					proof: proof
				});

				// Send the response packet to the sender
				self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
			}
		], function(err) {
			if (err) {
				throw err;
			}
		});
	},
	routes: {}
};

// Attach functions to routes
UDPApp.prototype.routes[proto.SERVER_NEGOTIATE] = UDPApp.prototype.serverNegotiate;
UDPApp.prototype.routes[proto.SERVER_EPHEMERAL] = UDPApp.prototype.serverEphemeral;
UDPApp.prototype.routes[proto.SERVER_PROOF] = UDPApp.prototype.serverProof;

// UDPApp is an EventEmitter
UDPApp.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = UDPApp;

/*
 *  Charon: A game authentication server
 *  Copyright (C) 2014  Alex Mayfield
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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

// AuthApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.
function AuthApp(config, callback) {
	var self = this;

	// AuthApp is an EventEmitter
	events.EventEmitter.call(this);

	if (typeof callback !== 'function') {
		callback = function() { };
	}

	if (!(this instanceof AuthApp)) {
		callback(new Error("Constructor called as function"));
		return;
	}
	if (!("authPort" in config)) {
		callback(new Error("Missing authPort in AuthApp configuration."));
		return;
	}

	// Create database connection
	new DBConn(config).then(function(dbconn) {
		self.dbconn = dbconn;

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
					statements = [].concat.apply([], statements);
					async.mapSeries(
						statements,
						function(statement, call) {
							dbconn.db.query(statement)
							.done(function(err, result) {
								call(err, result);
							});
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
}
util.inherits(AuthApp, events.EventEmitter);

// Router.
//
// Routes incoming requests to the proper function.
AuthApp.prototype.router = function(msg, rinfo) {
	if (msg.length < 4) {
		this.emit('error', new Error('Message is too small'));
		return;
	}

	var packetType = msg.readUInt32LE(0);

	switch (packetType) {
		case proto.SERVER_NEGOTIATE:
		this.serverNegotiate(msg, rinfo);
		break;
		case proto.SERVER_EPHEMERAL:
		this.serverEphemeral(msg, rinfo);
		break;
		case proto.SERVER_PROOF:
		this.serverProof(msg, rinfo);
		break;
		default:
		this.emit('error', new Error('Message has invalid packet type'));
		break;
	}
};

// Server Negotiate Route
//
// This is the initial route that creates an authentication session.
AuthApp.prototype.serverNegotiate = function(msg, rinfo) {
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
};

// Server Ephemeral Route
//
// With the client ephemeral A value, generate an ephemeral number B to be sent
// back to the client.
AuthApp.prototype.serverEphemeral = function(msg, rinfo) {
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
};

// Server Proof Route
//
// Using the client M1, attempts to verify that the client is legitimate, and
// if so send the client an M2 that the client can use to verify that the auth
// server is who he says he is.
AuthApp.prototype.serverProof = function(msg, rinfo) {
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

			var proof;
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
};

module.exports = AuthApp;

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
var Promise = require('bluebird');
var dgram = require('dgram');
var fs = require('fs');
var srp = Promise.promisifyAll(require('srp'));
var util = require('util');
var winston = require('winston');

require('date-utils');

var DBConn = require('./dbconn');
var error = require('./error');
var proto = require('./proto');

// AuthApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.
function AuthApp(config, callback) {
	var self = this;

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
			self.socket.on('message', self.message.bind(self));
			self.socket.bind(config.authPort, function() {
				// We're finally done constructing at this point.
				callback(null, self);
			});
		}
	});
}

// Message handler.
//
// Passes messages onto the router, and correctly handles errors at the
// top level.  This is done in order to make the router testable, yet
// properly log/ignore errors that trickle down this far.
AuthApp.prototype.message = function(msg, rinfo) {
	this.router(msg, rinfo)
	.catch(error.IgnorableProtocol, function(err) {
		// Ignorable protocol errors should only be logged if we actually
		// want them to be logged.
		winston.debug(err.stack);
	});
}


// Router.
//
// Routes incoming requests to the proper function.
AuthApp.prototype.router = function(msg, rinfo) {
	var self = this;

	return new Promise(function(resolve, reject) {
		if (msg.length < 4) {
			reject(new error.IgnorableProtocol("Message is too small"));
		}

		var packetType = msg.readUInt32LE(0);

		switch (packetType) {
			case proto.SERVER_NEGOTIATE:
			resolve(self.serverNegotiate(msg, rinfo));
			break;
			case proto.SERVER_EPHEMERAL:
			resolve(self.serverEphemeral(msg, rinfo));
			break;
			case proto.SERVER_PROOF:
			resolve(self.serverProof(msg, rinfo));
			break;
			default:
			reject(new error.IgnorableProtocol("Message has invalid packet type"));
			break;
		}
	});
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
	this.dbconn.newSession(username)
	.then(function(session) {
		return [session, session.getUser()];
	}).spread(function(session, user) {
		// Write the response packet
		var response = proto.authNegotiate.marshall({
			session: session.session,
			salt: user.salt,
			username: user.username
		});

		// Send the response packet to the sender
		self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
	}).catch(error.UserNotFound, function(err) {
		// User was not found
		var error = proto.userError.marshall({
			username: username,
			error: proto.USER_NO_EXIST
		});

		self.socket.send(error, 0, error.length, rinfo.port, rinfo.address);
	}).catch(function(e) {
		// Unknown exception.
		// TODO: Log it here.
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

	// Is the session we were passed an active and valid session?
	this.dbconn.findSession(packet.session, this.sessionTimeout)
	.then(function(session) {
		return [session, session.getUser()];
	}).spread(function(session, user) {
		return [session, user, srp.genKeyAsync(32)];
	}).spread(function(session, user, secret) {
		// Try to generate the server's ephemeral value.
		var srpServer = new srp.Server(
			srp.params['2048'],
			user.salt,
			new Buffer(user.username, 'ascii'),
			user.verifier,
			secret
		);
		srpServer.setA(packet.ephemeral);
		var serverEphemeral = srpServer.computeB();
		return self.dbconn.setEphemeral(packet.session, packet.ephemeral, secret);
	}).then(function(session) {
		// Write the response packet
		var response = proto.authEphemeral.marshall({
			session: packet.session,
			ephemeral: session.ephemeral
		});

		// Send the response packet to the sender
		self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
	}).catch(function(err) {
		// Unknown exception.
		// TODO: Log it here.
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

	// Is the session we were passed an active and valid session?
	this.dbconn.findSession(packet.session, this.sessionTimeout)
	.then(function(session) {
		return [session, session.getUser()];
	}).spread(function(session, user) {
		// Recreate the necessary SRP state to check the client's proof.
		var srpServer = new srp.Server(
			srp.params['2048'],
			user.salt,
			new Buffer(user.username, 'ascii'),
			user.verifier,
			session.secret
		);

		// Reset A so we can check the message.
		srpServer.setA(session.ephemeral);

		var proof;
		try {
			// Check the client's proof.  This will throw if it fails.
			proof = srpServer.checkM1(packet.proof);
		} catch(e) {
			// Authentication failed.
			throw new error.SessionAuthFailed("Authentication failed");
		}

		// Write the response packet
		var response = proto.authProof.marshall({
			session: packet.session,
			proof: proof
		});

		// Send the response packet to the sender
		self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
	}).catch(error.SessionAuthFailed, function(err) {
		// Authentication failed
		var errorPacket = proto.sessionError.marshall({
			session: packet.session,
			error: proto.SESSION_AUTH_FAILED
		});

		self.socket.send(errorPacket, 0, errorPacket.length, rinfo.port, rinfo.address);
	}).catch(function(err) {
		// Unknown exception.
		// TODO: Log it here.
	});
};

module.exports = AuthApp;

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

var Promise = require('bluebird');

var dgram = Promise.promisifyAll(require('dgram'));
var srp = Promise.promisifyAll(require('srp'));
var winston = require('winston');

require('date-utils');

var DBConn = require('./dbconn');
var error = require('./error');
var proto = require('./proto');

// AuthApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.
function AuthApp(config) {
	var self = this;

	return new Promise(function(resolve, reject) {
		if (!("auth" in config)) {
			reject(new Error("Missing auth configuration"));
			return;
		}

		if (!("port" in config.auth)) {
			reject(new Error("Missing port in auth configuration."));
			return;
		}

		// Create database connection.
		resolve(new DBConn(config));
	}).then(function(dbconn) {
		self.dbconn = dbconn;

		// Start listening for UDP packets
		self.socket = dgram.createSocket('udp4');
		self.socket.on('message', self.message.bind(self));
		return self.socket.bindAsync(config.authPort);
	}).then(function() {
		return self;
	});
}

// Message handler.
//
// Passes messages onto the router, and correctly handles errors at the
// top level.  This is done in order to make the router testable, yet
// properly log/ignore errors that trickle down this far.
AuthApp.prototype.message = function(msg, rinfo) {
	var self = this;

	this.router(msg, rinfo).then(function(response) {
		// If our handler has a valid response, send it back
		self.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
	}).catch(error.UserNotFound, function(err) {
		// User was not found
		var error = proto.userError.marshall({
			username: username,
			error: proto.USER_NO_EXIST
		});

		self.socket.send(error, 0, error.length, rinfo.port, rinfo.address);
	}).catch(error.IgnorableProtocol, function(err) {
		// Protocol error that can be ignored unless we're debugging
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
	return this.dbconn.newSession(username)
	.then(function(session) {
		return Promise.all([session, session.getUser()]);
	}).spread(function(session, user) {
		// Write the response packet
		return proto.authNegotiate.marshall({
			session: session.session,
			salt: user.salt,
			username: user.username
		});
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
	return this.dbconn.findSession(packet.session, this.sessionTimeout)
	.then(function(session) {
		// Find the user associated with this session
		return Promise.all([session, session.getUser()]);
	}).spread(function(session, user) {
		// Generate a session key 
		return Promise.all([session, user, srp.genKeyAsync(32)]);
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
		return proto.authEphemeral.marshall({
			session: packet.session,
			ephemeral: session.ephemeral
		});
	})
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

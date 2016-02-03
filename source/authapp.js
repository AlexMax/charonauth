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
var _ = require('lodash');

var dgram = Promise.promisifyAll(require('dgram'));
var ipaddr = require('ipaddr.js');

var Config = require('./config');
var DBConn = require('./dbconn');
var error = require('./error');
var mock = require('./mock');
var proto = require('./proto');
var srp = Promise.promisifyAll(require('../srp'));

// Handles user authentication over a UDP socket.  Used by the game itself.
function AuthApp(config, logger) {
	var self = this;

	return new Promise(function(resolve, reject) {
		// Attach a logger if we have one.
		if (logger) {
			self.log = logger;
		} else {
			self.log = mock.logger;
		}

		self.config = new Config(config, {
			auth: {
				port: 16666
			}
		});

		if (!self.config.get('auth.port')) {
			reject(new Error("Missing port in auth configuration."));
			return;
		}

		// Create database connection.
		resolve(new DBConn(self.config.get('database')));
	}).then(function(dbconn) {
		self.dbconn = dbconn;

		// Start listening for UDP packets
		self.socket = dgram.createSocket('udp4');
		self.socket.on('message', self.message.bind(self));
		return self.socket.bindAsync(self.config.get('auth.port'));
	}).then(function() {
		return self;
	}).disposer(function() {
		self.socket.close();
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
	}).catch(error.IgnorableProtocol, function(err) {
		// Protocol error that can be ignored unless we're debugging
		self.log.verbose(err.message, {
			rinfo: rinfo
		});
	}).done();
};

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
	var packet, username, clientSession, version;

	return new Promise(function(resolve, reject) {
		// Unmarshall the server negotiation packet
		packet = proto.serverNegotiate.unmarshall(msg);

		clientSession = packet.clientSession;
		username = packet.username;
		version = packet.version;

		self.log.verbose("serverNegotiate", {
			clientSession: clientSession,
			username: username,
			version: version
		});

		// Create a new session for given user.
		resolve(self.dbconn.newSession(username));
	}).then(function(session) {
		return Promise.all([session, session.getUser()]);
	}).spread(function(session, user) {
		// Write the response packet
		var res = {
			clientSession: clientSession,
			session: session.session,
			salt: user.salt,
			username: user.username
		};

		self.log.verbose("authNegotiate", {
			clientSession: res.clientSession,
			session: res.session,
			salt: res.salt.toString('hex'),
			username: res.username
		});

		return proto.authNegotiate.marshall(res);
	}).catch(error.UserNotFound, function() {
		// Depending on if we're dealing with v1 or v2 of the protocol, send
		// back an error message with a username or client session ID in it.
		var res = null;
		switch (version) {
		case 2:
			// Error message with client session ID.
			return proto.clientSessionError.marshall({
				error: proto.USER_NO_EXIST,
				clientSession: clientSession
			});
		case 1:
			// Error message with username.
			// [AM] Remove support for this when Zandronum 1.3.1/1.4/2.0 comes out.
			return proto.userError.marshall({
				error: proto.USER_NO_EXIST,
				username: username
			});
		default:
			// Do not respond at all.
			throw new error.IgnorableProtocol('Attempting to error with unknown protoocl version');
		}
	});
};

// Server Ephemeral Route
//
// With the client ephemeral A value, generate an ephemeral number B to be sent
// back to the client.
AuthApp.prototype.serverEphemeral = function(msg, rinfo) {
	var self = this;
	var packet, session;

	return new Promise(function(resolve, reject) {
		packet = proto.serverEphemeral.unmarshall(msg);

		session = packet.session;

		self.log.verbose("serverEphemeral", {
			session: session,
			ephemeral: packet.ephemeral.toString('hex')
		});

		// Is the session we were passed an active and valid session?
		resolve(self.dbconn.findSession(packet.session, self.sessionTimeout));
	}).then(function(session) {
		// Find the user associated with this session and generate a session
		// key to be used later.
		return Promise.all([session, session.getUser(), srp.genKeyAsync(32)]);
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

		return Promise.all([
			srpServer.computeB(),
			self.dbconn.setEphemeral(packet.session, packet.ephemeral, secret)
		]);
	}).spread(function(serverEphemeral, session) {
		// Write the response packet
		var res = {
			session: packet.session,
			ephemeral: serverEphemeral
		};

		self.log.verbose("authEphemeral", {
			session: res.session,
			ephemeral: res.ephemeral.toString('hex')
		});

		return proto.authEphemeral.marshall(res);
	}).catch(error.SessionNotFound, function() {
		return proto.sessionError.marshall({
			error: proto.SESSION_NO_EXIST,
			session: session
		});
	});
};

// Server Proof Route
//
// Using the client M1, attempts to verify that the client is legitimate, and
// if so send the client an M2 that the client can use to verify that the auth
// server is who he says he is.
AuthApp.prototype.serverProof = function(msg, rinfo) {
	var self = this;
	var packet, session;

	return new Promise(function(resolve, reject) {
		packet = proto.serverProof.unmarshall(msg);

		session = packet.session;

		self.log.verbose("serverProof", {
			session: session,
			proof: packet.proof.toString('hex')
		});

		// Is the session we were passed an active and valid session?
		resolve(self.dbconn.findSession(packet.session, self.sessionTimeout));
	}).then(function(session) {
		return Promise.all([session, session.getUser()]);
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
			// Log failed authentications to the logfile.
			self.log.info("Failed Authentication", {
				ip: rinfo.address,
				username: user.username
			});

			// Authentication failed.
			throw new error.SessionAuthFailed("Authentication failed", packet.session);
		}

		// Log successful authentications to the logfile.
		self.log.info("Successful Authentication", {
			ip: rinfo.address,
			username: user.username
		});

		// Log an authenticate action as an action.
		return Promise.all([proof, self.dbconn.Action.create({
			UserId: user.id,
			WhomId: user.id,
			type: 'auth',
			ip: new Buffer(ipaddr.parse(rinfo.address).toByteArray())
		})]);
	}).spread(function(proof) {
		// Write the response packet
		var res = {
			session: packet.session,
			proof: proof
		};

		self.log.verbose("authProof", {
			session: res.session,
			proof: res.proof.toString('hex')
		});

		return proto.authProof.marshall(res);
	}).catch(error.SessionNotFound, function() {
		return proto.sessionError.marshall({
			error: proto.SESSION_NO_EXIST,
			session: session
		});
	}).catch(error.SessionAuthFailed, function() {
		return proto.sessionError.marshall({
			error: proto.SESSION_AUTH_FAILED,
			session: session
		});
	});
};

module.exports = AuthApp;

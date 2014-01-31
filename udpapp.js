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
var UDPApp = function(config) {
	"use strict";

	if (!("dbfilename" in config)) {
		throw new Error("Missing dbfilename in UDPApp configuration.");
	}
	if (!("port" in config)) {
		throw new Error("Missing port in UDPApp configuration.");
	}

	// Create database connection
	this.dbconn = new DBConn({
		filename: config.dbfilename
	});

	// Create socket server
	this.socket = dgram.createSocket('udp4');
	this.socket.on('message', this.router.bind(this));
	this.socket.bind(config.port);
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
		// Unmarshall the server negotiation packet
		var packet = proto.clientNegotiate.unmarshall(msg);
		var username = packet.username;

		// Create a new session ID
		var sessionBuffer = crypto.randomBytes(4);
		var session = sessionBuffer.readUInt32LE(0);

		// TODO: Save the session in the database

		// Write the response packet
		var response = new Buffer(10 + username.length);
		response.writeUInt32LE(proto.AUTH_NEGOTIATE, 0);
		response.writeUInt8(1, 4);
		sessionBuffer.copy(response, 5, 0, 4);
		response.write(username, 9, username.length, 'ascii');
		response.writeUInt8(0, response.length - 1);

		// Send the response packet to the sender
		this.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
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

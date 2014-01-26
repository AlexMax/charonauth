var dgram = require('dgram');
var srp = require('srp');
var util = require('util');

var DBConn = require('./dbconn');

// Protocol Constants
const SERVER_NEGOTIATE = 0xD003CA01;
const AUTH_NEGOTIATE = 0xD003CA10;
const SRP_A = 0xD003CA02;
const SRP_S_AND_B = 0xD003CA20;
const SRP_M = 0xD003CA03;
const SRP_HAMK = 0xD003CA30;

const ERROR_USER = 0xD003CAFF;
const ERROR_SESSION = 0xD003CAEE;

const USER_TRY_LATER = 0;
const USER_NO_EXIST = 1;
const USER_OUTDATED_PROTOCOL = 2;
const USER_WILL_NOT_AUTH = 3;

const SESSION_TRY_LATER = 0;
const SESSION_NO_EXIST = 1;
const SESSION_VERIFIER_UNSAFE = 2;
const SESSION_AUTH_FAILED = 3;

// UDPApp
//
// This object encompasses all functionality dealing with the UDP endpoint of
// charon.  More specifically, the socket server lives here.

// Constructor
var UDPApp = function(config) {
	"use strict";

	if (!("dbfilename" in config)) {
		throw Error("Missing dbfilename in UDPApp configuration.");
	}
	if (!("port" in config)) {
		throw Error("Missing port in UDPApp configuration.");
	}

	// Create database connection
	this.dbconn = new DBConn({
		filename: config.dbfilename
	});

	// Create socket server
	this.socket = dgram.createSocket('udp4');
	this.socket.on('message', this.router);
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
		if (packetType in router) {
			router[packetType](msg, rinfo);
		} else {
			util.log("Message from " + rinfo.address + " has an invalid packet type, discarding.");
		}
	},
	routes: {
		SERVER_NEGOTIATE: function() {
			util.log("SERVER_NEGOTIATE not implemented.");
		},
		SRP_A: function() {
			util.log("SRP_A not implemented.");
		},
		SRP_M: function() {
			util.log("SRP_M not implemented.");
		}
	}
};

module.exports = UDPApp;

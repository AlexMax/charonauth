/* jshint node: true */
"use strict";

var buffer = require("buffer");
var buffertools = require("buffertools");
var util = require("util");

// Protocol Constants
var SERVER_NEGOTIATE = 0xD003CA01;
var AUTH_NEGOTIATE = 0xD003CA10;
var SERVER_EPHEMERAL = 0xD003CA02;
var AUTH_EPHEMERAL = 0xD003CA20;
var ERROR_USER = 0xD003CAFF;

// Error constants
var USER_NO_EXIST = 1;

function readString(buf, offset, encoding) {
	if (offset === undefined) {
		offset = 0;
	}

	if (encoding === undefined) {
		encoding = 'utf8';
	}

	var z = buffertools.indexOf(buf, "\0", offset);
	if (z === -1) {
		throw new TypeError("Null-terminator not found in buffer");
	}

	return buf.toString(encoding, offset, z);
}

function writeString(buf, str, offset, encoding) {
	if (offset === undefined) {
		offset = 0;
	}

	if (encoding === undefined) {
		encoding = 'utf8';
	}

	var string = new Buffer(str, encoding);
	string.copy(buf, offset);
	buf.writeUInt8(0, offset + string.length);
}

// Server Negotiation
var serverNegotiate = {
	marshall: function(data) {
		var buf = new Buffer(5 + Buffer.byteLength(data.username, 'ascii') + 1);

		buf.writeUInt32LE(SERVER_NEGOTIATE, 0);
		buf.writeUInt8(1, 4);
		writeString(buf, data.username, 5, 'ascii');

		return buf;
	},
	unmarshall: function(buf) {
		if (buf.readUInt32LE(0) !== SERVER_NEGOTIATE) {
			throw new TypeError("Buffer is not a SERVER_NEGOTIATE packet");
			return false;
		}
		if (buf.readUInt8(4) !== 1) {
			throw new TypeError("Buffer is incorrect version of protocol");
			return false;
		}

		// Username
		var data = {
			username: readString(buf, 5, 'ascii')
		};

		return data;
	}
};

// Auth server negotiation
// UInt32, UInt8, UInt32, UInt8, Buffer, String
var authNegotiate = {
	marshall: function(data) {
		var buf = new Buffer(10 + data.salt.length + Buffer.byteLength(data.username, 'ascii') + 1);

		buf.writeUInt32LE(AUTH_NEGOTIATE, 0);
		buf.writeUInt8(1, 4);
		buf.writeUInt32LE(data.session, 5);
		buf.writeUInt8(data.salt.length, 9);
		data.salt.copy(buf, 10);
		writeString(buf, data.username, 10 + data.salt.length, 'ascii');

		return buf;
	},
	unmarshall: function(buf) {
		if (buf.readUInt32LE(0) !== AUTH_NEGOTIATE) {
			throw new TypeError("Buffer is not a AUTH_NEGOTIATE packet");
			return false;
		}
		if (buf.readUInt8(4) !== 1) {
			throw new TypeError("Buffer is incorrect version of protocol");
			return false;
		}

		// Salt
		var salt_len = buf.readUInt8(9);
		var salt = new Buffer(salt_len);
		buf.copy(salt, 0, 10, 10 + salt_len);

		var data = {
			session: buf.readUInt32LE(5),
			salt: salt,
			username: readString(buf, 10 + salt_len, 'ascii')
		};

		return data;
	}
};

// Server ephemeral
// UInt32, Int32, Buffer
var serverEphemeral = {
	marshall: function(data) {
		var buf = new Buffer(12 + data.ephemeral.length);

		buf.writeUInt32LE(SERVER_EPHEMERAL, 0);
		buf.writeUInt32LE(data.session, 4);
		buf.writeInt32LE(data.ephemeral.length, 8);
		data.ephemeral.copy(buf, 12);

		return buf;
	},
	unmarshall: function(buf) {
		if (buf.readUInt32LE(0) !== SERVER_EPHEMERAL) {
			throw new TypeError("Buffer is not a SERVER_EPHEMERAL packet");
			return false;
		}

		var ephemeralLength = buf.readInt32LE(8);
		var ephemeral = new Buffer(ephemeralLength);
		buf.copy(ephemeral, 0, 12, 12 + ephemeralLength);

		return {
			session: buf.readUInt32LE(4),
			ephemeral: ephemeral
		};
	}
};

// Auth server ephemeral
// UInt32, Int32, Buffer
var authEphemeral = {
	marshall: function(data) {
		var buf = new Buffer(12 + data.ephemeral.length);

		buf.writeUInt32LE(AUTH_EPHEMERAL, 0);
		buf.writeUInt32LE(data.session, 4);
		buf.writeInt32LE(data.ephemeral.length, 8);
		data.ephemeral.copy(buf, 12);

		return buf;
	},
	unmarshall: function(buf) {
		if (buf.readUInt32LE(0) !== AUTH_EPHEMERAL) {
			throw new TypeError("Buffer is not an AUTH_EPHEMERAL packet");
			return false;
		}

		var ephemeralLength = buf.readInt32LE(8);
		var ephemeral = new Buffer(ephemeralLength);
		buf.copy(ephemeral, 0, 12, 12 + ephemeralLength);

		return {
			session: buf.readUInt32LE(4),
			ephemeral: ephemeral
		};
	}
};

// Errors
var userError = {
	marshall: function(data) {
		var buf = new Buffer(5 + Buffer.byteLength(data.username, 'ascii') + 1);

		buf.writeUInt32LE(ERROR_USER, 0);
		buf.writeUInt8(data.error, 4);
		writeString(buf, data.username, 5, 'ascii');

		return buf;
	},
	unmarshall: function(buf) {
		if (buf.readUInt32LE(0) !== ERROR_USER) {
			throw new TypeError("Buffer is not an ERROR_USER packet");
			return false;
		}

		return {
			error: buf.readUInt8(4),
			username: readString(buf, 5, 'ascii')
		};
	}
};

exports.serverNegotiate = serverNegotiate;
exports.authNegotiate = authNegotiate;
exports.serverEphemeral = serverEphemeral;
exports.authEphemeral = authEphemeral;

exports.userError = userError;

exports.SERVER_NEGOTIATE = SERVER_NEGOTIATE;
exports.AUTH_NEGOTIATE = AUTH_NEGOTIATE;
exports.SERVER_EPHEMERAL = SERVER_EPHEMERAL;
exports.AUTH_EPHEMERAL = AUTH_EPHEMERAL;

exports.SRP_M = 0xD003CA03;
exports.SRP_HAMK = 0xD003CA30;

exports.ERROR_USER = ERROR_USER;
exports.ERROR_SESSION = 0xD003CAEE;

exports.USER_TRY_LATER = 0;
exports.USER_NO_EXIST = USER_NO_EXIST;
exports.USER_OUTDATED_PROTOCOL = 2;
exports.USER_WILL_NOT_AUTH = 3;

exports.SESSION_TRY_LATER = 0;
exports.SESSION_NO_EXIST = 1;
exports.SESSION_VERIFIER_UNSAFE = 2;
exports.SESSION_AUTH_FAILED = 3;

var buffer = require("buffer");
var buffertools = require("buffertools");
var util = require("util");

// Protocol Constants
const SERVER_NEGOTIATE = 0xD003CA01;
const AUTH_NEGOTIATE = 0xD003CA10;

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

// Client Negotiation
var clientNegotiate = {
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
		}
		if (buf.readUInt8(4) !== 1) {
			throw new TypeError("Buffer is incorrect version of protocol");
		}

		// Username
		data = {
			username: readString(buf, 5, 'ascii')
		};

		return data;
	}
};

// Auth server negotiation
// UInt32, UInt8, UInt32, UInt8, Buffer, String
var authServerNegotiate = {
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
		}
		if (buf.readUInt8(4) !== 1) {
			throw new TypeError("Buffer is incorrect version of protocol");
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

exports.clientNegotiate = clientNegotiate;
exports.authServerNegotiate = authServerNegotiate;

exports.SERVER_NEGOTIATE = SERVER_NEGOTIATE;
exports.AUTH_NEGOTIATE = AUTH_NEGOTIATE;
exports.SRP_A = 0xD003CA02;
exports.SRP_S_AND_B = 0xD003CA20;
exports.SRP_M = 0xD003CA03;
exports.SRP_HAMK = 0xD003CA30;

exports.ERROR_USER = 0xD003CAFF;
exports.ERROR_SESSION = 0xD003CAEE;

exports.USER_TRY_LATER = 0;
exports.USER_NO_EXIST = 1;
exports.USER_OUTDATED_PROTOCOL = 2;
exports.USER_WILL_NOT_AUTH = 3;

exports.SESSION_TRY_LATER = 0;
exports.SESSION_NO_EXIST = 1;
exports.SESSION_VERIFIER_UNSAFE = 2;
exports.SESSION_AUTH_FAILED = 3;

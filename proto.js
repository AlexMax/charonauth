var buffertools = require('buffertools');

// Protocol Constants
const SERVER_NEGOTIATE = 0xD003CA01;

// Utility functions
function readString(msg, start, encoding) {
	var index = buffertools.indexOf(msg, "\0", start);
	if (index === -1) {
		return null;
	} else {
		return msg.toString(encoding, start, index);
	}
}

function writeString(buf, msg, start, encoding) {
	buf.write(msg, start, encoding);
	buf.writeUInt8(0, start + msg.length);
}

// Server negotiation packet
ServerNegotiate = function(data) {
	this.clear();
	if (data) {
		this.unmarshall(data);
	}
}
ServerNegotiate.prototype = {
	set: function(key, value) {
		if (!(key in this.data)) {
			throw Error(key + " does not exist in ServerNegotiate.");
		}
		this.data[key] = value;
	},
	get: function(key) {
		if (!(key in this.data)) {
			throw Error(key + " does not exist in ServerNegotiate.");
		}
		return this.data[key];
	},
	clear: function() {
		this.data = {
			username: undefined,
			version: undefined
		};
	},
	marshall: function() {
		if (this.data.username === undefined) {
			throw TypeError('username is undefined in ServerNegotiate.');
		} else if (this.data.version === undefined) {
			throw TypeError('version is undefined in ServerNegotiate.');
		}

		var buf = new Buffer(6 + this.data.username.length);
		buf.writeUInt32LE(SERVER_NEGOTIATE, 0);
		buf.writeUInt8(this.data.version, 4);
		writeString(buf, this.data.username, 5, 'ascii');

		return buf;
	},
	unmarshall: function(data) {
		if (data.length < 5) {
			throw TypeError("ServerNegotiate is missing version.");
		}

		var version = data.readUInt8(4);
		if (version !== 1) {
			throw TypeError("ServerNegotiate has incorrect version.");
		}

		var username = readString(data, 5);
		if (username === null) {
			throw TypeError("ServerNegotiate is missing username.");
		}

		this.data = {
			version: version,
			username: username
		};
	}
};

// Protocol Constants
exports.SERVER_NEGOTIATE = SERVER_NEGOTIATE;
exports.AUTH_NEGOTIATE = 0xD003CA10;
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

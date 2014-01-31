var bufferpack = require("bufferpack");

// Protocol Constants
const SERVER_NEGOTIATE = 0xD003CA01;

// Server negotiation packet
ServerNegotiate = function(data) {
	this.clear();
	if (data) {
		this.unmarshall(data);
	}
};
ServerNegotiate.prototype = {
	format: '<I(id)B(version)S(username)',
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
			throw TypeError('Cannot marshall incomplete packet');
		} else if (this.data.version === undefined) {
			throw TypeError('Cannot marshall incomplete packet');
		}

		var buf = bufferpack.pack(this.format, [
			SERVER_NEGOTIATE,
			this.data.version,
			this.data.username
		]);

		return buf;
	},
	unmarshall: function(buf) {
		var data = bufferpack.unpack(this.format, buf, 0);

		if (typeof data === 'undefined') {
			throw TypeError('Cannot unmarshall malformed buffer');
		}

		this.data = {
			version: data.version,
			username: data.username
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

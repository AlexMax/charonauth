var bufferpack = require("bufferpack");

// Protocol Constants
const SERVER_NEGOTIATE = 0xD003CA01;

// Client Negotiation
var clientNegotiate = {
	format: '<I(id)B(version)S(username)',
	marshall: function(data) {
		var buf = bufferpack.pack(clientNegotiate.format, [
			SERVER_NEGOTIATE,
			data.version,
			data.username
		]);

		if (buf === undefined) {
			throw new TypeError('Cannot marshall data of incompatible type');
		}

		return buf;
	},
	unmarshall: function(buf) {
		var data = bufferpack.unpack(clientNegotiate.format, buf, 0);

		if (data === undefined) {
			throw new TypeError('Cannot unmarshall malformed buffer');
		}

		return data;
	}
};

exports.clientNegotiate = clientNegotiate;

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

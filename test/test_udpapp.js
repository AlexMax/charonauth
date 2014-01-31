var assert = require('assert');
var dgram = require('dgram');

var proto = require('../proto');
var UDPApp = require('../udpapp');

describe('UDPApp', function() {
	describe('new UDPApp()', function() {
		it("should construct correctly.", function() {
			assert.doesNotThrow(
				function() {
					new UDPApp({
						dbfilename: ":memory:",
						port: 16666
					});
				}
			);
		});
		it("should throw a worthwhile exception without new.", function() {
			assert.throws(
				function() {
					UDPApp({
						dbfilename: ":memory:",
						port: 16666
					});
				},
				function(err) {
					if (err instanceof TypeError) {
						return true;
					}
				}
			);
		});
		it("should throw on missing dbfilename.", function() {
			assert.throws(
				function() {
					UDPApp({
						port: 16666
					});
				},
				function(err) {
					if (err instanceof Error) {
						return true;
					}
				}
			);
		});
		it("should throw on missing port.", function() {
			assert.throws(
				function() {
					UDPApp({
						dbfilename: ":memory:"
					});
				},
				function(err) {
					if (err instanceof Error) {
						return true;
					}
				}
			);
		});
	});
	describe('UDPApp.router()', function() {
		it("should be capable of creating new authentication sessions.", function(done) {
			new UDPApp({
				dbfilename: ":memory:",
				port: 16666
			});

			var socket = dgram.createSocket('udp4');

			socket.on('message', function(msg, rinfo) {
				done();
			});

			var packet = proto.clientNegotiate.marshall({
				version: 1,
				username: 'username'
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
});

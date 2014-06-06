/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var assert = require('assert');
var async = require('async');
var dgram = require('dgram');
var fs = require('fs');
var srp = require('srp');
var util = require('util');

var proto = require('../proto');
var AuthApp = require('../authapp');

describe('AuthApp', function() {
	describe('new AuthApp()', function() {
		it("should construct correctly.", function(done) {
			new AuthApp({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" },
				},
				authPort: 16666
			}, function(error) {
				if (error) {
					done(error);
				} else {
					done();
				}
			});
		});
		it("should send an error to the callback without new.", function(done) {
			AuthApp({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" },
				},
				authPort: 16666
			}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
		it("should send an error to the callback on missing port.", function(done) {
			new AuthApp({}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
	});
	describe('AuthApp.router()', function() {
		var auth_app = undefined;

		beforeEach(function(done) {
			auth_app = new AuthApp({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				},
				authPort: 16666
			}, done);
		});
		afterEach(function() {
			// Prevent memory leaks...
			auth_app.removeAllListeners();
			
			auth_app = undefined;
		});
		it('should emit an error if the packet is too short.', function(done) {
			auth_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');
			var packet = new Buffer('00', 'hex');
			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it('should emit an error if the packet doesn\'t route anywhere.', function(done) {
			auth_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');
			var packet = new Buffer('00010203', 'hex');
			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
	describe('AuthApp.serverNegotiate()', function() {
		beforeEach(function(done) {
			// Load the test data into an in-memory database.
			async.waterfall([
				function(next) {
					new AuthApp({
						database: {
							uri: "sqlite://charonauth/",
							options: { "storage": ":memory:" }
						},
						dbImport: ['test/db/single_user.sql'],
						authPort: 16666
					}, next);
				}
			], function(err) {
				if (err) {
					done(err);
				} else {
					done();
				}
			});
		});
		it("should be capable of creating new authentication sessions.", function(done) {
			var username = 'username';

			var socket = dgram.createSocket('udp4');

			socket.on('message', function(msg, rinfo) {
				var response = proto.authNegotiate.unmarshall(msg);
				if (response.username === username) {
					done();
				} else {
					done(new Error("Response contains unexpected data"));
				}
			});

			var packet = proto.serverNegotiate.marshall({
				username: username
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should send an error packet if the user does not exist.", function(done) {
			var username = 'alice';

			var socket = dgram.createSocket('udp4');

			socket.on('message', function(msg, rinfo) {
				var response = proto.userError.unmarshall(msg);
				if (response.error === proto.USER_NO_EXIST && response.username === username) {
					done();
				} else {
					done(new Error("Response contains unexpected data"));
				}
			});

			var packet = proto.serverNegotiate.marshall({
				username: username
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
	describe('AuthApp.serverEphemeral()', function() {
		var auth_app = undefined;

		beforeEach(function(done) {
			// Load the test data into an in-memory database, plus start a new
			// session with it.
			async.waterfall([
				function(next) {
					auth_app = new AuthApp({
						database: {
							uri: "sqlite://charonauth/",
							options: { "storage": ":memory:" },
						},
						dbImport: ['test/db/single_user.sql', 'test/db/session.sql'],
						authPort: 16666
					}, next);
				}
			], function(err) {
				if (err) {
					done(err);
				} else {
					done();
				}
			});
		});
		afterEach(function() {
			// Prevent memory leaks...
			auth_app.removeAllListeners();
			
			auth_app = undefined;
		});
		it("should be capable of sending a valid ephemeral value B.", function(done) {
			// Any errors get bubbled up to the unit testing framework.
			auth_app.on('error', function(err) {
				done(err);
			});

			// What the client knows.
			var username = 'username';
			var password = 'password123';
			
			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			async.waterfall([
				function(next) {
					srp.genKey(32, next);
				},
				function(secret, next) {
					var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
					var ephemeral = srpClient.computeA();
				
					var socket = dgram.createSocket('udp4');
				
					socket.on('message', function(msg, rinfo) {
						var response = proto.authEphemeral.unmarshall(msg);
						if (response.session !== session) {
							next(new Error("Response contains incorrect session"));
							return;
						}
						if (response.ephemeral.length !== 256) {
							next(new Error("Ephemeral B from server is not 256 bytes long"));
							return;
						}
						next(null, srpClient, response.ephemeral);
					});
			
					var packet = proto.serverEphemeral.marshall({
						session: session,
						ephemeral: ephemeral
					});

					socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
				},
				function(srpClient, ephemeral, next) {
					try {
						srpClient.setB(ephemeral);
						next();
					} catch (e) {
						next(e);
					}
				}
			], function(err) {
				if (err) {
					done(err);
				} else {
					done();
				}
			});
		});
		it("should emit an error if session does not exist.", function(done) {
			auth_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var packet = proto.serverEphemeral.marshall({
				session: 987654,
				ephemeral: new Buffer('00', 'hex')
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should emit an error if ephemeral length is too short.", function(done) {
			auth_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var packet = proto.serverEphemeral.marshall({
				session: 123456,
				ephemeral: new Buffer('00', 'hex')
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should emit an error if ephemeral is bad.", function(done) {
			auth_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var ephemeral = new Buffer(256);
			ephemeral.fill(0);

			var packet = proto.serverEphemeral.marshall({
				session: 123456,
				ephemeral: ephemeral
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
	describe('AuthApp.serverProof()', function() {
		var auth_app = undefined;

		beforeEach(function(done) {
			// Load the test data into an in-memory database, plus start a new
			// session with it.
			async.waterfall([
				function(next) {
					auth_app = new AuthApp({
						database: {
							uri: "sqlite://charonauth/",
							options: { "storage": ":memory:" }
						},
						dbImport: ['test/db/single_user.sql', 'test/db/session_ephemeral.sql'],
						authPort: 16666
					}, next);
				}
			], function(err) {
				if (err) {
					done(err);
				} else {
					done();
				}
			});
		});
		afterEach(function() {
			// Prevent memory leaks...
			auth_app.removeAllListeners();
			
			auth_app = undefined;
		});
		it("should be capable of logging a user in.", function(done) {
			// What the client knows.
			var username = 'username';
			var password = 'password123';
			var secret = new Buffer('6b49c347dd893101864ca99ab1a558d85dba2401a0289734cc7010403d4c510c', 'hex');

			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			// What the client got from a hypothetical ephemeral exchange.
			var ephemeral = new Buffer('40bac984c032dea81579054cf429bca2effe8323208a20e1f5d02f4674fa5c2300d7786c679609d2dbde9ece179bb7c3d626d528043a93ec9fcaf86af3b020b444f3dcc97402af03a7cb6275fe523e1ba7300e7666db2428a63e0ff4c6f5f7cc1434c282c65a98c06b395d287b04164de5f5ed8dd12e97b0bd1a35c231ef8fb9aa037cddfd97bd04659a7a8cfa5e285d67dc509ef4654dcf0d01eb0a7fd203270181b4b78ebf8235811fd4671c42f6b66ba3f7e76f8be75ff97cdea31b8c5f940b2f774b2d1b528b5ffbef2dc19fff7180df0f3c0816774e789c21c84cf574d72199966f2b4e64fafa707f296db9decf295bbe96f2b3a8c604f182042d99a4f2', 'hex');

			var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
			srpClient.setB(ephemeral);
			var proof = srpClient.computeM1();

			var socket = dgram.createSocket('udp4');

			socket.on('message', function(msg, rinfo) {
				var response = proto.authProof.unmarshall(msg);
				if (response.session !== session) {
					next(new Error("Response contains incorrect session"));
					return;
				}
				try {
					srpClient.checkM2(response.proof);
				} catch(e) {
					next(e);
				}
				done();
			});

			var packet = proto.serverProof.marshall({
				session: session,
				proof: proof
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should send an error packet if the proof doesn't work.", function(done) {
			var socket = dgram.createSocket('udp4');

			socket.on('message', function(msg, rinfo) {
				var response = proto.sessionError.unmarshall(msg);
				assert.equal(response.session, 123456);
				assert.equal(response.error, 3);
				done();
			});

			var proof = new Buffer(256);
			proof.fill(0);

			var packet = proto.serverProof.marshall({
				session: 123456,
				proof: proof
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
});

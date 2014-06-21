/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var Promise = require('bluebird');

var assert = require('assert');
var srp = Promise.promisifyAll(require('srp'));

var error = require('../error');
var proto = require('../proto');
var AuthApp = require('../authapp');

describe('AuthApp', function() {
	describe('new AuthApp()', function() {
		it("should construct correctly.", function() {
			return new AuthApp({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" },
				},
				auth: {
					port: 16666
				}
			});
		});
		it("should error on missing port.", function() {
			return new AuthApp({}).then(function() {
				throw new Error("Did not error");
			}).catch(function(err) {
				// Success
			});
		});
	});
	describe('AuthApp.router()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				options: { "storage": ":memory:" }
			},
			auth: {
				port: 16666
			}
		};
		it('should error if the packet is too short.', function() {
			var packet = new Buffer('00', 'hex');
			return new AuthApp(config).then(function(app) {
				return app.router(packet);
			}).then(function() {
				throw new Error("Did not error");
			}).catch(error.IgnorableProtocol, function() {
				// Success
			});
		});
		it('should error if the packet doesn\'t route anywhere.', function() {
			var packet = new Buffer('00010203', 'hex');
			return new AuthApp(config).then(function(app) {
				return app.router(packet);
			}).then(function() {
				throw new Error("Did not error");
			}).catch(error.IgnorableProtocol, function() {
				// Success
			});
		});
	});
	describe('AuthApp.serverNegotiate()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				options: { "storage": ":memory:" }
			},
			auth: {
				port: 16666
			}
		};

		it("should be capable of creating new authentication sessions.", function() {
			var packet = proto.serverNegotiate.marshall({
				username: 'username'
			});

			return new AuthApp(config).then(function(app) {
				return Promise.all([app, require('./fixture/single_user')(app.dbconn.User)]);
			}).spread(function(app, _) {
				return app.serverNegotiate(packet);
			}).then(function(msg) {
				// Will throw and reject the promise if it fails
				var response = proto.authNegotiate.unmarshall(msg);

				assert.equal(response.username, "username", "Username is incorrect");
				assert.equal(response.salt.toString('hex'), '615a9e29', "Salt is incorrect");
			});
		});
		it("should error if the user does not exist.", function() {
			var packet = proto.serverNegotiate.marshall({
				username: 'alice'
			});

			return new AuthApp(config).then(function(app) {
				return Promise.all([app, require('./fixture/single_user')(app.dbconn.User)]);
			}).spread(function(app, _) {
				return app.serverNegotiate(packet);
			}).then(function() {
				throw new Error("Did not error");
			}).catch(error.UserNotFound, function() {
				// Success
			});
		});
	});
	describe('AuthApp.serverEphemeral()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				options: { "storage": ":memory:" }
			},
			auth: {
				port: 16666
			}
		};
		it("should be capable of sending a valid ephemeral value B.", function() {
			// What the client knows.
			var username = 'username';
			var password = 'password123';

			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			return new AuthApp(config).then(function(app) {
				return Promise.all([app, require('./fixture/single_user')(app.dbconn.User)]);
			}).spread(function(app, _) {
				return Promise.all([app, require('./fixture/single_user_session')(app.dbconn.User, app.dbconn.Session)]);
			}).spread(function(app, _) {
				return Promise.all([app, srp.genKeyAsync(32)]);
			}).spread(function(app, secret) {
				var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
				var ephemeral = srpClient.computeA();
				var packet = proto.serverEphemeral.marshall({
					session: session,
					ephemeral: ephemeral
				});

				return Promise.all([srpClient, app.serverEphemeral(packet)]);
			}).spread(function(srpClient, msg) {
				var response = proto.authEphemeral.unmarshall(msg);

				assert.equal(response.session, session, "Session is incorrect");

				srpClient.setB(response.ephemeral);
			});
		});
		it("should error if session does not exist.", function() {
			// What the client knows.
			var username = 'username';
			var password = 'password123';
			
			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			return new AuthApp(config).then(function(app) {
				return Promise.all([app, require('./fixture/single_user')(app.dbconn.User)]);
			}).spread(function(app, _) {
				return Promise.all([app, srp.genKeyAsync(32)]);
			}).spread(function(app, secret) {
				var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
				var ephemeral = srpClient.computeA();
				var packet = proto.serverEphemeral.marshall({
					session: session,
					ephemeral: ephemeral
				});

				return Promise.all([srpClient, app.serverEphemeral(packet)]);
			}).then(function() {
				throw new Error("Did not error");
			}).catch(error.SessionNotFound, function() {
				// Success
			});
		});
	});
});
/*	describe('AuthApp.serverProof()', function() {
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
});*/

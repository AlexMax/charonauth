/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var Promise = require('bluebird');

var assert = require('assert');

var AuthApp = require('../source/authapp');
var error = require('../source/error');
var proto = require('../source/proto');
var srp = Promise.promisifyAll(require('../srp'));

describe('AuthApp', function() {
	describe('new AuthApp()', function() {
		it("should construct correctly.", function() {
			return Promise.using(new AuthApp({
				database: {
					uri: "sqlite://charonauth/",
					storage: ":memory:"
				},
				auth: {
					port: 16666
				}
			}), function(app) {
				assert(app instanceof AuthApp);
			});
		});
		it("should error on missing configuration.", function() {
			return Promise.using(new AuthApp({}), function(app) {
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
				storage: ":memory:"
			},
			auth: {
				port: 16666
			}
		};
		it('should error if the packet is too short.', function() {
			var packet = new Buffer('00', 'hex');
			return Promise.using(new AuthApp(config), function(app) {
				return app.router(packet).then(function() {
					throw new Error("Did not error");
				}).catch(error.IgnorableProtocol, function() {
					// Success
				});
			});
		});
		it('should error if the packet doesn\'t route anywhere.', function() {
			var packet = new Buffer('00010203', 'hex');
			return Promise.using(new AuthApp(config), function(app) {
				return app.router(packet).then(function() {
					throw new Error("Did not error");
				}).catch(error.IgnorableProtocol, function() {
					// Success
				});
			});
		});
	});
	describe('AuthApp.serverNegotiate()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			auth: {
				port: 16666
			}
		};

		it("should be capable of creating new authentication sessions.", function() {
			var clientSession = 654321;
			var username = 'username';

			var packet = proto.serverNegotiate.marshall({
				clientSession: 654321,
				username: username,
				version: 2
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return app.serverNegotiate(packet);
				}).then(function(msg) {
					// Will throw and reject the promise if it fails
					var response = proto.authNegotiate.unmarshall(msg);

					assert.equal(response.clientSession, 654321, "Client Session is incorrect");
					assert.equal(response.username, username, "Username is incorrect");
					assert.equal(response.salt.toString('hex'), '615a9e29', "Salt is incorrect");
				});
			});
		});
		it("should return the correct username for mixed-case attempts.", function() {
			var clientSession = 654321;

			var packet = proto.serverNegotiate.marshall({
				clientSession: clientSession,
				username: 'Username',
				version: 2
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return app.serverNegotiate(packet);
				}).then(function(msg) {
					// Will throw and reject the promise if it fails
					var response = proto.authNegotiate.unmarshall(msg);

					assert.equal(response.clientSession, clientSession, "Client Session is incorrect");
					assert.equal(response.username, "username", "Username is incorrect");
					assert.equal(response.salt.toString('hex'), '615a9e29', "Salt is incorrect");
				});
			});
		});
		it("should error if the user does not exist (v2).", function() {
			var clientSession = 654321;

			var packet = proto.serverNegotiate.marshall({
				clientSession: clientSession,
				username: 'alice',
				version: 2
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return app.serverNegotiate(packet);
				}).then(function(msg) {
					var error = proto.clientSessionError.unmarshall(msg);

					assert.equal(error.clientSession, clientSession, "Client Session is incorrect");
					assert.equal(error.error, proto.USER_NO_EXIST, "Error is incorrect");
				});
			});
		});
		it("should error if the user does not exist (v1).", function() {
			var clientSession = 654321;
			var username = 'alice';

			var packet = proto.serverNegotiate.marshall({
				clientSession: clientSession,
				username: username,
				version: 1
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return app.serverNegotiate(packet);
				}).then(function(msg) {
					var error = proto.userError.unmarshall(msg);

					assert.equal(error.username, username, "Username is incorrect");
					assert.equal(error.error, proto.USER_NO_EXIST, "Error is incorrect");
				});
			});
		});
	});
	describe('AuthApp.serverEphemeral()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
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

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return require('./fixture/single_user_session')(app.dbconn.User, app.dbconn.Session);
				}).then(function() {
					return srp.genKeyAsync(32);
				}).then(function(secret) {
					var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
					var ephemeral = srpClient.computeA();
					var packet = proto.serverEphemeral.marshall({
						session: session,
						ephemeral: ephemeral
					});

					return Promise.all([srpClient, ephemeral, app.serverEphemeral(packet)]);
				}).spread(function(srpClient, ephemeral, msg) {
					var response = proto.authEphemeral.unmarshall(msg);

					assert.equal(response.session, session, "Session is incorrect");
					assert.notEqual(response.ephemeral.toString('hex'), ephemeral.toString('hex'), "Server passed back A instead of B");

					srpClient.setB(response.ephemeral);
				});
			});
		});
		it("should error if session does not exist.", function() {
			// What the client knows.
			var username = 'username';
			var password = 'password123';

			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return srp.genKeyAsync(32);
				}).then(function(secret) {
					var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
					var ephemeral = srpClient.computeA();
					var packet = proto.serverEphemeral.marshall({
						session: session,
						ephemeral: ephemeral
					});

					return Promise.all([srpClient, app.serverEphemeral(packet)]);
				}).spread(function(_, msg) {
					var error = proto.sessionError.unmarshall(msg);

					assert.equal(error.error, proto.SESSION_NO_EXIST, "Error is incorrect");
					assert.equal(error.session, session, "Session is incorrect");
				});
			});
		});
	});
	describe('AuthApp.serverProof()', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			auth: {
				port: 16666
			}
		};
		var rinfo = {address: '127.0.0.1'};
		it("should be capable of logging a user in.", function() {
			// What the client knows.
			var username = 'username';
			var password = 'password123';
			var secret = new Buffer('6b49c347dd893101864ca99ab1a558d85dba2401a0289734cc7010403d4c510c', 'hex');

			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');
			var session = 123456;

			// What the client got from a hypothetical ephemeral exchange.
			var ephemeral = new Buffer('40bac984c032dea81579054cf429bca2effe8323208a20e1f5d02f4674fa5c2300d7786c679609d2dbde9ece179bb7c3d626d528043a93ec9fcaf86af3b020b444f3dcc97402af03a7cb6275fe523e1ba7300e7666db2428a63e0ff4c6f5f7cc1434c282c65a98c06b395d287b04164de5f5ed8dd12e97b0bd1a35c231ef8fb9aa037cddfd97bd04659a7a8cfa5e285d67dc509ef4654dcf0d01eb0a7fd203270181b4b78ebf8235811fd4671c42f6b66ba3f7e76f8be75ff97cdea31b8c5f940b2f774b2d1b528b5ffbef2dc19fff7180df0f3c0816774e789c21c84cf574d72199966f2b4e64fafa707f296db9decf295bbe96f2b3a8c604f182042d99a4f2', 'hex');

			// Prepare response to server
			var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), secret);
			srpClient.setB(ephemeral);
			var proof = srpClient.computeM1();
			var packet = proto.serverProof.marshall({
				session: session,
				proof: proof
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return require('./fixture/single_user_ephemeral')(app.dbconn.User, app.dbconn.Session);
				}).then(function() {
					return app.serverProof(packet, rinfo);
				}).then(function(msg) {
					var response = proto.authProof.unmarshall(msg);

					assert.equal(response.session, session, "Session is incorrect");

					srpClient.checkM2(response.proof);

					// Ensure that we recorded an action for an authentication
					return app.dbconn.Action.find(1);
				}).then(function(action) {
					assert.equal(action.type, 'auth');
					assert.equal(action.UserId, 1);
					assert.equal(action.WhomId, 1);
				});
			});
		});
		it("should error if the proof doesn't work.", function() {
			// Prepare a proof with nothing in it
			var session = 123456;
			var proof = new Buffer(256);
			proof.fill(0);

			var packet = proto.serverProof.marshall({
				session: session,
				proof: proof
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return require('./fixture/single_user_ephemeral')(app.dbconn.User, app.dbconn.Session);
				}).then(function() {
					return app.serverProof(packet, rinfo);
				}).then(function(msg) {
					var error = proto.sessionError.unmarshall(msg);

					assert.equal(error.error, proto.SESSION_AUTH_FAILED, "Error is incorrect");
					assert.equal(error.session, session, "Session is incorrect");
				});
			});
		});
		it("should error if the session doesn't exist.", function() {
			// Prepare a proof with nothing in it
			var session = 654321;
			var proof = new Buffer(256);
			proof.fill(0);

			var packet = proto.serverProof.marshall({
				session: session,
				proof: proof
			});

			return Promise.using(new AuthApp(config), function(app) {
				return require('./fixture/single_user')(app.dbconn.User)
				.then(function() {
					return require('./fixture/single_user_ephemeral')(app.dbconn.User, app.dbconn.Session);
				}).then(function() {
					return app.serverProof(packet, rinfo);
				}).then(function(msg) {
					var error = proto.sessionError.unmarshall(msg);

					assert.equal(error.error, proto.SESSION_NO_EXIST, "Error is incorrect");
					assert.equal(error.session, session, "Session is incorrect");
				});
			});
		});
	});
});

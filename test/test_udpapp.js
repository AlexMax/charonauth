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
var UDPApp = require('../udpapp');

describe('UDPApp', function() {
	describe('new UDPApp()', function() {
		it("should construct correctly.", function(done) {
			new UDPApp({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
				port: 16666
			}, function(error) {
				if (error) {
					done(error);
				} else {
					done();
				}
			});
		});
		it("should send an error to the callback without new.", function(done) {
			UDPApp({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
				port: 16666
			}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
		it("should send an error to the callback on missing dbConnection.", function(done) {
			new UDPApp({
				dbOptions: { "storage": ":memory:" },
				port: 16666
			}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
		it("should send an error to the callback on missing dbOptions.", function(done) {
			new UDPApp({
				dbConnection: "sqlite://charonauth/",
				port: 16666
			}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
		it("should send an error to the callback on missing port.", function(done) {
			new UDPApp({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}, function(error) {
				if (error) {
					done();
				} else {
					done(new Error("Did not error"));
				}
			});
		});
	});
	describe('UDPApp.serverNegotiate()', function() {
		beforeEach(function(done) {
			// Load the test data into an in-memory database.
			async.waterfall([
				function(next) {
					new UDPApp({
						dbConnection: "sqlite://charonauth/",
						dbOptions: { "storage": ":memory:" },
						port: 16666
					}, next);
				},
				function(udpapp, next) {
					fs.readFile('test/db/single_user.sql', function(err, sql) {
						next(err, udpapp, sql);
					});
				},
				function(udpapp, sql, next) {
					udpapp.dbconn.db.query(sql.toString('ascii'))
					.complete(function(err) {
						next(err);
					});
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
		it("should return an error if the user does not exist.", function(done) {
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
	describe('UDPApp.serverEphemeral()', function() {
		var session = null;
		var udp_app = undefined;

		beforeEach(function(done) {
			// Load the test data into an in-memory database, plus start a new
			// session with it.
			async.waterfall([
				function(next) {
					udp_app = new UDPApp({
						dbConnection: "sqlite://charonauth/",
						dbOptions: { "storage": ":memory:" },
						port: 16666
					}, next);
				},
				function(udpapp, next) {
					fs.readFile('test/db/single_user.sql', function(err, sql) {
						next(err, udpapp, sql);
					});
				},
				function(udpapp, sql, next) {
					udpapp.dbconn.db.query(sql.toString('ascii'))
					.complete(function(err) {
						next(err, udpapp);
					});
				},
				function(udpapp, next) {
					udpapp.dbconn.newSession('username', next);
				},
				function(data, next) {
					session = data.session;
					next();
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
			udp_app.removeAllListeners();
			
			udp_app = undefined;
		});
		it("should be capable of sending a valid ephemeral value B.", function(done) {
			// Any errors get bubbled up to the unit testing framework.
			udp_app.on('error', function(err) {
				done(err);
			});

			// What the client knows.
			var username = 'username';
			var password = 'password123';
			
			// What the client got from a hypothetical session establishment.
			var salt = new Buffer('615A9E29', 'hex');

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
						srpClient.computeM1();
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
			udp_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var packet = proto.serverEphemeral.marshall({
				session: session + 1,
				ephemeral: new Buffer('00', 'hex')
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should emit an error if ephemeral length is too short.", function(done) {
			udp_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var packet = proto.serverEphemeral.marshall({
				session: session,
				ephemeral: new Buffer('00', 'hex')
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
		it("should emit an error if ephemeral is bad.", function(done) {
			udp_app.on('error', function(err) {
				assert.ok(util.isError(err));
				done();
			});

			var socket = dgram.createSocket('udp4');

			var ephemeral = new Buffer(256);
			ephemeral.fill(0);

			var packet = proto.serverEphemeral.marshall({
				session: session,
				ephemeral: ephemeral
			});

			socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
		});
	});
});

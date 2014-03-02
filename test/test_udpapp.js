/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var assert = require('assert');
var async = require('async');
var dgram = require('dgram');
var fs = require('fs');
var srp = require('srp');

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
					.error(function(err) {
						next(err);
					})
					.success(function() {
						next();
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
		it("should be capable of sending an ephemeral value B.", function(done) {
			// What the client knows.
			var username = 'username';
			var password = 'password123';
			
			// What the client got from a hypothetical session establishment.
			var session = 220667729;
			var salt = new Buffer('615A9E29', 'hex');

			async.parallel([
				// Generate an ephemeral key A to send to the server.
				function(callback) {
					srp.genKey(32, function(err, key) {
						if (err) {
							callback(err);
							return;
						}

						var srpClient = new srp.Client(srp.params['2048'], salt, new Buffer(username, 'ascii'), new Buffer(password, 'ascii'), key);
						var ephemeral = srpClient.computeA();

						callback(null, ephemeral);
					});
				},
				// Set up the database.
				function(callback) {
					new UDPApp({
						dbConnection: "sqlite://charonauth/",
						dbOptions: { "storage": ":memory:" },
						port: 16666
					}, function(err, self) {
						fs.readFile('test/db/single_user.sql', function(err, data) {
							if (err) {
								callback(err);
								return;
							}
							self.dbconn.db.query(data.toString('ascii'))
							.error(function(err) {
								callback(err);
							})
							.success(function() {
								// Create a session for the user.
								self.dbconn.newSession(username, function(err, data) {
									if (err) {
										callback(err);
										return;
									}
									callback(null, data);
								});
							});
						});
					});
				}
			], function(err, results) {
				if (err) {
					done(err);
					return;
				}

				var ephemeral = results[0];
				var session = results[1].session;

				var socket = dgram.createSocket('udp4');

				socket.on('message', function(msg, rinfo) {
					var response = proto.authEphemeral.unmarshall(msg);
					if (response.session !== session) {
						done("Response contains incorrect session");
						return;
					}
					if (response.ephemeral.length !== 256) {
						done("Ephemeral B from server is not 256 bytes long");
						return;
					}
					done();
				});

				var packet = proto.serverEphemeral.marshall({
					session: session,
					ephemeral: ephemeral
				});

				socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
			});
		});
	});
});

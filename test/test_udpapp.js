/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var assert = require('assert');
var dgram = require('dgram');

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
		it("should throw an exception if we forget the callback function.", function() {
			assert.throws(function() {
				new UDPApp({
					dbConnection: "sqlite://charonauth/",
					dbOptions: { "storage": "charonauth.db" },
					port: 16666
				});
			});
		});
	});
	describe('UDPApp.router()', function() {
		it("should be capable of creating new authentication sessions.", function(done) {
			var username = 'username';

			new UDPApp({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
				port: 16666
			}, function() {
				var socket = dgram.createSocket('udp4');

				socket.on('message', function(msg, rinfo) {
					var response = proto.authServerNegotiate.unmarshall(msg);
					if (response.username === username) {
						done();
					} else {
						throw new Error('Response contains unexpected data');
					}
				});

				var packet = proto.clientNegotiate.marshall({
					username: username
				});

				socket.send(packet, 0, packet.length, 16666, '127.0.0.1');
			});
		});
	});
});

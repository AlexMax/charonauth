/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var fs = require('fs');

var DBConn = require('../dbconn');

describe('DBConn', function() {
	describe('new DBConn()', function() {
		it("should construct correctly.", function(done) {
			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function() {
				done();
			});
		});
	});
	describe('DBConn.addUser()', function() {
		it("should correctly add a user.", function(done) {
			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(dbconn) {
				return dbconn.addUser('username', 'password123', 'example@example.com')
			}).then(function() {
				done();
			});
		});
	});
	describe('DBConn.findUser()', function() {
		it("should correctly find a user in a case-insensitive manner.", function(done) {
			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				},
				dbImport: ['test/db/single_user.sql']
			}).then(function(dbconn) {
				return dbconn.findUser('Username');
			}).then(done);
		});
	});
});

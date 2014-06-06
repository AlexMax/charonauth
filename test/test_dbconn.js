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
			}).then(function(db) {
				if (!(db instanceof DBConn)) {
					done(new Error("Did not get a DBConn from constructor"));
				} else {
					done();
				}
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
			}).then(function(user) {
				if (user.username !== 'username') {
					done(new Error("User was not added as expected"));
				} else {
					done();
				}
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
			}).then(function(user) {
				done();
			}).catch(done);
		});
	});
});

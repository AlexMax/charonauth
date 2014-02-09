/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var DBConn = require('../dbconn');

describe('DBConn', function() {
	describe('new DBConn()', function() {
		it("should construct correctly.", function(done) {
			var dbconn = new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}, function(error) {
				if (error) {
					done(error);
				} else {
					done();
				}
			});
		});
	});
	describe('DBConn.addUser()', function() {
		it("should correctly add a user.", function(done) {
			var dbconn = new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}, function(error) {
				if (error) {
					done(error);
				} else {
					this.addUser('username', 'password123', function(error) {
						if (error) {
							done(error);
						} else {
							done();
						}
					});
				}
			});
		});
	});
	describe('DBConn.findUser()', function() {
		it("should correctly find a user.", function(done) {
			var dbconn = new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": "test/testdb/single_user.db" },
			}, function(error) {
				if (error) {
					done(error);
				} else {
					this.findUser('username', function(error, data) {
						if (error) {
							done(error);
						} else {
							done();
						}
					});
				}
			});
		});
	});
});

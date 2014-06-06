/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var fs = require('fs');

var DBConn = require('../dbconn');

describe('DBConn', function() {
	describe('new DBConn()', function() {
		it("should construct correctly.", function(done) {
			new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}).then(function() {
				done();
			});
		});
	});
	describe('DBConn.addUser()', function() {
		it("should correctly add a user.", function(done) {
			new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}).then(function(dbconn) {
				return dbconn.addUser('username', 'password123', 'example@example.com')
			}).then(function() {
				done();
			});
		});
	});
	describe('DBConn.findUser()', function() {
		it("should correctly find a user.", function(done) {
			new DBConn({
				dbConnection: "sqlite://charonauth/",
				dbOptions: { "storage": ":memory:" },
			}).then(function(dbconn) {
				fs.readFile('test/db/single_user.sql', function(error, data) {
					if (error) {
						done(error);
						return;
					}
					dbconn.db.query(data.toString('ascii'))
					.error(function(error) {
						done(error);
					})
					.success(function(data) {
						dbconn.findUser('username', function(error, data) {
							if (error) {
								done(error);
							} else {
								done();
							}
						});
					});
				});
			});
		});
	});
});

/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var fs = require('fs');

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
				dbOptions: { "storage": ":memory:" },
			}, function(error) {
				if (error) {
					done(error);
					return;
				}
				var self = this;
				fs.readFile('test/db/single_user.sql', function(error, data) {
					if (error) {
						done(error);
						return;
					}
					self.db.query(data.toString('ascii'))
					.error(function(error) {
						done(error);
					})
					.success(function(data) {
						self.findUser('username', function(error, data) {
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

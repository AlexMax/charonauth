/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var assert = require('assert');
var Promise = require('bluebird');

var DBConn = require('../dbconn');
var error = require('../error');

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
		it("should correctly lowercase a username.", function(done) {
			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(dbconn) {
				return dbconn.addUser('Username', 'password123', 'example@example.com')
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
			var db;

			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(dbconn) {
				db = dbconn;
				return require('./fixture/single_user')(db.User);
			}).then(function() {
				return db.findUser('Username');
			}).then(function(user) {
				done();
			}).catch(done);
		});
	});
	describe('DBConn.verifyUser()', function() {
		it("should correctly verify a user given a plaintext password.", function() {
			return new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('username', 'password123');
			}).then(function(user) {
				assert.equal(user.username, 'username');
			});
		});
		it("should correctly verify a user with incorrect capitalization.", function() {
			return new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('Username', 'password123');
			}).then(function(user) {
				assert.equal(user.username, 'username');
			});
		});
		it("should correctly verify a user given an e-mail address.", function() {
			return new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('example@example.com', 'password123');
			}).then(function(user) {
				assert.equal(user.username, 'username');
			});
		});
		it("should correctly error if a user doesn't exist.", function() {
			return new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('capodecima', 'password123');
			}).then(function(user) {
				throw new Error("Did not error");
			}).catch(error.UserNotFound, function() {
				// Success
			});
		});
		it("should correctly error a user with the wrong password.", function() {
			return new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('username', 'password');
			}).then(function(user) {
				throw new Error("Did not error");
			}).catch(error.LoginAuthFailed, function() {
				// Success
			});
		});
	});
	describe('DBConn.newSession()', function() {
		it("should correctly create a session.", function(done) {
			var db;

			new DBConn({
				database: {
					uri: "sqlite://charonauth/",
					options: { "storage": ":memory:" }
				}
			}).then(function(dbconn) {
				db = dbconn;
				return require('./fixture/single_user')(db.User);
			}).then(function() {
				return db.newSession('username');
			}).then(function(user) {
				return db.Session.findAndCountAll();
			}).then(function(sessions) {
				if (sessions.count !== 1) {
					done(new Error("Session was not created"));
				}
				return sessions.rows[0].getUser();
			}).then(function(user) {
				if (user === null) {
					done(new Error("Session is not attached to User"));
				}
				done();
			}).catch(done);
		});
	});
});

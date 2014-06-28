/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var Promise = require('bluebird');

var assert = require('assert');

var DBConn = require('../source/dbconn');
var error = require('../source/error');

describe('DBConn', function() {
	describe('new DBConn()', function() {
		it("should construct correctly.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			});
		});
	});
	describe('DBConn.addUser()', function() {
		it("should correctly add a user and profile.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			}).then(function(dbconn) {
				return dbconn.addUser('username', 'password123', 'example@example.com');
			}).then(function(user) {
				assert.equal(user.username, 'username');

				return user.getProfile();
			}).then(function(profile) {
				assert.notEqual(profile, null);
			});
		});
		it("should correctly lowercase username in User table.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			}).then(function(dbconn) {
				return dbconn.addUser('Username', 'password123', 'example@example.com');
			}).then(function(user) {
				assert.equal(user.username, 'username');

				return user.getProfile();
			}).then(function(profile) {
				assert.equal(profile.username, 'Username');
			});
		});
	});
	describe('DBConn.findUser()', function() {
		it("should correctly find a user in a case-insensitive manner.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.findUser('Username');
			});
		});
	});
	describe('DBConn.verifyUser()', function() {
		it("should correctly verify a user given a plaintext password.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
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
				uri: "sqlite://charonauth/",
				storage: ":memory:"
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
				uri: "sqlite://charonauth/",
				storage: ":memory:"
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
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return db.verifyUser('capodecima', 'password123');
			}).then(function(user) {
				throw new Error("Did not error");
			}).catch(error.UserNotFound, function(err) {
				assert.equal(err.username, 'capodecima');
			});
		});
		it("should correctly error a user with the wrong password.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
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
		it("should correctly create a session.", function() {
			return new DBConn({
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			}).then(function(db) {
				return Promise.all([db, require('./fixture/single_user')(db.User)]);
			}).spread(function(db, _) {
				return Promise.all([db, db.newSession('username')]);
			}).spread(function(db, user) {
				return db.Session.findAndCountAll();
			}).then(function(sessions) {
				assert.equal(sessions.count, 1, "Session was not created");

				return sessions.rows[0].getUser();
			}).then(function(user) {
				assert.notEqual(user, null, "Session is not attached to User");
			});
		});
	});
});

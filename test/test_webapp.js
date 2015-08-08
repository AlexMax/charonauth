/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var Promise = require('bluebird');
var request = require('supertest-as-promised');

var WebApp = require('../source/webapp');

describe('WebApp', function() {
	describe('new WebApp()', function() {
		it("should construct correctly.", function() {
			return new WebApp({
				database: {
					uri: "sqlite://charonauth/",
					storage: ":memory:"
				},
				web: {
					secret: 'udontop'
				}
			});
		});
	});
	describe('GET /', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			web: {
				port: 9876,
				secret: 'udontop'
			}
		};
		it("should retrieve the homepage", function() {
			return Promise.using(new WebApp(config), function(web) {
				return request(web.http).get('/').expect(200);
			});
		});
	});
	describe('GET /users', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			web: {
				port: 9876,
				secret: 'udontop'
			}
		};
		it("should show a user's account in list", function() {
			return Promise.using(new WebApp(config), function(web) {
				return require('./fixture/single_user_with_profile')(web.dbconn.User, web.dbconn.Profile)
					.then(function() {
						return request(web.http)
							.get('/users')
							.expect(200)
							.expect(/Username/);
					});
			});
		});
	});
	describe('GET /users/username', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			web: {
				port: 9876,
				secret: 'udontop'
			}
		};
		it("should show a user's account details", function() {
			return Promise.using(new WebApp(config), function(web) {
				return require('./fixture/single_user_with_profile')(web.dbconn.User, web.dbconn.Profile)
					.then(function() {
						return request(web.http)
							.get('/users/username')
							.expect(200)
							.expect(/Username/);
					});
			});
		});
	});
	describe('POST /register', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			web: {
				port: 9876,
				secret: 'udontop',
				csrf: false,
			},
			mail: {
				from: 'example@example.com',
				baseurl: 'http://example.com',
				transport: 'direct'
			}
		};
		it("should register an account", function() {
			return Promise.using(new WebApp(config), function(web) {
				return request(web.http)
					.post('/register')
					.type('form')
					.send({
						'username': 'username',
						'password': 'password123',
						'confirm': 'password123',
						'email': 'example@mailinator.com',
					})
					.expect(200)
					.expect(/verification e-mail/)
					.then(function() {
						return web.dbconn.findUser('username');
					});
			});
		});
	});
	describe('POST /login', function() {
		var config = {
			database: {
				uri: "sqlite://charonauth/",
				storage: ":memory:"
			},
			web: {
				port: 9876,
				secret: 'udontop',
				csrf: false,
			}
		};
		it("should correctly login", function() {
			return Promise.using(new WebApp(config), function(web) {
				return require('./fixture/single_user_with_profile')(web.dbconn.User, web.dbconn.Profile)
					.then(function() {
						var agent = request.agent(web.http);
						return agent
							.post('/login')
							.type('form')
							.send({
								'login': 'username',
								'password': 'password123',
							})
							.expect(302)
							.then(function() {
								return agent
									.get('/')
									.expect(200)
									.expect(/Username/);
							});
					});
			});
		});
	});
});

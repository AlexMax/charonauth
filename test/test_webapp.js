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
		it("should show a user's account", function() {
			return Promise.using(new WebApp(config), function(web) {
				return require('./fixture/single_user_with_profile')(web.dbconn.User, web.dbconn.Profile)
					.then(request(web.http)
							.get('/users')
							.expect(200)
							.expect(/Username/));
			});
		});
	});
});

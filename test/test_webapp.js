/* jshint node: true, newcap: false */
/* global describe, it, beforeEach */
"use strict";

var supertest = require('supertest');

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
		it("should retrieve the homepage", function(done) {
			new WebApp(config).then(function(web) {
				supertest(web.http).get('/').expect(200, done);
			}).done();
		});
	});
});

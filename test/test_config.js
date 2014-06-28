/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var assert = require('assert');

var Config = require('../source/config');

describe('Config', function() {
	describe('new Config()', function() {
		it("should construct correctly.", function() {
			assert.doesNotThrow(function() {
				new Config();
			});
		});
	});
	describe('Config.get()', function() {
		it('should return a trivial result.', function() {
			var config = new Config({
				one: 1,
				two: 2,
				three: 3
			});
			assert.equal(config.get('two'), 2);
		});
		it('should be capable of getting a nested result.', function() {
			var config = new Config({
				one: {
					two: {
						three: 3
					}
				}
			});
			assert.equal(config.get('one.two.three'), 3);
		});
		it('should return undefined for a trivial error.', function() {
			var config = new Config({
				one: 1,
				two: 2,
				three: 3
			});
			assert.equal(config.get('four'), undefined);
		});
		it('should return undefined for a nested error.', function() {
			var config = new Config({
				one: {
					two: {
						three: 3
					}
				}
			});
			assert.equal(config.get('one.two.five'), undefined);
		});
		it('should return undefined for a worse nested error.', function() {
			var config = new Config({
				one: {
					two: {
						three: 3
					}
				}
			});
			assert.equal(config.get('one.five.ten'), undefined);
		});
	});
	describe('Config.get()', function() {
		it('should set an already-exisitng trivial setting.', function() {
			var config = new Config({
				one: 1,
				two: 2
			});
			config.set('three', 3);
			assert.equal(config.values.three, 3);
		});
		it('should set a missing trivial setting.', function() {
			var config = new Config({
				one: 1,
				two: 2
			});
			config.set('three', 3);
			assert.equal(config.values.three, 3);
		});
		it('should set an already-existing deeply-nested setting.', function() {
			var config = new Config({
				one: {
					two: {
						three: null
					}
				}
			});
			config.set('one.two.three', 3);
			assert.equal(config.values.one.two.three, 3);
		});
		it('should set an missing deeply-nested setting.', function() {
			var config = new Config({});
			config.set('one.two.three', 3);
			assert.equal(config.values.one.two.three, 3);
		});
	});
});

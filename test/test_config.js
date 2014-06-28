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
	describe('Config.getBool()', function() {
		it('should get true from truthy values.', function() {
			var config = new Config({
				"true": true,
				"trues": "true",
				"yes": "yes",
				"1": 1,
				"1s": "1"
			});

			assert.deepEqual(config.getBool('true'), true, "Boolean true does not return true");
			assert.deepEqual(config.getBool('trues'), true, "String true does not return true");
			assert.deepEqual(config.getBool('yes'), true, "yes does not return true");
			assert.deepEqual(config.getBool('1'), true, "Numeric 1 does not return true");
			assert.deepEqual(config.getBool('1s'), true, "String 1 does not return true");
		});
		it('should get false from falsy values.', function() {
			var config = new Config({
				"false": false,
				"falses": "false",
				"no": "no",
				"0": 0,
				"0s": "0"
			});

			assert.deepEqual(config.getBool('false'), false, "Boolean false does not return false");
			assert.deepEqual(config.getBool('falses'), false, "String false does not return false");
			assert.deepEqual(config.getBool('no'), false, "no does not return false");
			assert.deepEqual(config.getBool('0'), false, "Numeric 0 does not return false");
			assert.deepEqual(config.getBool('0s'), false, "String 0 does not return false");
		});
	});
	describe('Config.set()', function() {
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

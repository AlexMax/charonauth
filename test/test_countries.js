/* jshint node: true, newcap: false */
/* global describe, it */
"use strict";

var assert = require('assert');

var countries = require('../source/countries');

describe('countries', function() {
	describe('countries.isCountryCode()', function() {
		it("should correctly detect a valid country code.", function() {
			assert(countries.isCountryCode('us'));
		});
		it("should correctly detect an invalid country code.", function() {
			assert.ifError(countries.isCountryCode('xz'));
		});
	});
	describe('countries.getData()', function() {
		it("should return data given a country code.", function() {
			assert.notStrictEqual(countries.getData('us'), null);
		});
		it("should return null given an invalid country code.", function() {
			assert.strictEqual(countries.getData('xz'), null);
		});
		it("should return data given a country code and key.", function() {
			assert.strictEqual(countries.getData('us', 'capital'), 'Washington D.C.');
		});
		it("should return data given an invalid country code and an otherwise-valid key.", function() {
			assert.strictEqual(countries.getData('xz', 'capital'), null);
		});
		it("should return null given a country code and an invalid key.", function() {
			assert.strictEqual(countries.getData('us', 'nope'), null);
		});
	});
});

var assert = require('assert');

var UDPApp = require('../udpapp');

describe('UDPApp', function() {
	describe('new UDPApp()', function() {
		it("should construct correctly.", function() {
			assert.doesNotThrow(
				function() {
					new UDPApp({
						dbfilename: ":memory:",
						port: 16666
					});
				}
			);
		});
		it("should throw a worthwhile exception without new.", function() {
			assert.throws(
				function() {
					UDPApp({
						dbfilename: ":memory:",
						port: 16666
					});
				},
				function(err) {
					if (err instanceof TypeError) {
						return true;
					}
				}
			);
		});
		it("should throw on missing dbfilename.", function() {
			assert.throws(
				function() {
					UDPApp({
						port: 16666
					});
				},
				function(err) {
					if (err instanceof Error) {
						return true;
					}
				}
			);
		});
		it("should throw on missing port.", function() {
			assert.throws(
				function() {
					UDPApp({
						dbfilename: ":memory:"
					});
				},
				function(err) {
					if (err instanceof Error) {
						return true;
					}
				}
			);
		});
	});
});

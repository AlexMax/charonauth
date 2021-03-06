/* jshint node: true */
"use strict";

var Promise = require('bluebird');

module.exports = function(user, session) {
	return Promise.all([
		user.find({ username: 'username' }),
		session.findOrCreate({
			where: {session: 123456},
			defaults: {
				ephemeral: new Buffer('0f49b565190f4edb74db1d7fc468323e45aff13246287bf383807136c9c0f8bd93cc3e8f67017142750f526835981ad7d3b786c9fc72905b6f80491f11f0f28b3336f8e59d220f87d08ca14e5d4a810e43c5920dae4d4a360a12525e50486ca2f7c3ae3f792c7005bd954f6b0080622341d3f6a9074b46495feaecfe0872afe499461dbc17348d96be2559ce9028c98b051b944bd11e3e72fc370c4f6ffecbf8ddeabde518a69c7f10e4507f65ecdc61273ea6403642f888ff3b015bf32587a20372ef34b3cf84dbda28b4dcf1bce2980d06b75abba97eb7cd4599faad07cb229213c244c498de69e0487217cda4abded2069138e76631fa3622de9d356edc43', 'hex'),
				secret: new Buffer('334d31b26d2ea155626d00235310749a7e70cf2d10e648d8892d1c6156dde8db', 'hex')
			}
		})
	]).spread(function(use, ses) {
		return ses[0].setUser(use);
	});
}

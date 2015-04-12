/* jshint node: true */
"use strict";

var Promise = require('bluebird');

module.exports = function(user, session) {
	return Promise.all([
		user.find({ username: 'username' }),
		session.findOrCreate({ where: { session: 123456 }})
	]).spread(function(use, ses) {
		return ses[0].setUser(use);
	});
}

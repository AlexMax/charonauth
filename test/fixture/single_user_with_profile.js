/* jshint node: true */
"use strict";

var Promise = require('bluebird');

module.exports = function(User, Profile) {
	return User.findOrCreate({
		where: {username: "username"},
		defaults: {
			active: true,
			email: "example@example.com",
			verifier: new Buffer('9E47B7B1156178E359876C77272D6FF1A3D411AF95F2C266998B783466E384FA922C7802C8B62C2A7C8E1ECB765932AC81377ED6FFE3B8F1CF137BCB92EB359263008BE6094AB144A51BE8DE009E142974FC5063F52895EB32FA04698939123B145543D736B19DABE22D391FC2AD4C00D2E156105F5996F5E108D36E6A9D84D650A2A5B96703AEA0D12E88F45BDA4EF9F02DE19187FD99A35F33204363E490784FB4E4FA7D10DCBA1CA8508EB8846F0B781D10ADC5404C74444910730E2560967C1A1785254A7B403831FE9A69F2E41F0818F1898F8D4432122828A1CD8F958826470898185DA450D405DA15E6B286EC6523A91DE0AC6C543D19D5785FF42563', 'hex'),
			salt: new Buffer('615A9E29', 'hex'),
			access: "OWNER",
		}
	}).then(function(user) {
		return Promise.all([user, Profile.findOrCreate({
			where: {UserId: user.id},
			defaults: {
				username: "Username"
			}
		})]);
	}).spread(function(user, profile) {
		return user[0].setProfile(profile[0]);
	});
}

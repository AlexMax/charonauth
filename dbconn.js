var Sequelize = require('sequelize');

// DBConn
//
// Handles communication with the database.

// Constructor
var DBConn = function(config, callback) {
	var self = this;
	this._db = new Sequelize(config.connection);
	this._db.authenticate().complete(function(error) {
		if (error) {
			throw error;
		} else {
			callback.call(self);
		}
	});
};

// Object methods
DBConn.prototype = {
	
};

module.exports = DBConn;

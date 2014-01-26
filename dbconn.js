var sqlite3 = require('sqlite3');

// DBConn
//
// Handles communication with the database.

// Constructor
var DBConn = function(config) {
	this.db = new sqlite3.Database(config.filename);
};

// Object methods
DBConn.prototype = { };

module.exports = DBConn;

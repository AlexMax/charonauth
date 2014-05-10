/* jshint node: true */
"use strict";

var child_process = require('child_process');

child_process.fork('webmaster');
child_process.fork('authmaster');

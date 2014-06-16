/* jshint node: true */
"use strict";

// UserNotFoundError
//
// Thrown when a user can't be found in the database

function UserNotFoundError(message) {
    this.message = message;
    this.name = "UserNotFoundError";
    Error.captureStackTrace(this, UserNotFoundError);
}
UserNotFoundError.prototype = Object.create(Error.prototype);
UserNotFoundError.prototype.constructor = UserNotFoundError;

function SessionAuthFailedError(message) {
    this.message = message;
    this.name = "SessionAuthFailedError";
    Error.captureStackTrace(this, SessionAuthFailedError);
}
SessionAuthFailedError.prototype = Object.create(Error.prototype);
SessionAuthFailedError.prototype.constructor = SessionAuthFailedError;

module.exports.UserNotFound = UserNotFoundError;
module.exports.SessionAuthFailed = SessionAuthFailedError;

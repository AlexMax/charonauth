/* jshint node: true */
"use strict";

// IgnorableProtocolError
//
// Thrown when the server cannot decode an incoming message and should
// not reply to the sender.

function IgnorableProtocolError(message) {
    this.message = message;
    this.name = "IgnorableProtocolError";
    Error.captureStackTrace(this, IgnorableProtocolError);
}
IgnorableProtocolError.prototype = Object.create(Error.prototype);
IgnorableProtocolError.prototype.constructor = IgnorableProtocolError;

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

// SessionAuthFailedError
//
// Thrown when an authentication attempt has failed

function SessionAuthFailedError(message) {
    this.message = message;
    this.name = "SessionAuthFailedError";
    Error.captureStackTrace(this, SessionAuthFailedError);
}
SessionAuthFailedError.prototype = Object.create(Error.prototype);
SessionAuthFailedError.prototype.constructor = SessionAuthFailedError;

module.exports.IgnorableProtocol = IgnorableProtocolError;
module.exports.UserNotFound = UserNotFoundError;
module.exports.SessionAuthFailed = SessionAuthFailedError;

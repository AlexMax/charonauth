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

// FormValidationError
//
// Thrown when a form validator cannot validate a form.

function FormValidationError(message, invalidFields) {
    this.message = message;
    this.name = "FormValidationError";
		this.invalidFields = invalidFields;
    Error.captureStackTrace(this, FormValidationError);
}
FormValidationError.prototype = Object.create(Error.prototype);
FormValidationError.prototype.constructor = FormValidationError;

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

// SessionNotFoundError
//
// Thrown when a session can't be found in the database

function SessionNotFoundError(message) {
    this.message = message;
    this.name = "SessionNotFoundError";
    Error.captureStackTrace(this, SessionNotFoundError);
}
SessionNotFoundError.prototype = Object.create(Error.prototype);
SessionNotFoundError.prototype.constructor = SessionNotFoundError;

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

// LoginAuthFailedError
//
// Thrown when an plaintext login attempt has failed

function LoginAuthFailedError(message) {
    this.message = message;
    this.name = "LoginAuthFailedError";
    Error.captureStackTrace(this, LoginAuthFailedError);
}
LoginAuthFailedError.prototype = Object.create(Error.prototype);
LoginAuthFailedError.prototype.constructor = LoginAuthFailedError;

module.exports.IgnorableProtocol = IgnorableProtocolError;
module.exports.FormValidation = FormValidationError;
module.exports.UserNotFound = UserNotFoundError;
module.exports.SessionNotFound = SessionNotFoundError;
module.exports.SessionAuthFailed = SessionAuthFailedError;
module.exports.LoginAuthFailed = LoginAuthFailedError;

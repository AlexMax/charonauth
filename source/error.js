/* jshint node: true */
"use strict";

// NotFoundError
//
// Thrown when the webserver can't find a webpage.

function NotFoundError(message) {
	this.name = "NotFoundError";
	this.message = message;
	Error.captureStackTrace(this, NotFoundError);
}
NotFoundError.prototype = Object.create(Error.prototype);
NotFoundError.prototype.constructor = NotFoundError;

// ForbiddenError
//
// Thrown when the webserver can't show a webpage.

function ForbiddenError(message) {
	this.name = "ForbiddenError";
	this.message = message;
	Error.captureStackTrace(this, ForbiddenError);
}
ForbiddenError.prototype = Object.create(Error.prototype);
ForbiddenError.prototype.constructor = ForbiddenError;

// IgnorableProtocolError
//
// Thrown when the server cannot decode an incoming message and should
// not reply to the sender.

function IgnorableProtocolError(message) {
	this.name = "IgnorableProtocolError";
	this.message = message;
	Error.captureStackTrace(this, IgnorableProtocolError);
}
IgnorableProtocolError.prototype = Object.create(Error.prototype);
IgnorableProtocolError.prototype.constructor = IgnorableProtocolError;

// FormValidationError
//
// Thrown when a form validator cannot validate a form.

function FormValidationError(message, invalidFields) {
	this.name = "FormValidationError";
	this.message = message;
	this.invalidFields = invalidFields;
	Error.captureStackTrace(this, FormValidationError);
}
FormValidationError.prototype = Object.create(Error.prototype);
FormValidationError.prototype.constructor = FormValidationError;

// UserNotFoundError
//
// Thrown when a user can't be found in the database

function UserNotFoundError(message, username) {
	this.name = "UserNotFoundError";
	this.message = message;
	this.username = username;
	Error.captureStackTrace(this, UserNotFoundError);
}
UserNotFoundError.prototype = Object.create(Error.prototype);
UserNotFoundError.prototype.constructor = UserNotFoundError;

// VerifyNotFoundError
//
// Thrown when a verify can't be found in the database

function VerifyNotFoundError(message) {
	this.name = "VerifyNotFoundError";
	this.message = message;
	Error.captureStackTrace(this, VerifyNotFoundError);
}
VerifyNotFoundError.prototype = Object.create(Error.prototype);
VerifyNotFoundError.prototype.constructor = VerifyNotFoundError;

// ResetNotFoundError
//
// Thrown when a reset can't be found in the database

function ResetNotFoundError(message) {
	this.name = "ResetNotFoundError";
	this.message = message;
	Error.captureStackTrace(this, ResetNotFoundError);
}
ResetNotFoundError.prototype = Object.create(Error.prototype);
ResetNotFoundError.prototype.constructor = ResetNotFoundError;

// SessionNotFoundError
//
// Thrown when a session can't be found in the database

function SessionNotFoundError(message, session) {
	this.name = "SessionNotFoundError";
	this.message = message;
	this.session = session;
	Error.captureStackTrace(this, SessionNotFoundError);
}
SessionNotFoundError.prototype = Object.create(Error.prototype);
SessionNotFoundError.prototype.constructor = SessionNotFoundError;

// SessionAuthFailedError
//
// Thrown when an authentication attempt has failed

function SessionAuthFailedError(message, session) {
	this.name = "SessionAuthFailedError";
	this.message = message;
	this.session = session;
	Error.captureStackTrace(this, SessionAuthFailedError);
}
SessionAuthFailedError.prototype = Object.create(Error.prototype);
SessionAuthFailedError.prototype.constructor = SessionAuthFailedError;

// LoginAuthFailedError
//
// Thrown when an plaintext login attempt has failed

function LoginAuthFailedError(message) {
	this.name = "LoginAuthFailedError";
	this.message = message;
	Error.captureStackTrace(this, LoginAuthFailedError);
}
LoginAuthFailedError.prototype = Object.create(Error.prototype);
LoginAuthFailedError.prototype.constructor = LoginAuthFailedError;

module.exports.NotFound = NotFoundError;
module.exports.Forbidden = ForbiddenError;
module.exports.IgnorableProtocol = IgnorableProtocolError;
module.exports.FormValidation = FormValidationError;
module.exports.UserNotFound = UserNotFoundError;
module.exports.VerifyNotFound = VerifyNotFoundError;
module.exports.ResetNotFound = ResetNotFoundError;
module.exports.SessionNotFound = SessionNotFoundError;
module.exports.SessionAuthFailed = SessionAuthFailedError;
module.exports.LoginAuthFailed = LoginAuthFailedError;

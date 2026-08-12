export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message || "Validation failed", 400);
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message) {
    super(message || "Authentication failed", 401);
    this.code = "AUTHENTICATION_ERROR";
  }
}

export class AuthorizationError extends AppError {
  constructor(message) {
    super(message || "Not authorized to access this resource", 403);
    this.code = "AUTHORIZATION_ERROR";
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message || "Resource not found", 404);
    this.code = "NOT_FOUND_ERROR";
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message || "Resource already exists or conflicts", 409);
    this.code = "CONFLICT_ERROR";
  }
}

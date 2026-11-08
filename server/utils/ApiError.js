/**
 * Operational HTTP error.
 * Centralised error middleware turns these into consistent JSON responses
 * with the correct status code (400/404/409/502/503...).
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined, code = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'AI returned an unusable response', details) {
    return new ApiError(502, message, details, 'AI_INVALID_RESPONSE');
  }

  static notConfigured(message, code = 'NOT_CONFIGURED') {
    return new ApiError(503, message, undefined, code);
  }
}

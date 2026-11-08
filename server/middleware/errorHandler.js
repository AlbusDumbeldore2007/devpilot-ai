import { ApiError } from '../utils/ApiError.js';

/** 404 handler for unmatched routes — RESTful "resource not found". */
export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * CENTRALIZED ERROR HANDLING MIDDLEWARE
 * Every error in the app funnels here. Known infrastructure errors (Mongoose
 * validation, bad ObjectId casts, duplicate keys, malformed JSON) are mapped
 * to proper JSON responses with appropriate HTTP status codes.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let details = err.details;
  let code = err.code;

  // Mongoose schema validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed.';
    details = Object.values(err.errors).map((item) => item.message);
  }

  // Invalid ObjectId or type cast
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}".`;
    details = [String(err.value)];
  }

  // Unique index violation
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists.';
    details = Object.keys(err.keyValue || {});
    code = 'DUPLICATE_KEY';
  }

  // Body parser / malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
  }

  if (statusCode >= 500) {
    console.error('\x1b[31m[error]\x1b[0m', err);
  }

  const payload = {
    success: false,
    message,
    ...(code && { code }),
    ...(details && { details: Array.isArray(details) ? details : [details] }),
    ...(process.env.NODE_ENV !== 'production' && !err.isOperational && statusCode >= 500 && { stack: err.stack }),
  };

  res.status(statusCode).json(payload);
}

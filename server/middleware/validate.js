import { ApiError } from '../utils/ApiError.js';
import { isDatabaseReady } from '../config/db.js';

/**
 * Validation middleware factory.
 * The validator returns `{ values, errors }`. On failure a 400 is raised;
 * on success the sanitised values replace `req.body`.
 */
export function validateBody(validator, options = {}) {
  return (req, res, next) => {
    const { values, errors } = validator(req.body ?? {}, options);
    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed.', errors));
    }
    req.body = values;
    return next();
  };
}

/** Ensures a route param is a syntactically valid MongoDB ObjectId. */
export function validateObjectIdParam(param = 'id') {
  return (req, res, next) => {
    const value = req.params[param];
    if (!value || !/^[a-f\d]{24}$/i.test(value)) {
      return next(ApiError.badRequest(`Invalid ${param}: expected a 24-character MongoDB ObjectId.`));
    }
    return next();
  };
}

/**
 * Degraded-mode guard: if MongoDB is unavailable, return a useful 503 with
 * configuration guidance instead of letting queries hang or crash.
 */
export function requireDatabase(req, res, next) {
  if (isDatabaseReady()) return next();

  return next(
    new ApiError(
      503,
      'Database is not connected. Set MONGODB_URI in server/.env, start MongoDB, then restart the API.',
      undefined,
      'DATABASE_NOT_CONFIGURED'
    )
  );
}

import { ApiError } from '../utils/ApiError.js';
import { isPostgresReady, pingPostgres } from '../config/prisma.js';
import { isDatabaseReady as isMongoReady } from '../config/db.js';
import { isPrismaId } from '../utils/schemas.js';

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

/** Ensures a route param is a syntactically valid Prisma cuid/uuid identifier. */
export function validateObjectIdParam(param = 'id') {
  return (req, res, next) => {
    const value = req.params[param];
    if (!isPrismaId(value)) {
      return next(ApiError.badRequest(`Invalid ${param}: expected a valid resource identifier.`));
    }
    return next();
  };
}

/**
 * Degraded-mode guard: if PostgreSQL is unavailable, return a useful 503 with
 * configuration guidance instead of letting queries hang or crash.
 */
export async function requireDatabase(req, res, next) {
  if (isPostgresReady()) return next();
  const online = await pingPostgres();
  if (online) return next();

  return next(
    new ApiError(
      503,
      'PostgreSQL is not connected. Run `npm run dev:services` or set DATABASE_URL, then restart the API.',
      undefined,
      'DATABASE_NOT_CONFIGURED'
    )
  );
}

/** MongoDB is optional metadata storage; routes degrade gracefully. */
export function requireMongo(req, res, next) {
  if (isMongoReady()) return next();
  return next(
    new ApiError(
      503,
      'MongoDB is not connected. Set MONGODB_URI and start MongoDB (or use docker compose) to use AI metadata.',
      undefined,
      'MONGO_NOT_CONFIGURED'
    )
  );
}

/**
 * PostgreSQL readiness guard: if PostgreSQL is available, proceed;
 * otherwise return 503 with configuration guidance.
 */
export async function requirePostgres(req, res, next) {
  if (isPostgresReady()) return next();
  const online = await pingPostgres();
  if (online) return next();

  return next(
    new ApiError(
      503,
      'PostgreSQL is not connected. Run `npm run dev:services` or set DATABASE_URL with pgvector, then restart the API.',
      undefined,
      'DATABASE_NOT_CONFIGURED'
    )
  );
}

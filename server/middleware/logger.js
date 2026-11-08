/**
 * Request + response logging middleware.
 * Logs method, path, status code and duration in a compact, readable format.
 */
export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const timestamp = new Date().toISOString().slice(11, 19);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const status = res.statusCode;
    const color =
      status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';

    console.log(
      `\x1b[90m${timestamp}\x1b[0m ${color}${status}\x1b[0m ${req.method.padEnd(6)} ${req.originalUrl} \x1b[90m${durationMs.toFixed(1)}ms\x1b[0m`
    );
  });

  next();
}

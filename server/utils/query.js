/** Escape user input before building a case-insensitive MongoDB regex. */
export const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse a simple sort query (`deadline`, `-createdAt`) against an allow-list,
 * preventing arbitrary field injection through the query string.
 */
export function parseSort(sortParam, allowed, fallback) {
  if (!sortParam) return fallback;
  const descending = String(sortParam).startsWith('-');
  const key = String(sortParam).replace(/^-/, '');
  const field = allowed[key];
  if (!field) return fallback;
  return { [field]: descending ? -1 : 1 };
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;

/**
 * Plain-text sanitisation. DevPilot stores text, never HTML, so tags are
 * removed and control characters are stripped before validation/storage.
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\u0000/g, '')
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAG, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Multi-line text keeps paragraph breaks but still removes markup. */
export function sanitizeMultiline(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\u0000/g, '')
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAG, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeFilename(value) {
  return String(value || 'document')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(CONTROL_CHARS, '')
    .slice(0, 180);
}

export function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

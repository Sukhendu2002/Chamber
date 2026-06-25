/**
 * Minimal input sanitization for user-generated content.
 * Prevents XSS via HTML escaping and path traversal via filename sanitization.
 */

// ponytail: one file covers all sanitization, no extra deps

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Sanitize text for Telegram HTML messages (alias for escapeHtml) */
export function sanitizeTelegramHtml(str: string): string {
  return escapeHtml(str);
}

/** Sanitize file extension, strip non-alphanumeric chars */
export function sanitizeExtension(filename: string): string {
  const ext = filename.split(".").pop() || "jpg";
  return ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "jpg";
}



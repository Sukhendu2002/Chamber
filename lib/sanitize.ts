const ALLOWED_UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Sanitize text for Telegram HTML messages (alias for escapeHtml) */
export function sanitizeTelegramHtml(str: string | null | undefined): string {
  return escapeHtml(str);
}

export function getSafeUploadExtension(mimeType: string): string | null {
  return ALLOWED_UPLOAD_TYPES[mimeType as keyof typeof ALLOWED_UPLOAD_TYPES] ?? null;
}

export function isAllowedUploadMimeType(mimeType: string): boolean {
  return getSafeUploadExtension(mimeType) !== null;
}

export function getSafeReceiptHeaders(contentType: string | undefined): {
  contentType: string;
  contentDisposition: "inline" | "attachment";
} {
  if (contentType && isAllowedUploadMimeType(contentType)) {
    return { contentType, contentDisposition: "inline" };
  }

  return {
    contentType: "application/octet-stream",
    contentDisposition: "attachment",
  };
}


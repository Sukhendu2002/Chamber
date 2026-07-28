import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  getSafeReceiptHeaders,
  getSafeUploadExtension,
  isAllowedUploadMimeType,
  MAX_UPLOAD_SIZE_BYTES,
  sanitizeTelegramHtml,
} from "@/lib/sanitize";

describe("sanitization helpers", () => {
  it("escapes Telegram HTML special characters", () => {
    expect(escapeHtml(`<script data-test="x">Tom & Jerry's</script>`)).toBe(
      "&lt;script data-test=&quot;x&quot;&gt;Tom &amp; Jerry&#x27;s&lt;/script&gt;"
    );
    expect(sanitizeTelegramHtml(null)).toBe("");
  });

  it("derives extensions only from allowed MIME types", () => {
    expect(getSafeUploadExtension("image/jpeg")).toBe("jpg");
    expect(getSafeUploadExtension("image/png")).toBe("png");
    expect(getSafeUploadExtension("image/webp")).toBe("webp");
    expect(getSafeUploadExtension("application/pdf")).toBe("pdf");
    expect(getSafeUploadExtension("text/html")).toBeNull();
    expect(isAllowedUploadMimeType("image/svg+xml")).toBe(false);
  });

  it("serves unknown legacy content as a download", () => {
    expect(getSafeReceiptHeaders("image/png")).toEqual({
      contentType: "image/png",
      contentDisposition: "inline",
    });
    expect(getSafeReceiptHeaders("text/html")).toEqual({
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
    });
  });

  it("limits uploads to 10 MB", () => {
    expect(MAX_UPLOAD_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

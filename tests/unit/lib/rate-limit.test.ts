import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow first request", () => {
    const result = checkRateLimit("test-key", 5, 10_000);
    expect(result.success).toBe(true);
    expect(result.retryAfter).toBe(0);
  });

  it("should allow up to max requests in the window", () => {
    const key = "burst-key";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 10_000);
      expect(result.success).toBe(true);
    }
  });

  it("should block requests exceeding the limit", () => {
    const key = "exceed-key";
    const max = 3;

    for (let i = 0; i < max; i++) {
      checkRateLimit(key, max, 10_000);
    }

    const result = checkRateLimit(key, max, 10_000);
    expect(result.success).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should reset after window expires", () => {
    const key = "reset-key";

    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 10_000);
    }

    // Exhausted
    expect(checkRateLimit(key, 3, 10_000).success).toBe(false);

    // Advance past window
    vi.advanceTimersByTime(10_001);

    // Should reset
    const result = checkRateLimit(key, 3, 10_000);
    expect(result.success).toBe(true);
  });

  it("should track keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("key-a", 5, 10_000);
    }

    // key-a is exhausted
    expect(checkRateLimit("key-a", 5, 10_000).success).toBe(false);

    // key-b is fresh
    expect(checkRateLimit("key-b", 5, 10_000).success).toBe(true);
  });
});

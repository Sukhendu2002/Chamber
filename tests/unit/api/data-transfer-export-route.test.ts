import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  generateUserExport: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/data-transfer/export", () => ({
  generateUserExport: mocks.generateUserExport,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));

describe("data export route", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ userId: "test-user-id" });
    mocks.checkRateLimit.mockReturnValue({ success: true, retryAfter: 0 });
    mocks.generateUserExport.mockResolvedValue({
      body: Buffer.from("export"),
      contentType: "application/json",
      fileName: "chamber-export.json",
      recordCount: 3,
      encrypted: false,
    });
  });

  it("rejects unauthenticated downloads", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    const { POST } = await import("@/app/api/data-transfer/export/route");
    const response = await POST(
      new Request("http://localhost/api/data-transfer/export", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.generateUserExport).not.toHaveBeenCalled();
  });

  it("returns a useful client error for malformed requests", async () => {
    const { POST } = await import("@/app/api/data-transfer/export/route");
    const response = await POST(
      new Request("http://localhost/api/data-transfer/export", {
        method: "POST",
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON request" });
  });

  it("returns private no-store downloads with record metadata", async () => {
    const { POST } = await import("@/app/api/data-transfer/export/route");
    const response = await POST(
      new Request("http://localhost/api/data-transfer/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
          sections: ["expenses"],
          range: "all",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Record-Count")).toBe("3");
    expect(response.headers.get("Content-Disposition")).toContain("chamber-export.json");
  });
});

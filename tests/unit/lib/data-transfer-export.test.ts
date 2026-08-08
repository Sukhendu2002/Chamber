import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

const mocks = vi.hoisted(() => ({
  userSettings: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userSettings: mocks.userSettings,
  },
}));

describe("data export generation", () => {
  beforeEach(() => {
    mocks.userSettings.findUnique.mockResolvedValue({
      id: "settings-id",
      userId: "test-user-id",
      currency: "INR",
      monthlyBudget: 50_000,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("creates a complete JSON export with ISO dates", async () => {
    const { generateUserExport } = await import("@/lib/data-transfer/export");
    const generated = await generateUserExport("test-user-id", {
      format: "json",
      sections: ["settings"],
      range: "all",
    });
    const payload = JSON.parse(generated.body.toString("utf8")) as {
      data: { settings: Array<Record<string, unknown>> };
    };

    expect(generated.contentType).toBe("application/json");
    expect(generated.recordCount).toBe(1);
    expect(payload.data.settings[0]).toEqual(
      expect.objectContaining({
        currency: "INR",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("encrypts exports without retaining the password in the envelope", async () => {
    const { generateUserExport } = await import("@/lib/data-transfer/export");
    const generated = await generateUserExport("test-user-id", {
      format: "json",
      sections: ["settings"],
      range: "all",
      encryptionPassword: "correct horse battery staple",
    });
    const envelope = JSON.parse(generated.body.toString("utf8")) as Record<string, unknown>;

    expect(generated.encrypted).toBe(true);
    expect(generated.fileName).toMatch(/\.json\.chamber$/);
    expect(envelope.algorithm).toBe("AES-256-GCM");
    expect(envelope).not.toHaveProperty("password");
    expect(envelope.ciphertext).toEqual(expect.any(String));
  });

  it("creates usable CSV, Excel, and PDF files", async () => {
    const { generateUserExport } = await import("@/lib/data-transfer/export");
    const request = {
      sections: ["settings"] as const,
      range: "all" as const,
    };

    const [csv, excel, pdf] = await Promise.all([
      generateUserExport("test-user-id", { ...request, format: "csv" }),
      generateUserExport("test-user-id", { ...request, format: "xlsx" }),
      generateUserExport("test-user-id", { ...request, format: "pdf" }),
    ]);
    const archive = await JSZip.loadAsync(csv.body);

    expect(archive.file("settings.csv")).not.toBeNull();
    expect(excel.body.subarray(0, 2).toString()).toBe("PK");
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
  });
});

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/capture/share/route";

describe("PWA share target fallback", () => {
  it("redirects to a recoverable error when no service worker intercepts the POST", async () => {
    const request = new NextRequest("https://chamber.example/capture/share", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://chamber.example/capture?source=share-unavailable",
    );
  });
});

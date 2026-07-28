import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface WebAppManifest {
  display?: string;
  icons?: Array<{ sizes?: string; purpose?: string }>;
  shortcuts?: Array<{ url?: string }>;
  share_target?: {
    action?: string;
    method?: string;
    enctype?: string;
    params?: {
      files?: Array<{ name?: string; accept?: string[] }>;
    };
  };
}

function readManifest(): WebAppManifest {
  const manifestPath = resolve(process.cwd(), "public/manifest.webmanifest");
  return JSON.parse(readFileSync(manifestPath, "utf8")) as WebAppManifest;
}

describe("PWA manifest", () => {
  it("defines an installable standalone experience with launcher icons", () => {
    const manifest = readManifest();

    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("provides manual and screenshot launcher shortcuts", () => {
    const manifest = readManifest();

    expect(manifest.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      "/capture?mode=manual&source=shortcut",
      "/capture?mode=screenshot&source=shortcut",
    ]);
  });

  it("registers an Android image share target", () => {
    const manifest = readManifest();

    expect(manifest.share_target).toEqual({
      action: "/capture/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        files: [
          {
            name: "receipt",
            accept: ["image/jpeg", "image/png", "image/webp"],
          },
        ],
      },
    });
  });
});

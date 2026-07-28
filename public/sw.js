/* global caches */

const STATIC_CACHE = "chamber-static-v1";
const SHARE_CACHE = "chamber-share-v1";
const SHARED_RECEIPT_PATH = "/__chamber_shared_receipt__";
const OFFLINE_PATH = "/offline";
const STATIC_ASSETS = [
  OFFLINE_PATH,
  "/manifest.webmanifest",
  "/icons/chamber-192.png",
  "/icons/chamber-512.png",
  "/icons/chamber-maskable-512.png",
];
const ALLOWED_SHARE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SHARE_SIZE = 10 * 1024 * 1024;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("chamber-static-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === "POST" &&
    url.origin === self.location.origin &&
    url.pathname === "/capture/share"
  ) {
    event.respondWith(handleSharedScreenshot(event.request));
    return;
  }

  if (
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    url.pathname === SHARED_RECEIPT_PATH
  ) {
    event.respondWith(consumeSharedScreenshot());
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(OFFLINE_PATH);
        return cached || new Response("Chamber is offline.", { status: 503 });
      }),
    );
    return;
  }

  if (
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
  }
});

async function handleSharedScreenshot(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("receipt");

    if (
      !(file instanceof File) ||
      !ALLOWED_SHARE_TYPES.has(file.type) ||
      file.size <= 0 ||
      file.size > MAX_SHARE_SIZE
    ) {
      return redirectToCapture("invalid-share");
    }

    const cache = await caches.open(SHARE_CACHE);
    const cacheKey = new Request(new URL(SHARED_RECEIPT_PATH, self.location.origin));
    const safeName = encodeURIComponent(file.name || "payment-screenshot");
    await cache.put(
      cacheKey,
      new Response(file, {
        headers: {
          "Content-Type": file.type,
          "Content-Length": String(file.size),
          "X-Chamber-Filename": safeName,
          "Cache-Control": "no-store",
        },
      }),
    );

    return redirectToCapture("share");
  } catch {
    return redirectToCapture("share-failed");
  }
}

async function consumeSharedScreenshot() {
  const cache = await caches.open(SHARE_CACHE);
  const cacheKey = new Request(new URL(SHARED_RECEIPT_PATH, self.location.origin));
  const response = await cache.match(cacheKey);

  if (!response) {
    return new Response("No shared screenshot is available.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  await cache.delete(cacheKey);
  return response;
}

function redirectToCapture(source) {
  const url = new URL("/capture", self.location.origin);
  url.searchParams.set("source", source);
  return Response.redirect(url.href, 303);
}

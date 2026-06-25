import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://chamber.vercel.app; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://api.telegram.org https://openrouter.ai https://api.exchangerate-api.com wss://chamber.vercel.app; " +
              "frame-src 'self' https://chamber.vercel.app; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        source: "/api/telegram/webhook",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { join } from "node:path";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../.."),
  transpilePackages: ["@hinario/music-engine", "@hinario/pedagogical-assistant", "@hinario/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
      },
      {
        urlPattern: /\/api\/hymns\/.*/,
        handler: "NetworkFirst",
        options: { cacheName: "hymns-api", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } }
      },
      {
        urlPattern: /\/api\/ava.*/,
        handler: "NetworkFirst",
        options: { cacheName: "ava-api", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } }
      },
      {
        urlPattern: /\/api\/podcasts.*/,
        handler: "NetworkFirst",
        options: { cacheName: "podcasts-api", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } }
      }
    ]
  }
})(nextConfig);

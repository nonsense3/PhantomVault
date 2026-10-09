import type { NextConfig } from "next";

// Sanitize non-standard NODE_ENV values from hosting environments
if (process.env.NODE_ENV) {
  const clean = process.env.NODE_ENV.trim().replace(/^['"]|['"]$/g, "");
  (process.env as Record<string, string | undefined>).NODE_ENV =
    ["production", "development", "test"].includes(clean) ? clean : "production";
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // PRD 9.1 rule 4: never advertise the stack (no X-Powered-By, no browser source maps).
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Session cookies + live data everywhere: classic dynamic rendering keeps this simple.
  cacheComponents: false,
  experimental: {
    cpus: 2,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

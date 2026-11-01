import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  // HSTS only when the app is served over HTTPS (never on http://localhost, where it would pin the browser to HTTPS).
  ...((process.env.APP_URL ?? "").startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must be re-checked on every visit so a fix reaches phones on the next online load.
      { source: "/field-sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Content-Type", value: "text/javascript; charset=utf-8" }] },
    ];
  },
};

export default nextConfig;

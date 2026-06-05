/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => "v3-direct-supabase-" + Date.now(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    // Static assets — cache aggressively
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    // API read routes — stale-while-revalidate for 60s
    {
      source: "/api/leaderboard",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
      ],
    },
    {
      source: "/api/feed",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
      ],
    },
    {
      source: "/api/dashboard",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
      ],
    },
    // Pages — allow browser caching with revalidation
    {
      source: "/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;

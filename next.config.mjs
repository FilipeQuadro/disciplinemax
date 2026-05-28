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
    {
      source: "/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;

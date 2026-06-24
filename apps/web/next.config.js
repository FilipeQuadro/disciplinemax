/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@disciplina-app/shared", "@disciplina-app/ui"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/:path*`,
      },
      {
        source: "/kairos/:path*",
        destination: `${process.env.NEXT_PUBLIC_KAIROS_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

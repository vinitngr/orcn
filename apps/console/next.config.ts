import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Config-level redirects avoid calling redirect() during React render,
    // which triggers a Turbopack/React Performance.measure negative-timestamp
    // error in next dev (vercel/next.js#86060).
    return [
      {
        source: "/",
        destination: "/deployments",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/deployments",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8080/api/v1/:path*", // Proxy to Go Gateway via IPv4
      },
    ];
  },
};

export default nextConfig;

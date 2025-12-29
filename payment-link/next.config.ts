import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "echokit.dev" },
      { protocol: "https", hostname: "www.x402.org" },
    ],
  },
};

export default nextConfig;

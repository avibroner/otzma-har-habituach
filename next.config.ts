import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.otzma-ins.co.il",
      },
    ],
  },
};

export default nextConfig;

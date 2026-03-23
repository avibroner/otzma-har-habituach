import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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

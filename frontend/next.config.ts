import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.43",
    "192.168.1.43:3000",
    "localhost:3000",
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone output
  output: "standalone",
};

export default nextConfig;

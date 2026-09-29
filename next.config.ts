import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 127.0.0.1 and localhost are different origins to the dev server.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

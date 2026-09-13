import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default config;

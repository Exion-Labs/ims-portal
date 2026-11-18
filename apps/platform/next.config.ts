import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ims/ui", "@ims/api-client"],
};

export default nextConfig;

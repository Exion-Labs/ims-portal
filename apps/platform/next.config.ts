import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/platform",
  transpilePackages: ["@ims/ui", "@ims/api-client"],
};

export default nextConfig;

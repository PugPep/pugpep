import type { NextConfig } from "next";

const sharpRuntimeFiles = [
  "./node_modules/sharp/**/*",
  "./node_modules/@img/sharp-*/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/admin/product-image-engine/preview": sharpRuntimeFiles,
    "/api/admin/product-image-engine/generate": sharpRuntimeFiles,
  },
};

export default nextConfig;

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
  async redirects() {
    return [
      {
        source: "/products/WOLVERINE",
        destination: "/products/bpc-157-tb-500",
        permanent: true,
      },
      {
        source: "/products/wolverine",
        destination: "/products/bpc-157-tb-500",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
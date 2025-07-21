/* eslint-disable @typescript-eslint/no-explicit-any */
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["lightningcss"],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.externals.push("lightningcss");
    }
    return config;
  },
};

module.exports = nextConfig;

export default nextConfig;

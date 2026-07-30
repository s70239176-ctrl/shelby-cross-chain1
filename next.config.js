/** @type {import('next').NextConfig} */
const nextConfig = {
  // No output:"standalone" — Vercel handles its own output format
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: [
    "@shelby-protocol/sdk",
    "@aptos-labs/ts-sdk",
    "@aptos-labs/aptos-client",
  ],
};
module.exports = nextConfig;

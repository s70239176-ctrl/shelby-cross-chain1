/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Prevent webpack from trying to bundle Node.js-only packages (got, etc.)
  // that are deep dependencies of @aptos-labs/ts-sdk.
  // These packages are only used at runtime in server components/API routes,
  // never bundled into client JS.
  serverExternalPackages: [
    "@aptos-labs/ts-sdk",
    "@aptos-labs/aptos-client",
    "@aptos-labs/wallet-standard",
    "@wallet-standard/core",
  ],
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Keep all Aptos/Shelby packages server-side only — they use Node.js APIs
  // (got, fs, etc.) that webpack can't bundle for the browser.
  serverExternalPackages: [
    "@shelby-protocol/sdk",
    "@aptos-labs/ts-sdk",
    "@aptos-labs/aptos-client",
  ],
};
module.exports = nextConfig;

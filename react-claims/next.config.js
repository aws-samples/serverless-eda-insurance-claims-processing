/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // Static export — produces an `out/` directory deployable to S3+CloudFront
  output: "export",
  // Pin the workspace root (repo has a root package-lock.json too)
  outputFileTracingRoot: path.join(__dirname),
  // Disable image optimization (not supported with static export)
  images: {
    unoptimized: true,
  },
  // Trailing slashes for S3 compatibility
  trailingSlash: true,
};

module.exports = nextConfig;

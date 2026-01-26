import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip trailing slash redirect for API routes
  // This prevents 307 redirects that can break POST requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

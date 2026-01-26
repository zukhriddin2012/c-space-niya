import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable trailing slash to prevent 307 redirects on POST requests
  trailingSlash: false,
  // Skip trailing slash redirect for API routes
  skipTrailingSlashRedirect: true,
  // Ensure API routes work correctly
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;

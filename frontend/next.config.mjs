import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Here we use the @cloudflare/next-on-pages next-dev module to allow us to use bindings during local development
// (when running the application with `next dev`), for more information see:
// https://github.com/cloudflare/next-on-pages/blob/main/internal-packages/next-dev/README.md
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly load environment variables
  env: {
    XATA_API_KEY: process.env.XATA_API_KEY,
    XATA_BRANCH: process.env.XATA_BRANCH || 'main',
    XATA_DATABASE_URL: process.env.XATA_DATABASE_URL
  },
  
  // Additional webpack configuration to ensure env vars are available
  webpack: (config, { isServer }) => {
    // Log environment variables during build
    if (isServer) {
      console.log('Server-side Environment Variables:', {
        XATA_API_KEY: process.env.XATA_API_KEY ? '[REDACTED]' : 'UNDEFINED',
        XATA_BRANCH: process.env.XATA_BRANCH,
        XATA_DATABASE_URL: process.env.XATA_DATABASE_URL
      });
    }
    return config;
  }
};

export default nextConfig;

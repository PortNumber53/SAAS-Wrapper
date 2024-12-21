import { XataClient } from "@/vendor/xata";

// Lazy initialization to avoid multiple client creations
let xataClient: XataClient | null = null;

export function getXataClient(): XataClient {
  if (!xataClient) {
    xataClient = new XataClient({
      apiKey: process.env.XATA_API_KEY,
      branch: process.env.XATA_BRANCH || 'main',
      // Add any additional configuration from environment
      fetch: globalThis.fetch,
      enableBrowser: true, // Enable browser support
      clientName: 'next-auth-adapter' // Add client name for better tracking
    });
  }
  return xataClient;
}

// Optional: Export the type for consistency
export type { XataClient } from "@/vendor/xata";

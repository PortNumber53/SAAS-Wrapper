import { XataClient } from "@/vendor/xata";

// Lazy initialization to avoid multiple client creations
let xataClient: XataClient | null = null;

export function getXataClient(): XataClient {
  // Log the entire process.env for debugging
  console.log('Full Environment:', {
    ...process.env,
    XATA_API_KEY: process.env.XATA_API_KEY ? '[REDACTED]' : 'UNDEFINED'
  });

  if (!xataClient) {
    // Detailed environment variable logging for debugging
    console.log('Initializing Xata Client with:', {
      XATA_API_KEY: process.env.XATA_API_KEY ? '[REDACTED]' : 'UNDEFINED',
      XATA_BRANCH: process.env.XATA_BRANCH,
      XATA_DATABASE_URL: process.env.XATA_DATABASE_URL
    });

    // Try multiple ways to get the API key
    const apiKey = 
      process.env.XATA_API_KEY || 
      process.env.NEXT_PUBLIC_XATA_API_KEY ||
      '';
    const branch = process.env.XATA_BRANCH ?? 'main';

    // More comprehensive logging
    console.log('Attempting to initialize with:', {
      apiKeyProvided: !!apiKey,
      branch
    });

    // Validate API key with more detailed error handling
    if (!apiKey) {
      console.error('CRITICAL: XATA_API_KEY is not set.');
      console.error('Checked environment variables:', {
        'process.env.XATA_API_KEY': process.env.XATA_API_KEY,
        'process.env.NEXT_PUBLIC_XATA_API_KEY': process.env.NEXT_PUBLIC_XATA_API_KEY
      });
      throw new Error('XATA_API_KEY is required to initialize Xata client');
    }

    try {
      // Explicitly type the options
      const clientOptions = {
        apiKey,
        branch,
        fetch: globalThis.fetch,
        enableBrowser: true,
        clientName: 'saas-wrapper'
      };

      console.log('Xata Client Options:', Object.keys(clientOptions));

      xataClient = new XataClient(clientOptions);
    } catch (error) {
      console.error('Failed to initialize Xata Client:', error);
      throw error;
    }
  }
  return xataClient;
}

// Export the type for consistency
export type { XataClient } from "@/vendor/xata";

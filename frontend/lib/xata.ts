import { buildClient } from "@xata.io/client";
import type { BaseClientOptions } from "@xata.io/client";

// Import the generated schema
import { tables } from "../vendor/xata";

// Create the client with the generated schema
const DatabaseClient = buildClient<typeof tables>();

// Lazy initialization to avoid multiple client creations
let xataClient: InstanceType<typeof DatabaseClient> | null = null;

export function getXataClient(): InstanceType<typeof DatabaseClient> {
  if (!xataClient) {
    // Validate API key with more detailed error handling
    const apiKey = 
      process.env.XATA_API_KEY || 
      process.env.NEXT_PUBLIC_XATA_API_KEY ||
      '';
    const branch = process.env.XATA_BRANCH ?? 'main';

    if (!apiKey) {
      console.error('CRITICAL: XATA_API_KEY is not set.');
      throw new Error('XATA_API_KEY is required to initialize Xata client');
    }

    try {
      const clientOptions: BaseClientOptions = {
        apiKey,
        branch,
        fetch: globalThis.fetch,
        enableBrowser: true,
        clientName: 'saas-wrapper'
      };

      xataClient = new DatabaseClient(clientOptions);
    } catch (error) {
      console.error('Failed to initialize Xata client:', error);
      throw error;
    }
  }

  return xataClient;
}

// Export the type for consistency
export type { BaseClientOptions } from "@xata.io/client";

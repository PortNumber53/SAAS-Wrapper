import { buildClient } from "@xata.io/client";

// Safely read environment variables
function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Create a function to initialize Xata client
export function getXataClient() {
  try {
    const XATA_API_KEY = getEnvVariable('XATA_API_KEY');
    const XATA_BRANCH = getEnvVariable('XATA_BRANCH') || 'main';
    const XATA_DATABASE_URL = getEnvVariable('XATA_DATABASE_URL');

    return buildClient({
      apiKey: XATA_API_KEY,
      branch: XATA_BRANCH,
      databaseURL: XATA_DATABASE_URL
    });
  } catch (error) {
    console.error('Failed to initialize Xata client:', error);
    throw error;
  }
}

// Singleton pattern to ensure only one client is created
let xataClient: ReturnType<typeof getXataClient> | null = null;

export function initializeXataClient() {
  if (!xataClient) {
    xataClient = getXataClient();
  }
  return xataClient;
}

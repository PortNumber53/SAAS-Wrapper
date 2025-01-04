import { XataClient } from '../vendor/xata';

// Shared Xata client initialization for both server and client
const initializeXataClient = () => {
  // Only allow server-side initialization
  if (typeof window === 'undefined') {
    const xataApiKey = process.env.XATA_API_KEY;
    const xataDatabaseURL = process.env.XATA_DATABASE_URL;
    const xataBranch = process.env.XATA_BRANCH || 'main';

    if (xataApiKey && xataDatabaseURL) {
      return new XataClient({
        apiKey: xataApiKey,
        databaseURL: xataDatabaseURL,
        branch: xataBranch
      });
    }

    console.warn('Xata client initialization failed: Missing API key or database URL');
  }

  // Provide a dummy client for client-side to prevent API key exposure
  return {
    db: {
      products: {
        getMany: () => {
          throw new Error('You are trying to use Xata from the browser, which is potentially a non-secure environment. Use server actions instead.');
        }
      }
    }
  } as any;
};

// Initialize Xata client
export const xata = initializeXataClient();
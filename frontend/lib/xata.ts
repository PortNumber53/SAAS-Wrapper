import { XataClient } from '../vendor/xata';

// Shared Xata client initialization for both server and client
const initializeXataClient = () => {
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

  // Provide a more comprehensive dummy client
  return {
    db: {
      pages: {
        filter: () => ({
          getFirst: () => null,
          read: () => null
        })
      },
      nextauth_users: {
        filter: () => ({
          getFirst: () => null,
          read: () => null
        })
      }
    }
  } as any;
};

// Initialize Xata client
export const xata = initializeXataClient();
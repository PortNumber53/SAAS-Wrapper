// Worker environment bindings
interface Env {
  // Backend origin for API proxy, e.g. https://api.example.com
  BACKEND_ORIGIN: string;
  // Optional static asset binding if configured
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Xata configuration
  XATA_DATABASE_URL: string; // e.g. https://<workspace>.<region>.xata.sh/db/<db>
  XATA_BRANCH: string; // e.g. main
  XATA_API_KEY: string;
}

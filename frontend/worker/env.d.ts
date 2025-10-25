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
  // Optional session secret used to sign cookies
  SESSION_SECRET?: string;
  // Xata Postgres DSN (preferred)
  // e.g. postgresql://<workspace>:<api_key>@<region>.sql.xata.sh/<db>:<branch>?sslmode=require
  XATA_DATABASE_URL: string;
}

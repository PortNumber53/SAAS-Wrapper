// Worker environment bindings
interface Env {
  // Backend origin for API proxy, e.g. https://api.example.com
  BACKEND_ORIGIN: string;
  // Optional static asset binding if configured
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  // Optional R2 bucket for image uploads
  IMAGES?: R2Bucket;
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // Instagram OAuth (now uses Facebook App credentials - Meta merged products)
  INSTAGRAM_VERIFY_TOKEN?: string;
  // Facebook (for Instagram Graph API)
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
  // Optional session secret used to sign cookies
  SESSION_SECRET?: string;
  // Stripe
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // Postgres DSN
  DATABASE_URL: string;
  // Admin emails (comma-separated) for gating admin endpoints
  ADMIN_EMAILS?: string;
}

// Puppeteer request interception for E2E test mocking.
// Intercepts API calls so tests run without Go backend or external APIs.

import type { Page, HTTPRequest } from 'puppeteer';

const TEST_IG_ACCOUNT = {
  ig_user_id: '17841400000000001',
  page_id: '100000000000001',
  page_name: 'Test Page',
  username: 'testaccount',
  token_valid: true,
  token_expires_at: Math.floor(Date.now() / 1000) + 86400,
  linked: true,
};

const TEST_USER = {
  email: 'test@example.com',
  name: 'Test User',
  picture: '',
};

function jsonBody(data: unknown, status = 200): { status: number; contentType: string; body: string } {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  };
}

/** Enable request interception and mock API endpoints. */
export async function enableInterceptors(page: Page) {
  await page.setRequestInterception(true);

  page.on('request', (req: HTTPRequest) => {
    const url = req.url();
    const method = req.method();

    // --- Session: return authenticated ---
    if (url.includes('/api/auth/session') && method === 'GET') {
      req.respond(jsonBody({ ok: true, ...TEST_USER }));
      return;
    }

    // --- Me endpoint ---
    if (url.includes('/api/me') && method === 'GET') {
      req.respond(jsonBody({
        ok: true,
        user: { id: 'test-user-id', ...TEST_USER, profile: '' },
      }));
      return;
    }

    // --- IG accounts: return test account ---
    if (url.includes('/api/ig/accounts') && method === 'GET') {
      req.respond(jsonBody({ ok: true, accounts: [TEST_IG_ACCOUNT] }));
      return;
    }

    // --- File upload: return fake uploaded file ---
    if (url.includes('/api/uploads') && method === 'POST') {
      const uuid = 'e2e-test-' + Date.now();
      req.respond(jsonBody({
        ok: true,
        url: `/api/media/${uuid}.jpg`,
        thumb_url: `/api/media/${uuid}.thumb.jpg`,
        key: `uploads/${uuid}.jpg`,
        content_type: 'image/jpeg',
        size_bytes: 1024,
      }));
      return;
    }

    // --- File metadata save ---
    if (url.includes('/api/files') && method === 'POST') {
      req.respond(jsonBody({ ok: true }));
      return;
    }

    // --- Drafts ---
    if (url.includes('/api/drafts')) {
      if (method === 'PUT') {
        req.respond(jsonBody({ ok: true }));
        return;
      }
      if (method === 'GET') {
        req.respond(jsonBody({ ok: true, payload: null, updated_at: null }));
        return;
      }
    }

    // --- IG publish: return success ---
    if (url.includes('/api/ig/publish') && method === 'POST') {
      req.respond(jsonBody({
        ok: true,
        result: { id: '99999999999999' },
      }));
      return;
    }

    // --- IG content sync ---
    if (url.includes('/api/ig/sync-content') && method === 'POST') {
      req.respond(jsonBody({ ok: true, counts: {} }));
      return;
    }

    // --- IG content list ---
    if (url.includes('/api/ig/content') && method === 'GET') {
      req.respond(jsonBody({ ok: true, items: [] }));
      return;
    }

    // --- Settings / prefs ---
    if (url.includes('/api/settings') && method === 'GET') {
      req.respond(jsonBody({ ok: true, settings: {} }));
      return;
    }

    // --- Integrations ---
    if (url.includes('/api/integrations') && method === 'GET') {
      req.respond(jsonBody({ ok: true, providers: [{ provider: 'iggraph' }] }));
      return;
    }

    // --- Agent settings ---
    if (url.includes('/api/agents/settings') && method === 'GET') {
      req.respond(jsonBody({ ok: true, models: [], default_model: '' }));
      return;
    }

    // --- Gemini key ---
    if (url.includes('/api/keys/gemini') && method === 'GET') {
      req.respond(jsonBody({ ok: true, configured: false, last4: '' }));
      return;
    }

    // --- Subscription tiers ---
    if (url.includes('/api/subscriptions/tiers') && method === 'GET') {
      req.respond(jsonBody({ ok: true, tiers: [] }));
      return;
    }

    // --- Subscription current ---
    if (url.includes('/api/subscriptions/current') && method === 'GET') {
      req.respond(jsonBody({ ok: true, subscription: null }));
      return;
    }

    // --- Google OAuth start: let it redirect normally for UI test ---
    if (url.includes('/api/auth/google/start')) {
      // Let the request through — we'll test that a popup opens
      req.continue();
      return;
    }

    // --- Pass through everything else (static assets, vite HMR, etc.) ---
    req.continue();
  });
}

/** Disable request interception. */
export async function disableInterceptors(page: Page) {
  await page.setRequestInterception(false);
}

export { TEST_IG_ACCOUNT, TEST_USER };

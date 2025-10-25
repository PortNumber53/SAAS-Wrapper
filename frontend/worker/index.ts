export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle auth routes inside the Worker first
    if (url.pathname === "/api/auth/google/start") {
      return startGoogleOAuth(env, url);
    }
    if (url.pathname === "/api/auth/google/callback") {
      return handleGoogleCallback(request, env, url);
    }

    // API proxy: forward remaining /api/* to the Go backend
    if (url.pathname.startsWith("/api/")) {
      if (!env.BACKEND_ORIGIN) {
        return new Response("Missing BACKEND_ORIGIN", { status: 500 });
      }

      // Rewrite path: strip the "/api" prefix when targeting backend
      const backendUrl = new URL(env.BACKEND_ORIGIN.replace(/\/$/, ""));
      backendUrl.pathname = url.pathname.replace(/^\/api/, "");
      backendUrl.search = url.search;

      // Clone request with original method/body, pass along headers
      const reqHeaders = new Headers(request.headers);
      // Ensure Host header matches backend origin
      reqHeaders.set("host", backendUrl.host);

      // Handle preflight quickly (useful if custom headers are sent)
      if (request.method === "OPTIONS") {
        const res = new Response(null, { status: 204 });
        res.headers.set("access-control-allow-origin", url.origin);
        res.headers.set("access-control-allow-headers", reqHeaders.get("access-control-request-headers") ?? "*");
        res.headers.set("access-control-allow-methods", reqHeaders.get("access-control-request-method") ?? "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.headers.set("access-control-max-age", "86400");
        return res;
      }

      const backendRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
      });

      const backendResponse = await fetch(backendRequest);
      // Pass-through response; optionally set CORS for safety (same-origin typically not needed)
      const resHeaders = new Headers(backendResponse.headers);
      resHeaders.set("access-control-allow-origin", url.origin);
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: resHeaders,
      });
    }

    // Delegate non-API requests to static assets. If a document navigation
    // results in 404 from assets, fall back to index.html (SPA routing).
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
      const accept = request.headers.get('accept') || '';
      const isDocument = request.method === 'GET' && accept.includes('text/html');
      if (isDocument) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = '/index.html';
        return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }
      return assetRes;
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// --- Google OAuth 2.0 helpers ---
function b64url(bytes: Uint8Array): string {
  // @ts-ignore: Buffer not present in workers; convert using btoa
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function newState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function getCookies(req: Request): Record<string, string> {
  const cookie = req.headers.get('cookie') || '';
  const out: Record<string, string> = {};
  cookie.split(';').forEach(pair => {
    const [k, ...rest] = pair.split('=');
    if (!k) return;
    out[k.trim()] = decodeURIComponent(rest.join('=').trim());
  });
  return out;
}

function setCookie(name: string, value: string, opts: { maxAgeSec?: number; secure?: boolean; httpOnly?: boolean; sameSite?: 'Lax'|'Strict'|'None'; path?: string; }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAgeSec) parts.push(`Max-Age=${opts.maxAgeSec}`);
  if (opts.secure ?? true) parts.push('Secure');
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  parts.push(`Path=${opts.path ?? '/'}`);
  return parts.join('; ');
}

async function startGoogleOAuth(env: Env, url: URL): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET', { status: 500 });
  }

  const state = newState();
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('access_type', 'offline');
  authorize.searchParams.set('include_granted_scopes', 'true');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  headers.append('Set-Cookie', setCookie('oauth_state', state, { maxAgeSec: 600, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  return new Response(null, { status: 302, headers });
}

async function handleGoogleCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET', { status: 500 });
  }
  const qs = url.searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  if (!code) return new Response('Missing code', { status: 400 });
  const cookies = getCookies(request);
  if (!state || !cookies.oauth_state || cookies.oauth_state !== state) {
    return new Response('Invalid state', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const errTxt = await tokenRes.text();
    return new Response(`Token exchange failed: ${errTxt}`, { status: 502 });
  }
  const tokenJson = await tokenRes.json() as any;
  const accessToken = tokenJson.access_token as string | undefined;
  const idToken = tokenJson.id_token as string | undefined;
  if (!accessToken && !idToken) {
    return new Response('No tokens returned', { status: 502 });
  }

  // Fetch user profile
  let profile: any = undefined;
  if (accessToken) {
    const uRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!uRes.ok) {
      const t = await uRes.text();
      return new Response(`Userinfo failed: ${t}`, { status: 502 });
    }
    profile = await uRes.json();
  }

  if (!profile?.email) {
    return new Response('Failed to retrieve profile email', { status: 502 });
  }

  // Persist to Xata
  try {
    await upsertUserToXata(env, {
      email: profile.email,
      name: profile.name ?? '',
      picture: profile.picture ?? '',
      provider: 'google',
      provider_id: profile.sub ?? '',
    });
  } catch (e: any) {
    return new Response(`Xata error: ${e?.message ?? e}`, { status: 502 });
  }

  // Clear state cookie and return a tiny HTML that posts a message to the opener
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', setCookie('oauth_state', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  const targetOrigin = url.origin;
  const payload = { ok: true, provider: 'google', email: profile.email };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        const data = ${JSON.stringify(payload)};
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage({ type: 'oauth:google', data }, ${JSON.stringify(targetOrigin)});
        }
      } catch (e) {}
      window.close();
    })();
  </script></body></html>`;
  return new Response(html, { status: 200, headers });
}

type NewUser = { email: string; name?: string; picture?: string; provider: string; provider_id: string };

async function upsertUserToXata(env: Env, user: NewUser): Promise<void> {
  const base = (env.XATA_DATABASE_URL || '').replace(/\/$/, '');
  const branch = env.XATA_BRANCH;
  const apiKey = env.XATA_API_KEY;
  if (!base || !branch || !apiKey) throw new Error('Missing Xata configuration');

  const headers = {
    'authorization': `Bearer ${apiKey}`,
    'content-type': 'application/json',
    'xata-branch': branch,
    'accept': 'application/json',
  } as Record<string, string>;

  // Ensure users table exists in your DB; this will upsert by email
  // 1) Find existing by email
  const queryUrl = `${base}/tables/users/query`;
  const qRes = await fetch(queryUrl, { method: 'POST', headers, body: JSON.stringify({ filter: { email: user.email }, page: { size: 1 } }) });
  if (!qRes.ok) {
    const t = await qRes.text();
    throw new Error(`Query failed: ${t}`);
  }
  const qJson = await qRes.json() as any;
  const existing = qJson?.records?.[0];

  const recordBody = {
    email: user.email,
    name: user.name ?? null,
    picture: user.picture ?? null,
    provider: user.provider,
    provider_id: user.provider_id,
    last_login_at: new Date().toISOString(),
  } as Record<string, any>;

  if (existing?.id) {
    const upUrl = `${base}/tables/users/data/${encodeURIComponent(existing.id)}`;
    const upRes = await fetch(upUrl, { method: 'PATCH', headers, body: JSON.stringify(recordBody) });
    if (!upRes.ok) {
      const t = await upRes.text();
      throw new Error(`Update failed: ${t}`);
    }
  } else {
    const crUrl = `${base}/tables/users/data`;
    const crRes = await fetch(crUrl, { method: 'POST', headers, body: JSON.stringify(recordBody) });
    if (!crRes.ok) {
      const t = await crRes.text();
      throw new Error(`Create failed: ${t}`);
    }
  }
}

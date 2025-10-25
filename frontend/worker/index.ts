export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // Enforce a canonical public origin for auth and document navigations
    const publicOrigin = getPublicOrigin(env, url);
    const isAuthRoute = pathname.startsWith('/api/auth/');
    const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(pathname);
    const isDocumentNav = (method === 'GET' || method === 'HEAD') && !looksLikeFile;
    if (publicOrigin && url.origin !== publicOrigin && (isAuthRoute || (!pathname.startsWith('/api/') && isDocumentNav))) {
      const dest = new URL(request.url);
      dest.protocol = new URL(publicOrigin).protocol;
      dest.host = new URL(publicOrigin).host;
      return new Response(null, { status: 302, headers: { Location: dest.toString() } });
    }

    // Handle auth routes inside the Worker first
    if (url.pathname === "/api/auth/google/start") {
      return startGoogleOAuth(env, url);
    }
    if (url.pathname === "/api/auth/google/callback") {
      return handleGoogleCallback(request, env, url);
    }
    if (url.pathname === "/api/auth/google/redirect-uri") {
      // Small diagnostic to confirm computed redirect URI for this host
      const origin = getPublicOrigin(env, url) || url.origin;
      const redirectUri = `${origin}/api/auth/google/callback`;
      return new Response(JSON.stringify({ origin, redirect_uri: redirectUri }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.pathname === "/api/auth/session") {
      return handleSession(request, env);
    }
    if (url.pathname === "/api/auth/logout") {
      const headers = new Headers();
      headers.append('Set-Cookie', setCookie('session', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/' }));
      return new Response(null, { status: 204, headers });
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

    // Delegate non-API requests to static assets. For GET/HEAD navigations to
    // routes without a file extension, fall back to index.html when assets are
    // not ready or return an error (robust during Wrangler hot-reloads).
    if (env.ASSETS) {
      const method = request.method;
      const path = new URL(request.url).pathname;
      const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(path);
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if ((method === 'GET' || method === 'HEAD') && !looksLikeFile && (!assetRes || assetRes.status >= 400)) {
          return serveIndexHtml(env, request);
        }
        return assetRes;
      } catch {
        if ((method === 'GET' || method === 'HEAD') && !looksLikeFile) {
          return serveIndexHtml(env, request);
        }
        return new Response(null, { status: 404 });
      }
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function normalizeOrigin(input: string | undefined, fallbackProtocol: string): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/\/$/, '');
  // If no scheme, default to current request protocol
  if (!/^https?:\/\//i.test(s)) {
    s = `${fallbackProtocol}//${s}`;
  }
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`; // strip path if any
  } catch {
    return null;
  }
}

function getPublicOrigin(env: Env, url: URL): string | null {
  const normalized = normalizeOrigin(env.PUBLIC_ORIGIN, url.protocol);
  return (normalized || url.origin).replace(/\/$/, '');
}

async function serveIndexHtml(env: Env, request: Request): Promise<Response> {
  const indexUrl = new URL(request.url);
  indexUrl.pathname = '/index.html';
  return env.ASSETS!.fetch(new Request(indexUrl.toString(), request));
}

// --- Helpers: base64url & cookies ---
function b64url(bytes: Uint8Array): string {
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

function b64urlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  const b64p = b64 + '='.repeat(pad);
  const bin = atob(b64p);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8(bytes: Uint8Array): string { return new TextDecoder().decode(bytes); }
function utf8Bytes(s: string): Uint8Array { return new TextEncoder().encode(s); }

async function signHmacSHA256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8Bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8Bytes(data));
  return new Uint8Array(sig);
}

type SessionPayload = { email: string; name?: string; picture?: string; sub?: string; iat: number; exp: number };

async function createSessionToken(payload: SessionPayload, secret?: string): Promise<string> {
  const header = { alg: secret ? 'HS256' : 'none', typ: 'JWT' };
  const encHeader = b64url(utf8Bytes(JSON.stringify(header)));
  const encPayload = b64url(utf8Bytes(JSON.stringify(payload)));
  const msg = `${encHeader}.${encPayload}`;
  if (!secret) return `${msg}.`;
  const sig = await signHmacSHA256(secret, msg);
  return `${msg}.${b64url(sig)}`;
}

async function verifySessionToken(token: string, secret?: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const [encHeader, encPayload, encSig] = parts;
  try {
    const payload = JSON.parse(utf8(b64urlDecodeToBytes(encPayload)));
    if (!secret) {
      // No secret; trust unsigned token only in dev
      if (payload?.exp && Date.now() / 1000 > payload.exp) return null;
      return payload as SessionPayload;
    }
    const expected = await signHmacSHA256(secret, `${encHeader}.${encPayload}`);
    if (!encSig) return null;
    const given = b64urlDecodeToBytes(encSig);
    if (given.length !== expected.length) return null;
    // constant-time compare
    let ok = 0;
    for (let i = 0; i < given.length; i++) ok |= given[i] ^ expected[i];
    if (ok !== 0) return null;
    if (payload?.exp && Date.now() / 1000 > payload.exp) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// --- Google OAuth 2.0 helpers ---
async function startGoogleOAuth(env: Env, url: URL): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET', { status: 500 });
  }

  const state = newState();
  const origin = getPublicOrigin(env, url) || url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('access_type', 'offline');
  authorize.searchParams.set('include_granted_scopes', 'true');
  authorize.searchParams.set('state', state);

  // Debug mode: surface computed values instead of redirecting
  if (url.searchParams.get('debug') === '1') {
    const body = { origin, redirect_uri: redirectUri, authorize: authorize.toString(), client_id: clientId };
    return new Response(JSON.stringify(body, null, 2), { headers: { 'content-type': 'application/json' } });
  }

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

  const origin = getPublicOrigin(env, url) || url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
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
  const tokenJson = await tokenRes.json() as { access_token?: string; id_token?: string };
  const accessToken = tokenJson.access_token;
  const idToken = tokenJson.id_token;
  if (!accessToken && !idToken) {
    return new Response('No tokens returned', { status: 502 });
  }

  // Fetch user profile
  type GoogleProfile = { email: string; name?: string; picture?: string; sub?: string };
  let profile: GoogleProfile | undefined = undefined;
  if (accessToken) {
    const uRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!uRes.ok) {
      const t = await uRes.text();
      return new Response(`Userinfo failed: ${t}`, { status: 502 });
    }
    profile = await uRes.json() as GoogleProfile;
  }

  if (!profile?.email) {
    return new Response('Failed to retrieve profile email', { status: 502 });
  }

  // Persist to Xata (optional in dev). Skip if config is missing.
  const hasXata = !!(env.XATA_DATABASE_URL && env.XATA_BRANCH && env.XATA_API_KEY);
  if (hasXata) {
    try {
      await upsertUserToXata(env, {
        email: profile.email,
        name: profile.name ?? '',
        picture: profile.picture ?? '',
        provider: 'google',
        provider_id: profile.sub ?? '',
      });
    } catch (e: unknown) {
      // Log but do not block login in dev
      console.error('Xata upsert failed', e);
    }
  }

  // Issue session cookie
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { email: profile.email, name: profile.name ?? '', picture: profile.picture ?? '', sub: profile.sub ?? '', iat: now, exp: now + 60 * 60 * 24 * 7 };
  const token = await createSessionToken(payload, env.SESSION_SECRET);

  // Clear state cookie and return a tiny HTML that posts a message to the opener
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', setCookie('oauth_state', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  headers.append('Set-Cookie', setCookie('session', token, { maxAgeSec: 60 * 60 * 24 * 7, secure: true, httpOnly: true, sameSite: 'Lax', path: '/' }));
  const targetOrigin = getPublicOrigin(env, url) || url.origin;
  const message = { ok: true, provider: 'google', email: profile.email, name: profile.name ?? '', picture: profile.picture ?? '' };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        const data = ${JSON.stringify(message)};
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

  // Validate branch and fall back to 'main' if the provided branch does not exist
  let effectiveBranch = branch;
  try {
    const bRes = await fetch(`${base}/branches`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    });
    if (bRes.ok) {
      const bJson = await bRes.json() as unknown;
      const list: string[] = Array.isArray(bJson) ? (bJson as string[]) : ((bJson as { branches?: string[] })?.branches ?? []);
      if (effectiveBranch && !list.includes(effectiveBranch) && list.includes('main')) {
        effectiveBranch = 'main';
      }
    }
  } catch { /* ignore and use provided branch */ }

  const headers = {
    'authorization': `Bearer ${apiKey}`,
    'content-type': 'application/json',
    'accept': 'application/json',
    ...(effectiveBranch ? { 'xata-branch': effectiveBranch } : {}),
  } as Record<string, string>;

  // Ensure users table exists in your DB; this will upsert by email
  // 1) Find existing by email
  const queryUrl = `${base}/tables/users/query`;
  const qRes = await fetch(queryUrl, { method: 'POST', headers, body: JSON.stringify({ filter: { email: user.email }, page: { size: 1 } }) });
  if (!qRes.ok) {
    const t = await qRes.text();
    // Retry once with 'main' if branch invalid
    if (/invalid base branch/i.test(t) && effectiveBranch !== 'main') {
      const h2 = { ...headers, 'xata-branch': 'main' };
      const r2 = await fetch(queryUrl, { method: 'POST', headers: h2, body: JSON.stringify({ filter: { email: user.email }, page: { size: 1 } }) });
      if (!r2.ok) {
        const t2 = await r2.text();
        throw new Error(`Query failed: ${t2}`);
      }
      const q2Json = await r2.json() as { records?: Array<{ id: string }> };
      const fallbackExisting = q2Json?.records?.[0];
      effectiveBranch = 'main';
      // proceed with existing and updated effectiveBranch
      const recordBody = {
        email: user.email,
        name: user.name ?? null,
        picture: user.picture ?? null,
        provider: user.provider,
        provider_id: user.provider_id,
        last_login_at: new Date().toISOString(),
      } as Record<string, unknown>;
      if (fallbackExisting?.id) {
        const upUrl = `${base}/tables/users/data/${encodeURIComponent(fallbackExisting.id)}`;
        const upRes = await fetch(upUrl, { method: 'PATCH', headers: { ...headers, 'xata-branch': effectiveBranch }, body: JSON.stringify(recordBody) });
        if (!upRes.ok) {
          const t = await upRes.text();
          throw new Error(`Update failed: ${t}`);
        }
      } else {
        const crUrl = `${base}/tables/users/data`;
        const crRes = await fetch(crUrl, { method: 'POST', headers: { ...headers, 'xata-branch': effectiveBranch }, body: JSON.stringify(recordBody) });
        if (!crRes.ok) {
          const t = await crRes.text();
          throw new Error(`Create failed: ${t}`);
        }
      }
      return;
    }
    throw new Error(`Query failed: ${t}`);
  }
  const qJson = await qRes.json() as { records?: Array<{ id: string }> };
  const existing = qJson?.records?.[0];

  const recordBody = {
    email: user.email,
    name: user.name ?? null,
    picture: user.picture ?? null,
    provider: user.provider,
    provider_id: user.provider_id,
    last_login_at: new Date().toISOString(),
  } as Record<string, unknown>;

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

async function handleSession(request: Request, env: Env): Promise<Response> {
  const cookies = getCookies(request);
  const tok = cookies.session;
  if (!tok) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
  const payload = await verifySessionToken(tok, env.SESSION_SECRET);
  if (!payload) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
  const body = { ok: true, email: payload.email, name: payload.name ?? '', picture: payload.picture ?? '' };
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

import postgres from 'postgres'

function getPg(env: Env) {
  const dsn = env.XATA_DATABASE_URL || '';
  if (!dsn) throw new Error('Missing XATA_DATABASE_URL');
  // Create a fresh client per request context to avoid cross-request I/O issues
  return postgres(dsn, { ssl: 'require' });
}

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
    if (url.pathname === "/api/auth/google/redirect-uri") {
      // Small diagnostic to confirm computed redirect URI for this host
      const origin = url.origin;
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
    // Note: /api/uploads and /api/media/* are proxied to BACKEND_ORIGIN
    if (url.pathname === "/api/integrations") {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      if (request.method === 'GET') {
        const list = await listUserIntegrations(env, sess.email).catch(() => [] as Array<{ provider: string }>);
        return new Response(JSON.stringify({ ok: true, providers: list }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname.startsWith('/api/integrations/')) {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const provider = url.pathname.split('/').pop() || '';
      if (request.method === 'DELETE') {
        await deleteUserIntegration(env, sess.email, provider).catch(() => {});
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === '/api/auth/instagram/start') {
      return startInstagramOAuth(request, env, url);
    }
    if (url.pathname === '/api/auth/instagram/callback') {
      return handleInstagramCallback(request, env, url);
    }
    if (url.pathname === '/api/auth/iggraph/start') {
      return startIGGraphOAuth(request, env, url);
    }
    if (url.pathname === '/api/auth/iggraph/callback') {
      return handleIGGraphCallback(request, env, url);
    }
    if (url.pathname === '/api/ig/accounts') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const rows = await sql`select ig_user_id, page_id, page_name, username, access_token, user_access_token from public.ig_accounts where email=${sess.email}` as Array<any>;
      const withStatus = await Promise.all(rows.map(async (r) => {
        const status: any = await debugFBToken(env, r.access_token).catch(() => ({ is_valid: false }));
        const exp = (status && typeof status.expires_at !== 'undefined') ? status.expires_at : null;
        // Link check: try a lightweight call on the IG user id
        let linked = false;
        try {
          const chk = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(r.ig_user_id)}?fields=id`, { headers: { Authorization: `Bearer ${r.access_token}` } });
          linked = chk.ok;
        } catch {}
        return { ig_user_id: r.ig_user_id, page_id: r.page_id, page_name: r.page_name, username: r.username, token_valid: !!status?.is_valid, token_expires_at: exp, linked };
      }));
      return new Response(JSON.stringify({ ok: true, accounts: withStatus }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/ig/content' && (request.method === 'GET')) {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const urlObj = new URL(request.url);
      const igUserId = urlObj.searchParams.get('ig_user_id') || '';
      // Ensure table exists; ignore if lacking privilege
      try {
        await sql`create table if not exists public.ig_media (
          media_id text primary key,
          ig_user_id text not null,
          caption text,
          media_type text,
          media_url text,
          permalink text,
          thumbnail_url text,
          timestamp timestamptz,
          email text,
          raw_payload jsonb,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        )`;
        // In case table existed before without this column, add it
        await sql`alter table public.ig_media add column if not exists raw_payload jsonb`;
      } catch {}
      // Return recent content, optionally filtered by ig_user_id
      try {
        let rows: Array<any> = [];
        if (igUserId) {
          rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} and ig_user_id=${igUserId} order by timestamp desc limit 200` as Array<any>;
        } else {
          rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} order by timestamp desc limit 500` as Array<any>;
        }
        return new Response(JSON.stringify({ ok: true, items: rows }), { headers: { 'content-type': 'application/json' } });
      } catch (e: any) {
        // If table is missing, return empty result instead of error
        const msg = String(e?.message || '');
        const code = (e && typeof e === 'object' && 'code' in e) ? (e as any).code : '';
        if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
          return new Response(JSON.stringify({ ok: true, items: [] }), { headers: { 'content-type': 'application/json' } });
        }
        return new Response(`query_failed: ${msg}`, { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    }
    if (url.pathname === '/api/ig/sync-content' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      // Ensure table exists (idempotent)
      await sql`create table if not exists public.ig_media (
        media_id text primary key,
        ig_user_id text not null,
        caption text,
        media_type text,
        media_url text,
        permalink text,
        thumbnail_url text,
        timestamp timestamptz,
        email text,
        raw_payload jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )`;
      // Backfill column if table existed already
      await sql`alter table public.ig_media add column if not exists raw_payload jsonb`;
      // Get linked IG accounts for this user
      const accounts = await sql`select ig_user_id, access_token from public.ig_accounts where email=${sess.email}` as Array<{ ig_user_id: string; access_token: string }>;
      const counts: Record<string, number> = {};
      for (const acc of accounts) {
        const igUserId = acc.ig_user_id;
        let fetched = 0;
        // paginate through media
        let nextUrl = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media`);
        nextUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp');
        nextUrl.searchParams.set('limit', '100');
        while (true) {
          const r = await fetch(nextUrl.toString(), { headers: { Authorization: `Bearer ${acc.access_token}` } });
          if (!r.ok) break;
          const j = await r.json() as any;
          const items = Array.isArray(j?.data) ? j.data : [];
          for (const it of items) {
            await sql`insert into public.ig_media (media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp, email, raw_payload) values (
              ${String(it.id || '')}, ${igUserId}, ${it.caption || ''}, ${String(it.media_type || '')}, ${String(it.media_url || '')}, ${String(it.permalink || '')}, ${String(it.thumbnail_url || '')}, ${it.timestamp ? new Date(it.timestamp) : null}, ${sess.email}, ${JSON.stringify(it)}::jsonb
            ) on conflict (media_id) do update set caption=excluded.caption, media_type=excluded.media_type, media_url=excluded.media_url, permalink=excluded.permalink, thumbnail_url=excluded.thumbnail_url, timestamp=excluded.timestamp, ig_user_id=excluded.ig_user_id, email=excluded.email, raw_payload=excluded.raw_payload, updated_at=now()`;
            fetched++;
          }
          const next = j?.paging?.next as string | undefined;
          if (next) {
            try { nextUrl = new URL(next); } catch { break; }
          } else {
            break;
          }
          if (fetched >= 1000) break; // safety cap per account
        }
        counts[igUserId] = fetched;
      }
      return new Response(JSON.stringify({ ok: true, counts }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/ig/publish' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const body = await request.json().catch(() => ({} as unknown));
      const ig_user_id = (body as any).ig_user_id as string | undefined;
      const image_url = (body as any).image_url as string | undefined;
      const caption = (body as any).caption as string | undefined;
      if (!ig_user_id || !image_url) return new Response(JSON.stringify({ ok: false, error: 'missing_params' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const row = (await sql`select access_token from public.ig_accounts where ig_user_id=${ig_user_id} and email=${sess.email} limit 1`) as Array<any>;
      if (!row.length) return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const access = row[0].access_token as string;
      // Create media
      const cr = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(ig_user_id)}/media`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ image_url, caption: caption ?? '', access_token: access }),
      });
      if (!cr.ok) return new Response(await cr.text(), { status: 502 });
      const crJ = await cr.json() as any;
      const creationId = crJ.id as string;
      const pub = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(ig_user_id)}/media_publish`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ creation_id: creationId, access_token: access }),
      });
      if (!pub.ok) return new Response(await pub.text(), { status: 502 });
      const pubJ = await pub.json();
      return new Response(JSON.stringify({ ok: true, result: pubJ }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/ig/refresh' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const body = await request.json().catch(() => ({} as unknown));
      const ig_user_id = (body as any).ig_user_id as string | undefined;
      if (!ig_user_id) return new Response(JSON.stringify({ ok: false, error: 'missing_ig_user_id' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const rows = await sql`select user_access_token from public.ig_accounts where ig_user_id=${ig_user_id} and email=${sess.email} limit 1` as Array<any>;
      if (!rows.length || !rows[0].user_access_token) return new Response(JSON.stringify({ ok: false, error: 'reauthorization_required' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const userToken = rows[0].user_access_token as string;
      // Validate the stored user token first; if invalid, require reauthorization
      const userTokStatus: any = await debugFBToken(env, userToken).catch(() => ({ is_valid: false }));
      if (!userTokStatus?.is_valid) {
        return new Response(JSON.stringify({ ok: false, error: 'reauthorization_required' }), { status: 400, headers: { 'content-type': 'application/json' } });
      }
      // Re-derive page token from user token
      // Request pages including the instagram_business_account linkage
      const pages = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account`, { headers: { Authorization: `Bearer ${userToken}` } });
      if (!pages.ok) return new Response(JSON.stringify({ ok: false, error: 'pages_fetch_failed', details: await pages.text() }), { status: 502, headers: { 'content-type': 'application/json' } });
      const pJson = await pages.json() as any;
      let entry = (pJson.data || []).find((p: any) => p.instagram_business_account?.id === ig_user_id);
      // Fallback: query each page for IG link if field missing
      if (!entry) {
        for (const p of (pJson.data || [])) {
          const q = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(p.id)}?fields=instagram_business_account`, { headers: { Authorization: `Bearer ${p.access_token}` } });
          if (!q.ok) continue;
          const qj = await q.json() as any;
          if (qj?.instagram_business_account?.id === ig_user_id) { entry = p; break; }
        }
      }
      if (!entry) {
        return new Response(JSON.stringify({ ok: false, error: 'ig_account_not_linked' }), { status: 404, headers: { 'content-type': 'application/json' } });
      }
      await sql`update public.ig_accounts set access_token=${entry.access_token}, updated_at=now() where ig_user_id=${ig_user_id} and email=${sess.email}`;
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname.startsWith('/api/ig/account/') && request.method === 'DELETE') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const igUserId = url.pathname.split('/').pop() || '';
      if (!igUserId) return new Response(JSON.stringify({ ok: false, error: 'missing_ig_user_id' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      await sql`delete from public.ig_accounts where ig_user_id=${igUserId} and email=${sess.email}`;
      // Also drop oauth mapping for that iggraph user id if present
      await sql`delete from public.oauth_accounts where provider='iggraph' and provider_user_id=${igUserId} and email=${sess.email}`;
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    }
    // Remove legacy HTTP debug route; we now use direct Postgres

    // SPA fallback early for extensionless document paths (prevents any asset-level redirects)
    if (!url.pathname.startsWith('/api/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(url.pathname);
      if (!looksLikeFile) {
        if (env.ASSETS) {
          return serveIndexHtml(env, request);
        }
      }
    }

    // Authenticated Xata-backed endpoints
    if (url.pathname === "/api/me") {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      if (request.method === 'GET') {
        const user = await findUserByEmail(env, sess.email).catch(() => null);
        return new Response(JSON.stringify({ ok: true, user }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PATCH') {
        const allowed = await request.json().catch(() => ({} as Record<string, unknown>));
        const user = await findUserByEmail(env, sess.email).catch(() => null);
        if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
        const body: Record<string, unknown> = {};
        if (typeof (allowed as any).name === 'string') body.name = (allowed as any).name || '';
        if (typeof (allowed as any).picture === 'string') body.profile = (allowed as any).picture || '';
        const ok = await updateUserById(env, user.id, body).then(() => true).catch(() => false);
        return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 500, headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === "/api/settings") {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      if (request.method === 'GET') {
        const s = await getUserSettings(env, sess.email).catch(() => ({} as any));
        return new Response(JSON.stringify({ ok: true, settings: s }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PATCH') {
        const payload = await request.json().catch(() => ({} as Record<string, unknown>));
        const updates: Record<string, unknown> = {};
        if (typeof (payload as any).theme === 'string') updates.theme = (payload as any).theme;
        const res = await setUserSettings(env, sess.email, updates).then(() => true).catch(() => false);
        return new Response(JSON.stringify({ ok: res }), { status: res ? 200 : 500, headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
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

async function serveIndexHtml(env: Env, request: Request): Promise<Response> {
  const indexUrl = new URL(request.url);
  indexUrl.pathname = '/index.html';
  // Create a fresh GET request for assets to avoid propagating original navigation headers
  let res = await env.ASSETS!.fetch(new Request(indexUrl.toString(), { method: 'GET' }));
  // If assets returns a redirect (e.g., to '/'), follow it but return 200 with the content to preserve the URL
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('Location') || res.headers.get('location');
    if (loc) {
      const target = new URL(loc, indexUrl);
      res = await env.ASSETS!.fetch(new Request(target.toString(), { method: 'GET' }));
    }
  }
  const headers = new Headers(res.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.delete('location');
  return new Response(res.body, { status: 200, headers });
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

async function getSessionFromCookie(request: Request, env: Env): Promise<SessionPayload | null> {
  const cookies = getCookies(request);
  const tok = cookies.session;
  if (!tok) return null;
  return await verifySessionToken(tok, env.SESSION_SECRET);
}

// --- Google OAuth 2.0 helpers ---
async function startGoogleOAuth(env: Env, url: URL): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET', { status: 500 });
  }

  const state = newState();
  const origin = url.origin;
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

  const origin = url.origin;
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
  const hasXata = !!(env.XATA_DATABASE_URL);
  if (hasXata) {
    try {
      await upsertUserToXata(env, {
        email: profile.email,
        name: profile.name ?? '',
        picture: profile.picture ?? '',
        provider: 'google',
        provider_id: profile.sub ?? '',
      });
      await upsertOAuthAccountToXata(env, {
        provider: 'google',
        provider_user_id: profile.sub ?? '',
        email: profile.email,
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
  const targetOrigin = url.origin;
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
  const sql = getPg(env);
  const rows = await sql<{ id: string }[]>`select xata_id as id from public.users where email=${user.email} limit 1`;
  const record = {
    email: user.email,
    password: 'oauth',
    name: user.name ?? '',
    profile: user.picture ?? '',
  } as const;
  if (rows.length) {
    await sql`update public.users set name=${record.name}, profile=${record.profile} where id=${rows[0].id}`;
  } else {
    await sql`insert into public.users (email, password, name, profile) values (${record.email}, ${record.password}, ${record.name}, ${record.profile})`;
  }
}

// --- Xata helpers ---
// legacy HTTP headers (unused now) removed

async function findUserByEmail(env: Env, email: string): Promise<{ id: string } & Record<string, unknown> | null> {
  const sql = getPg(env);
  const rows = await sql`select xata_id as id, email, name, profile from public.users where email=${email} limit 1` as Array<any>;
  return rows[0] ?? null;
}

async function updateUserById(env: Env, id: string, body: Record<string, unknown>): Promise<void> {
  const sql = getPg(env);
  const name = (body as any).name ?? null;
  const profile = (body as any).profile ?? null;
  await sql`update public.users set name=${name}, profile=${profile} where xata_id=${id}`;
}

async function getUserSettings(env: Env, email: string): Promise<Record<string, unknown>> {
  const sql = getPg(env);
  const rows = await sql`select xata_id as id, email, theme from public.user_settings where email=${email} limit 1` as Array<any>;
  return rows[0] ?? {};
}

async function setUserSettings(env: Env, email: string, updates: Record<string, unknown>): Promise<void> {
  const sql = getPg(env);
  const existing = await getUserSettings(env, email);
  const theme = (updates as any).theme ?? null;
  if ((existing as any)?.id) {
    await sql`update public.user_settings set theme=${theme} where xata_id=${(existing as any).id}`;
  } else {
    await sql`insert into public.user_settings (email, theme) values (${email}, ${theme})`;
  }
}

type OAuthAccount = { provider: string; provider_user_id: string; email: string };

async function upsertOAuthAccountToXata(env: Env, acct: OAuthAccount): Promise<void> {
  const sql = getPg(env);
  await sql`insert into public.oauth_accounts (provider, provider_user_id, email) values (${acct.provider}, ${acct.provider_user_id}, ${acct.email}) on conflict (provider, provider_user_id) do update set email=excluded.email`;
}

// --- Instagram OAuth (Basic Display) ---
async function startInstagramOAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.INSTAGRAM_CLIENT_ID || '';
  const clientSecret = env.INSTAGRAM_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    return new Response('Missing INSTAGRAM_CLIENT_ID/INSTAGRAM_CLIENT_SECRET', { status: 500 });
  }
  // Require a logged-in session to link the integration
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return new Response('Not authenticated', { status: 401 });

  const state = newState();
  const redirectUri = `${url.origin}/api/auth/instagram/callback`;
  const authorize = new URL('https://api.instagram.com/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'user_profile');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  headers.append('Set-Cookie', setCookie('oauth_state_ig', state, { maxAgeSec: 600, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/instagram' }));
  return new Response(null, { status: 302, headers });
}

async function handleInstagramCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.INSTAGRAM_CLIENT_ID || '';
  const clientSecret = env.INSTAGRAM_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return new Response('Missing INSTAGRAM_CLIENT_ID/INSTAGRAM_CLIENT_SECRET', { status: 500 });
  // Require session to link to current user
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return new Response('Not authenticated', { status: 401 });

  const qs = url.searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  if (!code) return new Response('Missing code', { status: 400 });
  const cookies = getCookies(request);
  if (!state || !cookies.oauth_state_ig || cookies.oauth_state_ig !== state) {
    return new Response('Invalid state', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/instagram/callback`;
  // Exchange code for access token
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return new Response(`Instagram token exchange failed: ${t}`, { status: 502 });
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; user_id?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) return new Response('No access token', { status: 502 });

  // Fetch user info
  const uRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`);
  if (!uRes.ok) {
    const t = await uRes.text();
    return new Response(`Instagram userinfo failed: ${t}`, { status: 502 });
  }
  const profile = await uRes.json() as { id?: string; username?: string };
  if (!profile?.id) return new Response('Missing instagram id', { status: 502 });

  // Store linkage
  try {
    await upsertOAuthAccountToXata(env, { provider: 'instagram', provider_user_id: profile.id, email: sess.email });
  } catch (e) {
    // log but don’t block UX
    console.error('Instagram upsert failed', e);
  }

  // Notify opener and close
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', setCookie('oauth_state_ig', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/instagram' }));
  const targetOrigin = url.origin;
  const msg = { ok: true, provider: 'instagram' };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        var data = ${JSON.stringify(msg)};
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage({ type: 'oauth:instagram', data: data }, ${JSON.stringify(targetOrigin)});
        }
      } catch (e) {}
      window.close();
    })();
  </script></body></html>`;
  return new Response(html, { status: 200, headers });
}

// --- Instagram Graph via Facebook Login ---
async function startIGGraphOAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';
  if (!appId || !appSecret) return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return new Response('Not authenticated', { status: 401 });
  const state = newState();
  const redirectUri = `${url.origin}/api/auth/iggraph/callback`;
  const scopes = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'instagram_content_publish',
    'business_management',
  ].join(',');
  const auth = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  auth.searchParams.set('client_id', appId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('scope', scopes);
  auth.searchParams.set('state', state);
  const headers = new Headers({ Location: auth.toString() });
  headers.append('Set-Cookie', setCookie('oauth_state_fb', state, { maxAgeSec: 600, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/iggraph' }));
  return new Response(null, { status: 302, headers });
}

async function handleIGGraphCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';
  if (!appId || !appSecret) return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return new Response('Not authenticated', { status: 401 });
  const qs = url.searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  if (!code) return new Response('Missing code', { status: 400 });
  const cookies = getCookies(request);
  if (!state || cookies.oauth_state_fb !== state) return new Response('Invalid state', { status: 400 });
  const redirectUri = `${url.origin}/api/auth/iggraph/callback`;

  // Exchange code → short-lived user token
  const tRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  }));
  if (!tRes.ok) return new Response(`FB token exchange failed: ${await tRes.text()}`, { status: 502 });
  const tJson = await tRes.json() as { access_token?: string; token_type?: string; expires_in?: number };
  let userToken = tJson.access_token as string;
  if (!userToken) return new Response('No access token', { status: 502 });
  // Exchange to long-lived token
  const ll = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: userToken,
  }));
  let userExpiresAt: number | null = null;
  if (ll.ok) {
    const llJ = await ll.json() as any;
    userToken = llJ.access_token || userToken;
    if (llJ.expires_in) userExpiresAt = Math.floor(Date.now()/1000) + Number(llJ.expires_in);
  }
  // Get pages
  const pages = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!pages.ok) return new Response(`Pages fetch failed: ${await pages.text()}`, { status: 502 });
  const pJson = await pages.json() as { data?: Array<{ id: string; name: string; access_token: string }> };
  const list = pJson.data || [];
  let savedAny = false;
  for (const p of list) {
    // Get IG user attached to the Page
    const igRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(p.id)}?fields=instagram_business_account`, {
      headers: { Authorization: `Bearer ${p.access_token}` },
    });
    if (!igRes.ok) continue;
    const igJson = await igRes.json() as any;
    const ig = igJson?.instagram_business_account?.id as string | undefined;
    if (!ig) continue;
    // Fetch IG username
    const igU = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(ig)}?fields=username`, {
      headers: { Authorization: `Bearer ${p.access_token}` },
    });
    const igUJson = igU.ok ? await igU.json() as any : {};
    const username = igUJson?.username || '';
    // Save
    const sql = getPg(env);
    await sql`insert into public.ig_accounts (ig_user_id, page_id, page_name, username, access_token, user_access_token, user_expires_at, email) values (${ig}, ${p.id}, ${p.name}, ${username}, ${p.access_token}, ${userToken}, ${userExpiresAt ? new Date(userExpiresAt*1000) : null}, ${sess.email}) on conflict (ig_user_id) do update set page_id=excluded.page_id, page_name=excluded.page_name, username=excluded.username, access_token=excluded.access_token, user_access_token=excluded.user_access_token, user_expires_at=excluded.user_expires_at, email=excluded.email, updated_at=now()`;
    // Mark provider connected as 'iggraph' too for unified integrations list
    try { await upsertOAuthAccountToXata(env, { provider: 'iggraph', provider_user_id: ig, email: sess.email }); } catch {}
    savedAny = true;
  }
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', setCookie('oauth_state_fb', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/iggraph' }));
  const targetOrigin = url.origin;
  const msg = { ok: savedAny, provider: 'iggraph' };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        var data = ${JSON.stringify(msg)};
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage({ type: 'oauth:iggraph', data: data }, ${JSON.stringify(targetOrigin)});
        }
      } catch (e) {}
      window.close();
    })();
  </script></body></html>`;
  return new Response(html, { status: 200, headers });
}

async function listUserIntegrations(env: Env, email: string): Promise<Array<{ provider: string }>> {
  const sql = getPg(env);
  const rows = await sql`select provider from public.oauth_accounts where email=${email}` as Array<{ provider: string }>;
  return rows;
}

async function deleteUserIntegration(env: Env, email: string, provider: string): Promise<void> {
  const sql = getPg(env);
  await sql`delete from public.oauth_accounts where email=${email} and provider=${provider}`;
  if (provider === 'iggraph') {
    // Also remove any stored IG Business accounts for this user
    await sql`delete from public.ig_accounts where email=${email}`;
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

async function debugFBToken(env: Env, inputToken: string): Promise<{ is_valid: boolean; expires_at?: number }> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';
  if (!appId || !appSecret) return { is_valid: false };
  const r = await fetch('https://graph.facebook.com/debug_token?' + new URLSearchParams({ input_token: inputToken, access_token: `${appId}|${appSecret}` }));
  if (!r.ok) return { is_valid: false };
  const j = await r.json() as any;
  const data = j?.data || {};
  return { is_valid: !!data.is_valid, expires_at: data.expires_at };
}

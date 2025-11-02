import postgres from 'postgres'

function getPg(env: Env) {
  const dsn = env.XATA_DATABASE_URL || '';
  if (!dsn) throw new Error('Missing XATA_DATABASE_URL');
  // Create a fresh client per request context to avoid cross-request I/O issues
  return postgres(dsn, { ssl: 'require' });
}

// Unique build identifier for dev auto-reload. Changes on every bundle.
const BUILD_ID = String(Date.now());

function effectiveOrigin(request: Request, url: URL): string {
  const xfHost = request.headers.get('x-forwarded-host');
  const xfProto = request.headers.get('x-forwarded-proto');
  if (xfHost) {
    const proto = (xfProto && (xfProto === 'http' || xfProto === 'https')) ? xfProto : (url.protocol.replace(':','') || 'https');
    return `${proto}://${xfHost}`;
  }
  // Fall back to Referer header's origin if present (common when called from SPA)
  const ref = request.headers.get('referer') || request.headers.get('referrer');
  if (ref) {
    try { return new URL(ref).origin; } catch {}
  }
  return url.origin;
}

function isHttps(request: Request, url: URL): boolean {
  const xfProto = request.headers.get('x-forwarded-proto');
  if (xfProto) return xfProto === 'https';
  return url.protocol === 'https:';
}

function paramOrigin(url: URL): string | null {
  const p = url.searchParams.get('origin');
  if (!p) return null;
  try {
    const u = new URL(p);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return `${u.protocol}//${u.host}`;
    }
  } catch {}
  return null;
}

function devOriginFromEnv(env: Env): string | null {
  const val = (env as any)?.DEV_ORIGIN as string | undefined;
  if (!val) return null;
  try {
    const u = new URL(val);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return `${u.protocol}//${u.host}`;
    }
  } catch {}
  return null;
}

// Short-lived idempotency cache for OAuth authorization codes to avoid
// duplicate token exchanges caused by browser double-calls to the callback.
const USED_OAUTH_CODES = new Map<string, number>();
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes
function pruneUsedCodes(now: number) {
  if (USED_OAUTH_CODES.size === 0) return;
  for (const [k, t] of USED_OAUTH_CODES.entries()) {
    if (now - t > OAUTH_CODE_TTL_MS) USED_OAUTH_CODES.delete(k);
  }
  // Soft cap to prevent unbounded growth
  if (USED_OAUTH_CODES.size > 5000) {
    const target = Math.floor(USED_OAUTH_CODES.size * 0.6);
    let i = 0;
    for (const k of USED_OAUTH_CODES.keys()) { USED_OAUTH_CODES.delete(k); if (++i >= target) break; }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {

    // Handle auth routes inside the Worker first
    if (url.pathname === "/api/auth/google/start") {
      return startGoogleOAuth(request, env, url);
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
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      const sql = getPg(env);
      const rows = user?.id
        ? await sql`select ig_user_id, page_id, page_name, username, access_token, user_access_token from public.ig_accounts where user_id=${user.id} or email=${sess.email}` as Array<any>
        : await sql`select ig_user_id, page_id, page_name, username, access_token, user_access_token from public.ig_accounts where email=${sess.email}` as Array<any>;
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
      // Return recent content, optionally filtered by ig_user_id
      let rows: Array<any> = [];
      if (igUserId) {
        rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} and ig_user_id=${igUserId} order by timestamp desc limit 200` as Array<any>;
      } else {
        rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} order by timestamp desc limit 500` as Array<any>;
      }
      return new Response(JSON.stringify({ ok: true, items: rows }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/ig/sync-content' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess?.email) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
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
              ${String(it.id || '')}, ${igUserId}, ${it.caption || ''}, ${String(it.media_type || '')}, ${String(it.media_url || '')}, ${String(it.permalink || '')}, ${String(it.thumbnail_url || '')}, ${it.timestamp ? new Date(it.timestamp) : null}, ${sess.email}, ${(sql as any).json(it)}
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
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      const rows = user?.id
        ? await sql`select user_access_token from public.ig_accounts where ig_user_id=${ig_user_id} and (email=${sess.email} or user_id=${user.id}) limit 1` as Array<any>
        : await sql`select user_access_token from public.ig_accounts where ig_user_id=${ig_user_id} and email=${sess.email} limit 1` as Array<any>;
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
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      if (user?.id) {
        await sql`delete from public.ig_accounts where ig_user_id=${igUserId} and (email=${sess.email} or user_id=${user.id})`;
      } else {
        await sql`delete from public.ig_accounts where ig_user_id=${igUserId} and email=${sess.email}`;
      }
      // Also drop oauth mapping for that iggraph user id if present
      await sql`delete from public.oauth_accounts where provider='iggraph' and provider_user_id=${igUserId} and email=${sess.email}`;
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    }
    // Remove legacy HTTP debug route; we now use direct Postgres

    // Dev-only endpoints for auto-reload
    if (url.pathname === '/__dev/build') {
      // Legacy polling endpoint (kept as a fallback)
      return new Response(BUILD_ID, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/__dev/events') {
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          // Recommend reconnection time
          controller.enqueue(enc.encode('retry: 1500\n'));
          // Send current build id
          controller.enqueue(enc.encode(`data: ${BUILD_ID}\n\n`));
          // Keepalive comments so proxies keep the connection open
          const iv = setInterval(() => {
            try { controller.enqueue(enc.encode(': keepalive\n\n')); } catch {}
          }, 25000);
          // On connection close, stop keepalive
          (controller as any)._iv = iv;
        },
        cancel(_reason) {
          const iv = (this as any)._iv as ReturnType<typeof setInterval> | undefined;
          if (iv) clearInterval(iv);
        }
      });
      return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } });
    }

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
        const s = await getUserPrefs(env, sess.email).catch(() => ({} as any));
        return new Response(JSON.stringify({ ok: true, settings: s }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PATCH') {
        const payload = await request.json().catch(() => ({} as Record<string, unknown>));
        const theme = typeof (payload as any).theme === 'string' ? (payload as any).theme : undefined;
        const res = await setUserPrefs(env, sess.email, { theme }).then(() => true).catch(() => false);
        return new Response(JSON.stringify({ ok: res }), { status: res ? 200 : 500, headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === "/api/keys/gemini") {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email);
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      if (request.method === 'GET') {
        const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='gemini_key' limit 1` as Array<{ config: any }>;
        const cfg = rows[0]?.config || {};
        const apiKey: string = typeof cfg.api_key === 'string' ? cfg.api_key : '';
        const last4 = apiKey ? apiKey.slice(-4) : '';
        return new Response(JSON.stringify({ ok: true, configured: !!apiKey, last4 }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PUT') {
        const body = (await request.json().catch(() => ({}))) as any;
        const apiKey = typeof (body as any).api_key === 'string' ? (body as any).api_key.trim() : '';
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'missing_api_key' }), { status: 400, headers: { 'content-type': 'application/json' } });
        await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'gemini_key', ${(sql as any).json({ api_key: apiKey })}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'DELETE') {
        await sql`delete from public.user_settings where user_id=${user.id} and key='gemini_key'`;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    // Stripe: create/list products, create/list prices, checkout session
    if (url.pathname === '/api/stripe/products') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      if (request.method === 'GET') {
        const rows = await sql`select stripe_product_id, name, description, active, created_at from public.stripe_products where user_id=${user.id} order by created_at desc` as Array<any>;
        return new Response(JSON.stringify({ ok: true, products: rows }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const name = (body?.name || '').toString().trim();
        const description = (body?.description || '').toString();
        if (!name) return new Response(JSON.stringify({ ok: false, error: 'missing_name' }), { status: 400, headers: { 'content-type': 'application/json' } });
        const s = await stripe(env, '/v1/products', 'POST', new URLSearchParams({ name, description }));
        const pid = s?.id as string;
        if (!pid) return new Response(JSON.stringify({ ok: false }), { status: 502, headers: { 'content-type': 'application/json' } });
        await sql`insert into public.stripe_products (user_id, stripe_product_id, name, description, active) values (${user.id}, ${pid}, ${name}, ${description}, true) on conflict (stripe_product_id) do nothing`;
        return new Response(JSON.stringify({ ok: true, product_id: pid }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === '/api/stripe/prices') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      if (request.method === 'GET') {
        const qp = url.searchParams;
        const pid = qp.get('product');
        const rows = pid
          ? await sql`select stripe_price_id, stripe_product_id, currency, unit_amount, type, interval, interval_count, active, created_at from public.stripe_prices where user_id=${user.id} and stripe_product_id=${pid} order by created_at desc` as Array<any>
          : await sql`select stripe_price_id, stripe_product_id, currency, unit_amount, type, interval, interval_count, active, created_at from public.stripe_prices where user_id=${user.id} order by created_at desc` as Array<any>;
        return new Response(JSON.stringify({ ok: true, prices: rows }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const stripe_product_id = (body?.product_id || '').toString().trim();
        const currency = (body?.currency || 'usd').toString().toLowerCase();
        const unit_amount = Math.max(50, Number(body?.unit_amount || 0)|0); // min 50 cents
        const kind = (body?.type || 'one_time').toString();
        if (!stripe_product_id || !currency || !unit_amount) return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });
        const params = new URLSearchParams({ currency, unit_amount: String(unit_amount), product: stripe_product_id });
        if (kind === 'recurring') {
          const interval = (body?.interval || 'month').toString();
          const interval_count = Math.max(1, Number(body?.interval_count || 1)|0);
          params.set('recurring[interval]', interval);
          params.set('recurring[interval_count]', String(interval_count));
        }
        const s = await stripe(env, '/v1/prices', 'POST', params);
        const priceId = s?.id as string;
        if (!priceId) return new Response(JSON.stringify({ ok: false }), { status: 502, headers: { 'content-type': 'application/json' } });
        await sql`insert into public.stripe_prices (user_id, stripe_product_id, stripe_price_id, currency, unit_amount, type, interval, interval_count, active) values (${user.id}, ${stripe_product_id}, ${priceId}, ${currency}, ${unit_amount}, ${kind}, ${kind==='recurring'? (s?.recurring?.interval||null): null}, ${kind==='recurring'? (s?.recurring?.interval_count||null): null}, true) on conflict (stripe_price_id) do nothing`;
        return new Response(JSON.stringify({ ok: true, price_id: priceId }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === '/api/stripe/sync-products' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const fetched = await stripeListAll(env, '/v1/products', new URLSearchParams({ limit: '100' }));
      let upserts = 0;
      for (const p of (fetched?.data || [])) {
        const pid = p?.id as string; if (!pid) continue;
        const name = (p?.name || '').toString();
        const description = (p?.description || '').toString();
        const active = !!p?.active;
        await sql`insert into public.stripe_products (user_id, stripe_product_id, name, description, active) values (${user.id}, ${pid}, ${name}, ${description}, ${active}) on conflict (stripe_product_id) do update set name=excluded.name, description=excluded.description, active=excluded.active`;
        upserts++;
      }
      return new Response(JSON.stringify({ ok: true, upserts }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/stripe/sync-prices' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email).catch(() => null as any)
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const fetched = await stripeListAll(env, '/v1/prices', new URLSearchParams({ limit: '100' }));
      let upserts = 0;
      for (const pr of (fetched?.data || [])) {
        const priceId = pr?.id as string; if (!priceId) continue;
        const product = (pr?.product || '').toString();
        const currency = (pr?.currency || '').toString();
        const unit_amount = Number(pr?.unit_amount || 0) | 0;
        const type = (pr?.type || (pr?.recurring ? 'recurring' : 'one_time')).toString();
        const interval = pr?.recurring?.interval ? String(pr?.recurring?.interval) : null;
        const interval_count = pr?.recurring?.interval_count ? Number(pr?.recurring?.interval_count) : null;
        const active = !!pr?.active;
        await sql`insert into public.stripe_prices (user_id, stripe_product_id, stripe_price_id, currency, unit_amount, type, interval, interval_count, active) values (${user.id}, ${product}, ${priceId}, ${currency}, ${unit_amount}, ${type}, ${interval}, ${interval_count}, ${active}) on conflict (stripe_price_id) do update set currency=excluded.currency, unit_amount=excluded.unit_amount, type=excluded.type, interval=excluded.interval, interval_count=excluded.interval_count, active=excluded.active`;
        upserts++;
      }
      return new Response(JSON.stringify({ ok: true, upserts }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/stripe/checkout' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const body = (await request.json().catch(() => ({}))) as any;
      const price = (body?.price_id || '').toString().trim();
      const mode = (body?.mode || 'payment').toString(); // 'payment' or 'subscription'
      const success_url = (body?.success_url || (new URL('/', new URL(request.url).origin)).toString());
      const cancel_url = (body?.cancel_url || success_url);
      if (!price) return new Response(JSON.stringify({ ok: false, error: 'missing_price' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const params = new URLSearchParams();
      params.set('mode', mode);
      params.set('success_url', success_url);
      params.set('cancel_url', cancel_url);
      params.set('line_items[0][price]', price);
      params.set('line_items[0][quantity]', '1');
      const s = await stripe(env, '/v1/checkout/sessions', 'POST', params);
      const urlStr = s?.url as string;
      if (!urlStr) return new Response(JSON.stringify({ ok: false }), { status: 502, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true, url: urlStr }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/files' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email);
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const body = (await request.json().catch(() => ({}))) as any;
      const key = typeof body.key === 'string' ? body.key : '';
      const urlStr = typeof body.url === 'string' ? body.url : '';
      const thumb = typeof body.thumb_url === 'string' ? body.thumb_url : '';
      const ct = typeof body.content_type === 'string' ? body.content_type : '';
      const size = typeof body.size_bytes === 'number' ? Math.max(0, Math.floor(body.size_bytes)) : null;
      if (!key || !urlStr) return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      await sql`insert into public.user_uploads (user_id, key, url, thumb_url, content_type, size_bytes) values (${user.id}, ${key}, ${urlStr}, ${thumb || null}, ${ct || null}, ${size}) on conflict (user_id, key) do update set url=excluded.url, thumb_url=excluded.thumb_url, content_type=excluded.content_type, size_bytes=excluded.size_bytes, updated_at=now()`;
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/drafts') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email);
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      if (request.method === 'GET') {
        const ig = new URL(request.url).searchParams.get('ig_user_id') || '';
        if (ig) {
          const rows = await sql`select payload, updated_at from public.user_drafts where user_id=${user.id} and ig_user_id=${ig} limit 1` as Array<{ payload: any; updated_at: string }>;
          return new Response(JSON.stringify({ ok: true, payload: rows[0]?.payload || null, updated_at: rows[0]?.updated_at || null }), { headers: { 'content-type': 'application/json' } });
        }
        const rows = await sql`select ig_user_id, updated_at from public.user_drafts where user_id=${user.id}` as Array<{ ig_user_id: string; updated_at: string }>;
        return new Response(JSON.stringify({ ok: true, drafts: rows }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PUT') {
        const body = (await request.json().catch(() => ({}))) as any;
        const ig = typeof body.ig_user_id === 'string' ? body.ig_user_id : '';
        const payload = typeof body.payload === 'object' && body.payload ? body.payload : {};
        if (!ig) return new Response(JSON.stringify({ ok: false, error: 'missing_ig_user_id' }), { status: 400, headers: { 'content-type': 'application/json' } });
        await sql`insert into public.user_drafts (user_id, ig_user_id, payload) values (${user.id}, ${ig}, ${(sql as any).json(payload)}) on conflict (user_id, ig_user_id) do update set payload=excluded.payload, updated_at=now()`;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === '/api/agents/settings') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const user = await findUserByEmail(env, sess.email);
      if (!user?.id) {
        return new Response(JSON.stringify({ ok: true, models: [], default_model: '' }), { headers: { 'content-type': 'application/json' } });
      }
      const sql = getPg(env);
      if (request.method === 'GET') {
        const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='agent_settings' limit 1` as Array<{ config: any }>;
        const cfg = rows[0]?.config || {};
        const models: string[] = Array.isArray(cfg.models) ? cfg.models : [];
        const defModel: string = (typeof cfg.default_model === 'string' && cfg.default_model && models.includes(cfg.default_model)) ? cfg.default_model : '';
        return new Response(JSON.stringify({ ok: true, models, default_model: defModel }), { headers: { 'content-type': 'application/json' } });
      }
      if (request.method === 'PUT') {
        const body = (await request.json().catch(() => ({}))) as any;
        const models = Array.isArray(body.models) ? Array.from(new Set(body.models.filter((m: any) => typeof m === 'string').map((m: string) => m.trim()).filter(Boolean))) : [];
        const default_model_raw = (typeof body.default_model === 'string' ? body.default_model.trim() : '');
        const default_model = models.includes(default_model_raw) ? default_model_raw : (models[0] || '');
        const next = { models, default_model };
        await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'agent_settings', ${(sql as any).json(next)}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(null, { status: 405 });
    }
    if (url.pathname === '/api/agents/chat' && request.method === 'POST') {
      const sess = await getSessionFromCookie(request, env);
      if (!sess) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'content-type': 'application/json' } });
      const sql = getPg(env);
      const user = await findUserByEmail(env, sess.email);
      if (!user?.id) return new Response(JSON.stringify({ ok: false, error: 'user_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      // Load Gemini API key from user_settings
      const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='gemini_key' limit 1` as Array<{ config: any }>;
      const apiKey: string = rows[0]?.config?.api_key || '';
      if (!apiKey) {
        return new Response(
          JSON.stringify({ ok: false, error: 'missing_gemini_key', message: 'Gemini API key not set. Add one under Agents → API Keys.' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }
      const body = (await request.json().catch(() => ({}))) as any;
      const model = (typeof body.model === 'string' && body.model) ? body.model : 'gemini-1.5-flash';
      const msgs = Array.isArray(body.messages) ? body.messages as Array<{ role: string; content: string }> : [];
      // Transform to Gemini generateContent format
      const contents = msgs.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      }));
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents }),
      });
      if (!r.ok) {
        const t = await r.text();
        let message = 'Upstream error';
        let statusCode: number | undefined = undefined;
        let statusText: string | undefined = undefined;
        try {
          const ej = JSON.parse(t);
          statusCode = ej?.error?.code;
          statusText = ej?.error?.status;
          const details = Array.isArray(ej?.error?.details) ? ej.error.details : [];
          const loc = details.find((d: any) => d?.['@type']?.toString().includes('LocalizedMessage'));
          message = (loc?.message as string) || (ej?.error?.message as string) || message;
        } catch {}
        console.error('agents.chat upstream error', { httpStatus: r.status, statusText: r.statusText, body: t });
        return new Response(
          JSON.stringify({ ok: false, error: 'upstream_error', message, code: statusCode, status: statusText }),
          { status: 502, headers: { 'content-type': 'application/json' } }
        );
      }
      const j = await r.json() as any;
      const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '')?.join('') || '';
      return new Response(JSON.stringify({ ok: true, text }), { headers: { 'content-type': 'application/json' } });
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
      // Avoid forbidden headers like 'host' and avoid reusing a consumed body
      const reqHeaders = new Headers(request.headers);
      reqHeaders.delete('host');
      reqHeaders.delete('content-length');

      // Handle preflight quickly (useful if custom headers are sent)
      if (request.method === "OPTIONS") {
        const res = new Response(null, { status: 204 });
        res.headers.set("access-control-allow-origin", url.origin);
        res.headers.set("access-control-allow-headers", reqHeaders.get("access-control-request-headers") ?? "*");
        res.headers.set("access-control-allow-methods", reqHeaders.get("access-control-request-method") ?? "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.headers.set("access-control-max-age", "86400");
        return res;
      }

      try {
      const cloned = request.clone();
      const backendRequest = new Request(backendUrl.toString(), {
        method: cloned.method,
        headers: reqHeaders,
        body: ["GET", "HEAD"].includes(cloned.method) ? undefined : cloned.body,
        redirect: "manual",
      });

        const backendResponse = await fetch(backendRequest);
        if (backendResponse.status >= 500) {
          console.error('api_proxy upstream 5xx', {
            method: request.method,
            path: url.pathname,
            target: backendUrl.toString(),
            status: backendResponse.status,
          });
        }
        // Pass-through response; optionally set CORS for safety (same-origin typically not needed)
        const resHeaders = new Headers(backendResponse.headers);
        resHeaders.set("access-control-allow-origin", url.origin);
        return new Response(backendResponse.body, {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          headers: resHeaders,
        });
      } catch (e: any) {
        console.error('api_proxy fetch error', {
          method: request.method,
          path: url.pathname,
          target: backendUrl.toString(),
          error: String(e?.message || e),
        });
        return new Response(JSON.stringify({ ok: false, error: 'proxy_error', message: 'Network error talking to backend' }), { status: 502, headers: { 'content-type': 'application/json' } });
      }
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
    } catch (e: any) {
      // Top-level safeguard to avoid opaque failures
      console.error('unhandled worker error', { path: url.pathname, error: String(e?.message || e) });
      return new Response(JSON.stringify({ ok: false, error: 'internal_error', message: 'Unexpected error' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
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
  // Read the HTML to inject a tiny dev auto-reload script when running locally.
  const text = await res.text();
  const wantAutoReload = (env as any)?.DEV_AUTORELOAD === '1';
  const injected = wantAutoReload
    ? text.replace('</body>', `  <script>
      (function(){
        try {
          var cur = null;
          if ('EventSource' in window) {
            var es = new EventSource('/__dev/events');
            es.onmessage = function(ev){
              var t = ev.data || '';
              if (cur === null) { cur = t; return; }
              if (t && t !== cur) { location.reload(); }
            };
          } else {
            // Fallback to lightweight polling if EventSource unavailable
            async function ping(){
              try {
                var r = await fetch('/__dev/build', { cache: 'no-store' });
                var t = await r.text();
                if (cur === null) { cur = t; return; }
                if (t && t !== cur) { location.reload(); }
              } catch (e) {}
            }
            setInterval(ping, 2000);
            ping();
          }
        } catch (e) {}
      })();
    </script>\n</body>`) : text;
  const headers = new Headers(res.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.delete('location');
  return new Response(injected, { status: 200, headers });
}

// --- Helpers: base64url & cookies ---
function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToString(s: string): string {
  return utf8(b64urlDecodeToBytes(s));
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

async function stripe(env: Env, path: string, method: string, body?: URLSearchParams): Promise<any> {
  const key = (env as any).STRIPE_SECRET_KEY as string | undefined;
  if (!key) throw new Error('missing_stripe_secret');
  const init: RequestInit = {
    method,
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/x-www-form-urlencoded',
    }
  };
  if (body) (init as any).body = body;
  const res = await fetch(`https://api.stripe.com${path}`, init);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`stripe_${res.status}: ${t}`);
  }
  return await res.json();
}

async function stripeListAll(env: Env, path: string, params: URLSearchParams): Promise<{ data: any[] }> {
  const out: any[] = [];
  let starting_after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const p = new URLSearchParams(params);
    if (starting_after) p.set('starting_after', starting_after);
    const page = await stripe(env, path + '?' + p.toString(), 'GET');
    const data = Array.isArray(page?.data) ? page.data : [];
    out.push(...data);
    if (page?.has_more && data.length) {
      starting_after = String(data[data.length - 1].id || '');
      if (!starting_after) break;
    } else break;
  }
  return { data: out };
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

// --- Signed state helpers (avoids strict cookie reliance during OAuth) ---
async function makeSignedState(secret: string | undefined, context: { origin: string }): Promise<string> {
  // Payload: nonce|timestamp|origin
  const nonce = newState();
  const ts = Date.now();
  const data = `${nonce}|${ts}|${context.origin}`;
  if (!secret) return `${b64url(utf8Bytes(data))}.`; // unsigned (dev)
  const sig = await signHmacSHA256(secret, data);
  return `${b64url(utf8Bytes(data))}.${b64url(sig)}`;
}

async function verifySignedState(state: string | null, secret: string | undefined): Promise<boolean> {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length < 1) return false;
  const raw = parts[0];
  const sig = parts[1] || '';
  let data = '';
  try { data = b64urlToString(raw); } catch { return false; }
  const fields = data.split('|');
  if (fields.length < 3) return false;
  const ts = Number(fields[1] || '0');
  if (!Number.isFinite(ts)) return false;
  // Expire in 10 minutes
  if (Date.now() - ts > 10 * 60 * 1000) return false;
  if (!secret) return true; // accept unsigned in dev
  const expected = await signHmacSHA256(secret, data);
  const given = sig ? b64urlDecodeToBytes(sig) : new Uint8Array(0);
  if (given.length !== expected.length) return false;
  let ok = 0; for (let i = 0; i < given.length; i++) ok |= given[i] ^ expected[i];
  return ok === 0;
}

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
async function startGoogleOAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET', { status: 500 });
  }

  const origin = paramOrigin(url) || devOriginFromEnv(env) || effectiveOrigin(request, url);
  const state = await makeSignedState(env.SESSION_SECRET, { origin });
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('access_type', 'offline');
  authorize.searchParams.set('include_granted_scopes', 'true');
  // Ensure the Google account chooser appears after logout or when switching accounts.
  // Allow overriding via `?prompt=` on the start URL; default to `select_account`.
  const prompt = (url.searchParams.get('prompt') || 'select_account').trim();
  if (prompt) authorize.searchParams.set('prompt', prompt);
  authorize.searchParams.set('state', state);

  // Debug mode: surface computed values instead of redirecting
  if (url.searchParams.get('debug') === '1') {
    const body = { origin, redirect_uri: redirectUri, authorize: authorize.toString(), client_id: clientId, state };
    return new Response(JSON.stringify(body, null, 2), { headers: { 'content-type': 'application/json' } });
  }

  const headers = new Headers({ Location: authorize.toString() });
  const secure = isHttps(request, url);
  // Best-effort cookie for legacy validation and CSRF defense-in-depth; optional in dev
  headers.append('Set-Cookie', setCookie('oauth_state', state, { maxAgeSec: 600, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
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
  const nowMs = Date.now();
  pruneUsedCodes(nowMs);
  // Duplicate/refresh guard: if a valid session already exists, skip exchange and navigate opener
  const existing = await getSessionFromCookie(request, env);
  if (existing?.email) {
    const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
    const origin = effectiveOrigin(request, url);
    const html = `<!doctype html><html><body><script>
      (function(){ try { if (window.opener) { window.opener.location.href = ${JSON.stringify(origin + '/dashboard')}; } } catch (e) {} window.close(); })();
    </script></body></html>`;
    return new Response(html, { status: 200, headers });
  }
  // If this code was already used recently, short-circuit as success
  if (USED_OAUTH_CODES.has(code)) {
    const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
    const origin = effectiveOrigin(request, url);
    const html = `<!doctype html><html><body><script>
      (function(){ try { if (window.opener) { window.opener.location.href = ${JSON.stringify(origin + '/dashboard')}; } } catch (e) {} window.close(); })();
    </script></body></html>`;
    return new Response(html, { status: 200, headers });
  }
  const cookies = getCookies(request);
  const signedOk = await verifySignedState(state, env.SESSION_SECRET);
  const cookieOk = (state && cookies.oauth_state === state);
  if (!signedOk && !cookieOk) {
    return new Response('Invalid state', { status: 400 });
  }

  const origin = effectiveOrigin(request, url);
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
  USED_OAUTH_CODES.set(code, nowMs);
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
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state', '', { maxAgeSec: 0, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  headers.append('Set-Cookie', setCookie('session', token, { maxAgeSec: 60 * 60 * 24 * 7, secure, httpOnly: true, sameSite: 'Lax', path: '/' }));
  const targetOrigin = url.origin;
  const message = { ok: true, provider: 'google', email: profile.email, name: profile.name ?? '', picture: profile.picture ?? '' };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        const data = ${JSON.stringify(message)};
        if (window.opener) {
          try { window.opener.postMessage({ type: 'oauth:google', data }, ${JSON.stringify(targetOrigin)}); } catch (e) {}
          try { window.opener.location.href = ${JSON.stringify(origin + '/dashboard')}; } catch (e) {}
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
    await sql`update public.users set name=${record.name}, profile=${record.profile} where xata_id=${rows[0].id}`;
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

async function getUserPrefs(env: Env, email: string): Promise<Record<string, unknown>> {
  const sql = getPg(env);
  const user = await findUserByEmail(env, email);
  if (!user?.id) return {};
  const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='prefs' limit 1` as Array<{ config: any }>;
  return rows[0]?.config || {};
}

async function setUserPrefs(env: Env, email: string, updates: { theme?: string }): Promise<void> {
  const sql = getPg(env);
  const user = await findUserByEmail(env, email);
  if (!user?.id) return;
  const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='prefs' limit 1` as Array<{ config: any }>;
  const current = rows[0]?.config || {};
  const next = { ...current } as any;
  if (typeof updates.theme === 'string') next.theme = updates.theme;
  await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'prefs', ${(sql as any).json(next)}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
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
  const origin = paramOrigin(url) || devOriginFromEnv(env) || effectiveOrigin(request, url);
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const authorize = new URL('https://api.instagram.com/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'user_profile');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state_ig', state, { maxAgeSec: 600, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/instagram' }));
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

  const redirectUri = `${effectiveOrigin(request, url)}/api/auth/instagram/callback`;
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
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state_ig', '', { maxAgeSec: 0, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/instagram' }));
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
  const origin = paramOrigin(url) || devOriginFromEnv(env) || effectiveOrigin(request, url);
  const redirectUri = `${origin}/api/auth/iggraph/callback`;
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
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state_fb', state, { maxAgeSec: 600, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/iggraph' }));
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
  const redirectUri = `${effectiveOrigin(request, url)}/api/auth/iggraph/callback`;

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
    const me = await findUserByEmail(env, sess.email).catch(() => null as any)
    await sql`insert into public.ig_accounts (ig_user_id, page_id, page_name, username, access_token, user_access_token, user_expires_at, email, user_id) values (${ig}, ${p.id}, ${p.name}, ${username}, ${p.access_token}, ${userToken}, ${userExpiresAt ? new Date(userExpiresAt*1000) : null}, ${sess.email}, ${me?.id || null}) on conflict (ig_user_id) do update set page_id=excluded.page_id, page_name=excluded.page_name, username=excluded.username, access_token=excluded.access_token, user_access_token=excluded.user_access_token, user_expires_at=excluded.user_expires_at, email=excluded.email, user_id=coalesce(excluded.user_id, public.ig_accounts.user_id), updated_at=now()`;
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
  if (!tok) return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { 'content-type': 'application/json' } });
  const payload = await verifySessionToken(tok, env.SESSION_SECRET);
  if (!payload) return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { 'content-type': 'application/json' } });
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

// Instagram routes: OAuth flows (Basic + Graph), content, publish, sync, refresh, delete

import { logger } from '../logger';
import {
  getCookies, setCookie, getSessionFromCookie,
  makeSignedState, verifySignedState, extractOriginFromState,
} from '../crypto';
import {
  getPg, effectiveOrigin, isHttps, paramOrigin, devOriginFromEnv,
  findUserByEmail, upsertOAuthAccount, debugFBToken,
  jsonResponse, errorResponse, unauthorizedResponse,
} from '../helpers';

export async function handleIGAccounts(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in ig/accounts', { error: e.message, email: sess.email });
    return null as any;
  });
  const sql = getPg(env);
  const rows = user?.id
    ? await sql`select ig_user_id, page_id, page_name, username, access_token, user_access_token from public.ig_accounts where user_id=${user.id} or email=${sess.email}` as Array<any>
    : await sql`select ig_user_id, page_id, page_name, username, access_token, user_access_token from public.ig_accounts where email=${sess.email}` as Array<any>;
  const withStatus = await Promise.all(rows.map(async (r) => {
    const status: any = await debugFBToken(env, r.access_token).catch(() => ({ is_valid: false }));
    const exp = (status && typeof status.expires_at !== 'undefined') ? status.expires_at : null;
    let linked = false;
    try {
      const chk = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(r.ig_user_id)}?fields=id`, { headers: { Authorization: `Bearer ${r.access_token}` } });
      linked = chk.ok;
    } catch { }
    return { ig_user_id: r.ig_user_id, page_id: r.page_id, page_name: r.page_name, username: r.username, token_valid: !!status?.is_valid, token_expires_at: exp, linked };
  }));
  return jsonResponse({ ok: true, accounts: withStatus });
}

export async function handleIGContent(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const sql = getPg(env);
  const urlObj = new URL(request.url);
  const igUserId = urlObj.searchParams.get('ig_user_id') || '';
  let rows: Array<any> = [];
  if (igUserId) {
    rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} and ig_user_id=${igUserId} order by timestamp desc limit 200` as Array<any>;
  } else {
    rows = await sql`select media_id, ig_user_id, caption, media_type, media_url, permalink, thumbnail_url, timestamp from public.ig_media where email=${sess.email} order by timestamp desc limit 500` as Array<any>;
  }
  return jsonResponse({ ok: true, items: rows });
}

export async function handleIGSyncContent(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const sql = getPg(env);
  const accounts = await sql`select ig_user_id, access_token from public.ig_accounts where email=${sess.email}` as Array<{ ig_user_id: string; access_token: string }>;
  const counts: Record<string, number> = {};
  for (const acc of accounts) {
    const igUserId = acc.ig_user_id;
    let fetched = 0;
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
      if (fetched >= 1000) break;
    }
    counts[igUserId] = fetched;
  }
  return jsonResponse({ ok: true, counts });
}

export async function handleIGPublish(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const body = await request.json().catch(() => ({} as unknown));
  const ig_user_id = (body as any).ig_user_id as string | undefined;
  const image_url = (body as any).image_url as string | undefined;
  const caption = (body as any).caption as string | undefined;
  if (!ig_user_id || !image_url) return errorResponse('missing_params', 400);
  const sql = getPg(env);
  const row = (await sql`select access_token from public.ig_accounts where ig_user_id=${ig_user_id} and email=${sess.email} limit 1`) as Array<any>;
  if (!row.length) return errorResponse('not_found', 404);
  const access = row[0].access_token as string;
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
  return jsonResponse({ ok: true, result: pubJ });
}

export async function handleIGRefresh(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const body = await request.json().catch(() => ({} as unknown));
  const ig_user_id = (body as any).ig_user_id as string | undefined;
  if (!ig_user_id) return errorResponse('missing_ig_user_id', 400);
  const sql = getPg(env);
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in ig/refresh', { error: e.message });
    return null as any;
  });
  const rows = user?.id
    ? await sql`select user_access_token from public.ig_accounts where ig_user_id=${ig_user_id} and (email=${sess.email} or user_id=${user.id}) limit 1` as Array<any>
    : await sql`select user_access_token from public.ig_accounts where ig_user_id=${ig_user_id} and email=${sess.email} limit 1` as Array<any>;
  if (!rows.length || !rows[0].user_access_token) return errorResponse('reauthorization_required', 400);
  const userToken = rows[0].user_access_token as string;
  const userTokStatus: any = await debugFBToken(env, userToken).catch(() => ({ is_valid: false }));
  if (!userTokStatus?.is_valid) {
    return errorResponse('reauthorization_required', 400);
  }
  const pages = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account`, { headers: { Authorization: `Bearer ${userToken}` } });
  if (!pages.ok) return errorResponse('pages_fetch_failed', 502, { details: await pages.text() });
  const pJson = await pages.json() as any;
  let entry = (pJson.data || []).find((p: any) => p.instagram_business_account?.id === ig_user_id);
  if (!entry) {
    for (const p of (pJson.data || [])) {
      const q = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(p.id)}?fields=instagram_business_account`, { headers: { Authorization: `Bearer ${p.access_token}` } });
      if (!q.ok) continue;
      const qj = await q.json() as any;
      if (qj?.instagram_business_account?.id === ig_user_id) { entry = p; break; }
    }
  }
  if (!entry) {
    return errorResponse('ig_account_not_linked', 404);
  }
  await sql`update public.ig_accounts set access_token=${entry.access_token}, updated_at=now() where ig_user_id=${ig_user_id} and email=${sess.email}`;
  return jsonResponse({ ok: true });
}

export async function handleIGAccountDelete(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return unauthorizedResponse();
  const igUserId = url.pathname.split('/').pop() || '';
  if (!igUserId) return errorResponse('missing_ig_user_id', 400);
  const sql = getPg(env);
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in ig/account delete', { error: e.message });
    return null as any;
  });
  if (user?.id) {
    await sql`delete from public.ig_accounts where ig_user_id=${igUserId} and (email=${sess.email} or user_id=${user.id})`;
  } else {
    await sql`delete from public.ig_accounts where ig_user_id=${igUserId} and email=${sess.email}`;
  }
  await sql`delete from public.oauth_accounts where provider='iggraph' and provider_user_id=${igUserId} and email=${sess.email}`;
  return jsonResponse({ ok: true });
}

// --- Instagram Basic Display OAuth ---

export async function startInstagramOAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.FACEBOOK_APP_ID || '';
  const clientSecret = env.FACEBOOK_APP_SECRET || '';
  if (!clientId || !clientSecret) {
    return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  }
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return new Response('Not authenticated', { status: 401 });

  const origin = paramOrigin(url) || devOriginFromEnv(env) || effectiveOrigin(request, url);
  const state = await makeSignedState(env.SESSION_SECRET, { origin });
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const authorize = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'instagram_basic,instagram_manage_messages');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state_ig', state, { maxAgeSec: 600, secure, httpOnly: true, sameSite: 'Lax', path: '/' }));
  return new Response(null, { status: 302, headers });
}

export async function handleInstagramCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const clientId = env.FACEBOOK_APP_ID || '';
  const clientSecret = env.FACEBOOK_APP_SECRET || '';

  // Meta Webhook Verification
  if (request.method === 'GET' && url.searchParams.has('hub.challenge')) {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === env.INSTAGRAM_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Verification failed', { status: 403 });
  }

  if (!clientId || !clientSecret) return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return new Response('Not authenticated', { status: 401 });

  const qs = url.searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  if (!code) return new Response('Missing code', { status: 400 });
  const cookies = getCookies(request);

  logger.debug('Instagram callback', {
    hasState: !!state,
    hasCookie: !!cookies.oauth_state_ig,
    stateMatch: state === cookies.oauth_state_ig,
  });

  if (!state || !cookies.oauth_state_ig || cookies.oauth_state_ig !== state) {
    return new Response(`Invalid state. State: ${!!state}, Cookie: ${!!cookies.oauth_state_ig}, Match: ${state === cookies.oauth_state_ig}`, { status: 400 });
  }

  const originFromState = await verifySignedState(state, env.SESSION_SECRET) ? extractOriginFromState(state) : null;
  const origin = originFromState || effectiveOrigin(request, url);
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return new Response(`Instagram token exchange failed: ${t}`, { status: 502 });
  }
  const tokenJson = await tokenRes.json() as { access_token?: string; user_id?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) return new Response('No access token', { status: 502 });

  const uRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`);
  if (!uRes.ok) {
    const t = await uRes.text();
    return new Response(`Instagram userinfo failed: ${t}`, { status: 502 });
  }
  const profile = await uRes.json() as { id?: string; username?: string };
  if (!profile?.id) return new Response('Missing instagram id', { status: 502 });

  try {
    await upsertOAuthAccount(env, { provider: 'instagram', provider_user_id: profile.id, email: sess.email });
  } catch (e: any) {
    logger.error('Instagram upsert failed', { error: e.message });
  }

  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state_ig', '', { maxAgeSec: 0, secure, httpOnly: true, sameSite: 'Lax', path: '/' }));
  const targetOrigin = origin;
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

export async function startIGGraphOAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';
  if (!appId || !appSecret) return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return new Response('Not authenticated', { status: 401 });
  const origin = paramOrigin(url) || devOriginFromEnv(env) || effectiveOrigin(request, url);
  const state = await makeSignedState(env.SESSION_SECRET, { origin });
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

export async function handleIGGraphCallback(request: Request, env: Env, url: URL): Promise<Response> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';

  // Meta Webhook Verification
  if (request.method === 'GET' && url.searchParams.has('hub.challenge')) {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === env.INSTAGRAM_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Verification failed', { status: 403 });
  }

  if (!appId || !appSecret) return new Response('Missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET', { status: 500 });
  const sess = await getSessionFromCookie(request, env);
  if (!sess?.email) return new Response('Not authenticated', { status: 401 });
  const qs = url.searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  if (!code) return new Response('Missing code', { status: 400 });
  const cookies = getCookies(request);
  if (!state || cookies.oauth_state_fb !== state) return new Response('Invalid state', { status: 400 });
  const originFromState = await verifySignedState(state, env.SESSION_SECRET) ? extractOriginFromState(state) : null;
  const origin = originFromState || effectiveOrigin(request, url);
  const redirectUri = `${origin}/api/auth/iggraph/callback`;

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

  const ll = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: userToken,
  }));
  let userExpiresAt: number | null = null;
  if (ll.ok) {
    const llJ = await ll.json() as any;
    userToken = llJ.access_token || userToken;
    if (llJ.expires_in) userExpiresAt = Math.floor(Date.now() / 1000) + Number(llJ.expires_in);
  }

  const pages = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!pages.ok) return new Response(`Pages fetch failed: ${await pages.text()}`, { status: 502 });
  const pJson = await pages.json() as { data?: Array<{ id: string; name: string; access_token: string }> };
  const list = pJson.data || [];

  logger.info('Facebook Pages found', { count: list.length, pages: list.map(p => ({ id: p.id, name: p.name })) });

  let savedAny = false;
  for (const p of list) {
    const igRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(p.id)}?fields=instagram_business_account`, {
      headers: { Authorization: `Bearer ${p.access_token}` },
    });
    if (!igRes.ok) {
      logger.debug(`Page ${p.name}: No IG account`, { pageId: p.id, status: igRes.status });
      continue;
    }
    const igJson = await igRes.json() as any;
    const ig = igJson?.instagram_business_account?.id as string | undefined;
    if (!ig) {
      logger.debug(`Page ${p.name}: No instagram_business_account field`, { pageId: p.id });
      continue;
    }
    logger.info(`Page ${p.name}: Found IG account`, { pageId: p.id, igUserId: ig });
    const igU = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(ig)}?fields=username`, {
      headers: { Authorization: `Bearer ${p.access_token}` },
    });
    const igUJson = igU.ok ? await igU.json() as any : {};
    const username = igUJson?.username || '';
    const sql = getPg(env);
    const me = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in iggraph callback', { error: e.message });
      return null as any;
    });
    await sql`insert into public.ig_accounts (ig_user_id, page_id, page_name, username, access_token, user_access_token, user_expires_at, email, user_id) values (${ig}, ${p.id}, ${p.name}, ${username}, ${p.access_token}, ${userToken}, ${userExpiresAt ? new Date(userExpiresAt * 1000) : null}, ${sess.email}, ${me?.id || null}) on conflict (ig_user_id, email) do update set page_id=excluded.page_id, page_name=excluded.page_name, username=excluded.username, access_token=excluded.access_token, user_access_token=excluded.user_access_token, user_expires_at=excluded.user_expires_at, user_id=coalesce(excluded.user_id, public.ig_accounts.user_id), updated_at=now()`;
    try { await upsertOAuthAccount(env, { provider: 'iggraph', provider_user_id: ig, email: sess.email }); } catch { }
    savedAny = true;
  }
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  headers.append('Set-Cookie', setCookie('oauth_state_fb', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/api/auth/iggraph' }));
  const targetOrigin = origin;
  const msg = { ok: savedAny, provider: 'iggraph' };

  logger.info('Instagram Graph callback complete', { savedAny, targetOrigin });

  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        var data = ${JSON.stringify(msg)};
        var targetOrigin = ${JSON.stringify(targetOrigin)};
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage({ type: 'oauth:iggraph', data: data }, targetOrigin);
        }
      } catch (e) {}
      setTimeout(function() { window.close(); }, 1000);
    })();
  </script></body></html>`;
  return new Response(html, { status: 200, headers });
}

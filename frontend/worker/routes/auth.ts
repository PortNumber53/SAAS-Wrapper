// Auth routes: Google OAuth, session, logout

import { logger } from '../logger';
import {
  getCookies, setCookie, getSessionFromCookie, createSessionToken,
  makeSignedState, verifySignedState, extractOriginFromState,
  type SessionPayload,
} from '../crypto';
import {
  effectiveOrigin, isHttps, paramOrigin, devOriginFromEnv,
  upsertUser, upsertOAuthAccount,
  jsonResponse, errorResponse,
} from '../helpers';

// Short-lived idempotency cache for OAuth authorization codes
const USED_OAUTH_CODES = new Map<string, number>();
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;

function pruneUsedCodes(now: number) {
  if (USED_OAUTH_CODES.size === 0) return;
  for (const [k, t] of USED_OAUTH_CODES.entries()) {
    if (now - t > OAUTH_CODE_TTL_MS) USED_OAUTH_CODES.delete(k);
  }
  if (USED_OAUTH_CODES.size > 5000) {
    const target = Math.floor(USED_OAUTH_CODES.size * 0.6);
    let i = 0;
    for (const k of USED_OAUTH_CODES.keys()) { USED_OAUTH_CODES.delete(k); if (++i >= target) break; }
  }
}

export async function startGoogleOAuth(request: Request, env: Env, url: URL): Promise<Response> {
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
  const prompt = (url.searchParams.get('prompt') || 'select_account').trim();
  if (prompt) authorize.searchParams.set('prompt', prompt);
  authorize.searchParams.set('state', state);

  if (url.searchParams.get('debug') === '1') {
    const body = { origin, redirect_uri: redirectUri, authorize: authorize.toString(), client_id: clientId, state };
    return jsonResponse(body);
  }

  const headers = new Headers({ Location: authorize.toString() });
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state', state, { maxAgeSec: 600, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  return new Response(null, { status: 302, headers });
}

export async function handleGoogleCallback(request: Request, env: Env, url: URL): Promise<Response> {
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

  const originFromState = signedOk ? extractOriginFromState(state) : null;
  let origin = originFromState || effectiveOrigin(request, url);
  if (origin.includes('localhost:18312') || origin.includes('127.0.0.1:18312')) {
    origin = origin.replace('18312', '18310');
  }
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
    const diag = { client_id: clientId, redirect_uri: redirectUri };
    return new Response(`Token exchange failed: ${errTxt}\nDiag: ${JSON.stringify(diag)}`, { status: 502 });
  }
  USED_OAUTH_CODES.set(code, nowMs);
  const tokenJson = await tokenRes.json() as { access_token?: string; id_token?: string };
  const accessToken = tokenJson.access_token;
  const idToken = tokenJson.id_token;
  if (!accessToken && !idToken) {
    return new Response('No tokens returned', { status: 502 });
  }

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

  const hasDb = !!(env.DATABASE_URL);
  if (hasDb) {
    try {
      await upsertUser(env, {
        email: profile.email,
        name: profile.name ?? '',
        picture: profile.picture ?? '',
        provider: 'google',
        provider_id: profile.sub ?? '',
      });
      await upsertOAuthAccount(env, {
        provider: 'google',
        provider_user_id: profile.sub ?? '',
        email: profile.email,
      });
    } catch (e: any) {
      logger.error('Database upsert failed during Google OAuth', { error: e.message });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { email: profile.email, name: profile.name ?? '', picture: profile.picture ?? '', sub: profile.sub ?? '', iat: now, exp: now + 60 * 60 * 24 * 7 };
  const token = await createSessionToken(payload, env.SESSION_SECRET);

  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
  const secure = isHttps(request, url);
  headers.append('Set-Cookie', setCookie('oauth_state', '', { maxAgeSec: 0, secure, httpOnly: true, sameSite: 'Lax', path: '/api/auth/google' }));
  headers.append('Set-Cookie', setCookie('session', token, { maxAgeSec: 60 * 60 * 24 * 7, secure, httpOnly: true, sameSite: 'Lax', path: '/' }));
  const targetOrigin = origin;
  const message = { ok: true, provider: 'google', email: profile.email, name: profile.name ?? '', picture: profile.picture ?? '' };
  const html = `<!doctype html><html><body><script>
    (function(){
      try {
        const data = ${JSON.stringify(message)};
        if (window.opener) {
          try { window.opener.postMessage({ type: 'oauth:google', data }, ${JSON.stringify(targetOrigin)}); } catch (e) {}
        }
      } catch (e) {}
      window.close();
    })();
  </script></body></html>`;
  return new Response(html, { status: 200, headers });
}

export async function handleSession(request: Request, env: Env): Promise<Response> {
  const cookies = getCookies(request);
  const tok = cookies.session;
  if (!tok) return jsonResponse({ ok: false });
  const payload = await verifySessionToken(tok, env.SESSION_SECRET);
  if (!payload) return jsonResponse({ ok: false });
  return jsonResponse({ ok: true, email: payload.email, name: payload.name ?? '', picture: payload.picture ?? '' });
}

// Re-import for handleSession usage
import { verifySessionToken } from '../crypto';

export function handleLogout(): Response {
  const headers = new Headers();
  headers.append('Set-Cookie', setCookie('session', '', { maxAgeSec: 0, secure: true, httpOnly: true, sameSite: 'Lax', path: '/' }));
  return new Response(null, { status: 204, headers });
}

export function handleRedirectUri(url: URL): Response {
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  return jsonResponse({ origin, redirect_uri: redirectUri });
}

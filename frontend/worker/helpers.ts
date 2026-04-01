// Shared request/response helpers and origin utilities.

import postgres from 'postgres';
import { logger } from './logger';

// Re-export pure helpers so existing imports from './helpers' continue to work.
export {
  effectiveOrigin, isHttps, paramOrigin, devOriginFromEnv,
  jsonResponse, errorResponse, unauthorizedResponse,
} from './url-helpers';

// --- Database ---

export function getPg(env: Env) {
  let dsn = (env.DATABASE_URL || '').trim();
  if (!dsn) throw new Error('Missing DATABASE_URL');
  if ((dsn.startsWith('"') && dsn.endsWith('"')) || (dsn.startsWith("'") && dsn.endsWith("'"))) {
    dsn = dsn.slice(1, -1);
  }
  const ssl = dsn.includes('sslmode=disable') ? false : 'require';
  try {
    return postgres(dsn, { ssl });
  } catch (e: any) {
    logger.error('getPg error', { dsnLen: dsn.length, dsnStart: dsn.slice(0, 20) + '...', error: e.message });
    throw e;
  }
}

// --- Database helpers ---

export async function findUserByEmail(env: Env, email: string): Promise<{ id: string } & Record<string, unknown> | null> {
  const sql = getPg(env);
  const rows = await sql`select id, email, name, profile, profile as picture from public.users where email=${email} limit 1` as Array<any>;
  return rows[0] ?? null;
}

export async function updateUserById(env: Env, id: string, body: Record<string, unknown>): Promise<void> {
  const sql = getPg(env);
  const name = (body as any).name ?? null;
  const profile = (body as any).profile ?? null;
  await sql`update public.users set name=${name}, profile=${profile} where id=${id}`;
}

export async function getUserPrefs(env: Env, email: string): Promise<Record<string, unknown>> {
  const sql = getPg(env);
  const user = await findUserByEmail(env, email);
  if (!user?.id) return {};
  const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='prefs' limit 1` as Array<{ config: any }>;
  return rows[0]?.config || {};
}

export async function setUserPrefs(env: Env, email: string, updates: { theme?: string }): Promise<void> {
  const sql = getPg(env);
  const user = await findUserByEmail(env, email);
  if (!user?.id) return;
  const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='prefs' limit 1` as Array<{ config: any }>;
  const current = rows[0]?.config || {};
  const next = { ...current } as any;
  if (typeof updates.theme === 'string') next.theme = updates.theme;
  await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'prefs', ${(sql as any).json(next)}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
}

export type NewUser = { email: string; name?: string; picture?: string; provider: string; provider_id: string };

export async function upsertUser(env: Env, user: NewUser): Promise<void> {
  const sql = getPg(env);
  const rows = await sql<{ id: string }[]>`select id from public.users where email=${user.email} limit 1`;
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

export type OAuthAccount = { provider: string; provider_user_id: string; email: string };

export async function upsertOAuthAccount(env: Env, acct: OAuthAccount): Promise<void> {
  const sql = getPg(env);
  await sql`insert into public.oauth_accounts (provider, provider_user_id, email) values (${acct.provider}, ${acct.provider_user_id}, ${acct.email}) on conflict (provider, provider_user_id) do update set email=excluded.email`;
}

export async function listUserIntegrations(env: Env, email: string): Promise<Array<{ provider: string }>> {
  const sql = getPg(env);
  const rows = await sql`select provider from public.oauth_accounts where email=${email}` as Array<{ provider: string }>;
  return rows;
}

export async function deleteUserIntegration(env: Env, email: string, provider: string): Promise<void> {
  const sql = getPg(env);
  await sql`delete from public.oauth_accounts where email=${email} and provider=${provider}`;
  if (provider === 'iggraph') {
    await sql`delete from public.ig_accounts where email=${email}`;
  }
}

// --- Stripe helpers ---

export async function stripe(env: Env, path: string, method: string, body?: URLSearchParams): Promise<any> {
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

export async function stripeListAll(env: Env, path: string, params: URLSearchParams): Promise<{ data: any[] }> {
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

export async function verifyStripeWebhook(body: string, signature: string, secret: string): Promise<any | null> {
  try {
    const sigParts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = sigParts.t;
    const v1Sig = sigParts.v1;

    if (!timestamp || !v1Sig) return null;

    const signedPayload = `${timestamp}.${body}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSig !== v1Sig) {
      logger.error('Webhook signature mismatch');
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      logger.error('Webhook timestamp too old');
      return null;
    }

    return JSON.parse(body);
  } catch (e: any) {
    logger.error('Webhook verification error', { error: e.message });
    return null;
  }
}

// --- Facebook token debug ---

export async function debugFBToken(env: Env, inputToken: string): Promise<{ is_valid: boolean; expires_at?: number }> {
  const appId = env.FACEBOOK_APP_ID || '';
  const appSecret = env.FACEBOOK_APP_SECRET || '';
  if (!appId || !appSecret) return { is_valid: false };
  const r = await fetch('https://graph.facebook.com/debug_token?' + new URLSearchParams({ input_token: inputToken, access_token: `${appId}|${appSecret}` }));
  if (!r.ok) return { is_valid: false };
  const j = await r.json() as any;
  const data = j?.data || {};
  return { is_valid: !!data.is_valid, expires_at: data.expires_at };
}

// Settings, integrations, user profile, Gemini keys, agent settings, drafts, files

import { logger } from '../logger';
import { getSessionFromCookie, encryptApiKey, decryptApiKey } from '../crypto';
import {
  getPg, findUserByEmail, updateUserById, getUserPrefs, setUserPrefs,
  listUserIntegrations, deleteUserIntegration,
  jsonResponse, errorResponse, unauthorizedResponse,
} from '../helpers';

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  if (request.method === 'GET') {
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in /me', { error: e.message });
      return null;
    });
    const responseUser = user ? { ...user, picture: user.profile } : null;
    return jsonResponse({ ok: true, user: responseUser });
  }
  if (request.method === 'PATCH') {
    const allowed = await request.json().catch(() => ({} as Record<string, unknown>));
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in PATCH /me', { error: e.message });
      return null;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);
    const body: Record<string, unknown> = {};
    if (typeof (allowed as any).name === 'string') body.name = (allowed as any).name || '';
    if (typeof (allowed as any).picture === 'string') body.profile = (allowed as any).picture || '';
    const ok = await updateUserById(env, user.id, body).then(() => true).catch((e: any) => {
      logger.error('updateUserById failed', { error: e.message, userId: user.id });
      return false;
    });
    return jsonResponse({ ok }, ok ? 200 : 500);
  }
  return new Response(null, { status: 405 });
}

export async function handleSettings(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  if (request.method === 'GET') {
    const s = await getUserPrefs(env, sess.email).catch((e: any) => {
      logger.error('getUserPrefs failed', { error: e.message });
      return {} as any;
    });
    return jsonResponse({ ok: true, settings: s });
  }
  if (request.method === 'PATCH') {
    const payload = await request.json().catch(() => ({} as Record<string, unknown>));
    const theme = typeof (payload as any).theme === 'string' ? (payload as any).theme : undefined;
    const res = await setUserPrefs(env, sess.email, { theme }).then(() => true).catch((e: any) => {
      logger.error('setUserPrefs failed', { error: e.message });
      return false;
    });
    return jsonResponse({ ok: res }, res ? 200 : 500);
  }
  return new Response(null, { status: 405 });
}

export async function handleIntegrations(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  if (request.method === 'GET') {
    const list = await listUserIntegrations(env, sess.email).catch((e: any) => {
      logger.error('listUserIntegrations failed', { error: e.message });
      return [] as Array<{ provider: string }>;
    });
    return jsonResponse({ ok: true, providers: list });
  }
  return new Response(null, { status: 405 });
}

export async function handleIntegrationDelete(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const provider = url.pathname.split('/').pop() || '';
  if (request.method === 'DELETE') {
    await deleteUserIntegration(env, sess.email, provider).catch((e: any) => {
      logger.error('deleteUserIntegration failed', { error: e.message, provider });
    });
    return jsonResponse({ ok: true });
  }
  return new Response(null, { status: 405 });
}

export async function handleGeminiKey(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in gemini key', { error: e.message });
    return null;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
  const sql = getPg(env);
  const encryptionSecret = env.SESSION_SECRET;

  if (request.method === 'GET') {
    const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='gemini_key' limit 1` as Array<{ config: any }>;
    const cfg = rows[0]?.config || {};
    let apiKey = '';
    if (typeof cfg.encrypted_api_key === 'string' && encryptionSecret) {
      try {
        apiKey = await decryptApiKey(cfg.encrypted_api_key, encryptionSecret);
      } catch {
        // Fallback: key may be stored in plaintext from before encryption was added
        apiKey = typeof cfg.api_key === 'string' ? cfg.api_key : '';
      }
    } else {
      apiKey = typeof cfg.api_key === 'string' ? cfg.api_key : '';
    }
    const last4 = apiKey ? apiKey.slice(-4) : '';
    return jsonResponse({ ok: true, configured: !!apiKey, last4 });
  }
  if (request.method === 'PUT') {
    const body = (await request.json().catch(() => ({}))) as any;
    const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';
    if (!apiKey) return errorResponse('missing_api_key', 400);

    let config: Record<string, string>;
    if (encryptionSecret) {
      const encrypted = await encryptApiKey(apiKey, encryptionSecret);
      config = { encrypted_api_key: encrypted };
    } else {
      // Dev fallback: store plaintext if no secret configured
      config = { api_key: apiKey };
    }
    await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'gemini_key', ${(sql as any).json(config)}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
    return jsonResponse({ ok: true });
  }
  if (request.method === 'DELETE') {
    await sql`delete from public.user_settings where user_id=${user.id} and key='gemini_key'`;
    return jsonResponse({ ok: true });
  }
  return new Response(null, { status: 405 });
}

export async function handleAgentSettings(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in agent settings', { error: e.message });
    return null;
  });
  if (!user?.id) {
    return jsonResponse({ ok: true, models: [], default_model: '' });
  }
  const sql = getPg(env);
  if (request.method === 'GET') {
    const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='agent_settings' limit 1` as Array<{ config: any }>;
    const cfg = rows[0]?.config || {};
    const models: string[] = Array.isArray(cfg.models) ? cfg.models : [];
    const defModel: string = (typeof cfg.default_model === 'string' && cfg.default_model && models.includes(cfg.default_model)) ? cfg.default_model : '';
    return jsonResponse({ ok: true, models, default_model: defModel });
  }
  if (request.method === 'PUT') {
    const body = (await request.json().catch(() => ({}))) as any;
    const models = Array.isArray(body.models) ? Array.from(new Set(body.models.filter((m: any) => typeof m === 'string').map((m: string) => m.trim()).filter(Boolean))) : [];
    const default_model_raw = (typeof body.default_model === 'string' ? body.default_model.trim() : '');
    const default_model = models.includes(default_model_raw) ? default_model_raw : (models[0] || '');
    const next = { models, default_model };
    await sql`insert into public.user_settings (user_id, key, config) values (${user.id}, 'agent_settings', ${(sql as any).json(next)}) on conflict (user_id, key) do update set config=excluded.config, updated_at=now()`;
    return jsonResponse({ ok: true });
  }
  return new Response(null, { status: 405 });
}

export async function handleAgentChat(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const sql = getPg(env);
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in agent chat', { error: e.message });
    return null;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);

  // Load and decrypt Gemini API key
  const rows = await sql`select config from public.user_settings where user_id=${user.id} and key='gemini_key' limit 1` as Array<{ config: any }>;
  const cfg = rows[0]?.config || {};
  let apiKey = '';
  const encryptionSecret = env.SESSION_SECRET;
  if (typeof cfg.encrypted_api_key === 'string' && encryptionSecret) {
    try {
      apiKey = await decryptApiKey(cfg.encrypted_api_key, encryptionSecret);
    } catch {
      apiKey = typeof cfg.api_key === 'string' ? cfg.api_key : '';
    }
  } else {
    apiKey = typeof cfg.api_key === 'string' ? cfg.api_key : '';
  }

  if (!apiKey) {
    return errorResponse('missing_gemini_key', 400, { message: 'Gemini API key not set. Add one under Agents \u2192 API Keys.' });
  }
  const body = (await request.json().catch(() => ({}))) as any;
  const model = (typeof body.model === 'string' && body.model) ? body.model : 'gemini-1.5-flash';
  const msgs = Array.isArray(body.messages) ? body.messages as Array<{ role: string; content: string }> : [];
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
    } catch { }
    logger.error('agents.chat upstream error', { httpStatus: r.status, model });
    return jsonResponse({ ok: false, error: 'upstream_error', message, code: statusCode, status: statusText }, 502);
  }
  const j = await r.json() as any;
  const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '')?.join('') || '';
  return jsonResponse({ ok: true, text });
}

export async function handleFiles(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in files', { error: e.message });
    return null;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
  const body = (await request.json().catch(() => ({}))) as any;
  const key = typeof body.key === 'string' ? body.key : '';
  const urlStr = typeof body.url === 'string' ? body.url : '';
  const thumb = typeof body.thumb_url === 'string' ? body.thumb_url : '';
  const ct = typeof body.content_type === 'string' ? body.content_type : '';
  const size = typeof body.size_bytes === 'number' ? Math.max(0, Math.floor(body.size_bytes)) : null;
  if (!key || !urlStr) return errorResponse('missing_fields', 400);
  const sql = getPg(env);
  await sql`insert into public.user_uploads (user_id, key, url, thumb_url, content_type, size_bytes) values (${user.id}, ${key}, ${urlStr}, ${thumb || null}, ${ct || null}, ${size}) on conflict (user_id, key) do update set url=excluded.url, thumb_url=excluded.thumb_url, content_type=excluded.content_type, size_bytes=excluded.size_bytes, updated_at=now()`;
  return jsonResponse({ ok: true });
}

export async function handleDrafts(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in drafts', { error: e.message });
    return null;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
  const sql = getPg(env);
  if (request.method === 'GET') {
    const ig = new URL(request.url).searchParams.get('ig_user_id') || '';
    if (ig) {
      const rows = await sql`select payload, updated_at from public.user_drafts where user_id=${user.id} and ig_user_id=${ig} limit 1` as Array<{ payload: any; updated_at: string }>;
      return jsonResponse({ ok: true, payload: rows[0]?.payload || null, updated_at: rows[0]?.updated_at || null });
    }
    const rows = await sql`select ig_user_id, updated_at from public.user_drafts where user_id=${user.id}` as Array<{ ig_user_id: string; updated_at: string }>;
    return jsonResponse({ ok: true, drafts: rows });
  }
  if (request.method === 'PUT') {
    const body = (await request.json().catch(() => ({}))) as any;
    const ig = typeof body.ig_user_id === 'string' ? body.ig_user_id : '';
    const payload = typeof body.payload === 'object' && body.payload ? body.payload : {};
    if (!ig) return errorResponse('missing_ig_user_id', 400);
    await sql`insert into public.user_drafts (user_id, ig_user_id, payload) values (${user.id}, ${ig}, ${(sql as any).json(payload)}) on conflict (user_id, ig_user_id) do update set payload=excluded.payload, updated_at=now()`;
    return jsonResponse({ ok: true });
  }
  return new Response(null, { status: 405 });
}

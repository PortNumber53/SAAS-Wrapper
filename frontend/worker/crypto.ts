// Cryptographic helpers: encoding, cookies, JWT, API key encryption.

// --- Base64url encoding/decoding ---

export function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  const b64p = b64 + '='.repeat(pad);
  const bin = atob(b64p);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64urlToString(s: string): string {
  return utf8(b64urlDecodeToBytes(s));
}

export function utf8(bytes: Uint8Array): string { return new TextDecoder().decode(bytes); }
export function utf8Bytes(s: string): Uint8Array { return new TextEncoder().encode(s); }

// --- HMAC-SHA256 ---

export async function signHmacSHA256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8Bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8Bytes(data));
  return new Uint8Array(sig);
}

// --- Cookie helpers ---

export function getCookies(req: Request): Record<string, string> {
  const cookie = req.headers.get('cookie') || '';
  const out: Record<string, string> = {};
  cookie.split(';').forEach(pair => {
    const [k, ...rest] = pair.split('=');
    if (!k) return;
    out[k.trim()] = decodeURIComponent(rest.join('=').trim());
  });
  return out;
}

export function setCookie(name: string, value: string, opts: { maxAgeSec?: number; secure?: boolean; httpOnly?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; path?: string; }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAgeSec) parts.push(`Max-Age=${opts.maxAgeSec}`);
  if (opts.secure ?? true) parts.push('Secure');
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  parts.push(`Path=${opts.path ?? '/'}`);
  return parts.join('; ');
}

export function newState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

// --- JWT session tokens ---

export type SessionPayload = { email: string; name?: string; picture?: string; sub?: string; iat: number; exp: number };

export async function createSessionToken(payload: SessionPayload, secret?: string): Promise<string> {
  const header = { alg: secret ? 'HS256' : 'none', typ: 'JWT' };
  const encHeader = b64url(utf8Bytes(JSON.stringify(header)));
  const encPayload = b64url(utf8Bytes(JSON.stringify(payload)));
  const msg = `${encHeader}.${encPayload}`;
  if (!secret) return `${msg}.`;
  const sig = await signHmacSHA256(secret, msg);
  return `${msg}.${b64url(sig)}`;
}

export async function verifySessionToken(token: string, secret?: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const [encHeader, encPayload, encSig] = parts;
  try {
    const payload = JSON.parse(utf8(b64urlDecodeToBytes(encPayload)));
    if (!secret) {
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

export async function getSessionFromCookie(request: Request, env: Env): Promise<SessionPayload | null> {
  const cookies = getCookies(request);
  const tok = cookies.session;
  if (!tok) return null;
  return await verifySessionToken(tok, env.SESSION_SECRET);
}

// --- Signed state for OAuth CSRF protection ---

export async function makeSignedState(secret: string | undefined, context: { origin: string }): Promise<string> {
  const nonce = newState();
  const ts = Date.now();
  const data = `${nonce}|${ts}|${context.origin}`;
  if (!secret) return `${b64url(utf8Bytes(data))}.`;
  const sig = await signHmacSHA256(secret, data);
  return `${b64url(utf8Bytes(data))}.${b64url(sig)}`;
}

export async function verifySignedState(state: string | null, secret: string | undefined): Promise<boolean> {
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
  if (Date.now() - ts > 10 * 60 * 1000) return false;
  if (!secret) return true;
  const expected = await signHmacSHA256(secret, data);
  const given = sig ? b64urlDecodeToBytes(sig) : new Uint8Array(0);
  if (given.length !== expected.length) return false;
  let ok = 0; for (let i = 0; i < given.length; i++) ok |= given[i] ^ expected[i];
  return ok === 0;
}

export function extractOriginFromState(state: string | null): string | null {
  if (!state) return null;
  try {
    const parts = state.split('.');
    const raw = parts[0] || '';
    const data = b64urlToString(raw);
    const fields = data.split('|');
    if (fields.length >= 3) {
      const origin = fields[2];
      if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) return origin;
    }
  } catch { }
  return null;
}

// --- API key encryption (AES-GCM with SESSION_SECRET-derived key) ---

async function deriveEncryptionKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', utf8Bytes(secret), { name: 'HKDF' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8Bytes('saas-wrapper-api-keys'), info: utf8Bytes('encrypt') },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(plaintext: string, secret: string): Promise<string> {
  const key = await deriveEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8Bytes(plaintext));
  // Format: base64url(iv):base64url(ciphertext)
  return `${b64url(iv)}:${b64url(new Uint8Array(ciphertext))}`;
}

export async function decryptApiKey(encrypted: string, secret: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(':');
  if (!ivB64 || !ctB64) throw new Error('invalid_encrypted_format');
  const key = await deriveEncryptionKey(secret);
  const iv = b64urlDecodeToBytes(ivB64);
  const ciphertext = b64urlDecodeToBytes(ctB64);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return utf8(new Uint8Array(plaintext));
}

// Pure helper functions with zero external dependencies.
// Extracted so unit tests can import these without triggering postgres module resolution.

// --- Origin helpers ---

export function effectiveOrigin(request: Request, url: URL): string {
  const xfHost = request.headers.get('x-forwarded-host');
  const xfProto = request.headers.get('x-forwarded-proto');
  if (xfHost) {
    const proto = (xfProto && (xfProto === 'http' || xfProto === 'https')) ? xfProto : (url.protocol.replace(':', '') || 'https');
    return `${proto}://${xfHost}`;
  }
  return url.origin;
}

export function isHttps(request: Request, url: URL): boolean {
  const xfProto = request.headers.get('x-forwarded-proto');
  if (xfProto) return xfProto === 'https';
  return url.protocol === 'https:';
}

export function paramOrigin(url: URL): string | null {
  const p = url.searchParams.get('origin');
  if (!p) return null;
  try {
    const u = new URL(p);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.portnumber53.com'))) {
      return `${u.protocol}//${u.host}`;
    }
  } catch { }
  return null;
}

export function devOriginFromEnv(env: Env): string | null {
  const val = (env as any)?.DEV_ORIGIN as string | undefined;
  if (!val) return null;
  try {
    const u = new URL(val);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.portnumber53.com'))) {
      return `${u.protocol}//${u.host}`;
    }
  } catch { }
  return null;
}

// --- JSON response helpers ---

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function errorResponse(error: string, status: number, extra?: Record<string, unknown>): Response {
  return jsonResponse({ ok: false, error, ...extra }, status);
}

export function unauthorizedResponse(): Response {
  return errorResponse('unauthorized', 401);
}

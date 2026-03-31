// Main worker entry point — thin router that delegates to domain modules.

import { logger } from './logger';
import { setCookie } from './crypto';
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from './rate-limit';

// Route handlers
import {
  startGoogleOAuth, handleGoogleCallback, handleSession, handleLogout, handleRedirectUri,
} from './routes/auth';
import {
  handleIGAccounts, handleIGContent, handleIGSyncContent, handleIGPublish,
  handleIGRefresh, handleIGAccountDelete,
  startInstagramOAuth, handleInstagramCallback,
  startIGGraphOAuth, handleIGGraphCallback,
} from './routes/instagram';
import {
  handleStripeProducts, handleStripePrices, handleStripeSyncProducts,
  handleStripeSyncPrices, handleStripeCheckout,
  handleWebhookThin, handleWebhookSnapshot,
} from './routes/stripe';
import {
  handleSubscriptionTiers, handleSubscribe, handleCurrentSubscription,
  handleChangeTier, handleSubscriptionHistory,
  handleCancelSubscription, handleReactivateSubscription,
} from './routes/subscriptions';
import {
  handleMe, handleSettings, handleIntegrations, handleIntegrationDelete,
  handleGeminiKey, handleAgentSettings, handleAgentChat,
  handleFiles, handleDrafts,
} from './routes/settings';

// Unique build identifier for dev auto-reload
const BUILD_ID = String(Date.now());

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {

      // --- Auth routes (rate-limited) ---
      if (url.pathname.startsWith('/api/auth/')) {
        const rl = checkRateLimit(rateLimitKey(request, 'auth'), RATE_LIMITS.auth);
        if (rl) return rl;

        if (url.pathname === '/api/auth/google/start') return startGoogleOAuth(request, env, url);
        if (url.pathname === '/api/auth/google/callback') return handleGoogleCallback(request, env, url);
        if (url.pathname === '/api/auth/google/redirect-uri') return handleRedirectUri(url);
        if (url.pathname === '/api/auth/session') return handleSession(request, env);
        if (url.pathname === '/api/auth/logout') return handleLogout();
        if (url.pathname === '/api/auth/instagram/start') return startInstagramOAuth(request, env, url);
        if (url.pathname === '/api/auth/instagram/callback') return handleInstagramCallback(request, env, url);
        if (url.pathname === '/api/auth/iggraph/start') return startIGGraphOAuth(request, env, url);
        if (url.pathname === '/api/auth/iggraph/callback') return handleIGGraphCallback(request, env, url);
      }

      // --- Integrations ---
      if (url.pathname === '/api/integrations') return handleIntegrations(request, env);
      if (url.pathname.startsWith('/api/integrations/')) return handleIntegrationDelete(request, env, url);

      // --- Instagram data routes ---
      if (url.pathname === '/api/ig/accounts') return handleIGAccounts(request, env);
      if (url.pathname === '/api/ig/content' && request.method === 'GET') return handleIGContent(request, env);
      if (url.pathname === '/api/ig/sync-content' && request.method === 'POST') return handleIGSyncContent(request, env);
      if (url.pathname === '/api/ig/publish' && request.method === 'POST') return handleIGPublish(request, env);
      if (url.pathname === '/api/ig/refresh' && request.method === 'POST') return handleIGRefresh(request, env);
      if (url.pathname.startsWith('/api/ig/account/') && request.method === 'DELETE') return handleIGAccountDelete(request, env, url);

      // --- Dev auto-reload ---
      if (url.pathname === '/__dev/build') {
        return new Response(BUILD_ID, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (url.pathname === '/__dev/events') {
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode('retry: 1500\n'));
            controller.enqueue(enc.encode(`data: ${BUILD_ID}\n\n`));
            const iv = setInterval(() => {
              try { controller.enqueue(enc.encode(': keepalive\n\n')); } catch { }
            }, 25000);
            (controller as any)._iv = iv;
          },
          cancel(_reason) {
            const iv = (this as any)._iv as ReturnType<typeof setInterval> | undefined;
            if (iv) clearInterval(iv);
          }
        });
        return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } });
      }

      // --- SPA fallback for non-API, extensionless paths ---
      if (!url.pathname.startsWith('/api/') && (request.method === 'GET' || request.method === 'HEAD')) {
        const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(url.pathname);
        if (!looksLikeFile && env.ASSETS) {
          return serveIndexHtml(env, request);
        }
      }

      // --- User profile ---
      if (url.pathname === '/api/me') return handleMe(request, env);

      // --- Settings ---
      if (url.pathname === '/api/settings') return handleSettings(request, env);

      // --- API keys (Gemini) ---
      if (url.pathname === '/api/keys/gemini' || url.pathname === '/api/keys/gemini/') return handleGeminiKey(request, env);

      // --- Stripe commerce routes ---
      if (url.pathname === '/api/stripe/products') return handleStripeProducts(request, env, url);
      if (url.pathname === '/api/stripe/prices') return handleStripePrices(request, env, url);
      if (url.pathname === '/api/stripe/sync-products' && request.method === 'POST') return handleStripeSyncProducts(request, env);
      if (url.pathname === '/api/stripe/sync-prices' && request.method === 'POST') return handleStripeSyncPrices(request, env);
      if (url.pathname === '/api/stripe/checkout' && request.method === 'POST') return handleStripeCheckout(request, env);

      // --- Stripe webhooks (rate-limited separately) ---
      if (url.pathname === '/webhook/stripe/thin' && request.method === 'POST') {
        const rl = checkRateLimit(rateLimitKey(request, 'webhook'), RATE_LIMITS.webhook);
        if (rl) return rl;
        return handleWebhookThin(request, env);
      }
      if (url.pathname === '/webhook/stripe/snapshot' && request.method === 'POST') {
        const rl = checkRateLimit(rateLimitKey(request, 'webhook'), RATE_LIMITS.webhook);
        if (rl) return rl;
        return handleWebhookSnapshot(request, env);
      }

      // --- Subscription routes ---
      if (url.pathname === '/api/subscriptions/tiers' && request.method === 'GET') return handleSubscriptionTiers(request, env);
      if (url.pathname === '/api/subscriptions/subscribe' && request.method === 'POST') return handleSubscribe(request, env, url);
      if (url.pathname === '/api/subscriptions/current' && request.method === 'GET') return handleCurrentSubscription(request, env);
      if (url.pathname === '/api/subscriptions/change-tier' && request.method === 'POST') return handleChangeTier(request, env, url);
      if (url.pathname === '/api/subscriptions/history' && request.method === 'GET') return handleSubscriptionHistory(request, env);
      if (url.pathname === '/api/subscriptions/cancel' && request.method === 'POST') return handleCancelSubscription(request, env);
      if (url.pathname === '/api/subscriptions/reactivate' && request.method === 'POST') return handleReactivateSubscription(request, env);

      // --- Files & Drafts ---
      if (url.pathname === '/api/files' && request.method === 'POST') {
        const rl = checkRateLimit(rateLimitKey(request, 'upload'), RATE_LIMITS.upload);
        if (rl) return rl;
        return handleFiles(request, env);
      }
      if (url.pathname === '/api/drafts') return handleDrafts(request, env);

      // --- Agent routes ---
      if (url.pathname === '/api/agents/settings') return handleAgentSettings(request, env);
      if (url.pathname === '/api/agents/chat' && request.method === 'POST') {
        const rl = checkRateLimit(rateLimitKey(request, 'api'), RATE_LIMITS.api);
        if (rl) return rl;
        return handleAgentChat(request, env);
      }

      // --- API proxy: forward remaining /api/* to Go backend ---
      if (url.pathname.startsWith('/api/')) {
        if (!env.BACKEND_ORIGIN) {
          return new Response('Missing BACKEND_ORIGIN', { status: 500 });
        }

        const backendUrl = new URL(env.BACKEND_ORIGIN.replace(/\/$/, ''));
        backendUrl.pathname = url.pathname.replace(/^\/api/, '');
        backendUrl.search = url.search;

        const reqHeaders = new Headers(request.headers);
        reqHeaders.delete('host');
        reqHeaders.delete('content-length');

        if (request.method === 'OPTIONS') {
          const res = new Response(null, { status: 204 });
          res.headers.set('access-control-allow-origin', url.origin);
          res.headers.set('access-control-allow-headers', reqHeaders.get('access-control-request-headers') ?? '*');
          res.headers.set('access-control-allow-methods', reqHeaders.get('access-control-request-method') ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
          res.headers.set('access-control-max-age', '86400');
          return res;
        }

        try {
          const cloned = request.clone();
          const backendRequest = new Request(backendUrl.toString(), {
            method: cloned.method,
            headers: reqHeaders,
            body: ['GET', 'HEAD'].includes(cloned.method) ? undefined : cloned.body,
            redirect: 'manual',
          });

          const backendResponse = await fetch(backendRequest);
          if (backendResponse.status >= 500) {
            logger.error('api_proxy upstream 5xx', {
              method: request.method,
              path: url.pathname,
              target: backendUrl.toString(),
              status: backendResponse.status,
            });
          }
          const resHeaders = new Headers(backendResponse.headers);
          resHeaders.set('access-control-allow-origin', url.origin);
          return new Response(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: resHeaders,
          });
        } catch (e: any) {
          logger.error('api_proxy fetch error', {
            method: request.method,
            path: url.pathname,
            target: backendUrl.toString(),
            error: e.message,
          });
          return new Response(JSON.stringify({ ok: false, error: 'proxy_error', message: 'Network error talking to backend' }), { status: 502, headers: { 'content-type': 'application/json' } });
        }
      }

      // --- Static assets ---
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
      logger.warn('Worker 404', { method: request.method, path: url.pathname });
      return new Response(null, { status: 404 });
    } catch (e: any) {
      logger.error('unhandled worker error', { path: url.pathname, error: e.message });
      return new Response(JSON.stringify({ ok: false, error: 'internal_error', message: 'Unexpected error' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  },
} satisfies ExportedHandler<Env>;

async function serveIndexHtml(env: Env, request: Request): Promise<Response> {
  const indexUrl = new URL(request.url);
  indexUrl.pathname = '/index.html';
  let res = await env.ASSETS!.fetch(new Request(indexUrl.toString(), { method: 'GET' }));
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('Location') || res.headers.get('location');
    if (loc) {
      const target = new URL(loc, indexUrl);
      res = await env.ASSETS!.fetch(new Request(target.toString(), { method: 'GET' }));
    }
  }
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

// Stripe routes: products, prices, checkout, sync, webhooks

import { logger } from '../logger';
import { getSessionFromCookie } from '../crypto';
import {
  getPg, findUserByEmail, stripe, stripeListAll, verifyStripeWebhook,
  jsonResponse, errorResponse, unauthorizedResponse,
} from '../helpers';

export async function handleStripeProducts(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in stripe/products', { error: e.message });
    return null as any;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
  const sql = getPg(env);
  if (request.method === 'GET') {
    const rows = await sql`select stripe_product_id, name, description, active, created_at from public.stripe_products where user_id=${user.id} order by created_at desc` as Array<any>;
    return jsonResponse({ ok: true, products: rows });
  }
  if (request.method === 'POST') {
    try {
      const body = (await request.json().catch(() => ({}))) as any;
      const name = (body?.name || '').toString().trim();
      const description = (body?.description || '').toString();
      if (!name) return errorResponse('missing_name', 400);
      const s = await stripe(env, '/v1/products', 'POST', new URLSearchParams({ name, description }));
      const pid = s?.id as string;
      if (!pid) return errorResponse('stripe_error', 502);
      await sql`insert into public.stripe_products (user_id, stripe_product_id, name, description, active) values (${user.id}, ${pid}, ${name}, ${description}, true) on conflict (stripe_product_id) do nothing`;
      return jsonResponse({ ok: true, product_id: pid });
    } catch (e: any) {
      logger.error('Stripe product creation error', { error: e.message });
      return errorResponse('internal_error', 500);
    }
  }
  return new Response(null, { status: 405 });
}

export async function handleStripePrices(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in stripe/prices', { error: e.message });
    return null as any;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
  const sql = getPg(env);
  if (request.method === 'GET') {
    const qp = url.searchParams;
    const pid = qp.get('product');
    const rows = pid
      ? await sql`select stripe_price_id, stripe_product_id, currency, unit_amount, type, interval, interval_count, active, created_at from public.stripe_prices where user_id=${user.id} and stripe_product_id=${pid} order by created_at desc` as Array<any>
      : await sql`select stripe_price_id, stripe_product_id, currency, unit_amount, type, interval, interval_count, active, created_at from public.stripe_prices where user_id=${user.id} order by created_at desc` as Array<any>;
    return jsonResponse({ ok: true, prices: rows });
  }
  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as any;
    const stripe_product_id = (body?.product_id || '').toString().trim();
    const currency = (body?.currency || 'usd').toString().toLowerCase();
    const unit_amount = Math.max(50, Number(body?.unit_amount || 0) | 0);
    const kind = (body?.type || 'one_time').toString();
    if (!stripe_product_id || !currency || !unit_amount) return errorResponse('missing_fields', 400);
    const params = new URLSearchParams({ currency, unit_amount: String(unit_amount), product: stripe_product_id });
    if (kind === 'recurring') {
      const interval = (body?.interval || 'month').toString();
      const interval_count = Math.max(1, Number(body?.interval_count || 1) | 0);
      params.set('recurring[interval]', interval);
      params.set('recurring[interval_count]', String(interval_count));
    }
    const s = await stripe(env, '/v1/prices', 'POST', params);
    const priceId = s?.id as string;
    if (!priceId) return errorResponse('stripe_error', 502);
    await sql`insert into public.stripe_prices (user_id, stripe_product_id, stripe_price_id, currency, unit_amount, type, interval, interval_count, active) values (${user.id}, ${stripe_product_id}, ${priceId}, ${currency}, ${unit_amount}, ${kind}, ${kind === 'recurring' ? (s?.recurring?.interval || null) : null}, ${kind === 'recurring' ? (s?.recurring?.interval_count || null) : null}, true) on conflict (stripe_price_id) do nothing`;
    return jsonResponse({ ok: true, price_id: priceId });
  }
  return new Response(null, { status: 405 });
}

export async function handleStripeSyncProducts(request: Request, env: Env): Promise<Response> {
  try {
    const sess = await getSessionFromCookie(request, env);
    if (!sess) return unauthorizedResponse();
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in stripe/sync-products', { error: e.message });
      return null as any;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);
    const sql = getPg(env);

    const fetched = await stripeListAll(env, '/v1/products', new URLSearchParams({ limit: '100' }));
    const stripeProductIds = new Set<string>();
    let pulledCount = 0;

    for (const p of (fetched?.data || [])) {
      const pid = p?.id as string; if (!pid) continue;
      stripeProductIds.add(pid);
      const name = (p?.name || '').toString();
      const description = (p?.description || '').toString();
      const active = !!p?.active;
      await sql`insert into public.stripe_products (user_id, stripe_product_id, name, description, active) values (${user.id}, ${pid}, ${name}, ${description}, ${active}) on conflict (stripe_product_id) do update set name=excluded.name, description=excluded.description, active=excluded.active`;
      pulledCount++;
    }

    const localProducts = await sql`select stripe_product_id, name, description, active from public.stripe_products where user_id=${user.id}` as Array<any>;
    let pushedCount = 0;

    logger.debug('Sync push check', { localCount: localProducts.length, stripeCount: stripeProductIds.size });
    for (const local of localProducts) {
      if (stripeProductIds.has(local.stripe_product_id)) continue;
      try {
        const created = await stripe(env, '/v1/products', 'POST', new URLSearchParams({
          name: local.name || 'Untitled Product',
          description: local.description || '',
          active: local.active ? 'true' : 'false'
        }));
        const newStripeId = created?.id as string;
        if (newStripeId) {
          await sql`update public.stripe_products set stripe_product_id=${newStripeId} where stripe_product_id=${local.stripe_product_id} and user_id=${user.id}`;
          pushedCount++;
        }
      } catch (e: any) {
        logger.error(`Failed to push product to Stripe`, { name: local.name, error: e.message });
      }
    }

    return jsonResponse({
      ok: true,
      pulled: pulledCount,
      pushed: pushedCount,
      message: `Synced: ${pulledCount} from Stripe, ${pushedCount} to Stripe`
    });
  } catch (e: any) {
    logger.error('Stripe sync-products error', { error: e.message });
    return errorResponse('internal_error', 500);
  }
}

export async function handleStripeSyncPrices(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const user = await findUserByEmail(env, sess.email).catch((e: any) => {
    logger.error('findUserByEmail failed in stripe/sync-prices', { error: e.message });
    return null as any;
  });
  if (!user?.id) return errorResponse('user_not_found', 404);
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
  return jsonResponse({ ok: true, upserts });
}

export async function handleStripeCheckout(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  const body = (await request.json().catch(() => ({}))) as any;
  const price = (body?.price_id || '').toString().trim();
  const mode = (body?.mode || 'payment').toString();
  const success_url = (body?.success_url || (new URL('/', new URL(request.url).origin)).toString());
  const cancel_url = (body?.cancel_url || success_url);
  if (!price) return errorResponse('missing_price', 400);
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('success_url', success_url);
  params.set('cancel_url', cancel_url);
  params.set('line_items[0][price]', price);
  params.set('line_items[0][quantity]', '1');
  const s = await stripe(env, '/v1/checkout/sessions', 'POST', params);
  const urlStr = s?.url as string;
  if (!urlStr) return errorResponse('stripe_error', 502);
  return jsonResponse({ ok: true, url: urlStr });
}

export async function handleWebhookThin(request: Request, env: Env): Promise<Response> {
  try {
    const sig = request.headers.get('stripe-signature');
    if (!sig) return new Response('Missing signature', { status: 400 });

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const body = await request.text();
    const event = await verifyStripeWebhook(body, sig, webhookSecret);
    if (!event) {
      return new Response('Invalid signature', { status: 400 });
    }

    logger.info('Stripe webhook (thin)', { type: event.type, id: event.id });

    return jsonResponse({ received: true });
  } catch (e: any) {
    logger.error('Stripe webhook (thin) error', { error: e.message });
    return jsonResponse({ error: e.message }, 400);
  }
}

export async function handleWebhookSnapshot(request: Request, env: Env): Promise<Response> {
  try {
    const sig = request.headers.get('stripe-signature');
    if (!sig) return new Response('Missing signature', { status: 400 });

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const body = await request.text();
    const event = await verifyStripeWebhook(body, sig, webhookSecret);
    if (!event) {
      return new Response('Invalid signature', { status: 400 });
    }

    logger.info('Stripe webhook (snapshot)', { type: event.type, id: event.id });

    const sql = getPg(env);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await sql`insert into public.stripe_events (event_id, event_type, customer_id, subscription_id, payment_intent_id, amount, currency, status, metadata, created_at)
          values (${event.id}, ${event.type}, ${session.customer || null}, ${session.subscription || null}, ${session.payment_intent || null}, ${session.amount_total || 0}, ${session.currency || 'usd'}, ${session.payment_status || 'unknown'}, ${JSON.stringify(session.metadata || {})}, ${new Date(event.created * 1000)})
          on conflict (event_id) do nothing`;

        if (session.subscription && session.metadata?.user_id && session.metadata?.tier_id) {
          const userId = session.metadata.user_id;
          const tierId = session.metadata.tier_id;
          const customerId = session.customer || null;
          const subId = session.subscription;
          await sql`insert into public.user_subscriptions (user_id, tier_id, stripe_subscription_id, stripe_customer_id, status)
            values (${userId}, ${tierId}, ${subId}, ${customerId}, 'active')
            on conflict (user_id) do update set tier_id=excluded.tier_id, stripe_subscription_id=excluded.stripe_subscription_id, stripe_customer_id=excluded.stripe_customer_id, status='active', updated_at=now()`;
        }
        break;
      }
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as any;
        await sql`insert into public.stripe_events (event_id, event_type, customer_id, payment_intent_id, amount, currency, status, created_at)
          values (${event.id}, ${event.type}, ${pi.customer || null}, ${pi.id}, ${pi.amount || 0}, ${pi.currency || 'usd'}, ${pi.status || 'unknown'}, ${new Date(event.created * 1000)})
          on conflict (event_id) do nothing`;
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        await sql`insert into public.stripe_events (event_id, event_type, customer_id, subscription_id, amount, currency, status, metadata, created_at)
          values (${event.id}, ${event.type}, ${sub.customer || null}, ${sub.id}, ${sub.items?.data?.[0]?.price?.unit_amount || 0}, ${sub.currency || 'usd'}, ${sub.status || 'unknown'}, ${JSON.stringify(sub.metadata || {})}, ${new Date(event.created * 1000)})
          on conflict (event_id) do nothing`;

        if (sub.id) {
          const stripeStatus = (sub.status || 'unknown') as string;
          let dbStatus = stripeStatus;
          if (stripeStatus === 'canceled' || event.type === 'customer.subscription.deleted') dbStatus = 'canceled';
          else if (stripeStatus === 'past_due') dbStatus = 'past_due';
          else if (stripeStatus === 'trialing') dbStatus = 'trialing';
          else if (stripeStatus === 'active') dbStatus = 'active';

          await sql`update public.user_subscriptions set status=${dbStatus}, current_period_start=${sub.current_period_start ? new Date(sub.current_period_start * 1000) : null}, current_period_end=${sub.current_period_end ? new Date(sub.current_period_end * 1000) : null}, updated_at=now() where stripe_subscription_id=${sub.id}`;
        }
        break;
      }
    }

    return jsonResponse({ received: true });
  } catch (e: any) {
    logger.error('Stripe webhook (snapshot) error', { error: e.message });
    return jsonResponse({ error: e.message }, 400);
  }
}

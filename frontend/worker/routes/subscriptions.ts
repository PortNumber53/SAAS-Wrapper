// Subscription routes: tiers, subscribe, current, change-tier, history, cancel, reactivate

import { logger } from '../logger';
import { getSessionFromCookie } from '../crypto';
import {
  getPg, effectiveOrigin, findUserByEmail, stripe,
  jsonResponse, errorResponse, unauthorizedResponse,
} from '../helpers';

export async function handleSubscriptionTiers(request: Request, env: Env): Promise<Response> {
  try {
    const sql = getPg(env);
    const rows = await sql`
      SELECT id, name, slug, stripe_product_id, stripe_price_id,
             price_cents, currency, billing_interval,
             max_integrations, max_api_calls, max_storage_mb,
             features, sort_order
      FROM public.subscription_tiers
      WHERE active = true AND deprecated_by IS NULL
      ORDER BY sort_order ASC
    ` as Array<any>;
    return jsonResponse({ ok: true, tiers: rows });
  } catch (e: any) {
    logger.error('tiers error', { error: e.message });
    return errorResponse(e.message, 500);
  }
}

export async function handleSubscribe(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in subscribe', { error: e.message });
      return null as any;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);

    const body = await request.json() as any;
    const tierSlug = body?.tier_slug;
    if (!tierSlug) return errorResponse('missing tier_slug', 400);

    const tiers = await sql`SELECT id, name, slug, stripe_price_id, price_cents FROM public.subscription_tiers WHERE slug=${tierSlug} AND active=true LIMIT 1` as Array<any>;
    if (!tiers.length) return errorResponse('tier_not_found', 404);
    const tier = tiers[0];

    if (tier.price_cents === 0) {
      await sql`insert into public.user_subscriptions (user_id, tier_id, status)
        values (${user.id}, ${tier.id}, 'active')
        on conflict (user_id) do update set tier_id=excluded.tier_id, status='active', updated_at=now()`;
      return jsonResponse({ ok: true, tier: tier.slug, message: 'Free tier activated' });
    }

    if (!tier.stripe_price_id) return errorResponse('tier_not_configured_in_stripe', 400);

    const origin = effectiveOrigin(request, url);
    const checkoutParams = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': tier.stripe_price_id,
      'line_items[0][quantity]': '1',
      'success_url': `${origin}/account/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      'cancel_url': `${origin}/account/billing?canceled=true`,
      'metadata[user_id]': user.id,
      'metadata[tier_id]': tier.id,
    });
    checkoutParams.set('customer_email', sess.email);

    const session = await stripe(env, '/v1/checkout/sessions', 'POST', checkoutParams);
    const checkoutUrl = session?.url as string;
    if (!checkoutUrl) throw new Error('checkout session missing url');

    return jsonResponse({ ok: true, checkout_url: checkoutUrl });
  } catch (e: any) {
    logger.error('subscribe error', { error: e.message });
    return errorResponse(e.message, 500);
  }
}

export async function handleCurrentSubscription(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in current subscription', { error: e.message });
      return null as any;
    });
    if (!user?.id) return jsonResponse({ ok: true, subscription: null });

    const rows = await sql`
      SELECT us.id, us.tier_id, us.stripe_subscription_id, us.status,
             us.current_period_start, us.current_period_end,
             st.name as tier_name, st.slug as tier_slug, st.price_cents,
             st.max_integrations, st.max_api_calls, st.max_storage_mb
      FROM public.user_subscriptions us
      JOIN public.subscription_tiers st ON st.id = us.tier_id
      WHERE us.user_id = ${user.id}
      LIMIT 1
    ` as Array<any>;

    if (!rows.length) {
      return jsonResponse({ ok: true, subscription: null, message: 'No active subscription' });
    }

    return jsonResponse({ ok: true, subscription: rows[0] });
  } catch (e: any) {
    logger.error('current subscription error', { error: e.message });
    return errorResponse(e.message, 500);
  }
}

export async function handleChangeTier(request: Request, env: Env, url: URL): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in change-tier', { error: e.message });
      return null as any;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);

    const body = await request.json() as any;
    const newTierSlug = body?.tier_slug;
    if (!newTierSlug) return errorResponse('missing tier_slug', 400);

    const newTiers = await sql`SELECT id, slug, stripe_price_id, price_cents FROM public.subscription_tiers WHERE slug=${newTierSlug} AND active=true LIMIT 1` as Array<any>;
    if (!newTiers.length) return errorResponse('tier_not_found', 404);
    const newTier = newTiers[0];

    const currentSubs = await sql`SELECT id, stripe_subscription_id, tier_id FROM public.user_subscriptions WHERE user_id=${user.id} LIMIT 1` as Array<any>;

    if (newTier.price_cents === 0) {
      if (currentSubs.length && currentSubs[0].stripe_subscription_id) {
        await stripe(env, `/v1/subscriptions/${currentSubs[0].stripe_subscription_id}`, 'POST', new URLSearchParams({ cancel_at_period_end: 'true' }));
      }
      await sql`insert into public.user_subscriptions (user_id, tier_id, status)
        values (${user.id}, ${newTier.id}, 'active')
        on conflict (user_id) do update set tier_id=excluded.tier_id, status='active', stripe_subscription_id=null, updated_at=now()`;
      return jsonResponse({ ok: true, tier: newTier.slug, message: 'Switched to free tier' });
    }

    if (!newTier.stripe_price_id) return errorResponse('tier_not_configured_in_stripe', 400);

    if (currentSubs.length && currentSubs[0].stripe_subscription_id) {
      const sub = await stripe(env, `/v1/subscriptions/${currentSubs[0].stripe_subscription_id}`, 'GET');
      const itemId = sub?.items?.data?.[0]?.id;
      if (!itemId) throw new Error('subscription has no items');

      await stripe(env, `/v1/subscriptions/${currentSubs[0].stripe_subscription_id}`, 'POST', new URLSearchParams({
        'items[0][id]': itemId,
        'items[0][price]': newTier.stripe_price_id,
        'proration_behavior': 'create_prorations',
      }));

      await sql`update public.user_subscriptions set tier_id=${newTier.id}, updated_at=now() where user_id=${user.id}`;
      return jsonResponse({ ok: true, tier: newTier.slug, message: 'Subscription updated' });
    } else {
      const origin = effectiveOrigin(request, url);
      const checkoutParams = new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': newTier.stripe_price_id,
        'line_items[0][quantity]': '1',
        'success_url': `${origin}/account/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
        'cancel_url': `${origin}/account/billing?canceled=true`,
        'metadata[user_id]': user.id,
        'metadata[tier_id]': newTier.id,
      });
      checkoutParams.set('customer_email', sess.email);
      const session = await stripe(env, '/v1/checkout/sessions', 'POST', checkoutParams);
      return jsonResponse({ ok: true, checkout_url: session?.url });
    }
  } catch (e: any) {
    logger.error('change-tier error', { error: e.message });
    return errorResponse(e.message, 500);
  }
}

export async function handleSubscriptionHistory(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in subscription history', { error: e.message });
      return null as any;
    });
    if (!user?.id) return jsonResponse({ ok: true, events: [] });

    const subRows = await sql`SELECT stripe_customer_id FROM public.user_subscriptions WHERE user_id=${user.id} LIMIT 1` as Array<any>;
    const customerId = subRows?.[0]?.stripe_customer_id;
    if (!customerId) return jsonResponse({ ok: true, events: [] });

    const events = await sql`
      SELECT event_id, event_type, subscription_id, payment_intent_id, amount, currency, status, created_at
      FROM public.stripe_events
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
      LIMIT 50
    ` as Array<any>;

    return jsonResponse({ ok: true, events });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
}

export async function handleCancelSubscription(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in cancel subscription', { error: e.message });
      return null as any;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);

    const subs = await sql`SELECT id, stripe_subscription_id FROM public.user_subscriptions WHERE user_id=${user.id} AND status='active' LIMIT 1` as Array<any>;
    if (!subs.length || !subs[0].stripe_subscription_id) {
      return errorResponse('no_active_subscription', 400);
    }

    await stripe(env, `/v1/subscriptions/${subs[0].stripe_subscription_id}`, 'POST', new URLSearchParams({
      'cancel_at_period_end': 'true',
    }));

    return jsonResponse({ ok: true, message: 'Subscription will cancel at end of billing period' });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
}

export async function handleReactivateSubscription(request: Request, env: Env): Promise<Response> {
  const sess = await getSessionFromCookie(request, env);
  if (!sess) return unauthorizedResponse();
  try {
    const sql = getPg(env);
    const user = await findUserByEmail(env, sess.email).catch((e: any) => {
      logger.error('findUserByEmail failed in reactivate subscription', { error: e.message });
      return null as any;
    });
    if (!user?.id) return errorResponse('user_not_found', 404);

    const subs = await sql`SELECT id, stripe_subscription_id FROM public.user_subscriptions WHERE user_id=${user.id} LIMIT 1` as Array<any>;
    if (!subs.length || !subs[0].stripe_subscription_id) {
      return errorResponse('no_subscription', 400);
    }

    await stripe(env, `/v1/subscriptions/${subs[0].stripe_subscription_id}`, 'POST', new URLSearchParams({
      'cancel_at_period_end': 'false',
    }));

    return jsonResponse({ ok: true, message: 'Auto-renewal re-enabled' });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
}

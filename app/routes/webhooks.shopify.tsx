import type {Route} from './+types/webhooks.shopify';
import {verifyShopifyWebhook} from '~/lib/security';
import {logger} from '~/lib/logger';

/**
 * POST /webhooks/shopify — verified Shopify webhook receiver.
 *
 * Register webhooks from a custom app (Admin → Settings → Apps → Develop
 * apps) pointing at https://<your-domain>/webhooks/shopify, and set
 * SHOPIFY_WEBHOOK_SECRET to that app's API secret key.
 *
 * Storefront data is fetched live from the Storefront API with short cache
 * TTLs, so product changes appear without webhooks. This endpoint exists for
 * integrations that must react to events (e.g. notify a CRM, warm caches,
 * forward to analytics). Handlers must be idempotent: Shopify retries and may
 * deliver duplicates (use X-Shopify-Event-Id to de-duplicate).
 */
const HANDLED_TOPICS = new Set([
  'products/update',
  'products/delete',
  'collections/update',
  'inventory_levels/update',
  'orders/create',
  'app/uninstalled',
]);

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') return new Response(null, {status: 405});

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response(null, {status: 413});

  const valid = await verifyShopifyWebhook({
    rawBody,
    hmacHeader: request.headers.get('X-Shopify-Hmac-Sha256'),
    secret: context.env.SHOPIFY_WEBHOOK_SECRET,
  });
  if (!valid) {
    logger.warn('webhook_invalid_signature', {topic: request.headers.get('X-Shopify-Topic')});
    return new Response('Unauthorized', {status: 401});
  }

  const topic = request.headers.get('X-Shopify-Topic') ?? 'unknown';
  const eventId = request.headers.get('X-Shopify-Event-Id');
  const shop = request.headers.get('X-Shopify-Shop-Domain');

  let payload: {id?: number | string; admin_graphql_api_id?: string} = {};
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return new Response('Bad request', {status: 400});
  }

  // Log only identifiers — never personal data from order/customer payloads.
  logger.info('webhook_received', {
    topic,
    eventId,
    shop,
    resource: payload.admin_graphql_api_id ?? payload.id ?? null,
    handled: HANDLED_TOPICS.has(topic),
  });

  // Add integration-specific handling here (keep it fast; use waitUntil for
  // follow-up work so Shopify gets a 200 within 5 seconds).
  return new Response(null, {status: 200});
}

export async function loader() {
  return new Response('Method not allowed', {status: 405});
}

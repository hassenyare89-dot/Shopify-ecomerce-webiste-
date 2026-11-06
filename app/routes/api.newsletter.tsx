import {data} from 'react-router';
import type {Route} from './+types/api.newsletter';
import {
  AdminApiNotConfiguredError,
  createAdminClient,
  subscribeEmailInKlaviyo,
  subscribeEmailInShopify,
} from '~/lib/admin.server';
import {
  getClientIp,
  isHoneypotTripped,
  isSameOriginRequest,
  isValidEmail,
  RateLimiter,
  sanitizeText,
} from '~/lib/security';
import {logger} from '~/lib/logger';

export type NewsletterActionData = {ok: boolean; message: string};

// 5 attempts per IP per 10 minutes (per worker isolate — see docs/SECURITY.md).
const limiter = new RateLimiter(5, 10 * 60 * 1000);

/**
 * POST /api/newsletter — records explicit email marketing consent.
 * Provider: NEWSLETTER_PROVIDER = shopify (Admin API) | klaviyo | none.
 */
export async function action({request, context}: Route.ActionArgs) {
  const respond = (body: NewsletterActionData, status = 200) =>
    data<NewsletterActionData>(body, {status, headers: {'Cache-Control': 'no-store'}});

  if (request.method !== 'POST') return respond({ok: false, message: 'Method not allowed'}, 405);
  if (!isSameOriginRequest(request)) return respond({ok: false, message: 'Invalid request origin.'}, 403);

  const {allowed, retryAfter} = limiter.check(`newsletter:${getClientIp(request)}`);
  if (!allowed) {
    return respond({ok: false, message: `Too many attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`}, 429);
  }

  const formData = await request.formData();
  // Bots that fill the hidden field get a success response and nothing is stored.
  if (isHoneypotTripped(formData)) return respond({ok: true, message: 'Thanks for subscribing!'});

  const email = sanitizeText(formData.get('email'), 254).toLowerCase();
  const source = sanitizeText(formData.get('source'), 40) || 'website';
  if (!isValidEmail(email)) return respond({ok: false, message: 'Please enter a valid email address.'}, 400);

  const {env} = context;
  const provider = (env.NEWSLETTER_PROVIDER || 'shopify').toLowerCase();

  try {
    if (provider === 'klaviyo') {
      await subscribeEmailInKlaviyo(env, email, source);
      return respond({ok: true, message: 'Thanks! Please check your inbox to confirm.'});
    }
    if (provider === 'shopify') {
      const result = await subscribeEmailInShopify(createAdminClient(env), email);
      return respond({
        ok: true,
        message: result === 'already_subscribed' ? 'You’re already subscribed — thank you!' : 'Thanks for subscribing!',
      });
    }
    throw new AdminApiNotConfiguredError('Newsletter disabled');
  } catch (error) {
    if (error instanceof AdminApiNotConfiguredError) {
      logger.warn('newsletter_not_configured', {provider});
      return respond({ok: false, message: 'Newsletter signup is not available right now.'}, 503);
    }
    logger.error('newsletter_failed', {provider, error});
    return respond({ok: false, message: 'Something went wrong. Please try again later.'}, 502);
  }
}

export async function loader() {
  return new Response('Not found', {status: 404});
}

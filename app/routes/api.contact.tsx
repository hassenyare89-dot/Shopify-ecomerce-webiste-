import {data} from 'react-router';
import type {Route} from './+types/api.contact';
import {
  getClientIp,
  isHoneypotTripped,
  isSameOriginRequest,
  isValidEmail,
  RateLimiter,
  sanitizeText,
} from '~/lib/security';
import {logger} from '~/lib/logger';
import {siteConfig} from '~/config/site';
import {CONTACT_TOPICS as TOPICS} from '~/lib/contact';

export type ContactActionData =
  | {ok: true; message: string}
  | {ok: false; message: string; fieldErrors?: Partial<Record<'name' | 'email' | 'message' | 'orderNumber', string>>};

const limiter = new RateLimiter(3, 10 * 60 * 1000);


/**
 * POST /api/contact — validates and forwards a support request to
 * CONTACT_FORM_WEBHOOK_URL (helpdesk / Zapier / Slack / email service).
 * The storefront itself stores nothing.
 */
export async function action({request, context}: Route.ActionArgs) {
  const respond = (body: ContactActionData, status = 200) =>
    data<ContactActionData>(body, {status, headers: {'Cache-Control': 'no-store'}});

  if (!isSameOriginRequest(request)) return respond({ok: false, message: 'Invalid request origin.'}, 403);
  const {allowed} = limiter.check(`contact:${getClientIp(request)}`);
  if (!allowed) return respond({ok: false, message: 'Too many messages. Please try again later.'}, 429);

  const form = await request.formData();
  if (isHoneypotTripped(form)) return respond({ok: true, message: 'Thanks — we’ll be in touch soon.'});

  const name = sanitizeText(form.get('name'), 100);
  const email = sanitizeText(form.get('email'), 254).toLowerCase();
  const message = sanitizeText(form.get('message'), 5000);
  const orderNumber = sanitizeText(form.get('orderNumber'), 40);
  const topicRaw = sanitizeText(form.get('topic'), 40);
  const topic = (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : 'Other';

  const fieldErrors: NonNullable<Extract<ContactActionData, {ok: false}>['fieldErrors']> = {};
  if (name.length < 2) fieldErrors.name = 'Please enter your name.';
  if (!isValidEmail(email)) fieldErrors.email = 'Please enter a valid email address.';
  if (message.length < 10) fieldErrors.message = 'Please enter a message of at least 10 characters.';
  if (orderNumber && !/^#?[A-Za-z0-9-]{1,40}$/.test(orderNumber)) fieldErrors.orderNumber = 'Order numbers contain only letters, numbers and dashes.';
  if (Object.keys(fieldErrors).length) {
    return respond({ok: false, message: 'Please fix the highlighted fields.', fieldErrors}, 400);
  }

  const url = context.env.CONTACT_FORM_WEBHOOK_URL;
  if (!url || !url.startsWith('https://')) {
    logger.warn('contact_form_not_configured');
    return respond(
      {ok: false, message: `Our contact form is unavailable. Please email us at ${siteConfig.contact.email}.`},
      503,
    );
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type: 'contact_form',
        submittedAt: new Date().toISOString(),
        topic,
        name,
        email,
        orderNumber: orderNumber || null,
        message,
      }),
    });
    if (!response.ok) throw new Error(`Contact webhook responded ${response.status}`);
    return respond({ok: true, message: 'Thanks — your message has been sent. We’ll reply by email.'});
  } catch (error) {
    logger.error('contact_form_failed', {error});
    return respond({ok: false, message: `We couldn’t send your message. Please email ${siteConfig.contact.email}.`}, 502);
  }
}

export async function loader() {
  return new Response('Not found', {status: 404});
}

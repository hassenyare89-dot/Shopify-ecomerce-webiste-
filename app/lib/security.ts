/**
 * Security utilities for custom server endpoints.
 *
 * Shopify-hosted checkout handles payments; this app never touches card data.
 * These helpers protect the few custom endpoints we own (newsletter, contact,
 * wishlist product lookup, webhooks).
 */

/** Response headers applied to every document and data response. */
export function applySecurityHeaders(
  headers: Headers,
  {isProduction}: {isProduction: boolean},
) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  headers.set(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'usb=()',
      'interest-cohort=()',
      // Allow Shopify-supported express wallets where applicable.
      'payment=(self "https://shop.app")',
    ].join(', '),
  );
  if (isProduction) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
  headers.delete('X-Powered-By');
}

/**
 * Same-origin check for state-changing requests (CSRF defence in depth on
 * top of SameSite=Lax cookies). Uses Origin, falling back to Sec-Fetch-Site.
 */
export function isSameOriginRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) {
    // Behind a TLS-terminating proxy the worker may see http://; compare hosts.
    try {
      return new URL(origin).host === new URL(requestOrigin).host;
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite) return fetchSite === 'same-origin' || fetchSite === 'none';
  // Non-browser clients send neither header; reject for mutating endpoints.
  return false;
}

/** Best-effort client IP on Oxygen / common proxies (used for rate limiting only). */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('oxygen-buyer-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter.
 *
 * LIMITATION: Oxygen runs many isolated workers, so this state is per-isolate
 * and best-effort. It blunts naive abuse of a single worker; for strong
 * guarantees, add a WAF/bot rule at the edge or a shared store (see
 * docs/SECURITY.md).
 */
export class RateLimiter {
  #buckets = new Map<string, Bucket>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): {allowed: boolean; retryAfter: number} {
    let bucket = this.#buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = {count: 0, resetAt: now + this.windowMs};
      this.#buckets.set(key, bucket);
      this.#evict(now);
    }
    bucket.count += 1;
    const allowed = bucket.count <= this.limit;
    return {
      allowed,
      retryAfter: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  #evict(now: number) {
    if (this.#buckets.size <= this.maxKeys) return;
    for (const [key, bucket] of this.#buckets) {
      if (bucket.resetAt <= now) this.#buckets.delete(key);
    }
    // Still too big: drop oldest entries.
    while (this.#buckets.size > this.maxKeys) {
      const firstKey = this.#buckets.keys().next().value;
      if (firstKey === undefined) break;
      this.#buckets.delete(firstKey);
    }
  }
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

/**
 * Normalises untrusted free text: trims, removes control characters (except
 * newlines/tabs) and enforces a max length. Output is still treated as
 * untrusted and is escaped by React when rendered.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** Honeypot: a hidden field real users never fill. */
export function isHoneypotTripped(formData: FormData, field = 'company_website') {
  const value = formData.get(field);
  return typeof value === 'string' && value.length > 0;
}

function base64FromBytes(bytes: ArrayBuffer): string {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/** HMAC-SHA256 of `body` with `secret`, base64-encoded (Shopify webhook format). */
export async function hmacSha256Base64(secret: string, body: string | ArrayBuffer) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const data = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return base64FromBytes(signature);
}

/**
 * Verifies the `X-Shopify-Hmac-Sha256` header of a webhook request against
 * the RAW request body. Must be called before parsing JSON.
 */
export async function verifyShopifyWebhook({
  rawBody,
  hmacHeader,
  secret,
}: {
  rawBody: string | ArrayBuffer;
  hmacHeader: string | null;
  secret: string | undefined;
}): Promise<boolean> {
  if (!secret || !hmacHeader) return false;
  const expected = await hmacSha256Base64(secret, rawBody);
  return timingSafeEqual(expected, hmacHeader);
}

/** Only allow redirects to relative, same-site paths. */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

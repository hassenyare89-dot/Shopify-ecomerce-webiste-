import {createHmac} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {
  applySecurityHeaders,
  getClientIp,
  hmacSha256Base64,
  isHoneypotTripped,
  isSameOriginRequest,
  isValidEmail,
  RateLimiter,
  safeRedirectPath,
  sanitizeText,
  timingSafeEqual,
  verifyShopifyWebhook,
} from '~/lib/security';

describe('webhook verification', () => {
  const secret = 'shpss_test_secret';
  const body = JSON.stringify({id: 1, title: 'Shirt'});
  const valid = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

  it('computes the same HMAC as Node crypto', async () => {
    expect(await hmacSha256Base64(secret, body)).toBe(valid);
  });
  it('accepts valid signatures', async () => {
    expect(await verifyShopifyWebhook({rawBody: body, hmacHeader: valid, secret})).toBe(true);
  });
  it('rejects tampered bodies, wrong secrets and missing headers', async () => {
    expect(await verifyShopifyWebhook({rawBody: body + ' ', hmacHeader: valid, secret})).toBe(false);
    expect(await verifyShopifyWebhook({rawBody: body, hmacHeader: valid, secret: 'other'})).toBe(false);
    expect(await verifyShopifyWebhook({rawBody: body, hmacHeader: null, secret})).toBe(false);
    expect(await verifyShopifyWebhook({rawBody: body, hmacHeader: valid, secret: undefined})).toBe(false);
  });
  it('compares in constant time semantics', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.check('ip', 0).allowed).toBe(true);
    expect(limiter.check('ip', 10).allowed).toBe(true);
    const blocked = limiter.check('ip', 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBe(1);
    expect(limiter.check('other', 20).allowed).toBe(true);
    expect(limiter.check('ip', 1001).allowed).toBe(true);
  });
  it('bounds memory', () => {
    const limiter = new RateLimiter(1, 1000, 10);
    for (let i = 0; i < 50; i++) limiter.check(`k${i}`, 0);
    expect(limiter.check('k0', 0).allowed).toBe(true); // evicted → fresh bucket
  });
});

describe('request checks', () => {
  const req = (headers: Record<string, string>) => new Request('https://shop.example/api/newsletter', {method: 'POST', headers});
  it('accepts same-origin and rejects cross-origin', () => {
    expect(isSameOriginRequest(req({Origin: 'https://shop.example'}))).toBe(true);
    expect(isSameOriginRequest(req({Origin: 'https://evil.example'}))).toBe(false);
    expect(isSameOriginRequest(req({'Sec-Fetch-Site': 'same-origin'}))).toBe(true);
    expect(isSameOriginRequest(req({'Sec-Fetch-Site': 'cross-site'}))).toBe(false);
    expect(isSameOriginRequest(req({}))).toBe(false);
  });
  it('reads client IP from Oxygen header first', () => {
    expect(getClientIp(req({'oxygen-buyer-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2'}))).toBe('1.1.1.1');
    expect(getClientIp(req({'x-forwarded-for': '2.2.2.2, 3.3.3.3'}))).toBe('2.2.2.2');
  });
});

describe('input validation', () => {
  it('validates emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('<script>@x.com')).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });
  it('sanitizes text', () => {
    expect(sanitizeText('  hi\u0000there\u0007  ', 100)).toBe('hithere');
    expect(sanitizeText('line1\nline2', 100)).toBe('line1\nline2');
    expect(sanitizeText('abcdef', 3)).toBe('abc');
    expect(sanitizeText(null, 3)).toBe('');
  });
  it('detects honeypot', () => {
    const fd = new FormData();
    expect(isHoneypotTripped(fd)).toBe(false);
    fd.set('company_website', 'spam');
    expect(isHoneypotTripped(fd)).toBe(true);
  });
  it('only allows safe relative redirects', () => {
    expect(safeRedirectPath('/account')).toBe('/account');
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
  });
});

describe('applySecurityHeaders', () => {
  it('sets hardening headers and HSTS only in production', () => {
    const dev = new Headers();
    applySecurityHeaders(dev, {isProduction: false});
    expect(dev.get('X-Content-Type-Options')).toBe('nosniff');
    expect(dev.get('X-Frame-Options')).toBe('DENY');
    expect(dev.get('Strict-Transport-Security')).toBeNull();
    const prod = new Headers();
    applySecurityHeaders(prod, {isProduction: true});
    expect(prod.get('Strict-Transport-Security')).toContain('max-age=63072000');
  });
});

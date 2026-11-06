/**
 * HTTP-level integration tests: SSR output, SEO, security headers and the
 * custom server endpoints, against the mock Storefront API.
 */
import {createHmac} from 'node:crypto';
import {expect, test} from '@playwright/test';

test.describe('Shopify data rendering (SSR)', () => {
  test('product page server-renders Shopify data with accurate JSON-LD', async ({request}) => {
    const res = await request.get('/products/linen-overshirt');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('<h1');
    expect(html).toContain('Linen Overshirt');
    type Ld = Record<string, any>;
    const ld: Ld[] = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
      .flatMap((m): Ld[] => {
        const parsed = JSON.parse(m[1]) as Ld | Ld[];
        return Array.isArray(parsed) ? (parsed as Ld[]) : [parsed];
      });
    const product = ld.find((x) => x['@type'] === 'Product')!;
    expect(product).toBeTruthy();
    expect(product.offers['@type']).toBe('AggregateOffer');
    expect(product.offers.priceCurrency).toBe('USD');
    // Sold-out variants (from Shopify data) are marked OutOfStock.
    expect(product.offers.offers.some((o: {availability: string}) => o.availability.endsWith('OutOfStock'))).toBe(true);
    expect(product.aggregateRating.reviewCount).toBe(124);
    expect(ld.some((x) => x['@type'] === 'BreadcrumbList')).toBe(true);
    expect(html).toMatch(/<link rel="canonical" href="http:\/\/localhost:3000\/products\/linen-overshirt"/);
  });

  test('collection page lists products and Shopify facets', async ({request}) => {
    const res = await request.get('/collections/apparel');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('Apparel');
    expect(html).toContain('Organic Cotton Tee');
    expect(html).toContain('Availability');
  });

  test('filters and sort from the URL are applied server-side and noindexed', async ({request}) => {
    const html = await (await request.get('/collections/apparel?filter.p.vendor=Stride%20Lab&sort=price-desc')).text();
    expect(html).toContain('Trail Runner Sneaker');
    expect(html).not.toContain('Organic Cotton Tee');
    expect(html).toContain('noindex');
  });

  test('unknown routes and products return real 404s', async ({request}) => {
    expect((await request.get('/this-does-not-exist')).status()).toBe(404);
    expect((await request.get('/products/does-not-exist')).status()).toBe(404);
  });

  test('friendly policy URLs redirect to Shopify policies', async ({request}) => {
    const res = await request.get('/returns', {maxRedirects: 0});
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe('/policies/refund-policy');
  });

  test('robots.txt and sitemap are served', async ({request}) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /account');
    expect(robots).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<sitemapindex');
  });
});

test.describe('Security', () => {
  test('documents include CSP and hardening headers', async ({request}) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['permissions-policy']).toContain('camera=()');
  });

  test('server-only secrets never reach the browser', async ({request}) => {
    const html = await (await request.get('/')).text();
    expect(html).not.toContain('mock-private-token');
    expect(html).not.toContain('mock-session-secret');
  });

  test('newsletter endpoint rejects cross-origin requests', async ({request}) => {
    const res = await request.post('/api/newsletter', {
      form: {email: 'a@example.com'},
      headers: {Origin: 'https://evil.example'},
    });
    expect(res.status()).toBe(403);
  });

  test('newsletter endpoint validates email', async ({request}) => {
    const res = await request.post('/api/newsletter', {
      form: {email: 'not-an-email'},
      headers: {Origin: 'http://localhost:3000'},
    });
    expect(res.status()).toBe(400);
  });

  test('contact endpoint validates fields and reports unconfigured delivery honestly', async ({request}) => {
    const bad = await request.post('/api/contact', {form: {name: 'A', email: 'x', message: 'short'}, headers: {Origin: 'http://localhost:3000'}});
    expect(bad.status()).toBe(400);
    const ok = await request.post('/api/contact', {
      form: {name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello, I have a question.'},
      headers: {Origin: 'http://localhost:3000'},
    });
    // CONTACT_FORM_WEBHOOK_URL is not set in the mock env.
    expect(ok.status()).toBe(503);
  });

  test('webhook endpoint enforces HMAC signatures', async ({request}) => {
    const body = JSON.stringify({id: 1});
    const unsigned = await request.post('/webhooks/shopify', {data: body, headers: {'Content-Type': 'application/json', 'X-Shopify-Topic': 'products/update'}});
    expect(unsigned.status()).toBe(401);
    // No SHOPIFY_WEBHOOK_SECRET in mock env → even a "valid-looking" signature is rejected.
    const sig = createHmac('sha256', 'guess').update(body).digest('base64');
    const forged = await request.post('/webhooks/shopify', {data: body, headers: {'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': sig}});
    expect(forged.status()).toBe(401);
  });

  test('wishlist API ignores invalid ids and returns live product data', async ({request}) => {
    const res = await request.get('/api/wishlist?ids=gid://shopify/Product/8000,DROP%20TABLE,gid://shopify/Product/999999');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.products).toHaveLength(1);
    expect(json.products[0].handle).toBe('linen-overshirt');
  });
});

test.describe('Customer accounts', () => {
  test('account login redirects to Shopify-hosted Customer Account authentication (OAuth + PKCE)', async ({request}) => {
    const res = await request.get('/account/login', {maxRedirects: 0});
    expect(res.status()).toBe(302);
    const location = new URL(res.headers()['location']);
    expect(location.hostname).toBe('shopify.com');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('client_id')).toBe('mock-customer-account-client-id');
  });

  test('protected account pages require authentication', async ({request}) => {
    const res = await request.get('/account/orders', {maxRedirects: 0});
    expect([302, 303]).toContain(res.status());
    expect(res.headers()['location']).toContain('/account/login');
  });
});

import {describe, expect, it} from 'vitest';
import {
  mapNodes,
  richTextToPlain,
  safeContentUrl,
  toFaqEntry,
  toHeroSlide,
  toTestimonial,
  type MetaobjectNode,
} from '~/lib/content';
import {buildNavigation, normalizeMenuUrl} from '~/lib/menu';
import {parseWishlist, toggleWishlistItem, WISHLIST_MAX_ITEMS} from '~/lib/wishlist';
import {buildThemeCss, themeInitScript} from '~/lib/theme';
import {buildCspDirectives, isLocalMockStore} from '~/lib/csp';
import {isNewProduct} from '~/components/ProductCard';

const node = (fields: Record<string, string>, extra: Partial<MetaobjectNode> = {}): MetaobjectNode =>
  ({
    id: 'gid://shopify/Metaobject/1',
    handle: 'h',
    type: 't',
    fields: Object.entries(fields).map(([key, value]) => ({key, value, type: 'single_line_text_field', reference: null})),
    ...extra,
  }) as MetaobjectNode;

describe('content mapping', () => {
  it('maps hero slides and rejects unsafe CTA URLs', () => {
    expect(toHeroSlide(node({heading: 'Hi', cta_url: 'javascript:alert(1)', secondary_cta_url: '/sale'}))).toMatchObject({
      heading: 'Hi',
      ctaUrl: undefined,
      secondaryCtaUrl: '/sale',
    });
    expect(toHeroSlide(node({eyebrow: 'no heading'}))).toBeNull();
  });
  it('maps testimonials with validated ratings', () => {
    expect(toTestimonial(node({quote: 'Great', author: 'A', rating: '{"value":"4","scale_max":"5"}'}))?.rating).toBe(4);
    expect(toTestimonial(node({quote: 'Great', author: 'A', rating: '9'}))?.rating).toBeUndefined();
    expect(toTestimonial(node({quote: 'Great'}))).toBeNull();
  });
  it('maps FAQ rich text to plain text', () => {
    const rich = JSON.stringify({type: 'root', children: [{type: 'paragraph', children: [{type: 'text', value: 'Answer one'}]}, {type: 'paragraph', children: [{type: 'text', value: 'Two'}]}]});
    expect(toFaqEntry(node({question: 'Q', answer: rich}))?.answer).toBe('Answer one\n\nTwo');
    expect(richTextToPlain('plain')).toBe('plain');
  });
  it('filters invalid nodes', () => {
    expect(mapNodes([node({heading: 'a'}), node({})], toHeroSlide)).toHaveLength(1);
    expect(mapNodes(undefined, toHeroSlide)).toEqual([]);
  });
  it('validates content URLs', () => {
    expect(safeContentUrl('/collections/x')).toBe('/collections/x');
    expect(safeContentUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeContentUrl('//evil.com')).toBeUndefined();
    expect(safeContentUrl('data:text/html,x')).toBeUndefined();
  });
});

describe('menus', () => {
  const opts = {publicStoreDomain: 'store.myshopify.com', primaryDomainUrl: 'https://brand.com'};
  it('converts store URLs to internal paths', () => {
    expect(normalizeMenuUrl('https://store.myshopify.com/collections/a', opts)).toEqual({to: '/collections/a', external: false});
    expect(normalizeMenuUrl('https://brand.com/pages/about?x=1', opts)).toEqual({to: '/pages/about?x=1', external: false});
    expect(normalizeMenuUrl('https://other.myshopify.com/collections/frontpage', opts)).toEqual({to: '/', external: false});
    expect(normalizeMenuUrl('https://instagram.com/brand', opts)).toEqual({to: 'https://instagram.com/brand', external: true});
    expect(normalizeMenuUrl('/blogs', opts)).toEqual({to: '/blogs', external: false});
  });
  it('uses fallback navigation when the Shopify menu is empty', () => {
    expect(buildNavigation(null, opts, [{title: 'Shop', to: '/collections/all'}])).toEqual([
      {id: 'fallback-0', title: 'Shop', to: '/collections/all', external: false, items: []},
    ]);
  });
});

describe('wishlist storage', () => {
  const a = 'gid://shopify/Product/1';
  const b = 'gid://shopify/Product/2';
  it('parses defensively', () => {
    expect(parseWishlist(null)).toEqual([]);
    expect(parseWishlist('garbage')).toEqual([]);
    expect(parseWishlist(JSON.stringify([a, a, 'x', 5, b]))).toEqual([a, b]);
  });
  it('toggles and caps items', () => {
    expect(toggleWishlistItem([], a)).toEqual([a]);
    expect(toggleWishlistItem([a, b], a)).toEqual([b]);
    expect(toggleWishlistItem([a], 'not-a-gid')).toEqual([a]);
    const many = Array.from({length: WISHLIST_MAX_ITEMS}, (_, i) => `gid://shopify/Product/${i + 10}`);
    expect(toggleWishlistItem(many, a)).toHaveLength(WISHLIST_MAX_ITEMS);
  });
});

describe('theme', () => {
  it('emits brand tokens for light and dark', () => {
    const css = buildThemeCss();
    expect(css).toContain(':root{');
    expect(css).toContain('--brand-primary:#1F3D2B;');
    expect(css).toContain(':root[data-theme="dark"]{');
  });
  it('rejects unsafe CSS values', () => {
    const css = buildThemeCss({
      ...(undefined as never as Parameters<typeof buildThemeCss>[0]),
      light: {primary: 'red;}</style><script>', background: '#fff'} as never,
      dark: {} as never,
      fonts: {heading: 'x', body: 'y', googleFontsHref: null},
      radius: '1rem',
      enableDarkMode: false,
      defaultMode: 'light',
    } as never);
    expect(css).not.toContain('<script>');
    expect(css).toContain('--brand-background:#fff;');
  });
  it('init script respects saved choice', () => {
    expect(themeInitScript()).toContain("localStorage.getItem('theme')");
  });
  it('init script only embeds known default modes', () => {
    const script = themeInitScript({enableDarkMode: true, defaultMode: '</script><script>alert(1)'} as never);
    expect(script).not.toContain('alert');
    expect(script).toContain("'system'");
  });
});

describe('CSP', () => {
  it('only allows third-party origins for configured integrations', () => {
    const base = buildCspDirectives({});
    expect((base.scriptSrc as string[]).join(' ')).not.toContain('googletagmanager');
    const withGa = buildCspDirectives({PUBLIC_GA4_MEASUREMENT_ID: 'G-1'});
    expect((withGa.scriptSrc as string[]).join(' ')).toContain('https://www.googletagmanager.com');
    expect(base.objectSrc).toEqual(["'none'"]);
    expect(base.upgradeInsecureRequests).toBe(true);
  });
  it('detects the local mock store', () => {
    expect(isLocalMockStore('http://127.0.0.1:4010')).toBe(true);
    expect(isLocalMockStore('my-store.myshopify.com')).toBe(false);
    expect(buildCspDirectives({PUBLIC_STORE_DOMAIN: 'http://127.0.0.1:4010'}).upgradeInsecureRequests).toBeUndefined();
  });
});

describe('product badges', () => {
  it('marks products published in the last 30 days as new', () => {
    const now = Date.parse('2026-11-06T00:00:00Z');
    expect(isNewProduct('2026-11-01T00:00:00Z', now)).toBe(true);
    expect(isNewProduct('2026-09-01T00:00:00Z', now)).toBe(false);
    expect(isNewProduct(null, now)).toBe(false);
  });
});

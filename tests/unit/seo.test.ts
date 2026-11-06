import {describe, expect, it} from 'vitest';
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqJsonLd,
  pageTitle,
  parseRating,
  productJsonLd,
  seoMeta,
} from '~/lib/seo';

const variant = (id: number, amount: string, available = true) => ({
  id: `gid://shopify/ProductVariant/${id}`,
  sku: `SKU${id}`,
  title: `V${id}`,
  availableForSale: available,
  price: {amount, currencyCode: 'USD'},
});

describe('seoMeta', () => {
  it('builds title, description, canonical, OG and JSON-LD tags', () => {
    const meta = seoMeta({
      title: 'Shirt',
      description: '<p>Soft linen</p>',
      url: 'https://shop.example/products/shirt',
      image: {url: 'https://cdn.shopify.com/a.jpg', altText: 'A shirt', width: 800, height: 1000},
      jsonLd: {'@type': 'Thing'},
    });
    expect(meta).toContainEqual({title: 'Shirt | Store Name'});
    expect(meta).toContainEqual({name: 'description', content: 'Soft linen'});
    expect(meta).toContainEqual({tagName: 'link', rel: 'canonical', href: 'https://shop.example/products/shirt'});
    expect(meta).toContainEqual({property: 'og:image', content: 'https://cdn.shopify.com/a.jpg'});
    expect(meta).toContainEqual({'script:ld+json': {'@type': 'Thing'}});
  });
  it('adds noindex and defaults', () => {
    const meta = seoMeta({noindex: true});
    expect(meta[0]).toEqual({title: pageTitle()});
    expect(meta).toContainEqual({name: 'robots', content: 'noindex, nofollow'});
  });
});

describe('canonicalUrl', () => {
  it('drops query strings and trailing slashes', () => {
    expect(canonicalUrl('https://a.com/collections/x/?sort=price&cursor=1')).toBe('https://a.com/collections/x');
    expect(canonicalUrl('https://a.com/?q=1')).toBe('https://a.com/');
    expect(canonicalUrl('https://a.com/products/old', '/products/new')).toBe('https://a.com/products/new');
  });
});

describe('productJsonLd', () => {
  it('uses a single Offer for one variant with real availability', () => {
    const ld = productJsonLd({
      url: 'https://a.com/products/x',
      title: 'X',
      handle: 'x',
      images: [{url: 'https://cdn/x.jpg'}],
      variants: [variant(1, '10', false)],
    }) as Record<string, any>;
    expect(ld.offers['@type']).toBe('Offer');
    expect(ld.offers.price).toBe('10.00');
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
    expect(ld.offers.url).toBe('https://a.com/products/x?variant=1');
    expect(ld.aggregateRating).toBeUndefined();
  });
  it('uses AggregateOffer for multiple variants and includes only real ratings', () => {
    const ld = productJsonLd({
      url: 'u',
      title: 'X',
      handle: 'x',
      vendor: 'Acme',
      images: [],
      variants: [variant(1, '10'), variant(2, '15.5')],
      rating: {value: 4.5, count: 12},
    }) as Record<string, any>;
    expect(ld.offers).toMatchObject({'@type': 'AggregateOffer', lowPrice: '10.00', highPrice: '15.50', offerCount: 2});
    expect(ld.brand).toEqual({'@type': 'Brand', name: 'Acme'});
    expect(ld.aggregateRating).toMatchObject({ratingValue: 4.5, reviewCount: 12});
  });
  it('omits rating when count is zero', () => {
    const ld = productJsonLd({url: 'u', title: 'X', handle: 'x', images: [], variants: [variant(1, '1')], rating: {value: 5, count: 0}}) as Record<string, any>;
    expect(ld.aggregateRating).toBeUndefined();
  });
});

describe('other JSON-LD', () => {
  it('builds breadcrumbs and FAQ', () => {
    expect(breadcrumbJsonLd('https://a.com', [{name: 'Home', path: '/'}, {name: 'X', path: '/x'}]).itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'X',
      item: 'https://a.com/x',
    });
    expect(faqJsonLd([{question: 'Q?', answer: '<b>A</b>'}]).mainEntity[0].acceptedAnswer.text).toBe('A');
  });
});

describe('parseRating', () => {
  it('parses review-app metafields', () => {
    expect(parseRating('{"value":"4.75","scale_min":"1.0","scale_max":"5.0"}', '12')).toEqual({value: 4.8, count: 12, scaleMax: 5});
  });
  it('rejects missing or invalid data', () => {
    expect(parseRating(null, '3')).toBeNull();
    expect(parseRating('{"value":"x"}', '3')).toBeNull();
    expect(parseRating('{"value":"4"}', '0')).toBeNull();
    expect(parseRating('not json', '3')).toBeNull();
  });
});

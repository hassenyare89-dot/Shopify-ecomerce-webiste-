/**
 * SEO helpers: meta tags and schema.org JSON-LD.
 *
 * Structured data is built ONLY from Shopify data that is also displayed on
 * the page. Ratings are included only if real review metafields exist —
 * never fabricated.
 */
import {siteConfig} from '~/config/site';
import {stripHtml, truncate} from '~/lib/format';

type MetaDescriptor = Record<string, string>;

export interface SeoInput {
  title?: string | null;
  description?: string | null;
  /** Absolute or root-relative canonical URL. */
  url?: string | null;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  /** Pre-built JSON-LD objects. */
  jsonLd?: object | object[];
}

export function pageTitle(title?: string | null) {
  if (!title) return `${siteConfig.name} — ${siteConfig.tagline}`;
  return `${title} | ${siteConfig.name}`;
}

/** Builds a React Router `meta` array with title, description, canonical, OG & Twitter. */
export function seoMeta(input: SeoInput): MetaDescriptor[] {
  const title = pageTitle(input.title);
  const description = truncate(
    stripHtml(input.description) || siteConfig.description,
    160,
  );
  const meta: MetaDescriptor[] = [
    {title},
    {name: 'description', content: description},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:type', content: input.type ?? 'website'},
    {property: 'og:site_name', content: siteConfig.name},
    {name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
  ];
  if (input.url) {
    meta.push({tagName: 'link', rel: 'canonical', href: input.url});
    meta.push({property: 'og:url', content: input.url});
  }
  if (input.image?.url) {
    meta.push({property: 'og:image', content: input.image.url});
    meta.push({name: 'twitter:image', content: input.image.url});
    if (input.image.altText) {
      meta.push({property: 'og:image:alt', content: input.image.altText});
    }
    if (input.image.width) {
      meta.push({property: 'og:image:width', content: String(input.image.width)});
    }
    if (input.image.height) {
      meta.push({property: 'og:image:height', content: String(input.image.height)});
    }
  }
  if (input.noindex) {
    meta.push({name: 'robots', content: 'noindex, nofollow'});
  }
  const jsonLd = Array.isArray(input.jsonLd)
    ? input.jsonLd
    : input.jsonLd
      ? [input.jsonLd]
      : [];
  for (const ld of jsonLd) {
    meta.push({'script:ld+json': ld} as unknown as MetaDescriptor);
  }
  return meta;
}

/** Canonical URL without query string or hash, on the given origin. */
export function canonicalUrl(requestUrl: string, pathname?: string): string {
  const url = new URL(requestUrl);
  const path = pathname ?? url.pathname;
  const normalized = path !== '/' ? path.replace(/\/+$/, '') : path;
  return `${url.origin}${normalized}`;
}

/** Strips tracking/variant/sort params so filtered pages don't create duplicate canonical URLs. */
export function canonicalWithPage(requestUrl: string): string {
  return canonicalUrl(requestUrl);
}

interface JsonLdVariant {
  id: string;
  sku?: string | null;
  title: string;
  availableForSale: boolean;
  price: {amount: string; currencyCode: string};
  image?: {url: string} | null;
}

interface JsonLdProductInput {
  url: string;
  title: string;
  description?: string | null;
  vendor?: string | null;
  handle: string;
  images: {url: string}[];
  variants: JsonLdVariant[];
  /** Real aggregate rating from a review app's metafields, if present. */
  rating?: {value: number; count: number; scaleMax?: number} | null;
}

/** schema.org Product with one Offer per variant (prices/availability straight from Shopify). */
export function productJsonLd(input: JsonLdProductInput) {
  const offers = input.variants.map((variant) => ({
    '@type': 'Offer',
    url: `${input.url}?variant=${encodeURIComponent(
      variant.id.split('/').pop() ?? variant.id,
    )}`,
    priceCurrency: variant.price.currencyCode,
    price: Number(variant.price.amount).toFixed(2),
    availability: variant.availableForSale
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    ...(variant.sku ? {sku: variant.sku} : {}),
    seller: {'@type': 'Organization', name: siteConfig.name},
  }));

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.title,
    url: input.url,
    description: truncate(stripHtml(input.description), 5000),
    image: input.images.map((i) => i.url).slice(0, 10),
    ...(input.vendor ? {brand: {'@type': 'Brand', name: input.vendor}} : {}),
    ...(input.variants[0]?.sku ? {sku: input.variants[0].sku} : {}),
    productID: input.handle,
    offers:
      offers.length === 1
        ? offers[0]
        : {
            '@type': 'AggregateOffer',
            priceCurrency: offers[0]?.priceCurrency,
            lowPrice: minPrice(input.variants),
            highPrice: maxPrice(input.variants),
            offerCount: offers.length,
            offers,
          },
  };

  if (
    input.rating &&
    input.rating.count > 0 &&
    Number.isFinite(input.rating.value)
  ) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.value,
      reviewCount: input.rating.count,
      bestRating: input.rating.scaleMax ?? 5,
      worstRating: 1,
    };
  }
  return ld;
}

function minPrice(variants: JsonLdVariant[]) {
  return Math.min(...variants.map((v) => Number(v.price.amount))).toFixed(2);
}
function maxPrice(variants: JsonLdVariant[]) {
  return Math.max(...variants.map((v) => Number(v.price.amount))).toFixed(2);
}

export function organizationJsonLd(origin: string, logoUrl?: string | null) {
  const sameAs = Object.values(siteConfig.social).filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: origin,
    ...(logoUrl ? {logo: logoUrl} : {}),
    ...(sameAs.length ? {sameAs} : {}),
    ...(siteConfig.contact.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            email: siteConfig.contact.email,
            contactType: 'customer support',
            ...(siteConfig.contact.phone
              ? {telephone: siteConfig.contact.phone}
              : {}),
          },
        }
      : {}),
  };
}

export function websiteJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };
}

export function articleJsonLd(input: {
  url: string;
  title: string;
  description?: string | null;
  image?: string | null;
  publishedAt: string;
  author?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    url: input.url,
    datePublished: input.publishedAt,
    ...(input.image ? {image: [input.image]} : {}),
    ...(input.description
      ? {description: truncate(stripHtml(input.description), 300)}
      : {}),
    ...(input.author ? {author: {'@type': 'Person', name: input.author}} : {}),
    publisher: {'@type': 'Organization', name: siteConfig.name},
  };
}

export function faqJsonLd(items: {question: string; answer: string}[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {'@type': 'Answer', text: stripHtml(item.answer)},
    })),
  };
}

/**
 * Parses review metafields written by most Shopify review apps
 * (`reviews.rating` = rating JSON, `reviews.rating_count` = integer).
 */
export function parseRating(
  ratingValue?: string | null,
  countValue?: string | null,
): {value: number; count: number; scaleMax: number} | null {
  if (!ratingValue || !countValue) return null;
  try {
    const parsed = JSON.parse(ratingValue) as {
      value?: string | number;
      scale_max?: string | number;
    };
    const value = Number(parsed.value);
    const scaleMax = Number(parsed.scale_max ?? 5);
    const count = Number.parseInt(countValue, 10);
    if (!Number.isFinite(value) || !Number.isFinite(count) || count <= 0) {
      return null;
    }
    return {value: Math.round(value * 10) / 10, count, scaleMax};
  } catch {
    return null;
  }
}

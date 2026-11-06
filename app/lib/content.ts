/**
 * Merchant-managed storefront content via Shopify metaobjects.
 *
 * Merchants edit these in Shopify admin → Content → Metaobjects, so homepage
 * content changes without a deploy. Definitions (types and fields) are listed
 * in docs/CONTENT_MODEL.md. Each definition must have "Storefronts" access
 * enabled. If a type doesn't exist or has no entries, the section falls back
 * to config (where truthful) or is hidden.
 */
import type {Storefront} from '@shopify/hydrogen';
import type {MetaobjectsQuery} from 'storefrontapi.generated';

export type MetaobjectNode = MetaobjectsQuery['metaobjects']['nodes'][number];

export interface ContentImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  heading: string;
  subheading?: string;
  image?: ContentImage;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  location?: string;
  rating?: number;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface PromoBanner {
  id: string;
  heading: string;
  body?: string;
  image?: ContentImage;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface SocialPost {
  id: string;
  image: ContentImage;
  url?: string;
  caption?: string;
}

type Fields = Record<string, {value: string | null; image?: ContentImage}>;

export function fieldsOf(node: MetaobjectNode): Fields {
  const result: Fields = {};
  for (const field of node.fields) {
    const ref = field.reference;
    const image =
      ref && ref.__typename === 'MediaImage' && ref.image
        ? {
            url: ref.image.url,
            altText: ref.image.altText,
            width: ref.image.width,
            height: ref.image.height,
          }
        : undefined;
    result[field.key] = {value: field.value ?? null, image};
  }
  return result;
}

const str = (f: Fields, key: string) => {
  const v = f[key]?.value;
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
};

/** Only allow relative paths or http(s) URLs from CMS content. */
export function safeContentUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Rich text fields are JSON; flatten to plain text paragraphs. */
export function richTextToPlain(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('{')) return value;
  try {
    const root = JSON.parse(value) as RichTextNode;
    const out: string[] = [];
    const walk = (node: RichTextNode, depth = 0) => {
      if (node.type === 'text' && node.value) out.push(node.value);
      node.children?.forEach((c) => walk(c, depth + 1));
      if (node.type === 'paragraph' || node.type === 'heading') out.push('\n\n');
    };
    walk(root);
    return out.join('').replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return value;
  }
}
interface RichTextNode {
  type: string;
  value?: string;
  children?: RichTextNode[];
}

export function toHeroSlide(node: MetaobjectNode): HeroSlide | null {
  const f = fieldsOf(node);
  const heading = str(f, 'heading');
  if (!heading) return null;
  return {
    id: node.id,
    heading,
    eyebrow: str(f, 'eyebrow'),
    subheading: str(f, 'subheading'),
    image: f.image?.image,
    ctaLabel: str(f, 'cta_label'),
    ctaUrl: safeContentUrl(str(f, 'cta_url')),
    secondaryCtaLabel: str(f, 'secondary_cta_label'),
    secondaryCtaUrl: safeContentUrl(str(f, 'secondary_cta_url')),
  };
}

export function toTestimonial(node: MetaobjectNode): Testimonial | null {
  const f = fieldsOf(node);
  const quote = richTextToPlain(str(f, 'quote'));
  const author = str(f, 'author');
  if (!quote || !author) return null;
  const ratingRaw = str(f, 'rating');
  let rating: number | undefined;
  if (ratingRaw) {
    try {
      const parsed = ratingRaw.startsWith('{')
        ? Number((JSON.parse(ratingRaw) as {value: string}).value)
        : Number(ratingRaw);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) rating = parsed;
    } catch {
      rating = undefined;
    }
  }
  return {id: node.id, quote, author, location: str(f, 'location'), rating};
}

export function toFaqEntry(node: MetaobjectNode): FaqEntry | null {
  const f = fieldsOf(node);
  const question = str(f, 'question');
  const answer = richTextToPlain(str(f, 'answer'));
  if (!question || !answer) return null;
  return {id: node.id, question, answer, category: str(f, 'category')};
}

export function toPromoBanner(node: MetaobjectNode): PromoBanner | null {
  const f = fieldsOf(node);
  const heading = str(f, 'heading');
  if (!heading) return null;
  return {
    id: node.id,
    heading,
    body: richTextToPlain(str(f, 'body')),
    image: f.image?.image,
    ctaLabel: str(f, 'cta_label'),
    ctaUrl: safeContentUrl(str(f, 'cta_url')),
  };
}

export function toSocialPost(node: MetaobjectNode): SocialPost | null {
  const f = fieldsOf(node);
  const image = f.image?.image;
  if (!image) return null;
  return {
    id: node.id,
    image,
    url: safeContentUrl(str(f, 'url')),
    caption: str(f, 'caption'),
  };
}

export function mapNodes<T>(
  nodes: MetaobjectNode[] | undefined,
  mapper: (n: MetaobjectNode) => T | null,
): T[] {
  return (nodes ?? []).map(mapper).filter((x): x is T => x !== null);
}

/**
 * Loads metaobjects of a type. Never throws: content is non-critical, so a
 * missing definition or API error results in an empty list.
 */
export async function getMetaobjects(
  storefront: Storefront,
  type: string,
  first = 20,
): Promise<MetaobjectNode[]> {
  try {
    const data = await storefront.query(METAOBJECTS_QUERY, {
      variables: {type, first},
      cache: storefront.CacheLong(),
    });
    return data?.metaobjects?.nodes ?? [];
  } catch (error) {
    console.warn(`[content] metaobjects "${type}" unavailable`, error);
    return [];
  }
}

const METAOBJECTS_QUERY = `#graphql
  query Metaobjects(
    $type: String!
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    metaobjects(type: $type, first: $first, sortKey: "updated_at", reverse: true) {
      nodes {
        id
        handle
        type
        fields {
          key
          type
          value
          reference {
            __typename
            ... on MediaImage {
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
` as const;

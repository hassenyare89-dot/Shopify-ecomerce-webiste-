# Content model (Shopify metaobjects)

Storefront-specific content is managed in **Shopify admin → Content → Metaobjects**. You don't need a separate CMS. For each definition below:

1. **Add definition** → set the **type** exactly as listed (for example `testimonial`).
2. Add the fields with the listed **keys** and types.
3. Under **Access**, enable **Storefronts** (required for the Storefront API).
4. Add entries. Changes appear within about an hour (`CacheLong`), or immediately after a redeploy.

If a type has no entries, the section either uses config fallbacks (hero, FAQ) or **is hidden** (testimonials, promos, social). It never shows invented content.

## `hero_slide` (homepage hero, first entry used)

| Key | Type | Required |
| --- | --- | --- |
| `heading` | Single line text | ✓ |
| `eyebrow` | Single line text | |
| `subheading` | Multi-line text | |
| `image` | File (image). When set, it replaces the product composition and 3D view | |
| `cta_label`, `cta_url` | Single line text / URL (relative paths like `/collections/sale` allowed) | |
| `secondary_cta_label`, `secondary_cta_url` | Single line text / URL | |

## `faq_item` (FAQ page and homepage preview)

| Key | Type | Required |
| --- | --- | --- |
| `question` | Single line text | ✓ |
| `answer` | Multi-line text or Rich text | ✓ |
| `category` | Single line text (groups the FAQ page) | |

## `testimonial`

Publish only genuine customer feedback that you have permission to use.

| Key | Type | Required |
| --- | --- | --- |
| `quote` | Multi-line text | ✓ |
| `author` | Single line text | ✓ |
| `location` | Single line text | |
| `rating` | Integer 1–5, or Rating | |

## `promo_banner` (up to 2 shown)

| Key | Type | Required |
| --- | --- | --- |
| `heading` | Single line text | ✓ |
| `body` | Multi-line text | |
| `image` | File (image) | |
| `cta_label`, `cta_url` | Single line text / URL | |

## `social_post` (social gallery, up to 6)

Linking a live Instagram feed requires the Instagram Graph API and a token. This model lets you curate posts instead.

| Key | Type | Required |
| --- | --- | --- |
| `image` | File (image) | ✓ |
| `url` | URL (link to the post) | |
| `caption` | Single line text (used as alt text) | |

## Product metafields

| Namespace.key | Type | Used for |
| --- | --- | --- |
| `custom.specifications` | Multi-line text or Rich text | "Specifications" accordion |
| `custom.size_chart` | Multi-line text, Rich text, or **Page reference** | "Size guide" accordion |
| `reviews.rating`, `reviews.rating_count` | Rating / Integer (written by review apps) | Stars, aggregate rating JSON-LD |

To change the specs or size-chart keys, edit `siteConfig.product`. Metafields used as **filters** are configured in the Search & Discovery app, and the URL mapping handles them automatically (`filter.p.m.<ns>.<key>`).

## Other configuration (code)

Brand colors, fonts, logo, announcement messages, homepage section order, trust badges, contact details and social links live in `app/config/site.ts`. They change rarely and are versioned with the code. To make any of them editable in the admin, create a metaobject following the pattern in `app/lib/content.ts`.

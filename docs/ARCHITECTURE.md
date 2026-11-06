# Architecture

## Overview

```
Browser ──HTTPS──▶ Shopify Oxygen (edge worker: server.ts)
                     │  React Router 7 SSR + Hydrogen
                     │  • security headers, CSP nonce, session cookie
                     │  • Hydrogen cache (CacheShort/CacheLong, stale-while-revalidate)
                     ├──▶ Storefront API 2026-04 (products, collections, search, cart, content)
                     ├──▶ Customer Account API 2026-04 (OAuth 2.0 + PKCE; orders, profile, addresses)
                     ├──▶ Admin API (optional, server-only: newsletter consent)
                     └──▶ Your endpoints (optional: contact form webhook, error webhook)
Checkout ──────────▶ Shopify hosted checkout (cart.checkoutUrl)
```

**Shopify is authoritative** for products, prices, inventory, discounts, carts, checkout, orders, taxes, shipping and customers. The app keeps no commerce database. The only local state is:

- `session` cookie: signed, HttpOnly, Secure, SameSite=Lax. Holds Customer Account OAuth tokens.
- `cart` cookie: the Shopify cart ID.
- `localStorage`: theme preference and device-local wishlist (product IDs only).

## Request flow

1. `server.ts` creates the Hydrogen context: storefront client, cart handler, customer account client and session.
2. React Router matches the route. `loader` functions query Shopify:
   - **critical data** (above the fold) is awaited;
   - **deferred data** (recommendations, footer, content sections) is streamed via `Suspense`/`Await` and never fails the page.
3. `entry.server.tsx` renders with a per-request CSP nonce and streams HTML. Bots get fully resolved HTML for SEO.
4. On 404, `storefrontRedirect` checks Shopify URL redirects.
5. Security headers are applied to every response.

## Caching and freshness

| Data | Strategy | Effect |
| --- | --- | --- |
| Products, collections, search | `CacheShort()` (about 1s fresh, then about 9s stale-while-revalidate) | Shopify changes appear within seconds |
| Menus, pages, blogs, metaobjects, policies | `CacheLong()` (about 1h, stale-while-revalidate 23h) | Content edits appear within about an hour. Redeploy, or shorten the strategy, for instant updates |
| Cart, customer account | Never cached (`no-store`) | Always live |

Hydrogen's subrequest cache runs on Oxygen's edge and is shared per deployment. Rate limits and Storefront API throttling are handled by Shopify; use the subrequest profiler (`/subrequest-profiler` in dev) to inspect queries.

## Key modules

| Module | Responsibility |
| --- | --- |
| `app/config/site.ts` | Brand, theme, navigation fallbacks, homepage composition, feature flags |
| `app/lib/filters.ts` | URL ↔ Shopify `ProductFilter` and sort mapping (shareable URLs, injection-safe query strings) |
| `app/lib/listing.server.ts` | "Collection if it exists, else Shopify-sorted catalog" loaders |
| `app/lib/content.ts` | Metaobject loading and mapping with URL safety checks |
| `app/lib/seo.ts` | Meta tags and JSON-LD from displayed Shopify data |
| `app/lib/security.ts` | Headers, same-origin check, rate limiter, validation, webhook HMAC |
| `app/lib/csp.ts` | CSP extensions per configured integration |
| `app/lib/admin.server.ts` | Minimal Admin API client (server-only) |
| `app/components/ThirdPartyAnalytics.tsx` | Consent-gated pixels fed by Hydrogen analytics events |
| `mock/` | Schema-accurate mock Storefront API for development and CI. **Never used in production** |

## Performance

- SSR and streaming; the hero image is `fetchpriority=high`, everything below the fold is lazy.
- Shopify CDN responsive images (`srcset`, `sizes`) through Hydrogen `<Image>`.
- three.js is **code-split** and only downloaded on capable devices after idle time.
- No UI framework dependency beyond React, Tailwind (zero runtime) and inline SVG icons.
- Third-party scripts load only with consent and only when configured.
- Root data (menus) is not revalidated on client navigation (`shouldRevalidate`).

## Error handling and resilience

- Loader failures in deferred sections fall back silently; critical failures render a branded error boundary inside the layout.
- Cart errors and warnings from Shopify (sold out, invalid code, expired cart) surface as toasts or inline messages.
- Unavailable cart lines block checkout with a clear message.
- Structured JSON logs (`app/lib/logger.ts`) with redaction. Optional external error reporting via `ERROR_WEBHOOK_URL`.

## Internationalization (extensibility)

The context sets `i18n: {language: 'EN', country: 'US'}` and every query uses `@inContext`. To add Shopify Markets:

1. Enable markets and currencies in Shopify admin.
2. Detect locale from a URL prefix (`/en-ca/…`) or subdomain in `app/lib/context.ts`.
3. Add a `($locale)` optional segment to routes, a country selector updating `cart.updateBuyerIdentity({countryCode})`, and `hreflang` alternate links in `seoMeta`.

`getVariantUrl` already preserves locale prefixes.

## Optional capabilities matrix

| Capability | Native in Shopify? | App needed? | Custom dev? | Permissions | Complexity |
| --- | --- | --- | --- | --- | --- |
| AI-assisted product discovery | Partially (Search & Discovery synonyms and boosts) | Optional (e.g. Searchanise, Algolia) | Medium (search UI exists) | App-specific | Medium |
| AI support chatbot | No (Shopify Inbox is human chat) | Yes (Gorgias, Tidio, etc.) | Low (script plus CSP) | Vendor | Low–Medium |
| Smart recommendations | **Yes** (`productRecommendations` RELATED/COMPLEMENTARY, implemented) | Optional (Search & Discovery tuning) | None | — | Low |
| Product comparison | No | Optional | Medium (client state and table) | None | Medium |
| Virtual try-on / AR | AR for 3D models: **yes** (Model3d media, implemented via `model-viewer`) | Try-on: yes | Low (AR) / High (try-on) | — | Medium–High |
| 3D customization | No | Yes (configurator apps) | High | App | High |
| Loyalty / points | No | Yes (Smile, LoyaltyLion, Yotpo) | Medium (account widgets) | App and Customer Account API | Medium |
| Gift registries | No | Yes | Medium | App | Medium |
| Subscriptions | Selling plans: **yes** (API) | Yes (Shopify Subscriptions app or similar) | Medium (selling-plan selector on PDP) | `unauthenticated_read_selling_plans` | Medium |
| Multi-currency | **Yes** (Markets) | No | Medium (locale routing, selector) | — | Medium |
| Multi-language | **Yes** (Translate & Adapt) | No | Medium (locale routing, UI strings) | — | Medium |
| B2B wholesale | **Shopify Plus** (B2B companies, catalogs) | No | Medium (company location selector, buyer identity) | Customer Account API B2B | Medium–High |
| Bulk ordering | Plus B2B quantity rules and price breaks (API fields exist) | Optional | Medium (quick-order grid) | — | Medium |
| Personalization (engraving) | Line item properties: **yes** (cart `attributes` supported) | Optional | Low–Medium (inputs on PDP) | — | Low |
| Live shopping | No | Yes | Low–Medium (embed) | Vendor | Medium |
| Cross-device wishlist | No | Yes (wishlist app) **or** customer metafields via Customer Account API | Medium | Customer Account API metafield write | Medium |
| Back-in-stock alerts | No | Yes (Klaviyo, Back in Stock) | Low (button on sold-out PDP) | App | Low |
| Reviews and ratings | No (reviews metafield standard only) | Yes (Judge.me, Okendo, Yotpo) | Low (ratings already read from metafields; widget mount `#product-reviews-widget`) | App | Low |
| Advanced merchandising | Partially (collections, sort, Search & Discovery) | Optional | Low | — | Low |

Implemented now: recommendations, AR/3D model viewing, device-local wishlist, cart line attributes, review ratings display (when a review app writes the metafields). Everything else is designed in but not built, so the launch scope stays small.

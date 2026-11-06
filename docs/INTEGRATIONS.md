# Integrations

All integrations are **optional and off by default**. Each is enabled by an environment variable, gated by visitor consent, and added to the CSP automatically (`app/lib/csp.ts`).

| Integration | Enable with | Consent | Notes |
| --- | --- | --- | --- |
| Shopify Analytics | Always on (Hydrogen) | Respects Customer Privacy API | Powers Shopify reports |
| Google Analytics 4 | `PUBLIC_GA4_MEASUREMENT_ID` | Analytics | Automatic page views disabled; `page_view`, `view_item`, `view_item_list`, `search`, `view_cart`, `add_to_cart` and `remove_from_cart` sent from Hydrogen events (no duplicates). Purchases are tracked by Shopify checkout: use the **Google & YouTube** app or Customer Events pixels |
| Google Tag Manager | `PUBLIC_GTM_CONTAINER_ID` | Analytics | Use GA4 *or* GTM-managed GA4, not both |
| Meta Pixel | `PUBLIC_META_PIXEL_ID` | Marketing | `PageView`, `ViewContent`, `Search`, `AddToCart`. Checkout and purchase come from the **Facebook & Instagram** app (Conversions API) |
| TikTok Pixel | `PUBLIC_TIKTOK_PIXEL_ID` | Marketing | Install the **TikTok** sales channel for checkout events |
| Pinterest Tag | `PUBLIC_PINTEREST_TAG_ID` | Marketing | Pinterest app for catalog and checkout |
| Klaviyo onsite | `PUBLIC_KLAVIYO_COMPANY_ID` | Marketing | Loads Klaviyo forms and tracking |
| Klaviyo newsletter | `NEWSLETTER_PROVIDER=klaviyo` + keys | Explicit form consent | Server-side subscription API |
| Shopify Email | `NEWSLETTER_PROVIDER=shopify` + Admin token | Explicit form consent | Subscribers get email marketing consent in Shopify |
| Abandoned cart | Shopify (Marketing → Automations) or Klaviyo | — | Works with Shopify checkout; no code needed |
| Google Merchant Center | **Google & YouTube** app | — | Product feed from Shopify; storefront JSON-LD matches displayed prices and availability |
| Meta Commerce | **Facebook & Instagram** app | — | Catalog sync |
| Reviews | Judge.me, Okendo, Yotpo, Shopify Product Reviews successors | — | Ratings read from `reviews.rating` and `reviews.rating_count` metafields. Mount full widgets in `#product-reviews-widget` on the PDP (add the vendor's origin to `csp.ts`) |
| Support chat | Gorgias, Tidio, Shopify Inbox, Zendesk | — | Add the vendor script in `root.tsx` with `useNonce()` and update `csp.ts`; prefer loading after interaction |
| Contact form | `CONTACT_FORM_WEBHOOK_URL` | — | JSON POST to your helpdesk, Zapier, Make or Slack |
| Error monitoring | `ERROR_WEBHOOK_URL` | — | Redacted error events |

## Adding a new third-party script safely

1. Add an env var and type it in `env.d.ts`.
2. Add its origins to `buildCspDirectives` only when the var is set.
3. Load it from `ThirdPartyAnalytics.tsx` (or a similar component) **after consent**, with the CSP nonce.
4. Map events from `useAnalytics().subscribe(...)`; never fire ecommerce events from multiple places.
5. Document it in the privacy and cookie policies.

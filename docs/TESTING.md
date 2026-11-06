# Testing strategy

## Automated

| Suite | Command | What it covers |
| --- | --- | --- |
| Unit (Vitest, 65 tests) | `npm test` | Price formatting and sale math, stock messaging, URL ↔ Shopify filter mapping and sort keys, query-string escaping, SEO meta and JSON-LD (including "no fabricated ratings"), webhook HMAC (cross-checked with Node crypto), rate limiter, same-origin checks, validation and sanitizing, metaobject mapping and URL safety, menu URL normalization, wishlist storage, theme CSS injection safety, CSP composition, mock variant encoding verified against Hydrogen's decoder |
| Integration (Playwright `request`) | `npm run test:e2e` | SSR of Shopify data, product JSON-LD accuracy (OutOfStock variants, real ratings), canonical tags, facets and URL filters, 404s, redirects, robots and sitemap, CSP and security headers, secrets not leaked, newsletter/contact/webhook/wishlist endpoint hardening, Customer Account OAuth + PKCE redirect, auth-required account routes |
| End-to-end (Playwright, desktop and Pixel 7) | `npm run test:e2e` | Browse → collection → product; variant selection; sold-out variants not purchasable; add to cart; quantity update; discount code valid and invalid; checkout handoff to `checkoutUrl`; remove line; buy now; cart persistence; predictive and full search; empty-search recommendations; filters and sort in URL; wishlist; skip link and Escape; mobile menu, sticky add-to-cart, filter drawer; no horizontal overflow |
| Accessibility (axe-core) | `npm run test:e2e` | WCAG 2.0/2.1/2.2 A and AA rules on home, collection, product, cart, search, contact and FAQ. Fails on serious or critical violations |
| Static | `npm run typecheck`, `npm run lint` | Strict TypeScript and generated GraphQL types; ESLint including jsx-a11y |
| Security | CI | `npm audit`, gitleaks, CodeQL |

E2E tests run a **production build** in MiniOxygen against the **mock Storefront API** (`mock/`), which validates every query against the official Storefront schema. That makes the suite deterministic and free of secrets, so it runs in CI.

```bash
npm run build
```

```bash
npm run test:e2e
```

## Manual (requires your Shopify development or staging store)

These can't be automated without your credentials and must be done before launch:

- [ ] **Complete a test purchase** with Shopify Payments test mode or the Bogus Gateway: add to cart → apply a real discount → checkout → shipping rate → taxes → pay with a test card → order confirmation page → order appears in admin.
- [ ] Order confirmation email and order status page links work.
- [ ] **Sign in** with Customer Accounts (email code) → `/account` → order history shows the test order → order detail → tracking after you mark it fulfilled with a tracking number.
- [ ] Address create, edit, delete and set default; profile name update; sign out.
- [ ] Inventory changes: set a variant to 0 in admin → within seconds the PDP shows Sold out and add to cart is disabled; an existing cart line shows "no longer available".
- [ ] Newsletter: subscriber appears in Customers with marketing consent; contact form reaches your helpdesk.
- [ ] Privacy banner appears in required regions; declining blocks GA, Meta and other pixels (check DevTools Network).
- [ ] Browsers: Safari iOS, Chrome Android, Chrome, Firefox, Edge, Safari macOS.
- [ ] Screen readers: VoiceOver (iOS/macOS) and NVDA (Windows) on home → PDP → cart → checkout handoff.
- [ ] Lighthouse (mobile) on home, collection and PDP; record real scores (don't estimate).
- [ ] Load: Oxygen scales automatically. Optionally run a modest k6 test against a preview URL and watch Storefront API throttling in the logs.
- [ ] Never use real customer payment data for testing.

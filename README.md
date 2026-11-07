# Shopify Headless Storefront (Hydrogen)

A premium, production-oriented custom storefront built on **Shopify Hydrogen** (React Router 7, React 18, TypeScript, Tailwind CSS v4), designed for **Shopify Oxygen** hosting.

Your Shopify store stays the source of truth for products, variants, inventory, collections, customers, discounts, orders, payments, shipping and taxes. This app renders that data and hands shoppers off to **Shopify's hosted checkout**. It has no separate commerce database and no custom payment handling.

> **Status:** feature-complete and tested against a **local mock Storefront API**. It has **not** yet been connected to your real store, because no credentials were supplied. To go live, follow [docs/SHOPIFY_SETUP.md](docs/SHOPIFY_SETUP.md), then work through [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).

## Features

| Area | What's included |
| --- | --- |
| Design system | Central brand config (`app/config/site.ts`): colors, fonts, logo, radius, announcements, menus, homepage section order. Light/dark themes. Accessible components: drawer, toasts, accordions, fields and buttons |
| Homepage | Cinematic hero with an optional lazy-loaded **three.js** 3D product view (static fallback for reduced motion, slow connections, low-end devices and no WebGL). Also: categories, featured collections, best sellers, new arrivals, trending, limited-time offer, promo banners, testimonials, top rated, brand story, trust badges, FAQ, social gallery and newsletter |
| Catalog | Collections, All products, New arrivals, Best sellers, Sale. Shopify Search & Discovery facets (availability, price, vendor, type, color swatches, size, metafields) and six sort orders, all stored in **shareable URLs** with cursor pagination |
| Product page | Media gallery (images, video, YouTube/Vimeo, 3D/AR models) with zoom. Variant swatches and sizes with sold-out handling, quantity, Add to cart, **Buy now**, wishlist and share. Specs and size-chart metafields, review-app ratings, related/complementary recommendations, sticky mobile add-to-cart |
| Search | Predictive search drawer (products, collections, pages, articles, suggestions). Full results page with facets, sort and empty-state recommendations |
| Cart | Slide-out drawer plus full page, optimistic updates, quantity changes and removal. Discount codes (Shopify validates them), gift cards, order notes, unavailable-item handling, recommendations and checkout handoff using Shopify's `checkoutUrl` |
| Accounts | **Customer Account API** (OAuth 2.0 + PKCE): dashboard, order history and search, order details with shipment tracking, profile, address book, logout |
| Content | Shopify **metaobjects** for hero slides, FAQs, testimonials, promo banners and social posts (with safe fallbacks). Shopify Pages, Policies and Blog |
| Pages | About, Contact (validated form forwarded to your helpdesk), FAQ, Shipping/Returns/Privacy/Terms (redirects to the Shopify policies), Cookie Policy, Accessibility Statement, Promotional Terms, Order tracking, Gift cards, Wishlist, Blog, 404 |
| SEO | SSR, canonical URLs, meta and Open Graph tags, Product/Offer/AggregateRating, Organization, WebSite, Breadcrumb, Article and FAQ JSON-LD (built only from displayed Shopify data), sitemap, robots.txt, noindex on filtered pages, Shopify URL redirects |
| Security | Strict CSP with nonces, security headers including HSTS, secure session cookies, same-origin checks, rate limiting, honeypots, input sanitizing, verified webhook HMAC, server-only secrets, redacted structured logs |
| Privacy & marketing | Shopify Customer Privacy banner. **Consent-gated** GA4, GTM, Meta, TikTok, Pinterest and Klaviyo, driven by Hydrogen's deduplicated analytics events. Newsletter signup records explicit consent in Shopify (Admin API) or Klaviyo |
| Quality | 65 unit tests and 35 Playwright tests (journeys, integration, axe WCAG 2.2 AA, mobile). CI, CodeQL, gitleaks, Dependabot, and Oxygen deployment with an approval gate |

## Quick start (no Shopify credentials needed)

Requires **Node.js 22 or 24**.

```bash
npm install
```

```bash
npm run dev:mock
```

Then open http://localhost:3000. `dev:mock` starts two processes:

1. **The mock Storefront API** (`mock/storefront-server.mjs`, port 4010). It executes real GraphQL against the **official Storefront API schema** bundled with Hydrogen, using a sample catalog and an in-memory cart. Use the discount code `WELCOME10` to test discounts.
2. **The Hydrogen dev server**, using `mock/mock.env`.

> **What's mocked:** all catalog data, images ("MOCK IMAGE"), content entries, the cart backend and a placeholder "Mock Shopify checkout" page. Customer login redirects to Shopify's real login, which can't complete without your store's credentials. Nothing mocked is used when `PUBLIC_STORE_DOMAIN` points at a real `*.myshopify.com` store.

## Connect your real store

```bash
npm run setup:env
```

`setup:env` creates `.env` from `.env.example` and generates a secure `SESSION_SECRET` without displaying it. It keeps any values you already have and lists the Shopify credentials that are still missing. It works on Windows, macOS and Linux.

```bash
npx shopify hydrogen link
```

```bash
npx shopify hydrogen env pull
```

```bash
npm run dev
```

Full step-by-step instructions, including required scopes and Customer Account API setup: **[docs/SHOPIFY_SETUP.md](docs/SHOPIFY_SETUP.md)**.

### Windows (PowerShell)

```powershell
cd C:\path\to\Shopify-ecomerce-webiste-
npm install
npm run setup:env
npx shopify hydrogen link
npx shopify hydrogen env pull
npm run dev
```

To preview without credentials, run `npm run dev:mock` instead of the last three commands.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `SESSION_SECRET environment variable is not set` (HTTP 500) | There's no `.env` file. A ZIP download or fresh clone never includes one, because `.env` holds secrets and is git-ignored. Run `npm run setup:env` |
| `PUBLIC_STORE_DOMAIN environment variable is not set` | Store credentials are missing. Run `npx shopify hydrogen link`, then `npx shopify hydrogen env pull`, or use `npm run dev:mock` |
| `'shopify' is not recognized…` | Dependencies aren't installed. Run `npm install` (the Shopify CLI is a project dependency) |
| `npm error Missing script: "install"` | Use `npm install`, not `npm run install` |
| `npm warn ERESOLVE overriding peer dependency` | Expected. React Router and esbuild are pinned to patched versions through `overrides` (see [docs/SECURITY.md](docs/SECURITY.md)) |
| `The envFile option is deprecated…` | Harmless. It comes from React Router's own Vite plugin (`@react-router/dev`) running on Vite 8, not from this project's config. It goes away when Hydrogen moves to a React Router release that has the fix |
| React Router "Future Flag" warnings | Informational previews of React Router v8 behavior. Hydrogen 2026.4 doesn't opt in yet, so leave them |
| Port 3000 in use | `npm run dev -- --port 3001`. To find what's using port 3000 on Windows: `Get-NetTCPConnection -LocalPort 3000 \| Select OwningProcess` |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server against the store in `.env` |
| `npm run dev:mock` | Mock API and dev server (no credentials) |
| `npm run mock:api` | Run only the mock Storefront API |
| `npm run build` | Production build (with GraphQL codegen) |
| `npm run preview` | Build and serve locally in MiniOxygen |
| `npm run preview:mock` | Serve an existing build against the mock API |
| `npm run codegen` | Regenerate Storefront/Customer Account API types and route types |
| `npm run typecheck` | TypeScript (strict) |
| `npm run lint` | ESLint (including jsx-a11y) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright E2E, integration and accessibility tests (builds are served automatically; run `npm run build` first) |
| `npm run check` | Typecheck, lint and unit tests |
| `npx shopify hydrogen deploy` | Deploy to Oxygen (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) |

## Project structure

```
app/
  config/site.ts        ← brand, theme, menus, homepage sections, features
  components/           ← UI library (ui/), layout/, home/, product/, account/
  routes/               ← file-based routes (React Router 7 flat routes)
  lib/                  ← filters, SEO, security, CSP, content, logger, admin.server
  graphql/customer-account/  ← Customer Account API documents
  content/legal.ts      ← legal page templates (review before launch)
  styles/tailwind.css   ← design tokens and global styles
mock/                   ← MOCK Storefront API and fixtures (dev/test only)
tests/unit, tests/e2e   ← Vitest and Playwright suites
docs/                   ← setup, architecture, deployment, security, ops
server.ts               ← Oxygen worker entry (security headers, redirects)
```

## Documentation

- [Shopify connection guide](docs/SHOPIFY_SETUP.md)
- [Architecture and optional capabilities](docs/ARCHITECTURE.md)
- [Content model (metaobjects)](docs/CONTENT_MODEL.md)
- [Integrations: analytics, email, reviews, chat](docs/INTEGRATIONS.md)
- [Deployment (Oxygen, domain, CI/CD, rollback)](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md) · [Compliance notes](docs/COMPLIANCE.md)
- [Testing strategy](docs/TESTING.md)
- [Maintenance guide](docs/MAINTENANCE.md)
- [Launch readiness checklist](docs/LAUNCH_CHECKLIST.md)

## Versions

Hydrogen **2026.4.8** (Storefront and Customer Account API **2026-04**). This is the latest release on the React Router line, generated by `@shopify/create-hydrogen` 5.1.0. React Router is pinned to **7.18.5** through `overrides` to pick up security fixes that Hydrogen's `~7.16` pin doesn't include. Hydrogen 2026.10 is a new framework-agnostic SDK; see [docs/MAINTENANCE.md](docs/MAINTENANCE.md) for upgrade guidance.

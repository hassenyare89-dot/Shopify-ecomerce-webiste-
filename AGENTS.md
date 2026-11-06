# Agent guide — Shopify Hydrogen storefront

Shopify Hydrogen 2026.4.x on React Router 7 (pinned 7.18.5), TypeScript strict, Tailwind v4, deployed to Oxygen.

## Rules
- Shopify is authoritative for commerce data. Never hardcode products/prices/inventory or compute authoritative totals; never build custom checkout or handle card data.
- Brand/config lives in `app/config/site.ts`; merchant-editable content in Shopify metaobjects (`docs/CONTENT_MODEL.md`).
- Every GraphQL document is a `#graphql` template literal; run `npm run codegen` after changing queries. Admin API documents are intentionally untagged.
- New third-party scripts must be consent-gated and added to `app/lib/csp.ts`.
- New endpoints: same-origin check, validation, rate limit, honeypot (`app/lib/security.ts`).
- Do not show fabricated reviews, testimonials, inventory, or countdowns.

## Commands
- `npm run dev:mock` — mock Storefront API + dev server (no credentials)
- `npm run check` — typecheck + lint + unit tests
- `npm run build && npm run test:e2e` — Playwright against prod build + mock API

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for Shopify API work. See `docs/` for setup, architecture, security and deployment.

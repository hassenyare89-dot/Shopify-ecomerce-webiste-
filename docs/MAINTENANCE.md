# Maintenance guide

## Everyday operations (no developer needed)

| Task | Where |
| --- | --- |
| Products, prices, inventory, media, variants | Shopify admin → Products |
| Collections and merchandising | Products → Collections (handles in `siteConfig.collections`) |
| Filters | Search & Discovery app |
| Navigation | Content → Menus (`main-menu`, `footer`) |
| Homepage hero, FAQs, testimonials, promos, social | Content → Metaobjects ([CONTENT_MODEL.md](CONTENT_MODEL.md)) |
| Pages, blog, policies | Online Store → Pages / Blog posts; Settings → Policies |
| Discounts, gift cards | Discounts; Products → Gift cards |
| Orders, returns, customers | Orders; Customers |
| Shipping, taxes, markets, payments, checkout | Settings |
| Redirects | Content → Menus → URL Redirects |
| SEO title and description per product/collection/page | "Search engine listing" section on each resource |

## Developer tasks

| Task | How |
| --- | --- |
| Rebrand (colors, fonts, logo, copy) | `app/config/site.ts` → PR → preview → merge |
| Reorder or remove homepage sections | `siteConfig.homeSections` |
| New announcement messages | `siteConfig.announcements` |
| After changing GraphQL queries | `npm run codegen` (runs automatically in `dev` and `build`) |
| Add a page | `app/routes/<name>.tsx` (flat routes) |

## Updating dependencies

Monthly, or when Dependabot opens PRs:

```bash
npx shopify hydrogen upgrade
```

```bash
npm run check && npm run build && npm run test:e2e
```

- Shopify releases a Storefront API version quarterly; each is supported for **at least 12 months**. Hydrogen's version (`2026.4.x`) maps to API `2026-04`. Plan an upgrade at least every 9 months (before April 2027 for this build).
- **React Router override:** `package.json` pins React Router 7.18.5 for security fixes. When Hydrogen's peer range allows a patched version, remove `overrides` and align versions.
- **Hydrogen 2026.10+** is a new framework-agnostic SDK (`@shopify/hydrogen/react`, `/vue`). The 2026.4 React Router line remains maintained. Migration is a planned project: follow Shopify's migration guide, run the full test suite, and verify on a preview deployment.
- Keep `@shopify/cli` and `@shopify/mini-oxygen` on the versions the Hydrogen upgrade command suggests.

## Monitoring routine

- Weekly: Oxygen logs for `level: error`, failed newsletter/contact events, 404 spikes (add redirects).
- Monthly: Lighthouse and Core Web Vitals (Search Console), `npm audit`, review GitHub security alerts.
- Quarterly: rotate secrets you can rotate, review staff and app access, re-run the accessibility checklist, review legal pages against actual practices.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Product or collection missing | Not published to the Hydrogen channel |
| Empty facets | Filters not configured in Search & Discovery |
| Content edits not visible | `CacheLong` (up to about 1h); redeploy to refresh |
| Login fails | Callback, origin or logout URIs not set for the current domain |
| Newsletter 503 | `NEWSLETTER_PROVIDER` credentials missing |
| CSP errors in console | New third-party origin not added to `app/lib/csp.ts` |
| "Only N left" not showing | `showInventoryCount` off, or inventory scope missing |

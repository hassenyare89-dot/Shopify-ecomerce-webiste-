# Launch readiness checklist

Complete it on an Oxygen **preview** deployment connected to the production store, then again on production right after the domain switch.

## Store connection
- [ ] Hydrogen channel installed; all sellable products and collections published to it
- [ ] Environment variables set for preview and production (secrets marked secret); no mock values (`127.0.0.1`) anywhere
- [ ] Storefront API scopes limited to what's needed
- [ ] Customer Account API callback, origin and logout URIs set for the production domain
- [ ] Menus `main-menu` and `footer` created; merchandising collections created (`new-arrivals`, `best-sellers`, `sale`, `trending`, `frontpage`) or handles updated
- [ ] Search & Discovery filters configured (availability, price, vendor, type, color, size)
- [ ] Metaobject definitions created with Storefront access; real content entered (or sections removed)

## Brand and content
- [ ] `siteConfig`: name, tagline, description, logo, colors (AA contrast checked in both themes), fonts, contact details, social links, business name
- [ ] Announcements, trust badges and delivery notes are truthful
- [ ] Limited-time offer disabled or configured with a real end date and terms
- [ ] Welcome discount advertised only if the code exists in Shopify
- [ ] Product images have alt text; descriptions accurate; compare-at prices genuine
- [ ] Favicon (`app/assets/favicon.svg`) replaced

## Legal and privacy
- [ ] Shopify policies written (privacy, terms, refund, shipping)
- [ ] Cookie policy, accessibility statement and promotional terms reviewed by counsel; `siteConfig.legal.templatesReviewed = true`
- [ ] Privacy banner configured and enabled (`PUBLIC_PRIVACY_BANNER=true`); opt-out tested
- [ ] Analytics and pixels configured and verified to load only after consent

## Commerce
- [ ] Payments configured; test-mode purchase completed end to end; test mode **disabled** afterwards
- [ ] Shipping zones and rates, taxes, markets verified at checkout
- [ ] Discount codes tested (valid, invalid, expired)
- [ ] Gift cards (if offered) purchasable and redeemable
- [ ] Order confirmation and shipping notification emails customized
- [ ] Inventory behavior verified (sold-out variants can't be added)
- [ ] Customer login, order history, tracking and addresses verified with a real test account

## Technical
- [ ] `npm run check`, `npm run build` and `npm run test:e2e` green on `main`; CI required on PRs
- [ ] Domain connected, HTTPS valid, `www` ↔ apex redirect chosen, HSTS present
- [ ] Legacy Online Store URLs redirected (Content → URL Redirects)
- [ ] `robots.txt` and `/sitemap.xml` reachable; sitemap submitted in Google Search Console and Bing
- [ ] Spot-check JSON-LD with Google's Rich Results Test (product, breadcrumb, organization)
- [ ] Lighthouse mobile scores recorded for home, collection and PDP
- [ ] No console errors or CSP violations on key pages in production
- [ ] Newsletter and contact endpoints configured and tested; error webhook receiving test events
- [ ] Logs reviewed; uptime monitor in place
- [ ] Rollback procedure understood (DEPLOYMENT.md §6); previous deployment identified
- [ ] Staff 2FA enforced; GitHub branch protection and production approval enabled

## Go-live
- [ ] Production deployment approved and live
- [ ] Smoke test: home → search → product → add to cart → checkout page loads → account login
- [ ] Monitor logs, orders and analytics closely for the first 48 hours

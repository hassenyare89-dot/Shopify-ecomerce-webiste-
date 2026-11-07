# Security

This document describes the security controls in place and the responsibilities that remain with the store owner. No system can be guaranteed unhackable; these controls reduce risk in line with OWASP guidance.

## Trust boundaries

- **Payments** happen entirely on Shopify's hosted checkout (PCI DSS Level 1). This app never sees, stores, logs or transmits card data.
- **Authentication** uses Shopify's Customer Account API (OAuth 2.0 Authorization Code with PKCE, nonce and state validation, all handled by Hydrogen). There is no custom password storage.
- **Order and customer data** is read only through the authenticated Customer Account API, scoped to the signed-in customer. Order detail IDs are validated as Shopify order GIDs, and Shopify enforces ownership.

## Controls in this codebase

| Control | Implementation |
| --- | --- |
| Content-Security-Policy | Hydrogen nonce-based CSP plus `app/lib/csp.ts`. `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action` limited to Shopify, `upgrade-insecure-requests`. Third-party origins only when configured |
| Security headers | `app/lib/security.ts`: HSTS (prod), nosniff, `X-Frame-Options: DENY`, strict Referrer-Policy, restrictive Permissions-Policy, COOP |
| Secrets | Server-only env vars; never imported in client code. The public Storefront token is used only by Shopify's Customer Privacy script, which is its documented use. `.env` is git-ignored; gitleaks runs in CI |
| Sessions | Signed cookie (`SESSION_SECRET`), HttpOnly, Secure (HTTPS), SameSite=Lax, 30-day max age |
| CSRF | SameSite=Lax cookies; custom POST endpoints (`/api/newsletter`, `/api/contact`) also require a same-origin `Origin`/`Sec-Fetch-Site`. Cart mutations are Shopify cart operations scoped to the shopper's own cart cookie |
| Input validation | Email regex and length limits, control-character stripping, length caps, enum validation, injection-safe Storefront query strings, discount and gift card length caps, URL validation for CMS links (no `javascript:`/`data:`) |
| Output encoding | React escapes all text. `dangerouslySetInnerHTML` is used only for Shopify-authored rich text (descriptions, pages, policies, articles) and for JSON-LD, which is serialized with `<` escaped |
| Rate limiting | Fixed-window per-IP limiter on newsletter (5/10 min) and contact (3/10 min). **Per-isolate, best-effort.** Add edge/WAF rules for strong guarantees |
| Bot protection | Honeypot fields; bots receive a fake success response. Add Cloudflare Turnstile or hCaptcha if abuse appears (requires a CSP update) |
| Webhooks | HMAC-SHA256 verification over the raw body with constant-time comparison; 1 MB limit; only identifiers are logged |
| Open redirects | Buy-now redirects only to Shopify `checkoutUrl` (HTTPS). Hydrogen restricts login `return_to` to the same origin. `safeRedirectPath` helper is available |
| Logging | Structured JSON; keys like token, secret, email, phone, address and cookie are redacted; errors reduced to name, message and short stack |
| Dependencies | Lockfile; Dependabot; `npm audit` in CI; React Router pinned to a patched version (see below); CodeQL |
| Least privilege | Storefront scopes limited to what's used; the Admin token only needs `read_customers` and `write_customers` and is only used by the newsletter action |

### Dependency note

- **React Router:** Hydrogen 2026.4.8 declares `react-router ~7.16.0`, which is affected by several high-severity advisories (GHSA-337j-9hxr-rhxg, GHSA-chx6-hx7r-mcp5, GHSA-wrjc-x8rr-h8h6 and others). `package.json` `overrides` pins **7.18.5**, and the full test suite passes on it. Remove the override once Hydrogen's peer range includes a patched version.
- **esbuild:** the Shopify CLI and Vite pin esbuild 0.27.x, which allows arbitrary file reads from the dev server **on Windows** (GHSA-g7r4-m6w7-qqqr). `overrides` pins **^0.28.2**, and build, unit and E2E tests pass on it.
- **`npm audit --omit=dev`: 0 vulnerabilities.**
- **Full `npm audit`:** about 45 advisories remain, all in **development-only tooling** that never ships to Oxygen:
  - GraphQL codegen (`@graphql-codegen/*`, `@graphql-tools/*`), via `@shopify/hydrogen-codegen` and `@shopify/cli`;
  - the local MiniOxygen runtime (`miniflare`, `undici`, `ws`, `body-parser`, `zod`), via `@shopify/mini-oxygen`;
  - the Vitest UI server (`vitest`, `tinypool`). This project doesn't run the UI server.

  npm's suggested "fixes" for these are either **downgrades** (for example `@shopify/mini-oxygen@0.0.5`) or major versions that Hydrogen 2026.4 doesn't support. Don't run `npm audit fix --force`. They resolve as Shopify updates its CLI and Hydrogen toolchain; re-check with each `npx shopify hydrogen upgrade`.

## Administration access

- All commerce administration stays in **Shopify admin**. Enforce 2-step authentication for all staff, use least-privilege staff permissions, and review collaborator access.
- The storefront has no admin UI of its own; content is managed through metaobjects in Shopify admin.
- GitHub: branch protection, required reviews, an approval gate on the `production` environment, and push protection for secrets.

## Credential rotation

See [SHOPIFY_SETUP.md → Credential rotation](SHOPIFY_SETUP.md#credential-rotation).

## Reporting vulnerabilities

Publish a `security.txt` or an email address for vulnerability reports, and triage them within a defined SLA.

## Security review checklist for changes

- [ ] No secret, token or PII added to client code, logs or the repository
- [ ] New third-party script: consent-gated, added to `csp.ts`, documented
- [ ] New form or endpoint: same-origin check, validation, rate limit, honeypot
- [ ] Rendering of HTML: only Shopify-authored rich text
- [ ] Redirects: only same-origin paths or Shopify checkout

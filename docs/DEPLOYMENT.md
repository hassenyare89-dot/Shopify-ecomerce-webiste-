# Deployment guide (Shopify Oxygen)

> Never deploy to production, or change the live store, without explicit approval. Use preview deployments first.

## Environments

| Environment | Source | URL | Store data |
| --- | --- | --- | --- |
| Local | `npm run dev` / `npm run dev:mock` | localhost:3000 | Your store (or mock) |
| Preview | Any non-`main` branch or PR | `*.myshopify.dev` (Oxygen preview) | Your store, preview env vars |
| Production | `main` (after approval) | `YOURDOMAIN.com` | Your store, production env vars |

Oxygen maps branches to environments in Hydrogen channel → storefront → **Storefront settings → Environments and variables**.

## 1. GitHub repository

1. Push this repository to GitHub. Branch protection on `main`: require PR reviews and require the **CI** and **Secret scan** checks.
2. Enable Dependabot alerts, secret scanning with push protection, and CodeQL (workflows included).
3. Create GitHub **environments** `preview` and `production`. Add **required reviewers** to `production`.

## 2. Connect Oxygen

**Option A (recommended): connect from Shopify admin.** Hydrogen channel → storefront → Storefront settings → **Connect to GitHub**. Shopify commits its own `oxygen-deployment-<id>.yml` workflow and secret. If you choose this, delete `.github/workflows/oxygen-deployment.yml` so you don't deploy twice.

**Option B: use the included workflow.**

1. Hydrogen channel → storefront → Storefront settings → **Deployments → Create deployment token**.
2. GitHub → Settings → Secrets → Actions: add `OXYGEN_DEPLOYMENT_TOKEN`.
3. GitHub → Settings → Variables: add `OXYGEN_ENABLED=true`.
4. Pushes to `main` deploy to production after a reviewer approves the `production` environment. Other branches and PRs create previews.

Manual deploy from a trusted machine:

```bash
npx shopify hydrogen deploy
```

## 3. Environment variables (Oxygen)

Set them in Storefront settings → **Environments and variables**, per environment. Mark every non-`PUBLIC_` value as **Secret**. Required and optional variables are documented in [`.env.example`](../.env.example). The storefront tokens, `SESSION_SECRET`, Customer Account values and `SHOP_ID` are provisioned automatically by the Hydrogen channel.

Production values to review: `PUBLIC_PRIVACY_BANNER=true`, analytics IDs, `NEWSLETTER_PROVIDER` with its token, `CONTACT_FORM_WEBHOOK_URL`, `ERROR_WEBHOOK_URL`.

## 4. Custom domain, DNS and HTTPS

1. Shopify admin → **Settings → Domains → Connect existing domain** → enter `YOURDOMAIN.com`.
2. At your DNS provider:
   - apex `@` → **A** record to Shopify's IP shown in admin (currently `23.227.38.65`; always use the value shown);
   - `www` → **CNAME** `shops.myshopify.com`.
3. Hydrogen channel → storefront → **Domains**: assign the domain to the **production** environment. Shopify provisions the TLS certificate automatically, and HTTPS is enforced. The app also sends HSTS.
4. Choose the primary domain. If the Online Store theme remains enabled, decide whether it should redirect to the headless storefront (Online Store → Preferences → password-protect the theme, or uninstall Online Store after launch).
5. Update Customer Account API callback, origin and logout URIs to the production domain (see SHOPIFY_SETUP.md §5).
6. Set `PUBLIC_CHECKOUT_DOMAIN` if you use a checkout subdomain.

## 5. Monitoring

- **Logs:** Hydrogen channel → storefront → **Logs** (structured JSON from `app/lib/logger.ts`). Configure a log drain to your observability tool if your plan supports it.
- **Errors:** set `ERROR_WEBHOOK_URL` to an HTTPS intake (Sentry, Datadog or a serverless function) to receive redacted error events.
- **Uptime:** add an external monitor for `/`, a product URL and `/robots.txt`.
- **Performance:** Oxygen analytics, plus Lighthouse CI or PageSpeed Insights for Core Web Vitals; Search Console CWV report after launch.
- **Commerce:** Shopify Analytics. Hydrogen sends Shopify analytics events automatically after consent.

## 6. Rollback

Every deployment is immutable. To roll back: Hydrogen channel → storefront → **Deployments** → select the last good deployment → **Make live** (or redeploy that commit). Then revert the bad commit on `main` so the next deploy doesn't reintroduce it. No database migrations exist, so rollback is instant and safe.

## 7. Production build locally

```bash
npm run build
```

```bash
npm run preview
```

## 8. Pre-launch

Complete [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) on a preview deployment connected to the production store before switching the domain.

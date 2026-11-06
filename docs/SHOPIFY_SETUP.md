# Shopify connection guide

This connects the storefront to your existing store (`YOUR-STORE.myshopify.com`) without changing your live Online Store theme. Work in a **development or staging environment first**.

> Nothing in this repository writes to your store except two optional features: newsletter consent (creates or updates customers) and the contact form (forwards to your own endpoint). Both are disabled until you configure them.

## 1. Prerequisites

- Shopify plan that includes the **Hydrogen sales channel** (Basic, Shopify, Advanced, Plus). Oxygen hosting is included on those plans; check current Shopify plan terms.
- Store owner or a staff account with permission to manage apps and sales channels.
- Node.js 22 or 24 and a GitHub account.

## 2. Install the Hydrogen sales channel

1. Shopify admin → **Settings → Apps and sales channels → Shopify App Store** → install **Hydrogen**.
2. In the Hydrogen channel, select **Create storefront**. Choose "Connect an existing repository" or set up later with the CLI.
3. **Publish products and collections to the Hydrogen channel.** Each product's Publishing section must include the Hydrogen storefront. Unpublished products are invisible to the Storefront API. This is the most common reason a page looks empty.

> If you host somewhere other than Oxygen, use the **Headless** channel instead. It provides the same tokens.

## 3. Link the project and pull environment variables

```bash
npx shopify hydrogen link
```

```bash
npx shopify hydrogen env pull
```

`env pull` writes `.env` with `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOP_ID` and `SESSION_SECRET`. `.env` is git-ignored. Never commit it.

To configure manually instead, copy `.env.example` and fill values from the Hydrogen channel → storefront → **Storefront settings → Storefront API** and **Customer Account API**.

## 4. Storefront API access scopes

In the Hydrogen channel → storefront → Storefront API permissions, enable only what's used:

| Scope | Why |
| --- | --- |
| `unauthenticated_read_product_listings` | Products, collections, search |
| `unauthenticated_read_product_tags` | Product tag filters |
| `unauthenticated_read_product_inventory` | **Optional.** Only if `siteConfig.product.showInventoryCount = true` ("Only N left") |
| `unauthenticated_read_content` | Pages, blogs, articles, menus |
| `unauthenticated_read_metaobjects` | Homepage content, FAQs, testimonials |
| `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts` | Cart API |
| `unauthenticated_read_selling_plans` | Only if you sell subscriptions |

The private token is used server-side only. The public token is used only by Shopify's Customer Privacy API in the browser, which is its documented use.

## 5. Customer accounts (Customer Account API)

1. Shopify admin → **Settings → Customer accounts** → choose **Customer accounts** (the new passwordless accounts, not legacy).
2. Hydrogen channel → storefront → **Storefront settings → Customer Account API → Application setup**:
   - **Callback URI(s):** `https://YOURDOMAIN.com/account/authorize` (plus each preview/staging domain).
   - **JavaScript origin(s):** `https://YOURDOMAIN.com`
   - **Logout URI:** `https://YOURDOMAIN.com`
3. Local development needs a public HTTPS domain, because Shopify won't redirect to `localhost`. Run `npx shopify hydrogen dev --customer-account-push` (tunnel), or use an Oxygen preview deployment.

## 6. Menus, policies and content

| What | Where in Shopify admin | Used by |
| --- | --- | --- |
| Header menu | Content → Menus → handle `main-menu` | Header and mobile menu. Two levels become dropdowns. If missing, `siteConfig.menus.fallbackHeader` is used |
| Footer menu | Content → Menus → handle `footer` | Extra footer links |
| Policies | Settings → Policies | `/policies/*` and footer links |
| Pages | Online Store → Pages (`about`, `cookie-policy`, `accessibility`, `promotional-terms` override the bundled templates) | Editorial and legal pages |
| Blog | Online Store → Blog posts (blog handle `journal` is linked by default) | `/blogs` |
| Metaobjects | Content → Metaobjects | Homepage content. See [CONTENT_MODEL.md](CONTENT_MODEL.md) |
| Brand logo | Settings → Brand | Header logo when `siteConfig.logo.src` is null |
| URL redirects | Content → Menus → URL Redirects | Applied automatically on 404 |
| Filters | **Search & Discovery** app → Filters | Collection and search facets |

### Merchandising collections

Create these collections, or change the handles in `siteConfig.collections`:

| Handle | Page | If missing |
| --- | --- | --- |
| `new-arrivals` | `/new-arrivals` | Falls back to products sorted newest first |
| `best-sellers` | `/best-sellers` | Falls back to Shopify's best-selling sort |
| `sale` | `/sale`, limited offer | Shows an honest empty state. Tip: make it an automated collection with "Compare-at price is not empty" |
| `trending` | Homepage rail | Section is hidden |
| `frontpage` | Featured collection section | Section is hidden |

## 7. Optional: newsletter via Shopify (Admin API)

1. Shopify admin → **Settings → Apps and sales channels → Develop apps** → **Create an app** (name it, for example, "Storefront newsletter").
2. **Admin API scopes:** `read_customers` and `write_customers` only.
3. Install the app, reveal the **Admin API access token** once and store it as `PRIVATE_ADMIN_API_TOKEN` (**secret**). Set `SHOPIFY_STORE_MYSHOPIFY_DOMAIN` and `NEWSLETTER_PROVIDER=shopify`.
4. Subscribers appear in Customers with email marketing consent "Subscribed", ready for **Shopify Email** or a synced Klaviyo account.

Using Klaviyo directly instead: set `NEWSLETTER_PROVIDER=klaviyo`, `KLAVIYO_PRIVATE_API_KEY` (scopes `subscriptions:write`, `lists:write`) and `KLAVIYO_LIST_ID`.

## 8. Optional: webhooks

Storefront pages fetch live data with short cache lifetimes, so webhooks aren't needed for product updates to appear. If an integration must react to events:

1. Use the same custom app (or another one). Register webhooks with the Admin API, or in Settings → Notifications → Webhooks, pointing at `https://YOURDOMAIN.com/webhooks/shopify`.
2. Set `SHOPIFY_WEBHOOK_SECRET` to the signing secret (**secret**). Requests with invalid HMAC signatures are rejected with 401.

## 9. Checkout and payments

Checkout is Shopify's hosted checkout. Configure it in Shopify admin; no code changes are needed.

- **Settings → Payments:** Shopify Payments, Shop Pay, Apple Pay, Google Pay, PayPal and others. Available methods depend on region and plan; the storefront footer shows the methods Shopify reports for your store.
- **Settings → Shipping and delivery**, **Taxes and duties**, **Markets** (international), **Checkout** (branding).
- **Checkout domain:** after you connect a custom domain, set `PUBLIC_CHECKOUT_DOMAIN` (for example `checkout.yourdomain.com` or your primary domain).
- **Test purchases:** enable Shopify Payments **test mode** (or the Bogus Gateway on development stores) and use Shopify's documented test cards. Never use real card data for testing.

## 10. Verify

```bash
npm run dev
```

Then check:

- [ ] The homepage shows your products; collections and product pages load.
- [ ] Add to cart, then Checkout, opens Shopify checkout with the same items.
- [ ] `/account` redirects to Shopify login, and after login returns to your account page.
- [ ] Menus, policies and FAQs show your content.

## Credential rotation

| Credential | How to rotate |
| --- | --- |
| Storefront API tokens | Hydrogen channel → Storefront API → regenerate, then update Oxygen env vars and redeploy |
| Admin API token | Custom app → API credentials → uninstall and reinstall the app (issues a new token), update `PRIVATE_ADMIN_API_TOKEN` |
| Webhook secret | Rotate the app secret, update `SHOPIFY_WEBHOOK_SECRET` |
| `SESSION_SECRET` | Generate a new value (`openssl rand -hex 32`). This signs out all customers. Carts are unaffected because they use a separate `cart` cookie |
| Klaviyo / contact webhook | Rotate in the provider and update the env var |

Rotate immediately if a secret is exposed, and at least annually.

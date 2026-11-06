# U.S. ecommerce compliance notes

> **Not legal advice.** The storefront provides technical capabilities and starter templates. Validate everything against your actual business practices and the laws that apply to you, with qualified counsel.

## Legal pages

| Page | Source | Action required |
| --- | --- | --- |
| Privacy Policy | Shopify → Settings → Policies (`/policies/privacy-policy`) | Generate or write it; disclose data collected, purposes, third parties (Shopify, analytics, ad pixels, Klaviyo, helpdesk), state privacy rights, retention and contact |
| Terms of Service | Shopify Policies | Write it |
| Refund / Return Policy | Shopify Policies (`/returns` redirects here) | Must match your real return window and process |
| Shipping Policy | Shopify Policies (`/shipping` redirects here) | Must match your configured rates and delivery promises |
| Cookie Policy | `/cookie-policy`: template in `app/content/legal.ts`, or a Shopify page `cookie-policy` | Review, list your actual vendors |
| Accessibility Statement | `/accessibility`: template or Shopify page `accessibility` | Review after an accessibility audit |
| Promotional Terms | `/promotional-terms`: template or Shopify page | Review for each campaign |
| Contact information | `/contact`, footer, `siteConfig.contact` | Provide a real support email or phone and, where required, a physical address |

Template pages display a visible "Template — pending review" notice until you set `siteConfig.legal.templatesReviewed = true`.

## Privacy and consent

- **Consent banner:** Shopify's Customer Privacy banner (`PUBLIC_PRIVACY_BANNER=true`). Configure regions, wording and "Do not sell or share" handling in Shopify admin → Settings → Customer privacy. Shopify supports GPC signals and U.S. state opt-out requirements; confirm your configuration.
- **Tracking gate:** GA4/GTM load only after *analytics* consent; Meta, TikTok, Pinterest and Klaviyo only after *marketing* consent. Hydrogen's Shopify analytics also respects consent.
- **Marketing consent:** the newsletter checkbox is never pre-checked; submission records `SUBSCRIBED` with single opt-in in Shopify. Consider double opt-in in Klaviyo or Shopify Email.
- **Privacy requests (access/delete):** handled in Shopify admin (customer data requests and erasure), plus each third-party vendor. The profile page directs customers to contact you.
- **Data minimization:** the contact form forwards only what's submitted to your endpoint; the storefront stores nothing. Logs redact PII.
- **Retention:** define retention for contact-form destinations, analytics and email platforms.

## Consumer protection

- Prices, compare-at prices, availability and discounts come straight from Shopify; "Save X%" rounds **down**.
- Only set a compare-at price that reflects a genuine former price (FTC guidance and state laws).
- Countdown timers show only for a configured real end date, and hide automatically after it passes.
- Testimonials and ratings display only real data (metaobjects or review-app metafields).
- Shipping and taxes are stated as "calculated at checkout"; Shopify checkout shows the final totals before payment.
- Order confirmations and status pages are Shopify's.

## Accessibility (WCAG 2.2 AA target)

Implemented: semantic landmarks, skip link, keyboard-operable menus, drawers and dialogs (focus trap and restore, Escape), visible focus, labelled forms with described errors, `aria-live` for cart and status updates, reduced-motion support (including disabling the 3D hero and carousels), pausable announcement bar, color tokens chosen for AA contrast, alt text from Shopify, 44px touch targets on key controls. Automated axe checks run in CI on key pages.

Still required: a manual audit with screen readers (VoiceOver and NVDA), checks of merchant content (alt text in Shopify, color contrast of uploaded banners), and an accessibility statement that reflects the results.

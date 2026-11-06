/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  /**
   * Storefront-specific environment variables (in addition to Hydrogen's).
   * See .env.example for documentation. Variables prefixed PUBLIC_ may be
   * exposed to the browser; everything else is server-only.
   */
  interface Env {
    /** Admin API access token (custom app). Server-only. Optional: newsletter. */
    PRIVATE_ADMIN_API_TOKEN?: string;
    /** Admin API version, e.g. 2026-04. */
    ADMIN_API_VERSION?: string;
    /** The store's permanent *.myshopify.com domain, for Admin API calls. */
    SHOPIFY_STORE_MYSHOPIFY_DOMAIN?: string;
    /** Webhook signing secret (custom app API secret). Server-only. */
    SHOPIFY_WEBHOOK_SECRET?: string;
    /** 'shopify' | 'klaviyo' | 'none'. */
    NEWSLETTER_PROVIDER?: string;
    /** Klaviyo private API key (server-only) and list ID for newsletter. */
    KLAVIYO_PRIVATE_API_KEY?: string;
    KLAVIYO_LIST_ID?: string;
    /** HTTPS endpoint that receives contact form submissions (helpdesk, Zapier…). */
    CONTACT_FORM_WEBHOOK_URL?: string;
    /** Optional HTTPS endpoint for error reports (Sentry/Datadog intake etc.). */
    ERROR_WEBHOOK_URL?: string;
    PUBLIC_GA4_MEASUREMENT_ID?: string;
    PUBLIC_GTM_CONTAINER_ID?: string;
    PUBLIC_META_PIXEL_ID?: string;
    PUBLIC_TIKTOK_PIXEL_ID?: string;
    PUBLIC_PINTEREST_TAG_ID?: string;
    PUBLIC_KLAVIYO_COMPANY_ID?: string;
    /** 'true' to show Shopify's cookie/privacy banner (configure in admin). */
    PUBLIC_PRIVACY_BANNER?: string;
  }
}

/**
 * Content-Security-Policy directives, extended on top of Hydrogen's secure
 * defaults (`createContentSecurityPolicy`). Third-party origins are only
 * allowed when the corresponding integration is configured via env.
 */
import {siteConfig} from '~/config/site';

export interface CspEnv {
  PUBLIC_STORE_DOMAIN?: string;
  PUBLIC_GA4_MEASUREMENT_ID?: string;
  PUBLIC_GTM_CONTAINER_ID?: string;
  PUBLIC_META_PIXEL_ID?: string;
  PUBLIC_TIKTOK_PIXEL_ID?: string;
  PUBLIC_PINTEREST_TAG_ID?: string;
  PUBLIC_KLAVIYO_COMPANY_ID?: string;
}

type Directives = Record<string, string[] | boolean>;

/** True when running against the local mock Storefront API (dev/test only). */
export function isLocalMockStore(storeDomain?: string) {
  return Boolean(storeDomain && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(storeDomain));
}

export function buildCspDirectives(
  env: CspEnv,
  {isProduction = true}: {isProduction?: boolean} = {},
): Directives {
  const scriptSrc = ["'self'", 'https://cdn.shopify.com'];
  const connectSrc: string[] = ['https://*.shopify.com', 'https://shop.app'];
  const imgSrc = ["'self'", 'data:', 'blob:', 'https://cdn.shopify.com', 'https://*.shopify.com'];
  const styleSrc: string[] = [];
  const fontSrc = ["'self'", 'https://cdn.shopify.com', 'data:'];
  const frameSrc = ["'self'", 'https://shop.app', 'https://*.shopify.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'];
  const mediaSrc = ["'self'", 'https://cdn.shopify.com', 'https://*.shopify.com', 'blob:'];

  if (siteConfig.theme.fonts.googleFontsHref) {
    styleSrc.push('https://fonts.googleapis.com');
    fontSrc.push('https://fonts.gstatic.com');
  }

  // 3D model viewer (Hydrogen <ModelViewer/> loads @google/model-viewer).
  scriptSrc.push('https://unpkg.com');

  if (env.PUBLIC_GA4_MEASUREMENT_ID || env.PUBLIC_GTM_CONTAINER_ID) {
    scriptSrc.push('https://www.googletagmanager.com');
    connectSrc.push(
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://www.googletagmanager.com',
    );
    imgSrc.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
    frameSrc.push('https://www.googletagmanager.com');
  }
  if (env.PUBLIC_META_PIXEL_ID) {
    scriptSrc.push('https://connect.facebook.net');
    connectSrc.push('https://www.facebook.com', 'https://connect.facebook.net');
    imgSrc.push('https://www.facebook.com');
  }
  if (env.PUBLIC_TIKTOK_PIXEL_ID) {
    scriptSrc.push('https://analytics.tiktok.com');
    connectSrc.push('https://analytics.tiktok.com');
  }
  if (env.PUBLIC_PINTEREST_TAG_ID) {
    scriptSrc.push('https://s.pinimg.com');
    connectSrc.push('https://ct.pinterest.com');
    imgSrc.push('https://ct.pinterest.com');
  }
  if (env.PUBLIC_KLAVIYO_COMPANY_ID) {
    scriptSrc.push('https://static.klaviyo.com', 'https://static-tracking.klaviyo.com');
    connectSrc.push('https://a.klaviyo.com', 'https://static-forms.klaviyo.com');
    styleSrc.push('https://static-forms.klaviyo.com');
    fontSrc.push('https://static-forms.klaviyo.com');
    imgSrc.push('https://static.klaviyo.com');
  }

  if (isLocalMockStore(env.PUBLIC_STORE_DOMAIN)) {
    const origin = env.PUBLIC_STORE_DOMAIN!.replace(/\/$/, '');
    imgSrc.push(origin);
    connectSrc.push(origin);
    mediaSrc.push(origin);
  }

  return {
    scriptSrc,
    connectSrc,
    imgSrc,
    styleSrc,
    fontSrc,
    frameSrc,
    mediaSrc,
    objectSrc: ["'none'"],
    formAction: ["'self'", 'https://*.shopify.com', 'https://shop.app'],
    ...(isProduction && !isLocalMockStore(env.PUBLIC_STORE_DOMAIN)
      ? {upgradeInsecureRequests: true}
      : {}),
  };
}

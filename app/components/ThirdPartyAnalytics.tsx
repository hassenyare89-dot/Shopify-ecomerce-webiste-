/**
 * Consent-aware third-party analytics/advertising pixels.
 *
 * - Scripts are only injected when an ID is configured AND the visitor has
 *   granted the relevant consent through Shopify's Customer Privacy API
 *   (analytics → GA4/GTM; marketing → Meta, TikTok, Pinterest, Klaviyo).
 * - Ecommerce events come from Hydrogen's analytics bus (which already
 *   de-duplicates and respects consent), so each event is sent exactly once.
 * - GA4 automatic page views are disabled; `page_viewed` is forwarded instead
 *   to avoid double-counting on client-side navigation.
 */
import {useEffect, useRef, useState} from 'react';
import {useAnalytics, useNonce} from '@shopify/hydrogen';

export interface AnalyticsIds {
  ga4?: string;
  gtm?: string;
  metaPixel?: string;
  tiktokPixel?: string;
  pinterestTag?: string;
  klaviyo?: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: ((...args: unknown[]) => void) & {queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...args: unknown[]) => void; push?: unknown};
    _fbq?: unknown;
    ttq?: {page: () => void; track: (event: string, data?: object) => void; load: (id: string) => void} & Record<string, unknown>;
    pintrk?: ((...args: unknown[]) => void) & {queue?: unknown[]; version?: string};
  }
}

function getConsent() {
  const privacy = window.Shopify?.customerPrivacy;
  return {
    analytics: Boolean(privacy?.analyticsProcessingAllowed?.()),
    marketing: Boolean(privacy?.marketingAllowed?.()),
  };
}

function injectScript(src: string, nonce?: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  if (nonce) script.nonce = nonce;
  document.head.appendChild(script);
}

export function ThirdPartyAnalytics({ids}: {ids: AnalyticsIds}) {
  const nonce = useNonce();
  const {subscribe, register} = useAnalytics();
  const {ready} = register('ThirdPartyAnalytics');
  const [consent, setConsent] = useState({analytics: false, marketing: false});
  const loaded = useRef<Set<string>>(new Set());

  const valid = (id?: string) => (id && ID_PATTERN.test(id) ? id : undefined);
  const ga4 = valid(ids.ga4);
  const gtm = valid(ids.gtm);
  const meta = valid(ids.metaPixel);
  const tiktok = valid(ids.tiktokPixel);
  const pinterest = valid(ids.pinterestTag);
  const klaviyo = valid(ids.klaviyo);

  // Track consent changes from Shopify's privacy banner.
  useEffect(() => {
    const update = () => setConsent(getConsent());
    update();
    document.addEventListener('visitorConsentCollected', update);
    const interval = window.setInterval(update, 2000);
    const stop = window.setTimeout(() => window.clearInterval(interval), 20000);
    return () => {
      document.removeEventListener('visitorConsentCollected', update);
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  // Load vendor scripts once consent is granted.
  useEffect(() => {
    const once = (key: string, fn: () => void) => {
      if (loaded.current.has(key)) return;
      loaded.current.add(key);
      fn();
    };
    if (consent.analytics && (ga4 || gtm)) {
      once('google', () => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer!.push(arguments);
        };
        window.gtag('js', new Date());
        if (ga4) {
          window.gtag('config', ga4, {send_page_view: false});
          injectScript(`https://www.googletagmanager.com/gtag/js?id=${ga4}`, nonce);
        }
        if (gtm) {
          window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
          injectScript(`https://www.googletagmanager.com/gtm.js?id=${gtm}`, nonce);
        }
      });
    }
    if (consent.marketing && meta) {
      once('meta', () => {
        const fbq = function (...args: unknown[]) {
          (fbq as unknown as {queue: unknown[]}).queue.push(args);
        } as NonNullable<Window['fbq']>;
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = '2.0';
        window.fbq = window.fbq ?? fbq;
        window._fbq = window.fbq;
        injectScript('https://connect.facebook.net/en_US/fbevents.js', nonce);
        window.fbq('init', meta);
      });
    }
    if (consent.marketing && tiktok) {
      once('tiktok', () => {
        injectScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${tiktok}&lib=ttq`, nonce);
      });
    }
    if (consent.marketing && pinterest) {
      once('pinterest', () => {
        const pintrk = function (...args: unknown[]) {
          pintrk.queue!.push(args);
        } as NonNullable<Window['pintrk']>;
        pintrk.queue = [];
        pintrk.version = '3.0';
        window.pintrk = window.pintrk ?? pintrk;
        injectScript('https://s.pinimg.com/ct/core.js', nonce);
        window.pintrk('load', pinterest);
      });
    }
    if (consent.marketing && klaviyo) {
      once('klaviyo', () => {
        injectScript(`https://static.klaviyo.com/onsite/js/${klaviyo}/klaviyo.js`, nonce);
      });
    }
  }, [consent, ga4, gtm, meta, tiktok, pinterest, klaviyo, nonce]);

  // Forward Hydrogen analytics events.
  useEffect(() => {
    subscribe('page_viewed', (data) => {
      window.gtag?.('event', 'page_view', {page_location: data.url});
      window.fbq?.('track', 'PageView');
      window.ttq?.page?.();
      window.pintrk?.('page');
    });
    subscribe('product_viewed', (data) => {
      const product = data.products?.[0];
      if (!product) return;
      window.gtag?.('event', 'view_item', {
        currency: data.shop?.currency,
        value: Number(product.price),
        items: [{item_id: product.id, item_name: product.title, item_variant: product.variantTitle, price: Number(product.price)}],
      });
      window.fbq?.('track', 'ViewContent', {content_ids: [product.id], content_type: 'product', value: Number(product.price), currency: data.shop?.currency});
      window.ttq?.track?.('ViewContent', {content_id: product.id, value: Number(product.price), currency: data.shop?.currency});
    });
    subscribe('collection_viewed', (data) => {
      window.gtag?.('event', 'view_item_list', {item_list_id: data.collection?.id, item_list_name: data.collection?.handle});
    });
    subscribe('search_viewed', (data) => {
      window.gtag?.('event', 'search', {search_term: data.searchTerm});
      window.fbq?.('track', 'Search', {search_string: data.searchTerm});
    });
    subscribe('cart_viewed', (data) => {
      window.gtag?.('event', 'view_cart', {
        currency: data.cart?.cost?.totalAmount?.currencyCode,
        value: Number(data.cart?.cost?.totalAmount?.amount ?? 0),
      });
    });
    subscribe('product_added_to_cart', (data) => {
      const line = data.currentLine;
      if (!line) return;
      const price = Number(line.cost?.amountPerQuantity?.amount ?? 0);
      const currency = line.cost?.amountPerQuantity?.currencyCode;
      window.gtag?.('event', 'add_to_cart', {
        currency,
        value: price * (line.quantity - (data.prevLine?.quantity ?? 0)),
        items: [{item_id: line.merchandise.product.id, item_name: line.merchandise.product.title, item_variant: line.merchandise.title, price, quantity: line.quantity}],
      });
      window.fbq?.('track', 'AddToCart', {content_ids: [line.merchandise.product.id], content_type: 'product', currency, value: price});
      window.ttq?.track?.('AddToCart', {content_id: line.merchandise.product.id, currency, value: price});
      window.pintrk?.('track', 'addtocart', {currency, value: price});
    });
    subscribe('product_removed_from_cart', (data) => {
      const line = data.prevLine;
      if (!line) return;
      window.gtag?.('event', 'remove_from_cart', {
        items: [{item_id: line.merchandise.product.id, item_name: line.merchandise.product.title}],
      });
    });
    ready();
  }, [subscribe, ready]);

  return null;
}

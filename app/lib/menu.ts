import type {HeaderQuery} from 'storefrontapi.generated';
import {siteConfig, type NavLinkConfig} from '~/config/site';

export interface NavItem {
  id: string;
  title: string;
  to: string;
  external: boolean;
  items: NavItem[];
}

/**
 * Converts a Shopify menu URL to an internal path when it points at this
 * store (myshopify domain, Online Store primary domain or storefront domain).
 * Collection/product links therefore stay inside the headless storefront.
 */
export function normalizeMenuUrl(
  url: string | null | undefined,
  {
    publicStoreDomain,
    primaryDomainUrl,
  }: {publicStoreDomain?: string; primaryDomainUrl?: string},
): {to: string; external: boolean} {
  if (!url) return {to: '/', external: false};
  if (url.startsWith('/')) return {to: url, external: false};
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const internalHosts = new Set<string>();
    if (publicStoreDomain) {
      internalHosts.add(publicStoreDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''));
    }
    if (primaryDomainUrl) {
      try {
        internalHosts.add(new URL(primaryDomainUrl).host);
      } catch {
        // ignore malformed primary domain
      }
    }
    if (host.endsWith('.myshopify.com') || internalHosts.has(host)) {
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      // Shopify's Online Store "frontpage" collection is our homepage.
      return {to: path === '/collections/frontpage' ? '/' : path || '/', external: false};
    }
    return {to: parsed.toString(), external: true};
  } catch {
    return {to: '/', external: false};
  }
}

type MenuItems = NonNullable<HeaderQuery['menu']>['items'];

export function buildNavigation(
  menu: {items: MenuItems} | null | undefined,
  options: {publicStoreDomain?: string; primaryDomainUrl?: string},
  fallback: readonly NavLinkConfig[] = siteConfig.menus.fallbackHeader,
): NavItem[] {
  if (!menu?.items?.length) {
    return fallback.map((link, i) => ({
      id: `fallback-${i}`,
      title: link.title,
      to: link.to,
      external: false,
      items: [],
    }));
  }
  return menu.items.map((item) => {
    const {to, external} = normalizeMenuUrl(item.url, options);
    return {
      id: item.id,
      title: item.title,
      to,
      external,
      items: (item.items ?? []).map((child) => {
        const c = normalizeMenuUrl(child.url, options);
        return {id: child.id, title: child.title, to: c.to, external: c.external, items: []};
      }),
    };
  });
}

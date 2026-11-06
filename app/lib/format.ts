/**
 * Display-only formatting helpers.
 *
 * IMPORTANT: these never compute authoritative transaction totals. Cart and
 * checkout totals always come from Shopify's calculated cart/checkout. These
 * helpers only format Shopify-provided MoneyV2 values for display.
 */

export interface MoneyLike {
  amount: string | number;
  currencyCode: string;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string, compact: boolean) {
  const cacheKey = `${locale}|${currency}|${compact}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(compact ? {minimumFractionDigits: 0, maximumFractionDigits: 2} : {}),
    });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

/** Formats a Shopify MoneyV2 value, e.g. {amount: "19.5", currencyCode: "USD"} → "$19.50". */
export function formatMoney(
  money: MoneyLike | null | undefined,
  {locale = 'en-US', compact = false}: {locale?: string; compact?: boolean} = {},
): string {
  if (!money) return '';
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return getFormatter(locale, money.currencyCode, compact).format(amount);
}

/** True when a compare-at price exists and is strictly greater than the price. */
export function isOnSale(
  price: MoneyLike | null | undefined,
  compareAtPrice: MoneyLike | null | undefined,
): boolean {
  if (!price || !compareAtPrice) return false;
  if (price.currencyCode !== compareAtPrice.currencyCode) return false;
  return Number(compareAtPrice.amount) > Number(price.amount);
}

/**
 * Whole-number percentage saved between compare-at and price, rounded DOWN
 * so we never overstate a discount (consumer-protection friendly).
 */
export function discountPercentage(
  price: MoneyLike | null | undefined,
  compareAtPrice: MoneyLike | null | undefined,
): number | null {
  if (!isOnSale(price, compareAtPrice)) return null;
  const p = Number(price!.amount);
  const c = Number(compareAtPrice!.amount);
  const pct = Math.floor(((c - p) / c) * 100);
  return pct > 0 ? pct : null;
}

/** True when a product's variants span multiple prices. */
export function hasPriceRange(range?: {
  minVariantPrice: MoneyLike;
  maxVariantPrice: MoneyLike;
}): boolean {
  if (!range) return false;
  return (
    Number(range.minVariantPrice.amount) !==
    Number(range.maxVariantPrice.amount)
  );
}

export function formatDate(
  value: string | number | Date,
  {
    locale = 'en-US',
    style = 'medium',
  }: {locale?: string; style?: 'short' | 'medium' | 'long'} = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {dateStyle: style}).format(date);
}

/** Pluralize a simple English noun: pluralize(1, 'item') → "1 item". */
export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Strips HTML tags and collapses whitespace — for meta descriptions etc. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<style\b[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Decode &amp; last so "&amp;lt;" becomes the literal text "&lt;", not "<".
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncates text at a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Inventory messaging that never invents stock levels. */
export function stockMessage({
  availableForSale,
  quantityAvailable,
  lowStockThreshold,
}: {
  availableForSale: boolean;
  quantityAvailable?: number | null;
  lowStockThreshold: number;
}): {tone: 'success' | 'warning' | 'danger'; label: string} {
  if (!availableForSale) return {tone: 'danger', label: 'Sold out'};
  if (
    typeof quantityAvailable === 'number' &&
    quantityAvailable > 0 &&
    quantityAvailable <= lowStockThreshold
  ) {
    return {tone: 'warning', label: `Only ${quantityAvailable} left`};
  }
  return {tone: 'success', label: 'In stock'};
}

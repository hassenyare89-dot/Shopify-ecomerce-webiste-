import {describe, expect, it} from 'vitest';
import {
  discountPercentage,
  formatDate,
  formatMoney,
  hasPriceRange,
  isOnSale,
  pluralize,
  stockMessage,
  stripHtml,
  truncate,
} from '~/lib/format';

const usd = (amount: string) => ({amount, currencyCode: 'USD'});

describe('formatMoney', () => {
  it('formats USD amounts', () => {
    expect(formatMoney(usd('19.5'))).toBe('$19.50');
    expect(formatMoney(usd('1234'))).toBe('$1,234.00');
  });
  it('formats other currencies and compact mode', () => {
    expect(formatMoney({amount: '10', currencyCode: 'EUR'}, {locale: 'en-US'})).toBe('€10.00');
    expect(formatMoney(usd('10'), {compact: true})).toBe('$10');
  });
  it('returns empty string for missing/invalid values', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(usd('abc'))).toBe('');
  });
});

describe('sale pricing', () => {
  it('detects genuine sales only', () => {
    expect(isOnSale(usd('80'), usd('100'))).toBe(true);
    expect(isOnSale(usd('100'), usd('100'))).toBe(false);
    expect(isOnSale(usd('100'), null)).toBe(false);
    expect(isOnSale(usd('80'), {amount: '100', currencyCode: 'EUR'})).toBe(false);
  });
  it('rounds discount percentage down (never overstates)', () => {
    expect(discountPercentage(usd('128'), usd('160'))).toBe(20);
    expect(discountPercentage(usd('66.67'), usd('100'))).toBe(33);
    expect(discountPercentage(usd('99.5'), usd('100'))).toBeNull();
    expect(discountPercentage(usd('100'), usd('90'))).toBeNull();
  });
  it('detects price ranges', () => {
    expect(hasPriceRange({minVariantPrice: usd('10'), maxVariantPrice: usd('12')})).toBe(true);
    expect(hasPriceRange({minVariantPrice: usd('10'), maxVariantPrice: usd('10.00')})).toBe(false);
  });
});

describe('stockMessage', () => {
  it('reports sold out, low stock and in stock', () => {
    expect(stockMessage({availableForSale: false, lowStockThreshold: 5})).toEqual({tone: 'danger', label: 'Sold out'});
    expect(stockMessage({availableForSale: true, quantityAvailable: 3, lowStockThreshold: 5}).label).toBe('Only 3 left');
    expect(stockMessage({availableForSale: true, quantityAvailable: 30, lowStockThreshold: 5}).label).toBe('In stock');
    // Unknown inventory never invents a number.
    expect(stockMessage({availableForSale: true, quantityAvailable: null, lowStockThreshold: 5}).label).toBe('In stock');
  });
});

describe('text helpers', () => {
  it('strips html', () => {
    expect(stripHtml('<p>Hello <b>world</b>&nbsp;&amp; co</p><script>x()</script>')).toBe('Hello world & co');
  });
  it('truncates at word boundaries', () => {
    expect(truncate('The quick brown fox jumps', 15)).toBe('The quick…');
    expect(truncate('short', 15)).toBe('short');
  });
  it('pluralizes', () => {
    expect(pluralize(1, 'item')).toBe('1 item');
    expect(pluralize(2, 'item')).toBe('2 items');
  });
  it('formats dates', () => {
    expect(formatDate('2026-11-06T12:00:00Z')).toBe('Nov 6, 2026');
    expect(formatDate('invalid')).toBe('');
  });
});

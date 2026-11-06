/**
 * URL <-> Shopify ProductFilter mapping.
 *
 * Filters and sort order live in the URL so result pages are shareable,
 * bookmarkable and crawlable. Parameter names mirror Shopify's own Online
 * Store conventions (`filter.v.price.gte`, `filter.p.vendor`, ...).
 *
 * Supported URL params:
 *   filter.v.availability=1|0
 *   filter.v.price.gte=10 & filter.v.price.lte=50
 *   filter.p.vendor=Acme
 *   filter.p.product_type=Shoes
 *   filter.p.tag=organic
 *   filter.p.category=<taxonomy category gid>
 *   filter.v.option.<name>=<value>
 *   filter.p.m.<namespace>.<key>=<value>
 *   filter.v.m.<namespace>.<key>=<value>
 *   filter.p.tm.<namespace>.<key>=<value>   (taxonomy metafields)
 *   sort=featured|best-selling|price-asc|price-desc|newest|title-asc|relevance
 */

import type {
  ProductFilter,
  ProductCollectionSortKeys,
  ProductSortKeys,
  SearchSortKeys,
} from '@shopify/hydrogen/storefront-api-types';

export const FILTER_PREFIX = 'filter.';

export type SortParam =
  | 'featured'
  | 'best-selling'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'title-asc'
  | 'relevance';

export const COLLECTION_SORT_OPTIONS: {value: SortParam; label: string}[] = [
  {value: 'featured', label: 'Featured'},
  {value: 'best-selling', label: 'Best selling'},
  {value: 'price-asc', label: 'Price: Low to High'},
  {value: 'price-desc', label: 'Price: High to Low'},
  {value: 'newest', label: 'Newest'},
  {value: 'title-asc', label: 'Alphabetical: A–Z'},
];

export const PRODUCTS_SORT_OPTIONS = COLLECTION_SORT_OPTIONS;

export const SEARCH_SORT_OPTIONS: {value: SortParam; label: string}[] = [
  {value: 'relevance', label: 'Relevance'},
  {value: 'price-asc', label: 'Price: Low to High'},
  {value: 'price-desc', label: 'Price: High to Low'},
];

function isSortParam(value: string | null): value is SortParam {
  return (
    value !== null &&
    [
      'featured',
      'best-selling',
      'price-asc',
      'price-desc',
      'newest',
      'title-asc',
      'relevance',
    ].includes(value)
  );
}

export function getSortParam(
  searchParams: URLSearchParams,
  fallback: SortParam,
): SortParam {
  const value = searchParams.get('sort');
  return isSortParam(value) ? value : fallback;
}

export function getCollectionSort(sort: SortParam): {
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
} {
  switch (sort) {
    case 'best-selling':
      return {sortKey: 'BEST_SELLING', reverse: false};
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'newest':
      return {sortKey: 'CREATED', reverse: true};
    case 'title-asc':
      return {sortKey: 'TITLE', reverse: false};
    case 'featured':
    case 'relevance':
    default:
      return {sortKey: 'COLLECTION_DEFAULT', reverse: false};
  }
}

export function getProductsSort(sort: SortParam): {
  sortKey: ProductSortKeys;
  reverse: boolean;
} {
  switch (sort) {
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'newest':
      return {sortKey: 'CREATED_AT', reverse: true};
    case 'title-asc':
      return {sortKey: 'TITLE', reverse: false};
    case 'featured':
    case 'best-selling':
    case 'relevance':
    default:
      return {sortKey: 'BEST_SELLING', reverse: false};
  }
}

export function getSearchSort(sort: SortParam): {
  sortKey: SearchSortKeys;
  reverse: boolean;
} {
  switch (sort) {
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    default:
      return {sortKey: 'RELEVANCE', reverse: false};
  }
}

function parsePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/** Splits "namespace.key" (namespace may not contain dots; key may). */
function splitNamespaceKey(rest: string) {
  const dot = rest.indexOf('.');
  if (dot <= 0 || dot === rest.length - 1) return null;
  return {namespace: rest.slice(0, dot), key: rest.slice(dot + 1)};
}

/**
 * Converts URL search params to Shopify `ProductFilter[]` for
 * `collection.products(filters:)` and `search(productFilters:)`.
 * Unknown/invalid params are ignored (never forwarded raw).
 */
export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ProductFilter[] {
  const filters: ProductFilter[] = [];
  const price: {min?: number; max?: number} = {};

  for (const [rawKey, rawValue] of searchParams.entries()) {
    if (!rawKey.startsWith(FILTER_PREFIX)) continue;
    const value = rawValue.slice(0, 256);
    if (value === '') continue;
    const key = rawKey.slice(FILTER_PREFIX.length);

    if (key === 'v.availability') {
      filters.push({available: value === '1' || value === 'true'});
    } else if (key === 'v.price.gte') {
      price.min = parsePrice(value);
    } else if (key === 'v.price.lte') {
      price.max = parsePrice(value);
    } else if (key === 'p.vendor') {
      filters.push({productVendor: value});
    } else if (key === 'p.product_type') {
      filters.push({productType: value});
    } else if (key === 'p.tag') {
      filters.push({tag: value});
    } else if (key === 'p.category') {
      filters.push({category: {id: value}});
    } else if (key.startsWith('v.option.')) {
      const name = key.slice('v.option.'.length);
      if (name) filters.push({variantOption: {name, value}});
    } else if (key.startsWith('p.m.')) {
      const nk = splitNamespaceKey(key.slice('p.m.'.length));
      if (nk) filters.push({productMetafield: {...nk, value}});
    } else if (key.startsWith('v.m.')) {
      const nk = splitNamespaceKey(key.slice('v.m.'.length));
      if (nk) filters.push({variantMetafield: {...nk, value}});
    } else if (key.startsWith('p.tm.')) {
      const nk = splitNamespaceKey(key.slice('p.tm.'.length));
      if (nk) filters.push({taxonomyMetafield: {...nk, value}});
    }
  }

  if (price.min !== undefined || price.max !== undefined) {
    filters.push({
      price: {
        ...(price.min !== undefined ? {min: price.min} : {}),
        ...(price.max !== undefined ? {max: price.max} : {}),
      },
    });
  }

  return filters;
}

/**
 * Converts a Shopify facet value `input` (a JSON-encoded ProductFilter) to the
 * URL param it corresponds to. Returns null for inputs we don't support.
 */
export function filterInputToParam(
  input: string | ProductFilter,
): {key: string; value: string} | null {
  let filter: ProductFilter;
  try {
    filter = typeof input === 'string' ? (JSON.parse(input) as ProductFilter) : input;
  } catch {
    return null;
  }
  if (!filter || typeof filter !== 'object') return null;

  if (typeof filter.available === 'boolean') {
    return {key: 'filter.v.availability', value: filter.available ? '1' : '0'};
  }
  if (filter.productVendor) {
    return {key: 'filter.p.vendor', value: filter.productVendor};
  }
  if (filter.productType) {
    return {key: 'filter.p.product_type', value: filter.productType};
  }
  if (filter.tag) return {key: 'filter.p.tag', value: filter.tag};
  if (filter.category?.id) {
    return {key: 'filter.p.category', value: filter.category.id};
  }
  if (filter.variantOption) {
    return {
      key: `filter.v.option.${filter.variantOption.name}`,
      value: filter.variantOption.value,
    };
  }
  if (filter.productMetafield) {
    const {namespace, key, value} = filter.productMetafield;
    return {key: `filter.p.m.${namespace}.${key}`, value};
  }
  if (filter.variantMetafield) {
    const {namespace, key, value} = filter.variantMetafield;
    return {key: `filter.v.m.${namespace}.${key}`, value};
  }
  if (filter.taxonomyMetafield) {
    const {namespace, key, value} = filter.taxonomyMetafield;
    return {key: `filter.p.tm.${namespace}.${key}`, value};
  }
  return null;
}

/** Whether a given facet value is currently applied. */
export function isFilterActive(
  searchParams: URLSearchParams,
  input: string | ProductFilter,
): boolean {
  const param = filterInputToParam(input);
  if (!param) return false;
  return searchParams.getAll(param.key).includes(param.value);
}

/** Returns new params with the facet value toggled. Resets pagination. */
export function toggleFilter(
  searchParams: URLSearchParams,
  input: string | ProductFilter,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  clearPagination(next);
  const param = filterInputToParam(input);
  if (!param) return next;

  const existing = next.getAll(param.key);
  next.delete(param.key);

  // Availability is single-valued; other facets are multi-select.
  if (param.key === 'filter.v.availability') {
    if (!existing.includes(param.value)) next.set(param.key, param.value);
    return next;
  }

  if (existing.includes(param.value)) {
    existing
      .filter((v) => v !== param.value)
      .forEach((v) => next.append(param.key, v));
  } else {
    [...existing, param.value].forEach((v) => next.append(param.key, v));
  }
  return next;
}

export function setPriceRange(
  searchParams: URLSearchParams,
  min: number | undefined,
  max: number | undefined,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  clearPagination(next);
  next.delete('filter.v.price.gte');
  next.delete('filter.v.price.lte');
  if (min !== undefined && Number.isFinite(min) && min > 0) {
    next.set('filter.v.price.gte', String(min));
  }
  if (max !== undefined && Number.isFinite(max) && max > 0) {
    next.set('filter.v.price.lte', String(max));
  }
  return next;
}

export function clearFilters(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith(FILTER_PREFIX)) next.append(key, value);
  }
  clearPagination(next);
  return next;
}

export function setSort(
  searchParams: URLSearchParams,
  sort: SortParam,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  clearPagination(next);
  next.set('sort', sort);
  return next;
}

export function clearPagination(params: URLSearchParams) {
  params.delete('cursor');
  params.delete('direction');
}

export interface AppliedFilter {
  key: string;
  value: string;
  label: string;
}

/** Human-readable list of currently applied filters (for "chips"). */
export function getAppliedFilters(
  searchParams: URLSearchParams,
  labelFor?: (key: string, value: string) => string | undefined,
  formatPrice: (n: number) => string = (n) => `$${n}`,
): AppliedFilter[] {
  const applied: AppliedFilter[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith(FILTER_PREFIX) || value === '') continue;
    if (key === 'filter.v.price.gte') {
      applied.push({key, value, label: `From ${formatPrice(Number(value))}`});
    } else if (key === 'filter.v.price.lte') {
      applied.push({key, value, label: `Up to ${formatPrice(Number(value))}`});
    } else if (key === 'filter.v.availability') {
      applied.push({
        key,
        value,
        label: value === '1' ? 'In stock' : 'Out of stock',
      });
    } else {
      applied.push({key, value, label: labelFor?.(key, value) ?? value});
    }
  }
  return applied;
}

export function removeAppliedFilter(
  searchParams: URLSearchParams,
  filter: Pick<AppliedFilter, 'key' | 'value'>,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  clearPagination(next);
  const remaining = next.getAll(filter.key).filter((v) => v !== filter.value);
  next.delete(filter.key);
  remaining.forEach((v) => next.append(filter.key, v));
  return next;
}

/**
 * Builds a Storefront API product search query string (used by the
 * `products(query:)` connection, which doesn't support `filters:`).
 * Values are quoted and escaped to prevent query-syntax injection.
 */
export function buildProductsQueryString(
  searchParams: URLSearchParams,
): string {
  const parts: string[] = [];
  const quote = (v: string) => `"${v.replace(/["\\]/g, '\\$&')}"`;

  const availability = searchParams.get('filter.v.availability');
  if (availability === '1') parts.push('available_for_sale:true');
  if (availability === '0') parts.push('available_for_sale:false');

  const min = parsePrice(searchParams.get('filter.v.price.gte'));
  const max = parsePrice(searchParams.get('filter.v.price.lte'));
  if (min !== undefined) parts.push(`variants.price:>=${min}`);
  if (max !== undefined) parts.push(`variants.price:<=${max}`);

  const vendors = searchParams.getAll('filter.p.vendor').filter(Boolean);
  if (vendors.length) {
    parts.push(`(${vendors.map((v) => `vendor:${quote(v)}`).join(' OR ')})`);
  }
  const types = searchParams.getAll('filter.p.product_type').filter(Boolean);
  if (types.length) {
    parts.push(
      `(${types.map((t) => `product_type:${quote(t)}`).join(' OR ')})`,
    );
  }
  const tags = searchParams.getAll('filter.p.tag').filter(Boolean);
  if (tags.length) {
    parts.push(`(${tags.map((t) => `tag:${quote(t)}`).join(' OR ')})`);
  }
  return parts.join(' AND ');
}

import {describe, expect, it} from 'vitest';
import {
  buildProductsQueryString,
  clearFilters,
  filterInputToParam,
  getAppliedFilters,
  getCollectionSort,
  getProductsSort,
  getSearchSort,
  getSortParam,
  isFilterActive,
  parseFiltersFromSearchParams,
  removeAppliedFilter,
  setPriceRange,
  setSort,
  toggleFilter,
} from '~/lib/filters';

const qs = (s: string) => new URLSearchParams(s);

describe('parseFiltersFromSearchParams', () => {
  it('maps URL params to Shopify ProductFilter inputs', () => {
    const filters = parseFiltersFromSearchParams(
      qs(
        'filter.v.availability=1&filter.p.vendor=Acme&filter.p.vendor=Beta&filter.v.option.color=Red&filter.p.product_type=Shoes&filter.p.tag=eco&filter.p.m.custom.material=Wool&filter.v.m.custom.fit=Slim&filter.p.tm.shopify.color-pattern=gid%3A%2F%2Fx&filter.p.category=gid%3A%2F%2Fcat&filter.v.price.gte=10&filter.v.price.lte=50&q=ignored',
      ),
    );
    expect(filters).toEqual([
      {available: true},
      {productVendor: 'Acme'},
      {productVendor: 'Beta'},
      {variantOption: {name: 'color', value: 'Red'}},
      {productType: 'Shoes'},
      {tag: 'eco'},
      {productMetafield: {namespace: 'custom', key: 'material', value: 'Wool'}},
      {variantMetafield: {namespace: 'custom', key: 'fit', value: 'Slim'}},
      {taxonomyMetafield: {namespace: 'shopify', key: 'color-pattern', value: 'gid://x'}},
      {category: {id: 'gid://cat'}},
      {price: {min: 10, max: 50}},
    ]);
  });
  it('ignores invalid values', () => {
    expect(parseFiltersFromSearchParams(qs('filter.v.price.gte=-5&filter.v.price.lte=abc&filter.p.m.bad=1&filter.unknown=x&filter.p.vendor='))).toEqual([]);
  });
});

describe('filterInputToParam round-trip', () => {
  it.each([
    [{available: false}, 'filter.v.availability', '0'],
    [{productVendor: 'Acme'}, 'filter.p.vendor', 'Acme'],
    [{variantOption: {name: 'size', value: 'M'}}, 'filter.v.option.size', 'M'],
    [{productMetafield: {namespace: 'custom', key: 'material', value: 'Wool'}}, 'filter.p.m.custom.material', 'Wool'],
  ])('%j', (input, key, value) => {
    expect(filterInputToParam(JSON.stringify(input))).toEqual({key, value});
    const parsed = parseFiltersFromSearchParams(qs(`${key}=${encodeURIComponent(value)}`));
    expect(parsed[0]).toEqual(input);
  });
  it('returns null for malformed input', () => {
    expect(filterInputToParam('{not json')).toBeNull();
    expect(filterInputToParam('{"price":{"min":1}}')).toBeNull();
  });
});

describe('toggling and clearing', () => {
  const red = JSON.stringify({variantOption: {name: 'color', value: 'Red'}});
  const blue = JSON.stringify({variantOption: {name: 'color', value: 'Blue'}});
  it('toggles multi-select facets and resets pagination', () => {
    let p = qs('sort=price-asc&cursor=abc&direction=next');
    p = toggleFilter(p, red);
    p = toggleFilter(p, blue);
    expect(p.getAll('filter.v.option.color')).toEqual(['Red', 'Blue']);
    expect(p.has('cursor')).toBe(false);
    expect(p.get('sort')).toBe('price-asc');
    expect(isFilterActive(p, red)).toBe(true);
    p = toggleFilter(p, red);
    expect(p.getAll('filter.v.option.color')).toEqual(['Blue']);
  });
  it('treats availability as single-valued', () => {
    let p = toggleFilter(qs(''), JSON.stringify({available: true}));
    p = toggleFilter(p, JSON.stringify({available: false}));
    expect(p.getAll('filter.v.availability')).toEqual(['0']);
  });
  it('sets and clears price, sort and filters', () => {
    let p = setPriceRange(qs('filter.p.vendor=A'), 10, undefined);
    expect(p.get('filter.v.price.gte')).toBe('10');
    expect(p.has('filter.v.price.lte')).toBe(false);
    p = setSort(p, 'newest');
    expect(p.get('sort')).toBe('newest');
    p = clearFilters(p);
    expect(p.toString()).toBe('sort=newest');
  });
  it('lists and removes applied filters', () => {
    const p = qs('filter.v.price.gte=10&filter.v.availability=1&filter.p.vendor=Acme');
    expect(getAppliedFilters(p).map((f) => f.label)).toEqual(['From $10', 'In stock', 'Acme']);
    expect(removeAppliedFilter(p, {key: 'filter.p.vendor', value: 'Acme'}).has('filter.p.vendor')).toBe(false);
  });
});

describe('sorting', () => {
  it('falls back for unknown sort values', () => {
    expect(getSortParam(qs('sort=bogus'), 'featured')).toBe('featured');
    expect(getSortParam(qs('sort=price-desc'), 'featured')).toBe('price-desc');
  });
  it('maps to Shopify sort keys', () => {
    expect(getCollectionSort('price-desc')).toEqual({sortKey: 'PRICE', reverse: true});
    expect(getCollectionSort('newest')).toEqual({sortKey: 'CREATED', reverse: true});
    expect(getCollectionSort('featured')).toEqual({sortKey: 'COLLECTION_DEFAULT', reverse: false});
    expect(getProductsSort('newest')).toEqual({sortKey: 'CREATED_AT', reverse: true});
    expect(getProductsSort('title-asc')).toEqual({sortKey: 'TITLE', reverse: false});
    expect(getSearchSort('best-selling')).toEqual({sortKey: 'RELEVANCE', reverse: false});
  });
});

describe('buildProductsQueryString', () => {
  it('builds escaped query syntax', () => {
    expect(
      buildProductsQueryString(qs('filter.v.availability=1&filter.v.price.gte=5&filter.p.vendor=A"B&filter.p.product_type=Shoes')),
    ).toBe('available_for_sale:true AND variants.price:>=5 AND (vendor:"A\\"B") AND (product_type:"Shoes")');
    expect(buildProductsQueryString(qs(''))).toBe('');
  });
});

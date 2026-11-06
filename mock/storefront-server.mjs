#!/usr/bin/env node
/**
 * MOCK Shopify Storefront API — for local development and automated tests.
 *
 *   npm run mock:api          (listens on http://127.0.0.1:4010)
 *
 * - Executes real GraphQL against the OFFICIAL Storefront API schema bundled
 *   with @shopify/hydrogen, so every storefront query is schema-validated.
 * - Serves the deterministic sample catalog from ./fixtures.mjs.
 * - Implements a stateful in-memory cart (create/add/update/remove,
 *   discount codes, notes, gift cards) and a mock checkout page.
 *
 * This is NOT Shopify and must never be used in production. Point
 * PUBLIC_STORE_DOMAIN at your real *.myshopify.com store to go live.
 */
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildClientSchema, graphql} from 'graphql';
import {addResolversToSchema} from '@graphql-tools/schema';
import {
  BLOGS,
  COLLECTIONS,
  DISCOUNT_CODES,
  MENUS,
  METAOBJECTS,
  MOCK_ORIGIN,
  PAGES,
  POLICIES,
  PRODUCTS,
  SHOP,
} from './fixtures.mjs';

const require = createRequire(import.meta.url);
const schemaPath = require.resolve('@shopify/hydrogen/storefront.schema.json');
const introspection = JSON.parse(readFileSync(schemaPath, 'utf8'));
const baseSchema = buildClientSchema(introspection.data ?? introspection);

const PORT = Number(new URL(MOCK_ORIGIN).port || 4010);
const VARIANTS = PRODUCTS.flatMap((p) => p._variants);
const byId = new Map([...PRODUCTS, ...VARIANTS, ...COLLECTIONS].map((n) => [n.id, n]));

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

const encodeCursor = (i) => Buffer.from(`cursor:${i}`).toString('base64');
const decodeCursor = (c) => Number(Buffer.from(c, 'base64').toString().split(':')[1]);

function connection(items, {first, last, after, before} = {}) {
  let start = 0;
  let end = items.length;
  if (after) start = decodeCursor(after) + 1;
  if (before) end = decodeCursor(before);
  let slice = items.slice(start, end);
  let offset = start;
  if (typeof first === 'number') slice = slice.slice(0, first);
  if (typeof last === 'number' && slice.length > last) {
    offset += slice.length - last;
    slice = slice.slice(-last);
  }
  const edges = slice.map((node, i) => ({node, cursor: encodeCursor(offset + i)}));
  return {
    nodes: slice,
    edges,
    totalCount: items.length,
    pageInfo: {
      hasNextPage: offset + slice.length < items.length,
      hasPreviousPage: offset > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}

const minPrice = (p) => Math.min(...p._variants.map((v) => Number(v.price.amount)));
const maxPrice = (p) => Math.max(...p._variants.map((v) => Number(v.price.amount)));
const money = (amount) => ({amount: Number(amount).toFixed(2), currencyCode: 'USD'});

function sortProducts(list, sortKey, reverse) {
  const sorted = [...list];
  switch (sortKey) {
    case 'PRICE':
      sorted.sort((a, b) => minPrice(a) - minPrice(b));
      break;
    case 'TITLE':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'CREATED':
    case 'CREATED_AT':
      sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      break;
    case 'BEST_SELLING':
      sorted.sort((a, b) => b._sales - a._sales);
      break;
    default:
      break;
  }
  if (reverse) sorted.reverse();
  return sorted;
}

function matchesFilter(product, filter) {
  if (typeof filter.available === 'boolean') return product.availableForSale === filter.available;
  if (filter.price) {
    const min = filter.price.min ?? 0;
    const max = filter.price.max ?? Infinity;
    return product._variants.some((v) => Number(v.price.amount) >= min && Number(v.price.amount) <= max);
  }
  if (filter.productVendor) return product.vendor === filter.productVendor;
  if (filter.productType) return product.productType === filter.productType;
  if (filter.tag) return product.tags.includes(filter.tag);
  if (filter.variantOption) {
    return product._variants.some((v) =>
      v.selectedOptions.some(
        (o) => o.name.toLowerCase() === filter.variantOption.name.toLowerCase() && o.value === filter.variantOption.value,
      ),
    );
  }
  return true;
}

/** Shopify semantics: same-type filters are OR'd, different types AND'd. */
function applyFilters(products, filters = []) {
  if (!filters?.length) return products;
  const groups = new Map();
  for (const f of filters) {
    const key = f.variantOption ? `opt:${f.variantOption.name.toLowerCase()}` : Object.keys(f)[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  return products.filter((p) => [...groups.values()].every((group) => group.some((f) => matchesFilter(p, f))));
}

function buildFacets(products) {
  const facet = (id, label, values, presentation = 'TEXT') => ({
    __typename: 'Filter',
    id,
    label,
    type: 'LIST',
    presentation,
    values: values.map(([label, count, input, swatch]) => ({
      __typename: 'FilterValue',
      id: `${id}.${label}`,
      label,
      count,
      input: JSON.stringify(input),
      swatch: swatch ?? null,
      image: null,
    })),
  });
  const count = (fn) => products.filter(fn).length;
  const vendors = [...new Set(PRODUCTS.map((p) => p.vendor))].sort();
  const types = [...new Set(PRODUCTS.map((p) => p.productType))].sort();
  const colors = [...new Set(PRODUCTS.flatMap((p) => p._options.find((o) => o.name === 'Color')?.values ?? []))];
  const sizes = [...new Set(PRODUCTS.flatMap((p) => p._options.find((o) => o.name === 'Size')?.values ?? []))];
  const COLOR_HEX = {Sand: '#d9c7ad', Clay: '#b4532a', Sage: '#9fb3a2', Ink: '#1f2a44', Bone: '#efe9df', Charcoal: '#3a3a38'};
  const prices = products.flatMap((p) => p._variants.map((v) => Number(v.price.amount)));
  return [
    facet('filter.v.availability', 'Availability', [
      ['In stock', count((p) => p.availableForSale), {available: true}],
      ['Out of stock', count((p) => !p.availableForSale), {available: false}],
    ]),
    {
      __typename: 'Filter',
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      presentation: null,
      values: [
        {
          __typename: 'FilterValue',
          id: 'filter.v.price',
          label: 'Price',
          count: 0,
          input: JSON.stringify({price: {min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0}}),
          swatch: null,
          image: null,
        },
      ],
    },
    facet('filter.v.option.color', 'Color', colors.map((c) => [c, count((p) => matchesFilter(p, {variantOption: {name: 'color', value: c}})), {variantOption: {name: 'color', value: c}}, {__typename: 'FilterValueSwatch', color: COLOR_HEX[c] ?? null, image: null}]), 'SWATCH'),
    facet('filter.v.option.size', 'Size', sizes.map((s) => [s, count((p) => matchesFilter(p, {variantOption: {name: 'size', value: s}})), {variantOption: {name: 'size', value: s}}])),
    facet('filter.p.vendor', 'Brand', vendors.map((v) => [v, count((p) => p.vendor === v), {productVendor: v}])),
    facet('filter.p.product_type', 'Product type', types.map((t) => [t, count((p) => p.productType === t), {productType: t}])),
  ];
}

/** Very small subset of Shopify's product search syntax used by the app. */
function applyQueryString(products, query) {
  if (!query) return products;
  let list = products;
  const clauses = query.split(/\s+AND\s+/);
  for (const clause of clauses) {
    const c = clause.replace(/^\(|\)$/g, '');
    if (c === 'available_for_sale:true') list = list.filter((p) => p.availableForSale);
    else if (c === 'available_for_sale:false') list = list.filter((p) => !p.availableForSale);
    else if (c.startsWith('variants.price:>=')) list = list.filter((p) => maxPrice(p) >= Number(c.split('>=')[1]));
    else if (c.startsWith('variants.price:<=')) list = list.filter((p) => minPrice(p) <= Number(c.split('<=')[1]));
    else if (c === 'gift_card:true') list = list.filter((p) => p.isGiftCard);
    else if (/^(vendor|product_type|tag):/.test(c)) {
      const parts = c.split(' OR ').map((s) => s.match(/^(\w+):"(.*)"$/)).filter(Boolean);
      list = list.filter((p) =>
        parts.some(([, key, value]) =>
          key === 'vendor' ? p.vendor === value : key === 'product_type' ? p.productType === value : p.tags.includes(value),
        ),
      );
    } else if (c.trim()) {
      const term = c.toLowerCase();
      list = list.filter((p) => `${p.title} ${p.vendor} ${p.productType} ${p.tags.join(' ')}`.toLowerCase().includes(term));
    }
  }
  return list;
}

function searchProducts(term) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((p) => {
    const hay = `${p.title} ${p.vendor} ${p.productType} ${p.tags.join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w) || hay.includes(w.replace(/s$/, '')));
  });
}

function collectionProducts(collection) {
  if (collection.handle === 'all') return PRODUCTS;
  return PRODUCTS.filter((p) => p._collections.includes(collection.handle));
}

function variantFor(product, selectedOptions = [], {fallbackToAvailable = true} = {}) {
  const wanted = (selectedOptions ?? []).filter((o) => product._options.some((po) => po.name.toLowerCase() === o.name.toLowerCase()));
  if (wanted.length) {
    const exact = product._variants.find((v) =>
      wanted.every((w) => v.selectedOptions.some((o) => o.name.toLowerCase() === w.name.toLowerCase() && o.value.toLowerCase() === w.value.toLowerCase())),
    );
    if (exact) return exact;
  }
  if (!fallbackToAvailable) return null;
  return product._variants.find((v) => v.availableForSale) ?? product._variants[0];
}

/* ----------------------------------------------------------------------- */
/* Cart                                                                     */
/* ----------------------------------------------------------------------- */

const carts = new Map();
let lineSeq = 1;

function newCart() {
  const token = `mock${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const cart = {
    id: `gid://shopify/Cart/${token}?key=mock`,
    token,
    lines: [],
    discountCodes: [],
    giftCards: [],
    note: '',
    attributes: [],
    buyerIdentity: {countryCode: 'US', email: null, phone: null, customer: null},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  carts.set(cart.id, cart);
  return cart;
}

function cartView(cart) {
  if (!cart) return null;
  const lines = cart.lines
    .map((line) => {
      const variant = byId.get(line.merchandiseId);
      if (!variant) return null;
      const unit = Number(variant.price.amount);
      return {
        __typename: 'CartLine',
        id: line.id,
        quantity: line.quantity,
        attributes: line.attributes ?? [],
        merchandise: variant,
        parentRelationship: null,
        cost: {
          totalAmount: money(unit * line.quantity),
          amountPerQuantity: money(unit),
          compareAtAmountPerQuantity: variant.compareAtPrice,
          subtotalAmount: money(unit * line.quantity),
        },
        discountAllocations: [],
        sellingPlanAllocation: null,
      };
    })
    .filter(Boolean);
  const subtotal = lines.reduce((acc, l) => acc + Number(l.cost.totalAmount.amount), 0);
  const discountRate = cart.discountCodes.filter((d) => d.applicable).reduce((acc, d) => acc + (DISCOUNT_CODES[d.code.toUpperCase()] ?? 0), 0);
  const total = subtotal * (1 - discountRate);
  return {
    __typename: 'Cart',
    id: cart.id,
    checkoutUrl: `${MOCK_ORIGIN}/checkouts/cn/${cart.token}`,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    note: cart.note,
    attributes: cart.attributes,
    totalQuantity: lines.reduce((acc, l) => acc + l.quantity, 0),
    buyerIdentity: {...cart.buyerIdentity, deliveryAddressPreferences: [], preferences: null, purchasingCompany: null},
    discountCodes: cart.discountCodes,
    appliedGiftCards: cart.giftCards,
    discountAllocations: [],
    _lines: lines,
    cost: {
      subtotalAmount: money(subtotal),
      totalAmount: money(total),
      totalDutyAmount: null,
      totalTaxAmount: null,
      checkoutChargeAmount: money(total),
      subtotalAmountEstimated: false,
      totalAmountEstimated: true,
    },
  };
}

function mutationResult(cart, userErrors = [], warnings = []) {
  if (cart) cart.updatedAt = new Date().toISOString();
  return {cart: cartView(cart), userErrors, warnings};
}

function addLines(cart, lines) {
  const errors = [];
  for (const input of lines) {
    const variant = byId.get(input.merchandiseId);
    if (!variant || variant.__typename !== 'ProductVariant') {
      errors.push({field: ['lines', 'merchandiseId'], message: 'The merchandise with id does not exist.', code: 'INVALID_MERCHANDISE_LINE'});
      continue;
    }
    if (!variant.availableForSale) {
      errors.push({field: ['lines'], message: `${variant.product.title} is sold out.`, code: 'MERCHANDISE_NOT_ENOUGH_STOCK'});
      continue;
    }
    const existing = cart.lines.find((l) => l.merchandiseId === input.merchandiseId && JSON.stringify(l.attributes ?? []) === JSON.stringify(input.attributes ?? []));
    if (existing) existing.quantity += input.quantity ?? 1;
    else cart.lines.push({id: `gid://shopify/CartLine/${lineSeq++}?cart=${cart.token}`, merchandiseId: input.merchandiseId, quantity: input.quantity ?? 1, attributes: input.attributes ?? []});
  }
  return errors;
}

/* ----------------------------------------------------------------------- */
/* Resolvers                                                                */
/* ----------------------------------------------------------------------- */

const metafieldFor = (owner, namespace, key) => {
  if (owner.__typename === 'Product' && namespace === 'reviews' && owner._rating) {
    if (key === 'rating') return {__typename: 'Metafield', namespace, key, type: 'rating', value: JSON.stringify({value: String(owner._rating[0]), scale_min: '1.0', scale_max: '5.0'}), reference: null};
    if (key === 'rating_count') return {__typename: 'Metafield', namespace, key, type: 'number_integer', value: String(owner._rating[1]), reference: null};
  }
  if (owner.__typename === 'Product' && namespace === 'custom' && key === 'specifications') {
    return {__typename: 'Metafield', namespace, key, type: 'multi_line_text_field', value: `Material: Sample material\nOrigin: Mock data\nCare: See label`, reference: null};
  }
  if (owner.__typename === 'Product' && namespace === 'custom' && key === 'size_chart' && owner._options.some((o) => o.name === 'Size')) {
    return {__typename: 'Metafield', namespace, key, type: 'multi_line_text_field', value: 'XS: 32–34" chest\nS: 35–37"\nM: 38–40"\nL: 41–43"\nXL: 44–46"\n(Mock size chart)', reference: null};
  }
  return null;
};

const resolvers = {
  QueryRoot: {
    shop: () => SHOP,
    localization: () => ({
      __typename: 'Localization',
      country: {__typename: 'Country', isoCode: 'US', name: 'United States', currency: {isoCode: 'USD', name: 'US Dollar', symbol: '$'}, unitSystem: 'IMPERIAL_SYSTEM', availableLanguages: [{isoCode: 'EN', name: 'English', endonymName: 'English'}], market: null},
      language: {isoCode: 'EN', name: 'English', endonymName: 'English'},
      availableCountries: [],
      availableLanguages: [{isoCode: 'EN', name: 'English', endonymName: 'English'}],
      market: null,
    }),
    menu: (_, {handle}) => MENUS[handle] ?? null,
    product: (_, {handle, id}) => PRODUCTS.find((p) => (handle ? p.handle === handle : p.id === id)) ?? null,
    products: (_, args) => connection(sortProducts(applyQueryString(PRODUCTS, args.query), args.sortKey, args.reverse), args),
    productTypes: (_, args) => connection([...new Set(PRODUCTS.map((p) => p.productType))].sort(), args),
    productTags: (_, args) => connection([...new Set(PRODUCTS.flatMap((p) => p.tags))].sort(), args),
    collection: (_, {handle, id}) => COLLECTIONS.find((c) => (handle ? c.handle === handle : c.id === id)) ?? null,
    collections: (_, args) => connection(args.reverse ? [...COLLECTIONS].reverse() : COLLECTIONS, args),
    productRecommendations: (_, {productHandle, productId, intent}) => {
      const product = PRODUCTS.find((p) => p.handle === productHandle || p.id === productId);
      if (!product) return null;
      const others = PRODUCTS.filter((p) => p.id !== product.id);
      if (intent === 'COMPLEMENTARY') return others.filter((p) => !p._collections.some((c) => product._collections.includes(c))).slice(0, 4);
      return others.filter((p) => p._collections.some((c) => product._collections.includes(c) && !['frontpage', 'sale'].includes(c))).slice(0, 8);
    },
    nodes: (_, {ids}) => ids.map((id) => byId.get(id) ?? null),
    node: (_, {id}) => byId.get(id) ?? null,
    page: (_, {handle}) => PAGES.find((p) => p.handle === handle) ?? null,
    pages: (_, args) => connection(PAGES, args),
    blog: (_, {handle}) => BLOGS.find((b) => b.handle === handle) ?? null,
    blogs: (_, args) => connection(BLOGS, args),
    articles: (_, args) => connection(BLOGS.flatMap((b) => b._articles), args),
    metaobjects: (_, {type, first}) => connection(METAOBJECTS[type] ?? [], {first}),
    metaobject: (_, {handle}) => Object.values(METAOBJECTS).flat().find((m) => m.handle === handle?.handle) ?? null,
    urlRedirects: (_, args) => connection([], args),
    cart: (_, {id}) => cartView(carts.get(id)),
    search: (_, args) => {
      const types = args.types ?? ['PRODUCT', 'PAGE', 'ARTICLE'];
      const term = (args.query ?? '').trim();
      const results = [];
      if (types.includes('PRODUCT')) {
        const base = searchProducts(term);
        const filtered = applyFilters(base, args.productFilters);
        const sorted = args.sortKey === 'PRICE' ? sortProducts(filtered, 'PRICE', args.reverse) : filtered;
        const conn = connection(sorted, args);
        return {...conn, productFilters: buildFacets(base)};
      }
      if (types.includes('PAGE')) results.push(...PAGES.filter((p) => p.title.toLowerCase().includes(term.toLowerCase())));
      if (types.includes('ARTICLE')) results.push(...BLOGS.flatMap((b) => b._articles).filter((a) => a.title.toLowerCase().includes(term.toLowerCase())));
      return {...connection(results, args), productFilters: []};
    },
    predictiveSearch: (_, {query, limit = 10}) => {
      const term = query.toLowerCase();
      const products = searchProducts(query).slice(0, limit);
      return {
        __typename: 'PredictiveSearchResult',
        products,
        collections: COLLECTIONS.filter((c) => c.title.toLowerCase().includes(term)).slice(0, limit),
        pages: PAGES.filter((p) => p.title.toLowerCase().includes(term)).slice(0, limit),
        articles: BLOGS.flatMap((b) => b._articles).filter((a) => a.title.toLowerCase().includes(term)).slice(0, limit),
        queries: products.length ? [{__typename: 'SearchQuerySuggestion', text: products[0].title.toLowerCase(), styledText: products[0].title.toLowerCase(), trackingParameters: null}] : [],
      };
    },
    sitemap: (_, {type}) => {
      const resources = {PRODUCT: PRODUCTS, COLLECTION: COLLECTIONS, PAGE: PAGES, BLOG: BLOGS, ARTICLE: BLOGS.flatMap((b) => b._articles), METAOBJECT: []}[type] ?? [];
      return {
        __typename: 'Sitemap',
        pagesCount: {count: Math.max(1, Math.ceil(resources.length / 250)), precision: 'EXACT'},
        resources: {
          hasNextPage: false,
          nextPage: null,
          items: resources.map((r) => ({__typename: 'SitemapResource', handle: r.handle, updatedAt: r.updatedAt ?? new Date().toISOString(), title: r.title, image: null})),
        },
      };
    },
  },
  Mutation: {
    cartCreate: (_, {input}) => {
      const cart = newCart();
      const errors = addLines(cart, input?.lines ?? []);
      if (input?.discountCodes) cart.discountCodes = input.discountCodes.map((code) => ({code, applicable: code.toUpperCase() in DISCOUNT_CODES}));
      if (input?.note) cart.note = input.note;
      return mutationResult(cart, errors);
    },
    cartLinesAdd: (_, {cartId, lines}) => {
      const cart = carts.get(cartId);
      if (!cart) return {cart: null, userErrors: [{field: ['cartId'], message: 'The specified cart does not exist.', code: 'INVALID'}], warnings: []};
      return mutationResult(cart, addLines(cart, lines));
    },
    cartLinesUpdate: (_, {cartId, lines}) => {
      const cart = carts.get(cartId);
      if (!cart) return {cart: null, userErrors: [{field: ['cartId'], message: 'The specified cart does not exist.', code: 'INVALID'}], warnings: []};
      for (const input of lines) {
        const line = cart.lines.find((l) => l.id === input.id);
        if (!line) continue;
        if (typeof input.quantity === 'number') line.quantity = input.quantity;
        if (input.merchandiseId) line.merchandiseId = input.merchandiseId;
      }
      cart.lines = cart.lines.filter((l) => l.quantity > 0);
      return mutationResult(cart);
    },
    cartLinesRemove: (_, {cartId, lineIds}) => {
      const cart = carts.get(cartId);
      if (!cart) return {cart: null, userErrors: [{field: ['cartId'], message: 'The specified cart does not exist.', code: 'INVALID'}], warnings: []};
      cart.lines = cart.lines.filter((l) => !lineIds.includes(l.id));
      return mutationResult(cart);
    },
    cartDiscountCodesUpdate: (_, {cartId, discountCodes}) => {
      const cart = carts.get(cartId) ?? newCart();
      cart.discountCodes = (discountCodes ?? []).map((code) => ({__typename: 'CartDiscountCode', code, applicable: code.toUpperCase() in DISCOUNT_CODES}));
      return mutationResult(cart);
    },
    cartGiftCardCodesAdd: (_, {cartId}) => mutationResult(carts.get(cartId), [{field: ['giftCardCodes'], message: 'Gift card code is invalid (mock).', code: 'GIFT_CARD_CODE_INVALID'}]),
    cartGiftCardCodesRemove: (_, {cartId}) => mutationResult(carts.get(cartId)),
    cartGiftCardCodesUpdate: (_, {cartId}) => mutationResult(carts.get(cartId)),
    cartNoteUpdate: (_, {cartId, note}) => {
      const cart = carts.get(cartId) ?? newCart();
      cart.note = note ?? '';
      return mutationResult(cart);
    },
    cartAttributesUpdate: (_, {cartId, attributes}) => {
      const cart = carts.get(cartId) ?? newCart();
      cart.attributes = attributes;
      return mutationResult(cart);
    },
    cartBuyerIdentityUpdate: (_, {cartId, buyerIdentity}) => {
      const cart = carts.get(cartId) ?? newCart();
      cart.buyerIdentity = {...cart.buyerIdentity, ...buyerIdentity};
      return mutationResult(cart);
    },
  },
  Cart: {
    lines: (cart, args) => connection(cart._lines, args),
  },
  Product: {
    metafield: (p, {namespace, key}) => metafieldFor(p, namespace, key),
    metafields: (p, {identifiers}) => identifiers.map(({namespace, key}) => metafieldFor(p, namespace, key)),
    images: (p, args) => connection(p.images, args),
    media: (p, args) =>
      connection(
        [...p.images, ...Object.values(p._colorImages)].map((img) => ({
          __typename: 'MediaImage',
          id: img.id.replace('ProductImage', 'MediaImage'),
          alt: img.altText,
          mediaContentType: 'IMAGE',
          image: img,
          previewImage: img,
          presentation: null,
        })),
        args,
      ),
    variants: (p, args) => connection(p._variants, args),
    variantsCount: (p) => ({count: p._variants.length, precision: 'EXACT'}),
    collections: (p, args) => connection(COLLECTIONS.filter((c) => p._collections.includes(c.handle) && c.handle !== 'frontpage'), args),
    priceRange: (p) => ({minVariantPrice: money(minPrice(p)), maxVariantPrice: money(maxPrice(p))}),
    compareAtPriceRange: (p) => {
      const values = p._variants.map((v) => (v.compareAtPrice ? Number(v.compareAtPrice.amount) : 0));
      return {minVariantPrice: money(Math.min(...values)), maxVariantPrice: money(Math.max(...values))};
    },
    options: (p) =>
      p._options.length
        ? p._options.map((opt, oi) => ({
            __typename: 'ProductOption',
            id: `${p.id}/option/${oi}`,
            name: opt.name,
            values: opt.values,
            optionValues: opt.values.map((value) => ({
              __typename: 'ProductOptionValue',
              id: `${p.id}/option/${oi}/${value}`,
              name: value,
              swatch: opt.name === 'Color' ? {__typename: 'ProductOptionValueSwatch', color: {Sand: '#d9c7ad', Clay: '#b4532a', Sage: '#9fb3a2', Ink: '#1f2a44', Bone: '#efe9df', Charcoal: '#3a3a38'}[value] ?? null, image: null} : null,
              firstSelectableVariant: p._variants.find((v) => v.selectedOptions[oi].value === value && v.availableForSale) ?? p._variants.find((v) => v.selectedOptions[oi].value === value) ?? null,
            })),
          }))
        : [{__typename: 'ProductOption', id: `${p.id}/option/0`, name: 'Title', values: ['Default Title'], optionValues: [{__typename: 'ProductOptionValue', id: `${p.id}/title`, name: 'Default Title', swatch: null, firstSelectableVariant: p._variants[0]}]}],
    selectedOrFirstAvailableVariant: (p, {selectedOptions}) => variantFor(p, selectedOptions),
    variantBySelectedOptions: (p, {selectedOptions}) => variantFor(p, selectedOptions, {fallbackToAvailable: false}),
    adjacentVariants: (p, {selectedOptions}) => {
      const selected = variantFor(p, selectedOptions);
      return p._variants.filter((v) => v !== selected && v.selectedOptions.filter((o, i) => o.value !== selected.selectedOptions[i].value).length === 1);
    },
    category: () => null,
    sellingPlanGroups: (_, args) => connection([], args),
  },
  ProductVariant: {
    metafield: () => null,
    metafields: (_, {identifiers}) => identifiers.map(() => null),
    storeAvailability: (_, args) => connection([], args),
    sellingPlanAllocations: (_, args) => connection([], args),
    quantityPriceBreaks: (_, args) => connection([], args),
    components: (_, args) => connection([], args),
  },
  Collection: {
    products: (c, args) => {
      const base = collectionProducts(c);
      const filtered = applyFilters(base, args.filters);
      const sorted = args.sortKey && args.sortKey !== 'COLLECTION_DEFAULT' && args.sortKey !== 'MANUAL' ? sortProducts(filtered, args.sortKey, args.reverse) : args.reverse ? [...filtered].reverse() : filtered;
      return {...connection(sorted, args), filters: buildFacets(base)};
    },
    metafield: () => null,
    metafields: (_, {identifiers}) => identifiers.map(() => null),
  },
  Shop: {
    privacyPolicy: () => POLICIES.privacyPolicy,
    refundPolicy: () => POLICIES.refundPolicy,
    shippingPolicy: () => POLICIES.shippingPolicy,
    termsOfService: () => POLICIES.termsOfService,
    subscriptionPolicy: () => POLICIES.subscriptionPolicy,
    termsOfSale: () => null,
    legalNotice: () => null,
    contactInformation: () => null,
    metafield: () => null,
    metafields: (_, {identifiers}) => identifiers.map(() => null),
  },
  Blog: {
    articles: (b, args) => connection(b._articles, args),
    articleByHandle: (b, {handle}) => b._articles.find((a) => a.handle === handle) ?? null,
    metafield: () => null,
  },
  Article: {metafield: () => null},
  Page: {metafield: () => null},
  Menu: {
    itemsCount: (m) => m.items.length,
  },
};

const schema = addResolversToSchema({schema: baseSchema, resolvers, updateResolversInPlace: false});

/* ----------------------------------------------------------------------- */
/* HTTP server                                                              */
/* ----------------------------------------------------------------------- */

function svgImage(seed, label, w, h) {
  const [, c1 = '#e8ddd0', c2 = '#b4532a'] = seed.split('|');
  const safe = (s) => String(s).replace(/[<>&"']/g, '');
  const shape = seed.includes('collection') || seed.includes('promo')
    ? `<circle cx="${w * 0.72}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.28}" fill="${safe(c2)}" opacity="0.85"/><rect x="${w * 0.12}" y="${h * 0.55}" width="${w * 0.42}" height="${h * 0.3}" rx="${w * 0.04}" fill="#fff" opacity="0.35"/>`
    : `<ellipse cx="${w / 2}" cy="${h * 0.86}" rx="${w * 0.3}" ry="${h * 0.03}" fill="#000" opacity="0.12"/><rect x="${w * 0.26}" y="${h * 0.2}" width="${w * 0.48}" height="${h * 0.62}" rx="${w * 0.08}" fill="${safe(c2)}"/><rect x="${w * 0.33}" y="${h * 0.3}" width="${w * 0.34}" height="${h * 0.04}" rx="${h * 0.02}" fill="#fff" opacity="0.5"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safe(label)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${safe(c1)}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>${shape}
<text x="${w / 2}" y="${h - h * 0.04}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w / 34)}" fill="#00000066" text-anchor="middle">MOCK IMAGE · ${safe(label).slice(0, 40)}</text>
</svg>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', MOCK_ORIGIN);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  if (url.pathname.startsWith('/mock-images/')) {
    const seed = decodeURIComponent(url.pathname.slice('/mock-images/'.length).replace(/\.svg$/, ''));
    const w = Number(url.searchParams.get('w')) || 1200;
    const h = Number(url.searchParams.get('h')) || 1500;
    res.writeHead(200, {'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400'});
    return res.end(svgImage(seed, url.searchParams.get('label') ?? '', w, h));
  }

  if (url.pathname.startsWith('/checkouts/')) {
    const token = url.pathname.split('/').pop();
    const cart = [...carts.values()].find((c) => c.token === token);
    const view = cartView(cart);
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mock checkout</title></head><body style="font-family:system-ui;max-width:640px;margin:48px auto;padding:0 16px">
<h1>Mock Shopify checkout</h1>
<p data-testid="mock-checkout"><strong>Test environment — no payment is taken.</strong> In production this is Shopify's hosted checkout.</p>
<p>Cart: <code>${token}</code> · Items: <span data-testid="mock-checkout-qty">${view?.totalQuantity ?? 0}</span> · Total: <span data-testid="mock-checkout-total">$${view?.cost.totalAmount.amount ?? '0.00'}</span></p>
<ul>${(view?._lines ?? []).map((l) => `<li>${l.quantity} × ${l.merchandise.product.title} (${l.merchandise.title})</li>`).join('')}</ul>
</body></html>`);
  }

  if (url.pathname === '/__health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ok: true, products: PRODUCTS.length, carts: carts.size}));
  }

  if (/^\/api\/[^/]+\/graphql(\.json)?$/.test(url.pathname) && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const isGraphqlBody = (req.headers['content-type'] ?? '').includes('application/graphql');
      const {query, variables, operationName} = isGraphqlBody ? {query: raw} : JSON.parse(raw);
      const result = await graphql({schema, source: query, variableValues: variables, operationName});
      if (result.errors?.length && process.env.MOCK_LOG !== '0') {
        console.error('[mock-storefront]', operationName ?? '', result.errors.map((e) => `${e.message} @ ${e.path?.join('.') ?? ''}`).join(' | '));
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({errors: [{message: String(error?.message ?? error)}]}));
    }
  }

  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-storefront] MOCK Storefront API on ${MOCK_ORIGIN} (${PRODUCTS.length} sample products) — not for production`);
});

/**
 * Server-side loaders for product listing pages that aren't a single
 * Shopify collection: All products, New arrivals, Best sellers, Sale.
 *
 * Strategy (keeps the merchant in control via Shopify admin):
 *  1. If a collection with the configured handle exists, use it — full
 *     Shopify filters/facets and merchant-controlled membership.
 *  2. Otherwise fall back to a Shopify-sorted `products` query (e.g. newest
 *     first, best selling). Never fabricates membership.
 */
import {getPaginationVariables} from '@shopify/hydrogen';
import type {Storefront} from '@shopify/hydrogen';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {
  buildProductsQueryString,
  getCollectionSort,
  getProductsSort,
  getSortParam,
  parseFiltersFromSearchParams,
  type SortParam,
} from '~/lib/filters';
import {siteConfig} from '~/config/site';

export async function loadCollectionOrProducts({
  storefront,
  request,
  handle,
  defaultSort,
  fallback,
}: {
  storefront: Storefront;
  request: Request;
  handle: string | null;
  defaultSort: SortParam;
  /** When no collection exists: 'products' = sorted catalog, 'empty' = honest empty state. */
  fallback: 'products' | 'empty';
}) {
  const searchParams = new URL(request.url).searchParams;
  const pagination = getPaginationVariables(request, {pageBy: siteConfig.pageSize});
  const sort = getSortParam(searchParams, defaultSort);

  if (handle) {
    const {sortKey, reverse} = getCollectionSort(sort);
    const {collection} = await storefront.query(LISTING_COLLECTION_QUERY, {
      variables: {
        handle,
        filters: parseFiltersFromSearchParams(searchParams),
        sortKey,
        reverse,
        ...pagination,
      },
      cache: storefront.CacheShort(),
    });
    if (collection) {
      return {
        source: 'collection' as const,
        sort,
        collection,
        products: collection.products,
        filters: collection.products.filters,
      };
    }
  }

  if (fallback === 'empty') {
    return {source: 'empty' as const, sort, collection: null, products: null, filters: []};
  }

  const {sortKey, reverse} = getProductsSort(sort);
  const query = buildProductsQueryString(searchParams) || null;
  const data = await storefront.query(LISTING_PRODUCTS_QUERY, {
    variables: {sortKey, reverse, query, ...pagination},
    cache: storefront.CacheShort(),
  });

  // Synthesised facets for the catalog-wide listing (Shopify's `products`
  // connection doesn't return facets): availability, price and product type.
  const productTypes = data.productTypes.nodes.filter(Boolean);
  const filters = [
    {
      id: 'filter.v.availability',
      label: 'Availability',
      type: 'LIST' as const,
      presentation: null,
      values: [
        {id: 'avail-1', label: 'In stock', count: -1, input: JSON.stringify({available: true}), swatch: null},
      ],
    },
    {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE' as const,
      presentation: null,
      values: [{id: 'price', label: 'Price', count: -1, input: JSON.stringify({price: {min: 0}}), swatch: null}],
    },
    ...(productTypes.length
      ? [
          {
            id: 'filter.p.product_type',
            label: 'Product type',
            type: 'LIST' as const,
            presentation: null,
            values: productTypes.map((t) => ({
              id: `type-${t}`,
              label: t,
              count: -1,
              input: JSON.stringify({productType: t}),
              swatch: null,
            })),
          },
        ]
      : []),
  ];

  return {source: 'products' as const, sort, collection: null, products: data.products, filters};
}

const LISTING_COLLECTION_QUERY = `#graphql
  query ListingCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        title
        description
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
          presentation
          values {
            id
            label
            count
            input
            swatch {
              color
              image {
                previewImage {
                  url
                }
              }
            }
          }
        }
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const LISTING_PRODUCTS_QUERY = `#graphql
  query ListingProducts(
    $country: CountryCode
    $language: LanguageCode
    $query: String
    $sortKey: ProductSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
    productTypes(first: 50) {
      nodes
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

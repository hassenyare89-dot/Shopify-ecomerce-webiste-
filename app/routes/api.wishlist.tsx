import {data} from 'react-router';
import type {Route} from './+types/api.wishlist';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {isProductGid, WISHLIST_MAX_ITEMS} from '~/lib/wishlist';

/**
 * GET /api/wishlist?ids=gid://shopify/Product/1,gid://...
 * Returns live Shopify product data for wishlist IDs (public catalog data
 * only). IDs are validated; unknown/unpublished products are dropped.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(isProductGid)
    .slice(0, WISHLIST_MAX_ITEMS);

  if (!ids.length) return data({products: []});

  const {nodes} = await context.storefront.query(WISHLIST_PRODUCTS_QUERY, {
    variables: {ids},
    cache: context.storefront.CacheShort(),
  });
  const products = nodes.filter(
    (n): n is Extract<NonNullable<(typeof nodes)[number]>, {__typename: 'Product'}> =>
      Boolean(n && n.__typename === 'Product'),
  );
  return data({products}, {headers: {'Cache-Control': 'private, max-age=60'}});
}

const WISHLIST_PRODUCTS_QUERY = `#graphql
  query WishlistProducts(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

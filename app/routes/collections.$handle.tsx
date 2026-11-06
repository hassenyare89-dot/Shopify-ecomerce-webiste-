import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {CollectionHeader} from '~/components/CollectionHeader';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductListing} from '~/components/ProductListing';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {
  COLLECTION_SORT_OPTIONS,
  getCollectionSort,
  getSortParam,
  parseFiltersFromSearchParams,
} from '~/lib/filters';
import {breadcrumbJsonLd, canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data) return seoMeta({title: 'Collection not found', noindex: true});
  const {collection, canonical, origin, filtered} = data;
  return seoMeta({
    title: collection.seo?.title || collection.title,
    description: collection.seo?.description || collection.description,
    url: canonical,
    image: collection.image,
    // Filtered/sorted variants of a collection shouldn't be indexed separately.
    noindex: filtered,
    jsonLd: breadcrumbJsonLd(origin, [
      {name: 'Home', path: '/'},
      {name: 'Collections', path: '/collections'},
      {name: collection.title, path: `/collections/${collection.handle}`},
    ]),
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  if (!handle) throw redirect('/collections');

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const paginationVariables = getPaginationVariables(request, {pageBy: siteConfig.pageSize});
  const sort = getSortParam(searchParams, 'featured');
  const {sortKey, reverse} = getCollectionSort(sort);
  const filters = parseFiltersFromSearchParams(searchParams);

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {handle, filters, sortKey, reverse, ...paginationVariables},
    cache: storefront.CacheShort(),
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {
    collection,
    sort,
    origin: url.origin,
    canonical: canonicalUrl(request.url),
    filtered: filters.length > 0 || searchParams.has('sort') || searchParams.has('cursor'),
  };
}

export default function Collection() {
  const {collection, sort} = useLoaderData<typeof loader>();
  const currency =
    collection.products.nodes[0]?.priceRange.minVariantPrice.currencyCode ?? 'USD';

  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs
        crumbs={[
          {name: 'Home', path: '/'},
          {name: 'Collections', path: '/collections'},
          {name: collection.title, path: `/collections/${collection.handle}`},
        ]}
      />
      <CollectionHeader
        title={collection.title}
        description={collection.description}
        image={collection.image}
      />
      <ProductListing
        products={collection.products}
        filters={collection.products.filters}
        sortOptions={COLLECTION_SORT_OPTIONS}
        sort={sort}
        currencyCode={currency}
      />
      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
    </div>
  );
}

const COLLECTION_QUERY = `#graphql
  query Collection(
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

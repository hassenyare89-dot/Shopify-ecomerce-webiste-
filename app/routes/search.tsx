import {Form, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {ProductListing, type ListingFilter} from '~/components/ProductListing';
import {ProductRail} from '~/components/ProductRail';
import {Button} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {
  getSearchSort,
  getSortParam,
  parseFiltersFromSearchParams,
  SEARCH_SORT_OPTIONS,
} from '~/lib/filters';
import {
  getEmptyPredictiveSearchResult,
  normalizeSearchTerm,
  type PredictiveSearchReturn,
} from '~/lib/search';
import {seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';
import {logger} from '~/lib/logger';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data && 'term' in data && data.term ? `Search: ${data.term}` : 'Search',
    // Search result pages are thin/duplicate content for crawlers.
    noindex: true,
  });

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.has('predictive')) {
    return predictiveSearch({request, context});
  }
  return regularSearch({request, context});
}

export default function SearchPage() {
  const data = useLoaderData<typeof loader>();
  if (data.type === 'predictive') return null;
  const {term, products, sort, error, fallback, articles, pages} = data;
  const total = products?.totalCount ?? 0;

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl">{term ? <>Results for &ldquo;{term}&rdquo;</> : 'Search'}</h1>
        <Form method="get" action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="search-page-input" className="sr-only">
            Search
          </label>
          <div className="relative flex-1">
            <Icon name="search" className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <input
              id="search-page-input"
              type="search"
              name="q"
              defaultValue={term}
              placeholder="Search products…"
              maxLength={100}
              className="h-12 w-full rounded-full border border-border bg-background pr-4 pl-11 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg" className="h-12">
            Search
          </Button>
        </Form>
        {term && products ? (
          <p className="mt-4 text-sm text-muted" aria-live="polite">
            {total} {total === 1 ? 'product' : 'products'} found
          </p>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="mb-6 text-sm text-sale">
          Search is temporarily unavailable. Please try again.
        </p>
      ) : null}

      {term && products && total > 0 ? (
        <ProductListing
          products={products}
          filters={products.productFilters as ListingFilter[]}
          sortOptions={SEARCH_SORT_OPTIONS}
          sort={sort}
          currencyCode={products.nodes[0]?.priceRange.minVariantPrice.currencyCode}
        />
      ) : (
        <EmptySearch term={term} />
      )}

      {(pages?.length || articles?.length) && term ? (
        <section aria-label="Other results" className="mt-16 grid gap-8 md:grid-cols-2">
          {pages?.length ? (
            <div>
              <h2 className="mb-4 text-xl">Pages</h2>
              <ul className="space-y-2 text-sm">
                {pages.map((p) => (
                  <li key={p.id}>
                    <Link to={`/pages/${p.handle}`} className="underline underline-offset-4">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {articles?.length ? (
            <div>
              <h2 className="mb-4 text-xl">Articles</h2>
              <ul className="space-y-2 text-sm">
                {articles.map((a) => (
                  <li key={a.id}>
                    <Link to={`/blogs/${a.blog.handle}/${a.handle}`} className="underline underline-offset-4">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {fallback?.length && (!products || total === 0) ? (
        <div className="mt-16">
          <ProductRail title="Popular right now" products={fallback} />
        </div>
      ) : null}

      <Analytics.SearchView data={{searchTerm: term, searchResults: products}} />
    </div>
  );
}

function EmptySearch({term}: {term: string}) {
  return (
    <div className="rounded-brand border border-dashed border-border px-6 py-16 text-center">
      <p className="font-heading text-2xl">{term ? `No results for “${term}”` : 'What are you looking for?'}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {term ? 'Check your spelling, try fewer words, or browse our collections.' : 'Search by product name, type or brand.'}
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {siteConfig.menus.fallbackHeader.slice(0, 5).map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-foreground">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function regularSearch({request, context}: Pick<Route.LoaderArgs, 'request' | 'context'>) {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = normalizeSearchTerm(url.searchParams.get('q'));
  const sort = getSortParam(url.searchParams, 'relevance');
  const {sortKey, reverse} = getSearchSort(sort);
  const variables = getPaginationVariables(request, {pageBy: siteConfig.pageSize});

  if (!term) {
    const fallback = await storefront
      .query(SEARCH_FALLBACK_QUERY, {cache: storefront.CacheLong()})
      .then((d) => d.products.nodes)
      .catch(() => []);
    return {type: 'regular' as const, term, sort, products: null, pages: [], articles: [], fallback, error: undefined};
  }

  try {
    const data = await storefront.query(SEARCH_QUERY, {
      variables: {
        ...variables,
        term,
        sortKey,
        reverse,
        productFilters: parseFiltersFromSearchParams(url.searchParams),
      },
      cache: storefront.CacheShort(),
    });
    const products = data.products;
    const fallback =
      products.totalCount === 0
        ? await storefront
            .query(SEARCH_FALLBACK_QUERY, {cache: storefront.CacheLong()})
            .then((d) => d.products.nodes)
            .catch(() => [])
        : [];
    return {
      type: 'regular' as const,
      term,
      sort,
      products,
      pages: data.pages.nodes.filter((n) => n.__typename === 'Page'),
      articles: data.articles.nodes.filter((n) => n.__typename === 'Article'),
      fallback,
      error: undefined,
    };
  } catch (error) {
    logger.error('search_failed', {error});
    return {type: 'regular' as const, term, sort, products: null, pages: [], articles: [], fallback: [], error: 'unavailable'};
  }
}

async function predictiveSearch({
  request,
  context,
}: Pick<Route.LoaderArgs, 'request' | 'context'>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = normalizeSearchTerm(url.searchParams.get('q'));
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit') || 6)));
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  try {
    const {predictiveSearch: items, errors} = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {limit, limitScope: 'EACH', term},
      cache: storefront.CacheShort(),
    });
    if (errors || !items) throw new Error(errors?.map((e) => e.message).join(', ') || 'No results');
    const total = Object.values(items).reduce((acc, list) => acc + list.length, 0);
    return {type, term, result: {items, total}};
  } catch (error) {
    logger.warn('predictive_search_failed', {error});
    return {type, term, result: getEmptyPredictiveSearchResult(), error: 'unavailable'};
  }
}

const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $productFilters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: $sortKey,
      reverse: $reverse,
      types: [PRODUCT],
      unavailableProducts: LAST,
      productFilters: $productFilters,
    ) {
      totalCount
      productFilters {
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
        ... on Product {
          ...ProductCard
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
    pages: search(query: $term, types: [PAGE], first: 5) {
      nodes {
        ... on Page {
          __typename
          id
          handle
          title
        }
      }
    }
    articles: search(query: $term, types: [ARTICLE], first: 5) {
      nodes {
        ... on Article {
          __typename
          id
          handle
          title
          blog {
            handle
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const SEARCH_FALLBACK_QUERY = `#graphql
  query SearchFallback($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const PREDICTIVE_SEARCH_QUERY = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
` as const;

import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {Icon} from '~/components/ui/Icon';
import {canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: 'Collections',
    description: 'Browse all of our collections.',
    url: data?.canonical,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables,
    cache: context.storefront.CacheLong(),
  });
  return {collections, canonical: canonicalUrl(request.url)};
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();
  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs crumbs={[{name: 'Home', path: '/'}, {name: 'Collections', path: '/collections'}]} />
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl md:text-6xl">Collections</h1>
        <p className="mt-4 text-muted">Explore curated edits from across our store.</p>
      </header>
      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        as="ul"
        resourcesClassName="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {({node: collection, index}) => (
          <li key={collection.id}>
            <Link
              to={`/collections/${collection.handle}`}
              prefetch="intent"
              className="group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-brand bg-surface">
                {collection.image ? (
                  <Image
                    data={collection.image}
                    alt={collection.image.altText || collection.title}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    loading={index < 3 ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover transition duration-700 ease-out-expo group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <h2 className="text-xl">{collection.title}</h2>
                <Icon name="arrowRight" className="size-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </li>
        )}
      </PaginatedResourceSection>
    </div>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

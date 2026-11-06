import {Analytics} from '@shopify/hydrogen';
import {ProductListing, type ListingFilter} from '~/components/ProductListing';
import {CollectionHeader} from '~/components/CollectionHeader';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {ButtonLink} from '~/components/ui/Button';
import {COLLECTION_SORT_OPTIONS, type SortParam} from '~/lib/filters';
import type {loadCollectionOrProducts} from '~/lib/listing.server';

type ListingData = Awaited<ReturnType<typeof loadCollectionOrProducts>>;

/** Shared page shell for All products / New arrivals / Best sellers / Sale. */
export function MerchandisingPage({
  data,
  title,
  description,
  path,
  eyebrow,
  emptyTitle,
  emptyBody,
}: {
  data: ListingData;
  title: string;
  description?: string;
  path: string;
  eyebrow?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const heading = data.collection?.title ?? title;
  const body = data.collection?.description || description;
  const currency = data.products?.nodes[0]?.priceRange.minVariantPrice.currencyCode ?? 'USD';

  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs crumbs={[{name: 'Home', path: '/'}, {name: heading, path}]} />
      <CollectionHeader title={heading} description={body} image={data.collection?.image} eyebrow={eyebrow} />
      {data.products ? (
        <ProductListing
          products={data.products}
          filters={data.filters as ListingFilter[]}
          sortOptions={COLLECTION_SORT_OPTIONS}
          sort={data.sort as SortParam}
          currencyCode={currency}
        />
      ) : (
        <div className="rounded-brand border border-dashed border-border py-20 text-center">
          <p className="font-heading text-2xl">{emptyTitle ?? 'Nothing here yet'}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{emptyBody ?? 'Check back soon.'}</p>
          <ButtonLink to="/collections/all" className="mt-6">
            Shop all products
          </ButtonLink>
        </div>
      )}
      {data.collection ? (
        <Analytics.CollectionView data={{collection: {id: data.collection.id, handle: data.collection.handle}}} />
      ) : null}
    </div>
  );
}

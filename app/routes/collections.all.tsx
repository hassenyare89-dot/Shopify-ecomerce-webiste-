import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import {MerchandisingPage} from '~/components/MerchandisingPage';
import {loadCollectionOrProducts} from '~/lib/listing.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.listing.collection?.seo?.title || data?.listing.collection?.title || 'All products',
    description: data?.listing.collection?.seo?.description || 'Browse our full catalog.',
    url: data?.canonical,
    noindex: data?.filtered,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const listing = await loadCollectionOrProducts({
    storefront: context.storefront,
    request,
    handle: null,
    defaultSort: 'best-selling',
    fallback: 'products',
  });
  const params = new URL(request.url).searchParams;
  return {
    listing,
    canonical: canonicalUrl(request.url),
    filtered: [...params.keys()].some((k) => k.startsWith('filter.') || k === 'sort' || k === 'cursor'),
  };
}

export default function Listing() {
  const {listing} = useLoaderData<typeof loader>();
  return (
    <MerchandisingPage
      data={listing}
      title="All products"
      description="Browse our full catalog."
      eyebrow="Shop"
      path="/collections/all"
    />
  );
}

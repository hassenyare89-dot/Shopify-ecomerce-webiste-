import {useLoaderData} from 'react-router';
import type {Route} from './+types/new-arrivals';
import {MerchandisingPage} from '~/components/MerchandisingPage';
import {loadCollectionOrProducts} from '~/lib/listing.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.listing.collection?.seo?.title || data?.listing.collection?.title || 'New arrivals',
    description: data?.listing.collection?.seo?.description || 'The latest additions to our store.',
    url: data?.canonical,
    noindex: data?.filtered,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const listing = await loadCollectionOrProducts({
    storefront: context.storefront,
    request,
    handle: siteConfig.collections.newArrivals,
    defaultSort: 'newest',
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
      title="New arrivals"
      description="The latest additions to our store."
      eyebrow="Just landed"
      path="/new-arrivals"
    />
  );
}

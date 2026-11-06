import {useLoaderData} from 'react-router';
import type {Route} from './+types/sale';
import {MerchandisingPage} from '~/components/MerchandisingPage';
import {loadCollectionOrProducts} from '~/lib/listing.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.listing.collection?.seo?.title || data?.listing.collection?.title || 'Sale',
    description: data?.listing.collection?.seo?.description || 'Products currently on offer.',
    url: data?.canonical,
    noindex: data?.filtered,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const listing = await loadCollectionOrProducts({
    storefront: context.storefront,
    request,
    handle: siteConfig.collections.sale,
    defaultSort: 'featured',
    fallback: 'empty',
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
      title="Sale"
      description="Products currently on offer."
      eyebrow="Offers"
      path="/sale"
      emptyTitle="No offers right now"
      emptyBody="There are no products on sale at the moment. Sign up to our newsletter to hear about future offers."
    />
  );
}

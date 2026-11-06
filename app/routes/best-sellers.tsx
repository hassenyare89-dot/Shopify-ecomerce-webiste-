import {useLoaderData} from 'react-router';
import type {Route} from './+types/best-sellers';
import {MerchandisingPage} from '~/components/MerchandisingPage';
import {loadCollectionOrProducts} from '~/lib/listing.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.listing.collection?.seo?.title || data?.listing.collection?.title || 'Best sellers',
    description: data?.listing.collection?.seo?.description || 'Our most popular products, ranked by Shopify sales data.',
    url: data?.canonical,
    noindex: data?.filtered,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const listing = await loadCollectionOrProducts({
    storefront: context.storefront,
    request,
    handle: siteConfig.collections.bestSellers,
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
      title="Best sellers"
      description="Our most popular products, ranked by Shopify sales data."
      eyebrow="Most loved"
      path="/best-sellers"
    />
  );
}

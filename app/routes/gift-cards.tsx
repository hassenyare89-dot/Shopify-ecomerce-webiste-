import {useLoaderData} from 'react-router';
import type {Route} from './+types/gift-cards';
import {ContentPage} from '~/components/ContentPage';
import {ProductGrid} from '~/components/ProductCard';
import {ButtonLink} from '~/components/ui/Button';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({title: 'Gift cards', description: 'Give the gift of choice with a digital gift card.', url: data?.canonical});

/**
 * Shows the store's gift card product(s). Shopify creates a gift card product
 * (default handle "gift-card") when gift cards are enabled — available on
 * most paid Shopify plans. Gift cards are redeemed at Shopify checkout.
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const data = await context.storefront.query(GIFT_CARDS_QUERY, {cache: context.storefront.CacheLong()});
  const products = data.products.nodes.filter((p) => p.isGiftCard);
  const fallback = data.product?.isGiftCard ? [data.product] : [];
  return {products: products.length ? products : fallback, canonical: canonicalUrl(request.url)};
}

export default function GiftCards() {
  const {products} = useLoaderData<typeof loader>();
  return (
    <ContentPage
      title="Gift cards"
      intro="Delivered by email and redeemable at checkout. The perfect gift when you’re not sure."
      path="/gift-cards"
      wide
    >
      {products.length ? (
        <ProductGrid products={products} className="lg:grid-cols-3" />
      ) : (
        <div className="rounded-brand border border-dashed border-border py-16 text-center">
          <p className="font-heading text-2xl">Gift cards aren’t available right now</p>
          <p className="mt-2 text-sm text-muted">Please check back soon.</p>
          <ButtonLink to="/collections/all" className="mt-6">
            Shop all products
          </ButtonLink>
        </div>
      )}
      <p className="mt-10 text-sm text-muted">
        Already have a gift card? Enter the code in your cart or at checkout.
      </p>
    </ContentPage>
  );
}

const GIFT_CARDS_QUERY = `#graphql
  query GiftCards($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 6, query: "gift_card:true") {
      nodes {
        isGiftCard
        ...ProductCard
      }
    }
    product(handle: "gift-card") {
      isGiftCard
      ...ProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

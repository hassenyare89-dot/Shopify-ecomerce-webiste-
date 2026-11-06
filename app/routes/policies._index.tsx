import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';
import {ContentPage} from '~/components/ContentPage';
import {Icon} from '~/components/ui/Icon';
import {seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = () => seoMeta({title: 'Policies'});

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY, {
    cache: context.storefront.CacheLong(),
  });

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <ContentPage title="Policies" path="/policies" intro="Our store policies, managed in Shopify.">
      <ul className="divide-y divide-border border-y border-border">
        {[
          ...policies.map((p) => ({key: p.id, title: p.title, to: `/policies/${p.handle}`})),
          {key: 'cookie', title: 'Cookie Policy', to: '/cookie-policy'},
          {key: 'a11y', title: 'Accessibility Statement', to: '/accessibility'},
          {key: 'promo', title: 'Promotional Terms', to: '/promotional-terms'},
        ].map((item) => (
          <li key={item.key}>
            <Link to={item.to} className="flex items-center justify-between py-4 hover:text-accent">
              {item.title}
              <Icon name="chevronRight" className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;

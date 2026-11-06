import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/order-tracking';
import {ContentPage} from '~/components/ContentPage';
import {ButtonLink} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({title: 'Order tracking', description: 'Track your order status and shipment.', url: data?.canonical});

export async function loader({context, request}: Route.LoaderArgs) {
  const isLoggedIn = await context.customerAccount.isLoggedIn().catch(() => false);
  return {isLoggedIn, canonical: canonicalUrl(request.url)};
}

/**
 * Order status is owned by Shopify. Signed-in customers see orders, fulfillment
 * status and carrier tracking in their account (Customer Account API). Guests
 * use the secure order status link in their Shopify confirmation email — we do
 * not offer an email+order-number lookup, which would expose order data
 * without authentication.
 */
export default function OrderTracking() {
  const {isLoggedIn} = useLoaderData<typeof loader>();
  return (
    <ContentPage title="Track your order" intro="Find the latest status and tracking for your order." path="/order-tracking">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-brand border border-border p-6">
          <Icon name="user" className="size-6" />
          <h2 className="mt-4 text-xl">{isLoggedIn ? 'View your orders' : 'Have an account?'}</h2>
          <p className="mt-2 text-sm text-muted">
            See order history, fulfillment status and carrier tracking links in your account.
          </p>
          <ButtonLink to="/account/orders" className="mt-5">
            {isLoggedIn ? 'Go to my orders' : 'Sign in to view orders'}
          </ButtonLink>
        </div>
        <div className="rounded-brand border border-border p-6">
          <Icon name="mail" className="size-6" />
          <h2 className="mt-4 text-xl">Checked out as a guest?</h2>
          <p className="mt-2 text-sm text-muted">
            Open your order confirmation or shipping email and select <strong>View your order</strong>. That secure
            link always shows the current status and tracking details.
          </p>
          <ButtonLink to="/contact" variant="outline" className="mt-5">
            Can’t find your email?
          </ButtonLink>
        </div>
      </div>
      <p className="mt-10 text-sm text-muted">
        Learn more in our <Link to="/policies/shipping-policy" className="underline">shipping policy</Link>.
      </p>
    </ContentPage>
  );
}

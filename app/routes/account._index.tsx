import {Link, useLoaderData, useOutletContext} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {Route} from './+types/account._index';
import type {CustomerFragment} from 'customer-accountapi.generated';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import {ButtonLink} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {OrderStatusBadge} from '~/components/account/OrderStatusBadge';
import {formatDate} from '~/lib/format';

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {first: 3, language: customerAccount.i18n.language},
  });
  return {recentOrders: data?.customer?.orders?.nodes ?? []};
}

export default function AccountOverview() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {recentOrders} = useLoaderData<typeof loader>();

  return (
    <div className="space-y-10">
      <section aria-labelledby="recent-orders" className="rounded-brand border border-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-orders" className="text-xl">
            Recent orders
          </h2>
          <Link to="/account/orders" className="text-sm underline underline-offset-4">
            View all
          </Link>
        </div>
        {recentOrders.length ? (
          <ul className="divide-y divide-border">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${btoa(order.id)}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-accent"
                >
                  <span>
                    <span className="font-medium">Order #{order.number}</span>
                    <span className="ml-3 text-sm text-muted">{formatDate(order.processedAt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <OrderStatusBadge status={order.fulfillmentStatus} />
                    <Money data={order.totalPrice} className="text-sm font-medium" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted">You haven’t placed any orders yet.</p>
            <ButtonLink to="/collections/all" className="mt-4">
              Start shopping
            </ButtonLink>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-brand border border-border p-6">
          <h2 className="text-xl">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd>{[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{customer.emailAddress?.emailAddress ?? '—'}</dd>
            </div>
          </dl>
          <Link to="/account/profile" className="mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4">
            Edit profile <Icon name="arrowRight" className="size-3.5" />
          </Link>
        </section>
        <section className="rounded-brand border border-border p-6">
          <h2 className="text-xl">Default address</h2>
          {customer.defaultAddress ? (
            <address className="mt-4 text-sm not-italic">
              {customer.defaultAddress.formatted.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="mt-4 text-sm text-muted">No address saved yet.</p>
          )}
          <Link to="/account/addresses" className="mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4">
            Manage addresses <Icon name="arrowRight" className="size-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}

import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {OrderStatusBadge} from '~/components/account/OrderStatusBadge';
import {buttonClasses} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {formatDate} from '~/lib/format';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `Order ${data?.order?.name ?? ''}`},
  {name: 'robots', content: 'noindex'},
];

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  let orderId: string;
  try {
    orderId = atob(params.id);
  } catch {
    throw new Response('Order not found', {status: 404});
  }
  // Only Shopify order GIDs; the Customer Account API also enforces ownership.
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderId)) {
    throw new Response('Order not found', {status: 404});
  }
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Response('Order not found', {status: 404});
  }

  const {order} = data;

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  };
}

export default function OrderRoute() {
  const {order, lineItems, discountValue, discountPercentage} = useLoaderData<typeof loader>();
  const fulfillments = order.fulfillments.nodes;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/account/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <Icon name="chevronLeft" className="size-4" /> All orders
          </Link>
          <h2 className="text-3xl">Order {order.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Placed {formatDate(order.processedAt!, {style: 'long'})}
            {order.confirmationNumber ? ` · Confirmation ${order.confirmationNumber}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.cancelledAt ? <OrderStatusBadge status="CANCELLED" /> : <OrderStatusBadge status={order.fulfillmentStatus} />}
          <a
            target="_blank"
            href={order.statusPageUrl}
            rel="noopener noreferrer"
            className={buttonClasses({variant: 'outline', size: 'sm'})}
          >
            Order status page <Icon name="external" className="size-3.5" />
          </a>
        </div>
      </div>

      {fulfillments.length ? (
        <section aria-labelledby="shipments" className="rounded-brand border border-border p-6">
          <h3 id="shipments" className="mb-4 font-body text-base font-semibold tracking-normal">
            Shipments
          </h3>
          <ul className="space-y-4">
            {fulfillments.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">Shipment {i + 1}</p>
                  {f.estimatedDeliveryAt ? (
                    <p className="text-muted">Estimated delivery {formatDate(f.estimatedDeliveryAt)}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <OrderStatusBadge status={f.latestShipmentStatus ?? f.status} />
                  {f.trackingInformation.map((t) =>
                    t.url ? (
                      <a key={t.number ?? t.url} href={t.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                        Track {t.company ?? 'package'} {t.number ? `(${t.number})` : ''}
                      </a>
                    ) : t.number ? (
                      <span key={t.number}>
                        {t.company} {t.number}
                      </span>
                    ) : null,
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-label="Items" className="rounded-brand border border-border">
          <ul className="divide-y divide-border">
            {lineItems.map((lineItem) => (
              <OrderLineRow key={lineItem.id} lineItem={lineItem} />
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section aria-label="Order summary" className="rounded-brand bg-surface p-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{order.subtotal ? <Money data={order.subtotal} /> : '—'}</dd>
              </div>
              {(discountValue && discountValue.amount) || discountPercentage ? (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd>{discountPercentage ? `-${discountPercentage}%` : discountValue ? <Money data={discountValue} /> : null}</dd>
                </div>
              ) : null}
              {order.totalShipping ? (
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd>
                    <Money data={order.totalShipping} />
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd>{order.totalTax ? <Money data={order.totalTax} /> : '—'}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>
                  <Money data={order.totalPrice!} />
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="ship-to" className="rounded-brand border border-border p-6 text-sm">
            <h3 id="ship-to" className="mb-2 font-body text-base font-semibold tracking-normal">
              Shipping address
            </h3>
            {order.shippingAddress ? (
              <address className="not-italic">
                {order.shippingAddress.formatted.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-muted">No shipping address</p>
            )}
          </section>

          <section className="rounded-brand border border-border p-6 text-sm">
            <h3 className="mb-2 font-body text-base font-semibold tracking-normal">Need help?</h3>
            <p className="text-muted">
              To start a return, review our{' '}
              <Link to="/policies/refund-policy" className="underline">
                refund policy
              </Link>{' '}
              or{' '}
              <Link to="/contact" className="underline">
                contact us
              </Link>{' '}
              with your order number.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <li className="flex gap-4 p-5">
      <div className="size-20 shrink-0 overflow-hidden rounded-[calc(var(--brand-radius)-0.25rem)] bg-surface">
        {lineItem.image ? (
          <Image data={lineItem.image} width={96} height={96} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-wrap justify-between gap-2 text-sm">
        <div>
          <p className="font-medium">{lineItem.title}</p>
          {lineItem.variantTitle ? <p className="text-muted">{lineItem.variantTitle}</p> : null}
          <p className="text-muted">Qty {lineItem.quantity}</p>
        </div>
        <div className="text-right">
          {lineItem.totalPrice ? <Money data={lineItem.totalPrice} className="font-medium" /> : null}
          {lineItem.price && lineItem.quantity > 1 ? (
            <p className="text-xs text-muted">
              <Money data={lineItem.price} as="span" /> each
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {useRef} from 'react';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {Button, ButtonLink} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {inputClasses} from '~/components/ui/primitives';
import {OrderStatusBadge} from '~/components/account/OrderStatusBadge';
import {formatDate} from '~/lib/format';
import {cn} from '~/lib/cn';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => [{title: 'Orders'}, {name: 'robots', content: 'noindex'}];

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Orders</h2>
      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

function OrdersTable({
  orders,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);
  return (
    <div aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders} as="ul" resourcesClassName="space-y-3">
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

function EmptyOrders({hasFilters = false}: {hasFilters?: boolean}) {
  return (
    <div className="rounded-brand border border-dashed border-border py-14 text-center">
      {hasFilters ? (
        <>
          <p className="font-medium">No orders match your search.</p>
          <Link to="/account/orders" className="mt-3 inline-block text-sm underline underline-offset-4">
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p className="font-medium">You haven&apos;t placed any orders yet.</p>
          <ButtonLink to="/collections/all" className="mt-5">
            Start shopping
          </ButtonLink>
        </>
      )}
    </div>
  );
}

function OrderSearchForm({currentFilters}: {currentFilters: OrderFilterParams}) {
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching = navigation.state !== 'idle' && navigation.location?.pathname?.includes('orders');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData.get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)?.toString().trim();
    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber) params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);
    setSearchParams(params);
  };

  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;

  return (
    <form ref={formRef} onSubmit={handleSubmit} aria-label="Search orders" className="flex flex-col gap-3 sm:flex-row">
      <input
        type="search"
        name={ORDER_FILTER_FIELDS.NAME}
        placeholder="Order #"
        aria-label="Order number"
        defaultValue={currentFilters.name || ''}
        className={cn(inputClasses, 'h-11 py-2')}
      />
      <input
        type="search"
        name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
        placeholder="Confirmation #"
        aria-label="Confirmation number"
        defaultValue={currentFilters.confirmationNumber || ''}
        className={cn(inputClasses, 'h-11 py-2')}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={isSearching}>
          Search
        </Button>
        {hasFilters ? (
          <Button
            variant="ghost"
            disabled={isSearching}
            onClick={() => {
              setSearchParams(new URLSearchParams());
              formRef.current?.reset();
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function OrderItem({order}: {order: OrderItemFragment}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status ?? order.fulfillmentStatus;
  return (
    <li>
      <Link
        to={`/account/orders/${btoa(order.id)}`}
        className="flex flex-wrap items-center justify-between gap-4 rounded-brand border border-border p-5 transition hover:border-foreground"
      >
        <div>
          <p className="font-semibold">Order #{order.number}</p>
          <p className="mt-1 text-sm text-muted">
            {formatDate(order.processedAt)}
            {order.confirmationNumber ? ` · Confirmation ${order.confirmationNumber}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <OrderStatusBadge status={fulfillmentStatus} />
          <Money data={order.totalPrice} className="font-medium" />
          <Icon name="chevronRight" className="size-4" />
        </div>
      </Link>
    </li>
  );
}

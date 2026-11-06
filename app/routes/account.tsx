import {data as remixData, Form, NavLink, Outlet, useLoaderData} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {Icon, type IconName} from '~/components/ui/Icon';
import {seoMeta} from '~/lib/seo';
import {cn} from '~/lib/cn';

export const meta: Route.MetaFunction = () => seoMeta({title: 'Your account', noindex: true});

export function shouldRevalidate() {
  return true;
}

/**
 * Authenticated area powered by Shopify's Customer Account API (OAuth 2.0 +
 * PKCE handled by Hydrogen). Unauthenticated visitors are redirected to
 * Shopify's hosted login by `customerAccount.query`.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {language: customerAccount.i18n.language},
  });

  if (errors?.length || !data?.customer) {
    throw new Response('Customer not found', {status: 404});
  }

  return remixData(
    {customer: data.customer},
    {headers: {'Cache-Control': 'no-cache, no-store, must-revalidate'}},
  );
}

const NAV: {to: string; label: string; icon: IconName; end?: boolean}[] = [
  {to: '/account', label: 'Overview', icon: 'user', end: true},
  {to: '/account/orders', label: 'Orders', icon: 'package'},
  {to: '/account/profile', label: 'Profile & settings', icon: 'info'},
  {to: '/account/addresses', label: 'Addresses', icon: 'map'},
];

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const heading = customer.firstName ? `Hi, ${customer.firstName}` : 'Your account';

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <p className="eyebrow mb-2">Account</p>
        <h1 className="text-4xl md:text-5xl">{heading}</h1>
      </header>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Account">
          <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
            {NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  prefetch="intent"
                  className={({isActive}) =>
                    cn(
                      'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition lg:rounded-brand',
                      isActive ? 'bg-foreground text-background' : 'hover:bg-surface',
                    )
                  }
                >
                  <Icon name={item.icon} className="size-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="shrink-0 lg:mt-4 lg:border-t lg:border-border lg:pt-4">
              <Form method="POST" action="/account/logout">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground lg:rounded-brand"
                >
                  <Icon name="logout" className="size-4" />
                  Sign out
                </button>
              </Form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet context={{customer}} />
        </div>
      </div>
    </div>
  );
}

import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {ThirdPartyAnalytics} from './components/ThirdPartyAnalytics';
import {ButtonLink} from './components/ui/Button';
import {siteConfig} from './config/site';
import {buildThemeCss, themeInitScript} from './lib/theme';
import {organizationJsonLd, websiteJsonLd} from './lib/seo';
import {logger} from './lib/logger';

export type RootLoader = typeof loader;

/**
 * Avoid re-fetching root queries (menus, shop) on every navigation.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // Revalidate after mutations (add to cart, login...).
  if (formMethod && formMethod !== 'GET') return true;
  // Revalidate when manually revalidating via useRevalidator.
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export function links() {
  const fontLinks = siteConfig.theme.fonts.googleFontsHref
    ? [
        {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
        {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const},
        {rel: 'stylesheet', href: siteConfig.theme.fonts.googleFontsHref},
      ]
    : [];
  return [
    {rel: 'preconnect', href: 'https://cdn.shopify.com'},
    {rel: 'preconnect', href: 'https://shop.app'},
    ...fontLinks,
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  const {storefront, env} = args.context;
  const origin = new URL(args.request.url).origin;

  return {
    ...deferredData,
    ...criticalData,
    origin,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      // Shopify's cookie banner. Configure regions & copy in Shopify admin →
      // Settings → Customer privacy.
      withPrivacyBanner: env.PUBLIC_PRIVACY_BANNER === 'true',
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    analyticsIds: {
      ga4: env.PUBLIC_GA4_MEASUREMENT_ID,
      gtm: env.PUBLIC_GTM_CONTAINER_ID,
      metaPixel: env.PUBLIC_META_PIXEL_ID,
      tiktokPixel: env.PUBLIC_TIKTOK_PIXEL_ID,
      pinterestTag: env.PUBLIC_PINTEREST_TAG_ID,
      klaviyo: env.PUBLIC_KLAVIYO_COMPANY_ID,
    },
  };
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {headerMenuHandle: siteConfig.menus.headerHandle},
    }),
  ]);
  return {header};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {footerMenuHandle: siteConfig.menus.footerHandle},
    })
    .catch((error: Error) => {
      logger.warn('footer_query_failed', {error});
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const origin = data?.origin ?? '';
  const logoUrl = data?.header?.shop?.brand?.logo?.image?.url ?? null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <meta name="theme-color" content={siteConfig.theme.light.background} />
        <style nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: buildThemeCss()}} />
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: themeInitScript()}} />
        <link rel="stylesheet" href={tailwindCss} />
        <Meta />
        <Links />
        {origin ? (
          <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                organizationJsonLd(origin, logoUrl),
                websiteJsonLd(origin),
              ]).replace(/</g, '\\u003c'),
            }}
          />
        ) : null}
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider cart={data.cart} shop={data.shop} consent={data.consent}>
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
      <ThirdPartyAnalytics ids={data.analyticsIds} />
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  let message = 'Something went wrong on our end. Please try again.';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) message = 'We couldn’t find the page you were looking for.';
  } else if (error instanceof Error && process.env.NODE_ENV !== 'production') {
    message = error.message;
  }

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Error {status}</p>
      <h1 className="mt-3 text-4xl md:text-6xl">
        {status === 404 ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-4 max-w-md text-muted">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/collections/all" variant="outline">
          Shop all products
        </ButtonLink>
      </div>
    </div>
  );
}

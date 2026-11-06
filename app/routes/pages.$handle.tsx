import {useLoaderData} from 'react-router';
import type {Route} from './+types/pages.$handle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ContentPage} from '~/components/ContentPage';
import {canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) =>
  data
    ? seoMeta({
        title: data.page.seo?.title ?? data.page.title,
        description: data.page.seo?.description ?? data.page.body,
        url: data.canonical,
      })
    : seoMeta({title: 'Page not found', noindex: true});

/** Any Shopify page (Online Store → Pages) at /pages/:handle. */
export async function loader({context, request, params}: Route.LoaderArgs) {
  if (!params.handle) throw new Response('Not Found', {status: 404});
  const {page} = await context.storefront.query(PAGE_QUERY, {
    variables: {handle: params.handle},
    cache: context.storefront.CacheLong(),
  });
  if (!page) throw new Response('Not Found', {status: 404});
  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});
  return {page, canonical: canonicalUrl(request.url)};
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();
  return <ContentPage title={page.title} html={page.body} path={`/pages/${page.handle}`} />;
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

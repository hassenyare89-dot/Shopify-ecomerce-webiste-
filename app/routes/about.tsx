import {useLoaderData} from 'react-router';
import type {Route} from './+types/about';
import {ContentPage} from '~/components/ContentPage';
import {ButtonLink} from '~/components/ui/Button';
import {TrustSection} from '~/components/home/sections';
import {LEGAL_PAGE_QUERY} from '~/lib/legal.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.page?.seo?.title ?? 'About us',
    description: data?.page?.seo?.description ?? siteConfig.brandStory.body,
    url: data?.canonical,
  });

/** Uses the Shopify page with handle "about" if present; otherwise the configured brand story. */
export async function loader({context, request}: Route.LoaderArgs) {
  const {page} = await context.storefront.query(LEGAL_PAGE_QUERY, {
    variables: {handle: 'about'},
    cache: context.storefront.CacheLong(),
  });
  return {page, canonical: canonicalUrl(request.url)};
}

export default function About() {
  const {page} = useLoaderData<typeof loader>();
  return (
    <>
      {page ? (
        <ContentPage eyebrow="Our story" title={page.title} html={page.body} path="/about" />
      ) : (
        <ContentPage eyebrow="Our story" title={siteConfig.brandStory.heading} path="/about">
          <p className="text-lg leading-8 text-foreground/85">{siteConfig.brandStory.body}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink to="/collections/all">Shop the collection</ButtonLink>
            <ButtonLink to="/contact" variant="outline">
              Get in touch
            </ButtonLink>
          </div>
        </ContentPage>
      )}
      <TrustSection />
    </>
  );
}

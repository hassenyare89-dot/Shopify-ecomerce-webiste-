import {useLoaderData} from 'react-router';
import type {Route} from './+types/cookie-policy';
import {ContentPage} from '~/components/ContentPage';
import {LegalTemplate} from '~/components/LegalTemplate';
import {loadLegalPage} from '~/lib/legal.server';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: data?.page?.seo?.title ?? data?.page?.title ?? data?.template?.title,
    description: data?.page?.seo?.description ?? data?.template?.intro,
    url: data?.canonical,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const result = await loadLegalPage(context.storefront, 'cookie-policy');
  return {...result, canonical: canonicalUrl(request.url)};
}

export default function LegalPage() {
  const {page, template} = useLoaderData<typeof loader>();
  if (page) {
    return <ContentPage title={page.title} html={page.body} path="/cookie-policy" />;
  }
  return (
    <ContentPage
      title={template!.title}
      intro={template!.intro}
      path="/cookie-policy"
      updatedAt={siteConfig.legal.lastUpdated}
      templateNotice={!siteConfig.legal.templatesReviewed}
    >
      <LegalTemplate doc={template!} />
    </ContentPage>
  );
}

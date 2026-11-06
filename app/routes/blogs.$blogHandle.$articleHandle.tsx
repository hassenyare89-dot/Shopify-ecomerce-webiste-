import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {formatDate} from '~/lib/format';
import {articleJsonLd, breadcrumbJsonLd, canonicalUrl, seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data) return seoMeta({title: 'Article not found', noindex: true});
  const {article, canonical, origin, blogHandle} = data;
  return seoMeta({
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.contentHtml,
    url: canonical,
    image: article.image,
    type: 'article',
    jsonLd: [
      articleJsonLd({
        url: canonical,
        title: article.title,
        description: article.seo?.description ?? article.contentHtml,
        image: article.image?.url,
        publishedAt: article.publishedAt,
        author: article.author?.name,
      }),
      breadcrumbJsonLd(origin, [
        {name: 'Home', path: '/'},
        {name: 'Journal', path: `/blogs/${blogHandle}`},
        {name: article.title, path: `/blogs/${blogHandle}/${article.handle}`},
      ]),
    ],
  });
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
      cache: context.storefront.CacheLong(),
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  return {
    article,
    blogHandle,
    origin: new URL(request.url).origin,
    canonical: canonicalUrl(request.url),
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const {article, blogHandle} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs
        crumbs={[
          {name: 'Home', path: '/'},
          {name: 'Journal', path: `/blogs/${blogHandle}`},
          {name: title, path: `/blogs/${blogHandle}/${article.handle}`},
        ]}
      />
      <article className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <p className="text-sm text-muted">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, {style: 'long'})}</time>
            {author?.name ? <> · {author.name}</> : null}
          </p>
          <h1 className="mt-3 text-4xl md:text-6xl">{title}</h1>
        </header>
        {image ? (
          <div className="mb-12 overflow-hidden rounded-brand">
            <Image data={image} sizes="(min-width: 768px) 768px, 100vw" loading="eager" className="w-full" />
          </div>
        ) : null}
        <div className="prose-store text-lg" dangerouslySetInnerHTML={{__html: contentHtml}} />
      </article>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const;

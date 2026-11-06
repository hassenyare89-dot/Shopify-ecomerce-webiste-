import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle._index';
import {Image, getPaginationVariables} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {formatDate} from '~/lib/format';
import {seoMeta} from '~/lib/seo';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({title: data?.blog.seo?.title ?? data?.blog.title ?? 'Journal', description: data?.blog.seo?.description});

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
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  if (!params.blogHandle) {
    throw new Response(`blog not found`, {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.blogHandle, data: blog});

  return {blog};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blog() {
  const {blog} = useLoaderData<typeof loader>();
  const {articles} = blog;

  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs crumbs={[{name: 'Home', path: '/'}, {name: 'Journal', path: '/blogs'}, {name: blog.title, path: `/blogs/${blog.handle}`}]} />
      <header className="mb-12 max-w-2xl">
        <p className="eyebrow mb-2">Journal</p>
        <h1 className="text-4xl md:text-6xl">{blog.title}</h1>
      </header>
      <PaginatedResourceSection<ArticleItemFragment>
        connection={articles}
        as="ul"
        resourcesClassName="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {({node: article, index}) => (
          <ArticleItem article={article} key={article.id} loading={index < 3 ? 'eager' : 'lazy'} />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

function ArticleItem({article, loading}: {article: ArticleItemFragment; loading?: HTMLImageElement['loading']}) {
  return (
    <li>
      <Link to={`/blogs/${article.blog.handle}/${article.handle}`} className="group block" prefetch="intent">
        <div className="aspect-[3/2] overflow-hidden rounded-brand bg-surface">
          {article.image ? (
            <Image
              alt={article.image.altText || article.title}
              aspectRatio="3/2"
              data={article.image}
              loading={loading}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : null}
        </div>
        <p className="mt-4 text-xs text-muted">{formatDate(article.publishedAt!, {style: 'long'})}</p>
        <h2 className="mt-1 text-xl group-hover:underline underline-offset-4">{article.title}</h2>
      </Link>
    </li>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          hasNextPage
          endCursor
          startCursor
        }

      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
` as const;

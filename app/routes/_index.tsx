import {Suspense} from 'react';
import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {siteConfig, type HomeSectionId} from '~/config/site';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {
  getMetaobjects,
  mapNodes,
  toFaqEntry,
  toHeroSlide,
  toPromoBanner,
  toSocialPost,
  toTestimonial,
  type HeroSlide,
} from '~/lib/content';
import {canonicalUrl, parseRating, seoMeta} from '~/lib/seo';
import {logger} from '~/lib/logger';
import {
  BrandStorySection,
  CategoriesSection,
  FaqPreviewSection,
  FeaturedCollectionSection,
  HeroSection,
  LimitedOfferSection,
  NewsletterSection,
  PromoBannersSection,
  RailSection,
  ReviewsSection,
  SocialSection,
  TestimonialsSection,
  TrustSection,
} from '~/components/home/sections';
import {ProductGridSkeleton} from '~/components/ui/primitives';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: null,
    description: siteConfig.description,
    url: data?.canonical,
    image: data?.heroImage ?? null,
  });

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData, canonical: canonicalUrl(args.request.url, '/')};
}

/** Above-the-fold data: hero, categories and the first product rails. */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const data = await storefront.query(HOMEPAGE_QUERY, {cache: storefront.CacheShort()});

  const heroSlides = mapNodes(data.heroSlides?.nodes, toHeroSlide);
  const fallbackSlide: HeroSlide = {
    id: 'config',
    eyebrow: siteConfig.hero.eyebrow,
    heading: siteConfig.hero.heading,
    subheading: siteConfig.hero.subheading,
  };
  const bestSellers = data.bestSellers.nodes;
  const productImages = bestSellers
    .map((p) => p.featuredImage)
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .slice(0, 3);

  const categoryHandles = siteConfig.collections.categories as readonly string[];
  const categories = data.collections.nodes
    .filter((c) => c.handle !== 'frontpage')
    .filter((c) => !categoryHandles.length || categoryHandles.includes(c.handle))
    .filter((c) => c.image);

  const slide = heroSlides[0] ?? fallbackSlide;
  return {
    hero: slide,
    heroImage: slide.image ?? productImages[0] ?? null,
    productImages,
    categories,
    bestSellers,
    newArrivals: data.newArrivals.nodes,
  };
}

/** Below-the-fold data is streamed; failures never break the page. */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const safe = <T,>(p: Promise<T>, fallback: T, label: string) =>
    p.catch((error: unknown) => {
      logger.warn('home_section_failed', {section: label, error});
      return fallback;
    });

  const collectionRail = (handle: string) =>
    safe(
      storefront
        .query(COLLECTION_RAIL_QUERY, {variables: {handle}, cache: storefront.CacheShort()})
        .then((d) => d.collection ?? null),
      null,
      `collection:${handle}`,
    );

  return {
    featuredCollections: Promise.all(siteConfig.collections.featured.map(collectionRail)).then((list) =>
      list.filter((c): c is NonNullable<typeof c> => Boolean(c?.products.nodes.length)),
    ),
    trending: collectionRail(siteConfig.collections.trending),
    limitedOffer: siteConfig.limitedOffer.enabled
      ? collectionRail(siteConfig.limitedOffer.collectionHandle)
      : Promise.resolve(null),
    testimonials: getMetaobjects(storefront, 'testimonial').then((n) => mapNodes(n, toTestimonial)),
    faqs: getMetaobjects(storefront, 'faq_item').then((n) => {
      const entries = mapNodes(n, toFaqEntry);
      return entries.length
        ? entries
        : siteConfig.faq.map((f, i) => ({id: `config-${i}`, ...f}));
    }),
    promoBanners: getMetaobjects(storefront, 'promo_banner').then((n) => mapNodes(n, toPromoBanner)),
    socialPosts: getMetaobjects(storefront, 'social_post').then((n) => mapNodes(n, toSocialPost)),
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const topRated = topRatedProducts([...data.bestSellers, ...data.newArrivals]);

  const sections: Record<HomeSectionId, React.ReactNode> = {
    hero: <HeroSection slide={data.hero} productImages={data.productImages} />,
    categories: <CategoriesSection collections={data.categories} />,
    bestSellers: (
      <RailSection
        eyebrow="Most loved"
        title="Best sellers"
        products={data.bestSellers}
        action={{label: 'Shop best sellers', to: '/best-sellers'}}
      />
    ),
    newArrivals: (
      <RailSection
        eyebrow="Just landed"
        title="New arrivals"
        products={data.newArrivals}
        action={{label: 'Shop new arrivals', to: '/new-arrivals'}}
      />
    ),
    featuredCollections: (
      <Deferred resolve={data.featuredCollections}>
        {(collections) =>
          collections.map((c) => (
            <FeaturedCollectionSection key={c.id} collection={{...c, products: c.products.nodes}} />
          ))
        }
      </Deferred>
    ),
    trending: (
      <Deferred resolve={data.trending}>
        {(c) =>
          c ? (
            <RailSection
              eyebrow="Trending"
              title={c.title}
              products={c.products.nodes}
              action={{label: 'View all', to: `/collections/${c.handle}`}}
            />
          ) : null
        }
      </Deferred>
    ),
    limitedOffers: (
      <Deferred resolve={data.limitedOffer}>
        {(c) => (c ? <LimitedOfferSection products={c.products.nodes} /> : null)}
      </Deferred>
    ),
    promoBanners: (
      <Deferred resolve={data.promoBanners}>{(b) => <PromoBannersSection banners={b} />}</Deferred>
    ),
    testimonials: (
      <Deferred resolve={data.testimonials}>{(t) => <TestimonialsSection testimonials={t} />}</Deferred>
    ),
    reviews: <ReviewsSection products={topRated} />,
    brandStory: <BrandStorySection image={data.categories[1]?.image ?? null} />,
    trust: <TrustSection />,
    faq: <Deferred resolve={data.faqs}>{(f) => <FaqPreviewSection items={f} />}</Deferred>,
    social: <Deferred resolve={data.socialPosts}>{(p) => <SocialSection posts={p} />}</Deferred>,
    newsletter: <NewsletterSection />,
  };

  return (
    <div className="home">
      {siteConfig.homeSections.map((id) => (
        <div key={id} data-section={id}>
          {sections[id]}
        </div>
      ))}
    </div>
  );
}

function Deferred<T>({
  resolve,
  children,
}: {
  resolve: Promise<T>;
  children: (value: T) => React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="container-page py-12">
          <ProductGridSkeleton count={4} />
        </div>
      }
    >
      <Await resolve={resolve} errorElement={null}>
        {(value) => <>{children(value)}</>}
      </Await>
    </Suspense>
  );
}

/** Products with real review ratings (≥4), highest first. */
function topRatedProducts(products: ProductCardFragment[]) {
  const seen = new Set<string>();
  return products
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({p, r: parseRating(p.rating?.value, p.ratingCount?.value)}))
    .filter((x) => x.r && x.r.value >= 4)
    .sort((a, b) => (b.r!.value - a.r!.value) || (b.r!.count - a.r!.count))
    .map((x) => x.p)
    .slice(0, 8);
}

const HOMEPAGE_QUERY = `#graphql
  query Homepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    heroSlides: metaobjects(type: "hero_slide", first: 3) {
      nodes {
        id
        handle
        type
        fields {
          key
          type
          value
          reference {
            __typename
            ... on MediaImage {
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
    collections(first: 12, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
    bestSellers: products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
    newArrivals: products(first: 8, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

const COLLECTION_RAIL_QUERY = `#graphql
  query CollectionRail(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        id
        url
        altText
        width
        height
      }
      products(first: 8) {
        nodes {
          ...ProductCard
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

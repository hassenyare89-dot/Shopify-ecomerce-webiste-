import {Suspense} from 'react';
import {Await, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {ProductGallery} from '~/components/product/ProductGallery';
import {ProductRail} from '~/components/ProductRail';
import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {Accordion, Badge, ProductGridSkeleton, Rating} from '~/components/ui/primitives';
import {Icon} from '~/components/ui/Icon';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';
import {richTextToPlain} from '~/lib/content';
import {discountPercentage} from '~/lib/format';
import {breadcrumbJsonLd, canonicalUrl, parseRating, productJsonLd, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';
import {logger} from '~/lib/logger';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data) return seoMeta({title: 'Product not found', noindex: true});
  const {product, canonical, origin, rating} = data;
  const image = product.media.nodes.find((m) => m.__typename === 'MediaImage')?.previewImage;
  return seoMeta({
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
    url: canonical,
    image: image ?? null,
    type: 'product',
    jsonLd: [
      productJsonLd({
        url: canonical,
        title: product.title,
        description: product.description,
        vendor: product.vendor,
        handle: product.handle,
        images: product.media.nodes
          .map((m) => m.previewImage)
          .filter((i): i is NonNullable<typeof i> => Boolean(i)),
        variants: product.variants.nodes,
        rating,
      }),
      breadcrumbJsonLd(origin, [
        {name: 'Home', path: '/'},
        {name: 'Shop', path: '/collections/all'},
        {name: product.title, path: `/products/${product.handle}`},
      ]),
    ],
  });
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  if (!handle) throw new Response('Expected product handle', {status: 400});

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(request),
      withInventory: siteConfig.product.showInventoryCount,
      specsNamespace: siteConfig.product.specsMetafield.namespace,
      specsKey: siteConfig.product.specsMetafield.key,
      sizeChartNamespace: siteConfig.product.sizeChartMetafield.namespace,
      sizeChartKey: siteConfig.product.sizeChartMetafield.key,
    },
    cache: storefront.CacheShort(),
  });

  if (!product?.id) throw new Response('Product not found', {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: product});

  const url = new URL(request.url);
  return {
    product,
    origin: url.origin,
    canonical: canonicalUrl(request.url, `/products/${product.handle}`),
    rating: parseRating(product.rating?.value, product.ratingCount?.value),
  };
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  const {storefront} = context;
  const handle = params.handle!;
  const recommendations = storefront
    .query(RECOMMENDATIONS_QUERY, {variables: {handle}, cache: storefront.CacheLong()})
    .then((data) => {
      const related = data.related ?? [];
      const complementary = data.complementary ?? [];
      return {related, complementary};
    })
    .catch((error: unknown) => {
      logger.warn('recommendations_failed', {error, handle});
      return {related: [], complementary: []};
    });
  return {recommendations};
}

export default function Product() {
  const {product, rating, recommendations} = useLoaderData<typeof loader>();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const pct = discountPercentage(selectedVariant?.price, selectedVariant?.compareAtPrice);
  const specs = richTextToPlain(product.specs?.value ?? undefined);
  const sizeChart = product.sizeChart;
  const sizeChartPage = sizeChart?.reference?.__typename === 'Page' ? sizeChart.reference : null;
  const sizeChartText = !sizeChartPage ? richTextToPlain(sizeChart?.value ?? undefined) : undefined;
  const collection = product.collections.nodes[0];

  return (
    <div className="container-page py-6 md:py-10">
      <Breadcrumbs
        crumbs={[
          {name: 'Home', path: '/'},
          collection
            ? {name: collection.title, path: `/collections/${collection.handle}`}
            : {name: 'Shop', path: '/collections/all'},
          {name: product.title, path: `/products/${product.handle}`},
        ]}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery
          media={product.media.nodes}
          selectedImageUrl={selectedVariant?.image?.url}
          title={product.title}
        />

        <div className="lg:sticky lg:top-28 lg:h-fit">
          {product.vendor ? <p className="eyebrow mb-3">{product.vendor}</p> : null}
          <h1 className="text-3xl md:text-4xl lg:text-5xl">{product.title}</h1>
          {rating ? (
            <a href="#reviews" className="mt-3 inline-flex">
              <Rating value={rating.value} count={rating.count} scaleMax={rating.scaleMax} size="md" />
            </a>
          ) : null}
          <div className="mt-5 flex items-center gap-3">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
              size="lg"
            />
            {pct ? <Badge tone="sale">Save {pct}%</Badge> : null}
          </div>
          {selectedVariant?.unitPrice && selectedVariant.unitPriceMeasurement?.referenceUnit ? (
            <p className="mt-1 text-xs text-muted">
              Unit price: {selectedVariant.unitPrice.amount} {selectedVariant.unitPrice.currencyCode} /{' '}
              {selectedVariant.unitPriceMeasurement.referenceValue === 1 ? '' : selectedVariant.unitPriceMeasurement.referenceValue}
              {selectedVariant.unitPriceMeasurement.referenceUnit}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            Taxes and <Link to="/policies/shipping-policy" className="underline">shipping</Link> calculated at checkout.
          </p>

          <div className="mt-8">
            <ProductForm productOptions={productOptions} selectedVariant={selectedVariant} product={product} />
          </div>

          <ul className="mt-8 grid gap-3 rounded-brand bg-surface p-5 text-sm">
            <li className="flex gap-3">
              <Icon name="truck" className="size-5 shrink-0" />
              <span>{siteConfig.product.deliveryNote}</span>
            </li>
            <li className="flex gap-3">
              <Icon name="return" className="size-5 shrink-0" />
              <span>
                {siteConfig.product.returnsNote}{' '}
                <Link to="/policies/refund-policy" className="underline underline-offset-2">
                  Returns policy
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <Icon name="lock" className="size-5 shrink-0" />
              <span>Secure checkout powered by Shopify</span>
            </li>
          </ul>

          <div className="mt-8 border-t border-border">
            <Accordion title="Description" defaultOpen>
              <div className="prose-store" dangerouslySetInnerHTML={{__html: product.descriptionHtml}} />
            </Accordion>
            {specs ? (
              <Accordion title="Specifications">
                <p className="whitespace-pre-line">{specs}</p>
              </Accordion>
            ) : null}
            {sizeChartPage || sizeChartText ? (
              <div id="size-guide">
                <Accordion title="Size guide">
                  {sizeChartPage ? (
                    <div className="prose-store" dangerouslySetInnerHTML={{__html: sizeChartPage.body}} />
                  ) : (
                    <p className="whitespace-pre-line">{sizeChartText}</p>
                  )}
                </Accordion>
              </div>
            ) : null}
            <Accordion title="Shipping & returns">
              <p>{siteConfig.product.deliveryNote}</p>
              <p className="mt-2">
                Read our{' '}
                <Link to="/policies/shipping-policy" className="underline">shipping policy</Link> and{' '}
                <Link to="/policies/refund-policy" className="underline">refund policy</Link>.
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      <section id="reviews" aria-labelledby="reviews-heading" className="mt-20 border-t border-border pt-12">
        <h2 id="reviews-heading" className="text-2xl md:text-3xl">
          Customer reviews
        </h2>
        {rating ? (
          <div className="mt-4 flex items-center gap-4">
            <span className="font-heading text-5xl">{rating.value}</span>
            <div>
              <Rating value={rating.value} scaleMax={rating.scaleMax} size="md" />
              <p className="mt-1 text-sm text-muted">Based on {rating.count} reviews</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No reviews yet.</p>
        )}
        {/* Mount point for a review app widget (Judge.me, Yotpo, Okendo…). See docs/INTEGRATIONS.md. */}
        <div id="product-reviews-widget" data-product-id={product.id} />
      </section>

      <Suspense
        fallback={
          <div className="mt-20">
            <ProductGridSkeleton count={4} />
          </div>
        }
      >
        <Await resolve={recommendations}>
          {({related, complementary}) => (
            <div className="mt-20 space-y-20">
              {complementary.length ? <ProductRail title="Pairs well with" products={complementary} /> : null}
              {related.length ? <ProductRail title="You may also like" products={related} /> : null}
            </div>
          )}
        </Await>
      </Suspense>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    quantityAvailable @include(if: $withInventory)
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
      id
      vendor
    }
    requiresShipping
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    unitPriceMeasurement {
      referenceUnit
      referenceValue
    }
  }
` as const;

const PRODUCT_MEDIA_FRAGMENT = `#graphql
  fragment ProductMedia on Media {
    __typename
    id
    alt
    mediaContentType
    previewImage {
      url
      altText
      width
      height
    }
    ... on MediaImage {
      image {
        id
        url
        altText
        width
        height
      }
    }
    ... on Video {
      sources {
        url
        mimeType
        width
        height
      }
    }
    ... on ExternalVideo {
      embedUrl
      host
    }
    ... on Model3d {
      sources {
        url
        mimeType
      }
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    productType
    tags
    encodedVariantExistence
    encodedVariantAvailability
    collections(first: 1) {
      nodes {
        handle
        title
      }
    }
    media(first: 20) {
      nodes {
        ...ProductMedia
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 100) {
      nodes {
        id
        sku
        title
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
    seo {
      description
      title
    }
    rating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    ratingCount: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
    specs: metafield(namespace: $specsNamespace, key: $specsKey) {
      value
      type
    }
    sizeChart: metafield(namespace: $sizeChartNamespace, key: $sizeChartKey) {
      value
      type
      reference {
        __typename
        ... on Page {
          title
          body
        }
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
  ${PRODUCT_MEDIA_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
    $withInventory: Boolean!
    $specsNamespace: String!
    $specsKey: String!
    $sizeChartNamespace: String!
    $sizeChartKey: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    related: productRecommendations(productHandle: $handle, intent: RELATED) {
      ...ProductCard
    }
    complementary: productRecommendations(productHandle: $handle, intent: COMPLEMENTARY) {
      ...ProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {ProductPrice} from '~/components/ProductPrice';
import {AddToCartButton} from '~/components/AddToCartButton';
import {WishlistButton} from '~/components/WishlistButton';
import {Badge, Rating} from '~/components/ui/primitives';
import {discountPercentage, hasPriceRange} from '~/lib/format';
import {parseRating} from '~/lib/seo';
import {useVariantUrl} from '~/lib/variants';
import {siteConfig} from '~/config/site';
import {cn} from '~/lib/cn';

const NEW_PRODUCT_DAYS = 30;

export function isNewProduct(publishedAt?: string | null, now = Date.now()) {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  return now - published < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

export function ProductCard({
  product,
  loading,
  sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
  className,
}: {
  product: ProductCardFragment;
  loading?: 'eager' | 'lazy';
  sizes?: string;
  className?: string;
}) {
  const variant = product.selectedOrFirstAvailableVariant;
  const url = useVariantUrl(product.handle);
  const image = product.featuredImage ?? product.images.nodes[0];
  const hoverImage = product.images.nodes[1];
  const minPrice = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const pct = discountPercentage(minPrice, compareAt);
  const rating = parseRating(product.rating?.value, product.ratingCount?.value);
  const singleVariant = (product.variantsCount?.count ?? 0) <= 1;
  const canQuickAdd =
    siteConfig.features.quickAdd &&
    singleVariant &&
    variant?.availableForSale &&
    product.availableForSale;

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative overflow-hidden rounded-brand bg-surface">
        <Link
          to={url}
          prefetch="intent"
          className="block aspect-[4/5]"
          aria-label={product.title}
        >
          {image ? (
            <>
              <Image
                data={image}
                alt={image.altText || product.title}
                aspectRatio="4/5"
                sizes={sizes}
                loading={loading}
                className={cn(
                  'h-full w-full object-cover transition duration-700 ease-out-expo group-hover:scale-[1.03]',
                  hoverImage && 'group-hover:opacity-0',
                )}
              />
              {hoverImage ? (
                <Image
                  data={hoverImage}
                  alt=""
                  aria-hidden
                  aspectRatio="4/5"
                  sizes={sizes}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 ease-out-expo group-hover:scale-[1.03] group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No image
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {!product.availableForSale ? (
            <Badge tone="dark">Sold out</Badge>
          ) : pct ? (
            <Badge tone="sale">-{pct}%</Badge>
          ) : null}
          {product.availableForSale && isNewProduct(product.publishedAt) ? (
            <Badge>New</Badge>
          ) : null}
        </div>

        {siteConfig.features.wishlist ? (
          <div className="absolute top-2 right-2">
            <WishlistButton productId={product.id} productTitle={product.title} />
          </div>
        ) : null}

        {canQuickAdd && variant ? (
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
            <AddToCartButton
              variant="primary"
              size="sm"
              fullWidth
              ariaLabel={`Add ${product.title} to cart`}
              lines={[
                {
                  merchandiseId: variant.id,
                  quantity: 1,
                  selectedVariant: {
                    ...variant,
                    product: {...variant.product, id: product.id, vendor: product.vendor},
                    requiresShipping: true,
                  },
                },
              ]}
              successMessage={`${product.title} added to cart`}
            >
              Quick add
            </AddToCartButton>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {product.vendor ? (
          <p className="text-xs tracking-wide text-muted uppercase">
            {product.vendor}
          </p>
        ) : null}
        <h3 className="font-body text-[0.95rem] font-medium tracking-normal">
          <Link to={url} prefetch="intent" className="hover:underline underline-offset-4">
            {product.title}
          </Link>
        </h3>
        <ProductPrice
          price={minPrice}
          compareAtPrice={compareAt}
          fromPrice={hasPriceRange(product.priceRange)}
          size="sm"
        />
        {rating ? (
          <Rating value={rating.value} count={rating.count} scaleMax={rating.scaleMax} />
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  eagerCount = 4,
  className,
}: {
  products: ProductCardFragment[];
  eagerCount?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4',
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} loading={index < eagerCount ? 'eager' : 'lazy'} />
        </li>
      ))}
    </ul>
  );
}

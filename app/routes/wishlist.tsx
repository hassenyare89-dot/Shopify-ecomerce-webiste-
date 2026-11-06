import {useEffect} from 'react';
import {useFetcher} from 'react-router';
import type {Route} from './+types/wishlist';
import {ContentPage} from '~/components/ContentPage';
import {ProductGrid} from '~/components/ProductCard';
import {ButtonLink} from '~/components/ui/Button';
import {ProductGridSkeleton} from '~/components/ui/primitives';
import {Icon} from '~/components/ui/Icon';
import {useWishlist} from '~/lib/wishlist';
import {seoMeta} from '~/lib/seo';
import type {loader as wishlistApiLoader} from './api.wishlist';

export const meta: Route.MetaFunction = () => seoMeta({title: 'Wishlist', noindex: true});

/**
 * Saved products are stored on this device; product data (price,
 * availability) is fetched live from Shopify via /api/wishlist.
 */
export default function Wishlist() {
  const {items} = useWishlist();
  const fetcher = useFetcher<typeof wishlistApiLoader>();
  const key = items.join(',');

  useEffect(() => {
    if (key) void fetcher.load(`/api/wishlist?ids=${encodeURIComponent(key)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const products = (fetcher.data?.products ?? []).filter((p) => items.includes(p.id));
  const loading = Boolean(key) && (fetcher.state !== 'idle' || !fetcher.data);

  return (
    <ContentPage title="Wishlist" path="/wishlist" intro="Products you’ve saved on this device." wide>
      {!items.length ? (
        <div className="rounded-brand border border-dashed border-border py-16 text-center">
          <Icon name="heart" className="mx-auto size-8" />
          <p className="mt-4 font-heading text-2xl">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-muted">Tap the heart on any product to save it for later.</p>
          <ButtonLink to="/collections/all" className="mt-6">
            Discover products
          </ButtonLink>
        </div>
      ) : loading && !products.length ? (
        <ProductGridSkeleton count={Math.min(items.length, 4)} />
      ) : (
        <ProductGrid products={products} className="lg:grid-cols-3" />
      )}
      {items.length ? (
        <p className="mt-10 text-xs text-muted">
          Your wishlist is saved in this browser. It isn’t synced across devices.
        </p>
      ) : null}
    </ContentPage>
  );
}

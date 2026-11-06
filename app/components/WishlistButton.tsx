import {useWishlist} from '~/lib/wishlist';
import {Icon} from '~/components/ui/Icon';
import {useToast} from '~/components/ui/Toast';
import {cn} from '~/lib/cn';
import {useEffect, useState} from 'react';

export function WishlistButton({
  productId,
  productTitle,
  variant = 'floating',
}: {
  productId: string;
  productTitle: string;
  variant?: 'floating' | 'inline';
}) {
  const {has, toggle} = useWishlist();
  const toast = useToast();
  // Avoid hydration mismatch: localStorage is only read after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const saved = mounted && has(productId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productTitle} from wishlist` : `Save ${productTitle} to wishlist`}
      onClick={() => {
        const added = toggle(productId);
        toast(added ? 'Saved to your wishlist' : 'Removed from your wishlist', {
          tone: 'info',
        });
      }}
      className={cn(
        'inline-flex items-center justify-center transition',
        variant === 'floating'
          ? 'size-9 rounded-full bg-background/80 text-foreground shadow-soft backdrop-blur hover:scale-105 hover:bg-background'
          : 'size-13 shrink-0 rounded-full border border-foreground/20 hover:border-foreground',
      )}
    >
      <Icon
        name="heart"
        filled={saved}
        className={cn('size-[1.15rem]', saved && 'text-sale')}
      />
    </button>
  );
}

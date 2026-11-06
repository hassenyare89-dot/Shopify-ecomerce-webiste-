import {useEffect, useRef} from 'react';
import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {Button, type ButtonSize, type ButtonVariant} from '~/components/ui/Button';
import {useToast} from '~/components/ui/Toast';
import {useAside} from '~/components/Aside';

interface CartActionData {
  errors?: Array<{message: string}>;
  warnings?: Array<{message: string}>;
  userErrors?: Array<{message: string}>;
}

/**
 * Adds lines to the Shopify cart via the Cart API (`cartLinesAdd`).
 * With `buyNow`, the server action redirects straight to Shopify checkout
 * using the cart's real `checkoutUrl`.
 */
export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  buyNow = false,
  openCart = false,
  successMessage,
  ariaLabel,
  className,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  buyNow?: boolean;
  openCart?: boolean;
  successMessage?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <CartForm
      route="/cart"
      inputs={{lines}}
      action={CartForm.ACTIONS.LinesAdd}
      fetcherKey={buyNow ? `buy-now-${lines[0]?.merchandiseId}` : undefined}
    >
      {(fetcher: FetcherWithComponents<CartActionData>) => (
        <AddToCartInner
          fetcher={fetcher}
          analytics={analytics}
          disabled={disabled}
          onClick={onClick}
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          buyNow={buyNow}
          openCart={openCart}
          successMessage={successMessage}
          ariaLabel={ariaLabel}
          className={className}
        >
          {children}
        </AddToCartInner>
      )}
    </CartForm>
  );
}

function AddToCartInner({
  fetcher,
  analytics,
  disabled,
  onClick,
  children,
  variant,
  size,
  fullWidth,
  buyNow,
  openCart,
  successMessage,
  ariaLabel,
  className,
}: {
  fetcher: FetcherWithComponents<CartActionData>;
  analytics?: unknown;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth: boolean;
  buyNow: boolean;
  openCart: boolean;
  successMessage?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const toast = useToast();
  const {open} = useAside();
  const submitted = useRef(false);
  const busy = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.state !== 'idle' || !submitted.current) return;
    submitted.current = false;
    const data = fetcher.data;
    const problems = [
      ...(data?.errors ?? []),
      ...(data?.userErrors ?? []),
      ...(data?.warnings ?? []),
    ];
    if (problems.length) {
      toast(problems[0].message || 'Could not update your cart.', {tone: 'error'});
      return;
    }
    if (!buyNow) {
      if (openCart) open('cart');
      else if (successMessage) {
        toast(successMessage, {action: {label: 'View cart', onClick: () => open('cart')}});
      }
    }
  }, [fetcher.state, fetcher.data, toast, buyNow, openCart, open, successMessage]);

  return (
    <>
      <input name="analytics" type="hidden" value={JSON.stringify(analytics ?? {})} />
      {buyNow ? <input type="hidden" name="buyNow" value="1" /> : null}
      <Button
        type="submit"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        aria-label={ariaLabel}
        disabled={disabled || busy}
        loading={busy}
        onClick={() => {
          submitted.current = true;
          onClick?.();
        }}
      >
        {children}
      </Button>
    </>
  );
}

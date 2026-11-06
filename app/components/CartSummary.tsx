import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef} from 'react';
import {Link, useFetcher} from 'react-router';
import {Button, buttonClasses} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {inputClasses} from '~/components/ui/primitives';
import {useToast} from '~/components/ui/Toast';
import {cn} from '~/lib/cn';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

/**
 * Totals are rendered exclusively from Shopify's calculated `cart.cost`.
 * Shipping and final taxes are calculated by Shopify at checkout.
 */
export function CartSummary({cart, layout}: CartSummaryProps) {
  const summaryId = useId();
  const hasUnavailable = (cart?.lines?.nodes ?? []).some(
    (line) => line.merchandise.availableForSale === false,
  );

  return (
    <aside
      aria-labelledby={summaryId}
      className={cn(
        layout === 'page'
          ? 'h-fit rounded-brand border border-border bg-surface p-6 lg:sticky lg:top-28'
          : 'border-t border-border bg-background px-5 pt-4 pb-5',
      )}
    >
      <h2
        id={summaryId}
        className={cn(
          'font-body text-base font-semibold tracking-normal',
          layout === 'aside' && 'sr-only',
        )}
      >
        Order summary
      </h2>

      {layout === 'page' ? (
        <div className="mt-4 space-y-4 border-b border-border pb-5">
          <CartDiscounts discountCodes={cart?.discountCodes} />
          <CartGiftCard giftCardCodes={cart?.appliedGiftCards} />
          <CartNote note={cart?.note} />
        </div>
      ) : (
        <details className="group mb-3">
          <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm text-muted [&::-webkit-details-marker]:hidden">
            Discount code or gift card
            <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-3 pt-3">
            <CartDiscounts discountCodes={cart?.discountCodes} />
            <CartGiftCard giftCardCodes={cart?.appliedGiftCards} />
          </div>
        </details>
      )}

      <dl className={cn('space-y-2 text-sm', layout === 'page' && 'mt-5')}>
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-medium" data-testid="cart-subtotal">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart.cost.subtotalAmount} />
            ) : (
              '—'
            )}
          </dd>
        </div>
        {cart?.discountCodes
          ?.filter((d) => d.applicable)
          .map((d) => (
            <div key={d.code} className="flex justify-between text-success">
              <dt>Discount code</dt>
              <dd className="inline-flex items-center gap-1">
                <Icon name="check" className="size-3.5" />
                {d.code}
              </dd>
            </div>
          ))}
        <div className="flex justify-between text-muted">
          <dt>Shipping &amp; taxes</dt>
          <dd>Calculated at checkout</dd>
        </div>
        {cart?.cost?.totalAmount?.amount ? (
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Estimated total</dt>
            <dd data-testid="cart-total">
              <Money data={cart.cost.totalAmount} />
            </dd>
          </div>
        ) : null}
      </dl>

      {hasUnavailable ? (
        <p role="alert" className="mt-4 text-xs font-medium text-sale">
          Some items are no longer available. Remove them to continue.
        </p>
      ) : null}

      <CartCheckoutActions
        checkoutUrl={cart?.checkoutUrl}
        disabled={hasUnavailable || !!cart?.isOptimistic}
        layout={layout}
      />
    </aside>
  );
}

function CartCheckoutActions({
  checkoutUrl,
  disabled,
  layout,
}: {
  checkoutUrl?: string;
  disabled: boolean;
  layout: CartLayout;
}) {
  if (!checkoutUrl) return null;
  return (
    <div className="mt-5 space-y-3">
      {/* Full-page navigation to Shopify-hosted checkout. */}
      <a
        href={disabled ? undefined : checkoutUrl}
        aria-disabled={disabled || undefined}
        className={buttonClasses({
          size: 'lg',
          fullWidth: true,
          className: disabled ? 'pointer-events-none opacity-50' : '',
        })}
        data-testid="checkout-button"
      >
        <Icon name="lock" className="size-4" />
        Checkout
      </a>
      {layout === 'aside' ? (
        <Link
          to="/cart"
          className={buttonClasses({variant: 'outline', size: 'md', fullWidth: true})}
        >
          View cart
        </Link>
      ) : null}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Icon name="lock" className="size-3" />
        Secure checkout powered by Shopify
      </p>
    </div>
  );
}

function CartDiscounts({
  discountCodes,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
}) {
  const inputId = useId();
  const fetcher = useFetcher<{cart?: CartApiQueryFragment | null}>({key: 'discount-update'});
  const toast = useToast();
  const lastSubmitted = useRef<string | null>(null);
  const codes = discountCodes?.filter((d) => d.applicable).map(({code}) => code) ?? [];
  const notApplicable = discountCodes?.filter((d) => !d.applicable) ?? [];

  useEffect(() => {
    if (fetcher.state !== 'idle' || !lastSubmitted.current || !fetcher.data) return;
    const code = lastSubmitted.current;
    lastSubmitted.current = null;
    const match = fetcher.data.cart?.discountCodes?.find(
      (d) => d.code.toLowerCase() === code.toLowerCase(),
    );
    if (match?.applicable) toast(`Discount "${match.code}" applied`);
    else toast(`"${code}" isn't valid for your cart`, {tone: 'error'});
  }, [fetcher.state, fetcher.data, toast]);

  return (
    <section aria-label="Discount codes" className="space-y-2">
      {codes.length ? (
        <ul className="flex flex-wrap gap-2">
          {codes.map((code) => (
            <li key={code}>
              <CartForm
                route="/cart"
                action={CartForm.ACTIONS.DiscountCodesUpdate}
                inputs={{discountCodes: codes.filter((c) => c !== code)}}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
                  aria-label={`Remove discount ${code}`}
                >
                  {code}
                  <Icon name="close" className="size-3" />
                </button>
              </CartForm>
            </li>
          ))}
        </ul>
      ) : null}
      {notApplicable.length ? (
        <p className="text-xs text-sale">
          {notApplicable.map((d) => d.code).join(', ')} can&rsquo;t be applied to
          this cart.
        </p>
      ) : null}
      <fetcher.Form
        method="post"
        action="/cart"
        className="flex gap-2"
        onSubmit={(e) => {
          const value = new FormData(e.currentTarget).get('discountCode');
          lastSubmitted.current = typeof value === 'string' ? value.trim() : null;
        }}
      >
        <input
          type="hidden"
          name={CartForm.INPUT_NAME}
          value={JSON.stringify({
            action: CartForm.ACTIONS.DiscountCodesUpdate,
            inputs: {discountCodes: codes},
          })}
        />
        <label htmlFor={inputId} className="sr-only">
          Discount code
        </label>
        <input
          id={inputId}
          type="text"
          name="discountCode"
          placeholder="Discount code"
          autoComplete="off"
          maxLength={64}
          required
          className={cn(inputClasses, 'h-10 py-2')}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-10"
          loading={fetcher.state !== 'idle'}
        >
          Apply
        </Button>
      </fetcher.Form>
    </section>
  );
}

function CartGiftCard({
  giftCardCodes,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher({key: 'gift-card-add'});

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <section aria-label="Gift cards" className="space-y-2">
      {giftCardCodes?.length ? (
        <ul className="space-y-1 text-xs">
          {giftCardCodes.map((giftCard) => (
            <li key={giftCard.id} className="flex items-center justify-between">
              <span>
                Gift card •••• {giftCard.lastCharacters} (
                <Money data={giftCard.amountUsed} as="span" /> applied)
              </span>
              <CartForm
                route="/cart"
                action={CartForm.ACTIONS.GiftCardCodesRemove}
                inputs={{giftCardCodes: [giftCard.id]}}
              >
                <button
                  type="submit"
                  className="underline underline-offset-4"
                  aria-label={`Remove gift card ending in ${giftCard.lastCharacters}`}
                >
                  Remove
                </button>
              </CartForm>
            </li>
          ))}
        </ul>
      ) : null}
      <CartForm
        fetcherKey="gift-card-add"
        route="/cart"
        action={CartForm.ACTIONS.GiftCardCodesAdd}
      >
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Gift card code
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            autoComplete="off"
            maxLength={32}
            required
            className={cn(inputClasses, 'h-10 py-2')}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-10"
            loading={fetcher.state !== 'idle'}
          >
            Apply
          </Button>
        </div>
      </CartForm>
    </section>
  );
}

function CartNote({note}: {note?: string | null}) {
  const id = useId();
  const fetcher = useFetcher({key: 'cart-note'});
  return (
    <details className="group" open={Boolean(note)}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm [&::-webkit-details-marker]:hidden">
        Add a note to your order
        <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
      </summary>
      <fetcher.Form method="post" action="/cart" className="mt-3 space-y-2">
        <input
          type="hidden"
          name={CartForm.INPUT_NAME}
          value={JSON.stringify({action: CartForm.ACTIONS.NoteUpdate, inputs: {}})}
        />
        <label htmlFor={id} className="sr-only">
          Order note
        </label>
        <textarea
          id={id}
          name="note"
          defaultValue={note ?? ''}
          maxLength={500}
          rows={3}
          placeholder="Special instructions for your order"
          className={inputClasses}
        />
        <Button type="submit" variant="outline" size="sm" loading={fetcher.state !== 'idle'}>
          Save note
        </Button>
      </fetcher.Form>
    </details>
  );
}

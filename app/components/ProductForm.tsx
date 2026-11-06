import {useEffect, useId, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {Maybe, ProductOptionValueSwatch} from '@shopify/hydrogen/storefront-api-types';
import type {ProductFragment} from 'storefrontapi.generated';
import {AddToCartButton} from './AddToCartButton';
import {WishlistButton} from './WishlistButton';
import {ProductPrice} from './ProductPrice';
import {Icon} from '~/components/ui/Icon';
import {useToast} from '~/components/ui/Toast';
import {stockMessage} from '~/lib/format';
import {siteConfig} from '~/config/site';
import {cn} from '~/lib/cn';

type SelectedVariant = ProductFragment['selectedOrFirstAvailableVariant'];

const MAX_QTY = 20;

/**
 * Variant selection + purchase controls.
 * - Option values that don't exist are disabled; unavailable ones are shown
 *   crossed out but still selectable so shoppers can see "Sold out".
 * - Add to cart / Buy now are disabled for unavailable variants, and Shopify
 *   re-validates availability on every cart mutation and at checkout.
 */
export function ProductForm({
  productOptions,
  selectedVariant,
  product,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: SelectedVariant;
  product: Pick<ProductFragment, 'id' | 'title' | 'handle' | 'vendor'>;
}) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const available = Boolean(selectedVariant?.availableForSale);
  const variantWithInventory = selectedVariant as SelectedVariant & {quantityAvailable?: number | null};
  const stock = stockMessage({
    availableForSale: available,
    quantityAvailable: variantWithInventory?.quantityAvailable,
    lowStockThreshold: siteConfig.product.lowStockThreshold,
  });
  const maxQty =
    typeof variantWithInventory?.quantityAvailable === 'number' && variantWithInventory.quantityAvailable > 0
      ? Math.min(MAX_QTY, variantWithInventory.quantityAvailable)
      : MAX_QTY;

  useEffect(() => setQuantity(1), [selectedVariant?.id]);

  // Sticky add-to-cart bar on mobile once the main CTA scrolls out of view.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lines = selectedVariant
    ? [{merchandiseId: selectedVariant.id, quantity, selectedVariant}]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;
        const selectedValue = option.optionValues.find((v) => v.selected)?.name;
        const isSwatch = option.optionValues.some((v) => v.swatch?.color || v.swatch?.image);
        return (
          <fieldset key={option.name}>
            <legend className="mb-3 text-sm">
              <span className="font-semibold">{option.name}:</span>{' '}
              <span className="text-muted">{selectedValue}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {name, handle, variantUriQuery, selected, available: valueAvailable, exists, isDifferentProduct, swatch} = value;
                const className = cn(
                  'relative inline-flex items-center justify-center transition focus-visible:outline-2',
                  isSwatch
                    ? 'size-10 rounded-full p-0.5 ring-1'
                    : 'h-11 min-w-12 rounded-full border px-4 text-sm font-medium',
                  isSwatch
                    ? selected
                      ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                      : 'ring-border hover:ring-foreground'
                    : selected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:border-foreground',
                  !valueAvailable && 'text-muted',
                  !exists && 'cursor-not-allowed opacity-30',
                );
                const label = `${option.name}: ${name}${!valueAvailable ? ' (sold out)' : ''}`;
                const inner = (
                  <>
                    <OptionSwatch swatch={swatch} name={name} isSwatch={isSwatch} />
                    {!valueAvailable ? (
                      <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="h-px w-[70%] rotate-[-20deg] bg-current" />
                      </span>
                    ) : null}
                  </>
                );

                if (isDifferentProduct) {
                  // Combined listings: link to the sibling product (crawlable).
                  return (
                    <Link
                      key={option.name + name}
                      className={className}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      aria-label={label}
                      aria-current={selected ? 'true' : undefined}
                    >
                      {inner}
                    </Link>
                  );
                }
                // Same product: update the URL search params without creating
                // crawlable duplicate links.
                return (
                  <button
                    type="button"
                    key={option.name + name}
                    className={className}
                    aria-label={label}
                    aria-pressed={selected}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        void navigate(`?${variantUriQuery}`, {replace: true, preventScrollReset: true});
                      }
                    }}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
            {/size/i.test(option.name) ? (
              <a href="#size-guide" className="mt-3 inline-block text-xs underline underline-offset-4">
                Size guide
              </a>
            ) : null}
          </fieldset>
        );
      })}

      <div className="flex items-center gap-2 text-sm" role="status">
        <span
          aria-hidden
          className={cn(
            'size-2 rounded-full',
            stock.tone === 'success' && 'bg-success',
            stock.tone === 'warning' && 'bg-amber-500',
            stock.tone === 'danger' && 'bg-sale',
          )}
        />
        <span className={cn(stock.tone === 'danger' && 'text-sale', stock.tone === 'warning' && 'font-medium')}>
          {stock.label}
        </span>
        {selectedVariant?.sku ? <span className="ml-auto text-xs text-muted">SKU: {selectedVariant.sku}</span> : null}
      </div>

      <div ref={ctaRef} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <QuantityInput value={quantity} onChange={setQuantity} max={maxQty} disabled={!available} />
          <div className="min-w-0 flex-1">
            <AddToCartButton
              disabled={!available}
              lines={lines}
              openCart
              fullWidth
              analytics={{products: [{id: product.id, quantity}]}}
            >
              {available ? 'Add to cart' : 'Sold out'}
            </AddToCartButton>
          </div>
          {siteConfig.features.wishlist ? (
            <WishlistButton productId={product.id} productTitle={product.title} variant="inline" />
          ) : null}
        </div>
        {available ? (
          <AddToCartButton lines={lines} buyNow variant="outline" fullWidth>
            Buy it now
          </AddToCartButton>
        ) : null}
      </div>

      <ShareButton title={product.title} />

      {/* Sticky mobile purchase bar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden',
          showSticky ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.title}</p>
            <ProductPrice price={selectedVariant?.price} compareAtPrice={selectedVariant?.compareAtPrice} size="sm" />
          </div>
          <AddToCartButton disabled={!available} lines={lines} openCart size="md">
            {available ? 'Add to cart' : 'Sold out'}
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}

function QuantityInput({
  value,
  onChange,
  max,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="inline-flex h-13 shrink-0 items-center rounded-full border border-border">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40"
      >
        <Icon name="minus" className="size-4" />
      </button>
      <label htmlFor={id} className="sr-only">
        Quantity
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(1, n)));
        }}
        className="w-8 appearance-none bg-transparent text-center text-sm tabular-nums [-moz-appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40"
      >
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  );
}

function ShareButton({title}: {title: string}) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="inline-flex w-fit items-center gap-2 text-sm text-muted hover:text-foreground"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({title, url});
          } else {
            await navigator.clipboard.writeText(url);
            toast('Link copied to clipboard', {tone: 'info'});
          }
        } catch {
          // user cancelled share sheet
        }
      }}
    >
      <Icon name="share" className="size-4" /> Share
    </button>
  );
}

function OptionSwatch({
  swatch,
  name,
  isSwatch,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
  isSwatch: boolean;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;
  if (!isSwatch || (!image && !color)) return <span>{name}</span>;
  return (
    <span
      aria-hidden
      className="block h-full w-full overflow-hidden rounded-full"
      style={{backgroundColor: color || 'transparent'}}
    >
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
    </span>
  );
}

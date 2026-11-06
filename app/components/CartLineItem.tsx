import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {Icon} from '~/components/ui/Icon';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {cn} from '~/lib/cn';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/** Max quantity selectable per line in the UI; Shopify enforces real limits. */
export const MAX_LINE_QUANTITY = 99;

export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const unavailable = merchandise.availableForSale === false;
  const options = selectedOptions.filter((o) => o.value !== 'Default Title');

  return (
    <li className={cn('py-5', line.isOptimistic && 'opacity-70')}>
      <div className="flex gap-4">
        <Link
          to={lineItemUrl}
          prefetch="intent"
          onClick={() => layout === 'aside' && close()}
          className="block w-20 shrink-0 overflow-hidden rounded-brand bg-surface sm:w-24"
          tabIndex={-1}
          aria-hidden
        >
          {image ? (
            <Image
              alt={image.altText || title}
              aspectRatio="4/5"
              data={image}
              width={120}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="aspect-[4/5]" />
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                prefetch="intent"
                to={lineItemUrl}
                onClick={() => layout === 'aside' && close()}
                className="line-clamp-2 text-sm font-medium hover:underline underline-offset-4"
              >
                {product.title}
              </Link>
              {options.length ? (
                <p className="mt-0.5 text-xs text-muted">
                  {options.map((o) => `${o.name}: ${o.value}`).join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <ProductPrice price={line.cost?.totalAmount} size="sm" className="justify-end" />
              {line.quantity > 1 && line.cost?.amountPerQuantity ? (
                <ProductPrice
                  price={line.cost.amountPerQuantity}
                  compareAtPrice={line.cost.compareAtAmountPerQuantity}
                  size="sm"
                  className="justify-end text-xs text-muted"
                />
              ) : null}
            </div>
          </div>
          {unavailable ? (
            <p className="text-xs font-medium text-sale" role="alert">
              This item is no longer available. Please remove it to check out.
            </p>
          ) : null}
          {line.attributes?.length ? (
            <ul className="text-xs text-muted">
              {line.attributes.map((a) => (
                <li key={a.key}>
                  {a.key}: {a.value}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-auto flex items-center justify-between pt-2">
            <CartLineQuantity line={line} title={product.title} />
            <CartLineRemoveButton
              lineIds={[id]}
              disabled={!!line.isOptimistic}
              title={product.title}
            />
          </div>
        </div>
      </div>

      {lineItemChildren ? (
        <ul
          aria-label={`Items included with ${product.title}`}
          className="mt-3 ml-6 border-l border-border pl-4"
        >
          {lineItemChildren.map((childLine) => (
            <CartLineItem
              childrenMap={childrenMap}
              key={childLine.id}
              line={childLine}
              layout={layout}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CartLineQuantity({line, title}: {line: CartLine; title: string}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Math.max(0, quantity - 1);
  const nextQuantity = Math.min(MAX_LINE_QUANTITY, quantity + 1);

  return (
    <div
      className="inline-flex h-9 items-center rounded-full border border-border"
      role="group"
      aria-label={`Quantity for ${title}`}
    >
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          type="submit"
          aria-label={`Decrease quantity of ${title}`}
          disabled={quantity <= 1 || !!isOptimistic}
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-foreground/5 disabled:opacity-40"
        >
          <Icon name="minus" className="size-3.5" />
        </button>
      </CartLineUpdateButton>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        <span className="sr-only">Quantity </span>
        {quantity}
      </span>
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          type="submit"
          aria-label={`Increase quantity of ${title}`}
          disabled={!!isOptimistic || quantity >= MAX_LINE_QUANTITY}
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-foreground/5 disabled:opacity-40"
        >
          <Icon name="plus" className="size-3.5" />
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

function CartLineRemoveButton({
  lineIds,
  disabled,
  title,
}: {
  lineIds: string[];
  disabled: boolean;
  title: string;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        aria-label={`Remove ${title} from cart`}
        className="inline-flex items-center gap-1 text-xs text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-40"
      >
        <Icon name="trash" className="size-3.5" />
        Remove
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Unique key per line so rapid +/- clicks cancel each other rather than racing.
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

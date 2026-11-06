import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {ButtonLink} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {pluralize} from '~/lib/format';
import {cn} from '~/lib/cn';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
  /** Rendered below the lines, e.g. recommendations. */
  children?: React.ReactNode;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};

/** Returns a map of all line items and their children (bundles, add-ons). */
export function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

/**
 * Cart contents shared by the /cart page and the cart drawer.
 * All totals shown come from Shopify's calculated cart.
 */
export function CartMain({layout, cart: originalCart, children}: CartMainProps) {
  // Applies pending cart actions optimistically for instant feedback.
  const cart = useOptimisticCart(originalCart);
  const lines = cart?.lines?.nodes ?? [];
  const cartHasItems = (cart?.totalQuantity ?? 0) > 0;
  const childrenMap = getLineItemChildrenMap(lines);

  if (!cartHasItems) {
    return <CartEmpty layout={layout} />;
  }

  return (
    <section
      aria-label={layout === 'page' ? 'Cart' : 'Cart drawer'}
      className={cn(
        layout === 'page'
          ? 'grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16'
          : 'flex h-full flex-col',
      )}
    >
      <div className={cn(layout === 'aside' && 'flex-1 px-5')}>
        <p className="sr-only" id={`cart-lines-${layout}`}>
          {pluralize(cart?.totalQuantity ?? 0, 'item')} in your cart
        </p>
        <ul aria-labelledby={`cart-lines-${layout}`} className="divide-y divide-border">
          {lines.map((line) => {
            // Child lines are rendered nested under their parent.
            if ('parentRelationship' in line && line.parentRelationship?.parent) {
              return null;
            }
            return (
              <CartLineItem
                key={line.id}
                line={line}
                layout={layout}
                childrenMap={childrenMap}
              />
            );
          })}
        </ul>
        {children}
      </div>
      <CartSummary cart={cart} layout={layout} />
    </section>
  );
}

function CartEmpty({layout}: {layout: CartLayout}) {
  const {close} = useAside();
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 text-center',
        layout === 'aside' ? 'h-full px-8 py-16' : 'py-20',
      )}
    >
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-surface">
        <Icon name="bag" className="size-7" />
      </span>
      <div>
        <p className="font-heading text-2xl">Your cart is empty</p>
        <p className="mt-2 text-sm text-muted">
          Looks like you haven&rsquo;t added anything yet.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink to="/collections/all" onClick={close} prefetch="viewport">
          Start shopping
        </ButtonLink>
        <ButtonLink to="/new-arrivals" onClick={close} variant="outline">
          New arrivals
        </ButtonLink>
      </div>
      {layout === 'page' ? (
        <Link to="/wishlist" className="text-sm underline underline-offset-4">
          View your wishlist
        </Link>
      ) : null}
    </div>
  );
}

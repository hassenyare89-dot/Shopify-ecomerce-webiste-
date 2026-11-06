import type {MoneyLike} from '~/lib/format';
import {discountPercentage, formatMoney, isOnSale} from '~/lib/format';
import {cn} from '~/lib/cn';

/**
 * Displays Shopify-provided prices. The compare-at price is only shown when
 * it is genuinely higher than the selling price (no fake "was" prices).
 */
export function ProductPrice({
  price,
  compareAtPrice,
  fromPrice = false,
  size = 'md',
  showSavings = false,
  className,
}: {
  price?: MoneyLike | null;
  compareAtPrice?: MoneyLike | null;
  /** Prefix "From" when variants have different prices. */
  fromPrice?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showSavings?: boolean;
  className?: string;
}) {
  if (!price) return <span className="text-muted">&nbsp;</span>;
  const onSale = isOnSale(price, compareAtPrice);
  const pct = discountPercentage(price, compareAtPrice);
  const sizes = {sm: 'text-sm', md: 'text-base', lg: 'text-2xl'} as const;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', sizes[size], className)}>
      <span className={cn('font-medium', onSale && 'text-sale')}>
        {onSale ? <span className="sr-only">Sale price </span> : <span className="sr-only">Price </span>}
        {fromPrice ? <span className="text-[0.85em] font-normal text-muted">From </span> : null}
        {formatMoney(price)}
      </span>
      {onSale && compareAtPrice ? (
        <s className="text-[0.85em] text-muted">
          <span className="sr-only">Regular price </span>
          {formatMoney(compareAtPrice)}
        </s>
      ) : null}
      {showSavings && pct ? (
        <span className="text-xs font-semibold text-sale">Save {pct}%</span>
      ) : null}
    </div>
  );
}

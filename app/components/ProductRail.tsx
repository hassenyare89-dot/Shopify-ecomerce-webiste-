import {useRef} from 'react';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {ProductCard} from '~/components/ProductCard';
import {SectionHeading} from '~/components/ui/primitives';
import {Icon} from '~/components/ui/Icon';

/**
 * Horizontally scrollable product rail with scroll-snap (touch friendly) and
 * keyboard-accessible prev/next buttons on larger screens.
 */
export function ProductRail({
  title,
  eyebrow,
  description,
  products,
  action,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  products: ProductCardFragment[];
  action?: {label: string; to: string};
}) {
  const scroller = useRef<HTMLUListElement>(null);
  if (!products.length) return null;

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({left: direction * el.clientWidth * 0.8, behavior: 'smooth'});
  };

  return (
    <section aria-label={title}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} action={action} />
      <div className="relative">
        <ul
          ref={scroller}
          className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:gap-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-[calc(25%-1.125rem)]"
            >
              <ProductCard product={product} loading="lazy" sizes="(min-width: 1024px) 25vw, 70vw" />
            </li>
          ))}
        </ul>
        {products.length > 4 ? (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] hidden justify-between lg:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="pointer-events-auto -ml-5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-background shadow-soft transition hover:shadow-lift"
              aria-label={`Scroll ${title} backward`}
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="pointer-events-auto -mr-5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-background shadow-soft transition hover:shadow-lift"
              aria-label={`Scroll ${title} forward`}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

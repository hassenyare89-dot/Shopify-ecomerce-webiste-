import {useEffect, useId, useState} from 'react';
import {Form, Link, useLocation, useNavigate, useNavigation, useSearchParams} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductCard} from '~/components/ProductCard';
import {Aside, useAside} from '~/components/Aside';
import {Button, ButtonLink} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {inputClasses} from '~/components/ui/primitives';
import {
  clearFilters,
  filterInputToParam,
  getAppliedFilters,
  isFilterActive,
  removeAppliedFilter,
  setPriceRange,
  setSort,
  toggleFilter,
  type SortParam,
} from '~/lib/filters';
import {formatMoney} from '~/lib/format';
import {cn} from '~/lib/cn';

type ProductConnection = {
  nodes: ProductCardFragment[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
};

export type ListingFilter = Pick<Filter, 'id' | 'label' | 'type' | 'presentation'> & {
  values: Array<{
    id: string;
    label: string;
    count: number;
    input: unknown;
    swatch?: {color?: string | null; image?: {previewImage?: {url: string} | null} | null} | null;
  }>;
};

export function ProductListing({
  products,
  filters = [],
  sortOptions,
  sort,
  emptyState,
  currencyCode = 'USD',
}: {
  products: ProductConnection;
  filters?: ListingFilter[];
  sortOptions: {value: SortParam; label: string}[];
  sort: SortParam;
  emptyState?: React.ReactNode;
  currencyCode?: string;
}) {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const {open} = useAside();
  const location = useLocation();
  const loading =
    navigation.state === 'loading' && navigation.location?.pathname === location.pathname;

  const formatPrice = (n: number) =>
    formatMoney({amount: n, currencyCode}, {compact: true});
  const applied = getAppliedFilters(searchParams, (key, value) => labelForFilter(filters, key, value), formatPrice);
  const hasFilters = filters.length > 0;
  const nodes = products.nodes ?? [];

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      {hasFilters ? (
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <FacetList filters={filters} currencyCode={currencyCode} />
          </div>
        </aside>
      ) : null}

      <div className={cn(!hasFilters && 'lg:col-span-2')}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => open('filters')}
                aria-label={`Filters${applied.length ? `, ${applied.length} applied` : ''}`}
              >
                <Icon name="filter" className="size-4" />
                Filters
                {applied.length ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[0.65rem] text-background">
                    {applied.length}
                  </span>
                ) : null}
              </Button>
            ) : null}
            <p className="text-sm text-muted" aria-live="polite">
              {loading ? 'Updating…' : `${nodes.length}${products.pageInfo?.hasNextPage ? '+' : ''} products`}
            </p>
          </div>
          <SortSelect options={sortOptions} value={sort} />
        </div>

        {applied.length ? (
          <ul aria-label="Applied filters" className="mb-6 flex flex-wrap items-center gap-2">
            {applied.map((filter) => (
              <li key={`${filter.key}-${filter.value}`}>
                <Link
                  to={`?${removeAppliedFilter(searchParams, filter)}`}
                  preventScrollReset
                  rel="nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-border"
                  aria-label={`Remove filter ${filter.label}`}
                >
                  {filter.label}
                  <Icon name="close" className="size-3" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                to={`?${clearFilters(searchParams)}`}
                preventScrollReset
                rel="nofollow"
                className="text-xs underline underline-offset-4"
              >
                Clear all
              </Link>
            </li>
          </ul>
        ) : null}

        <div className={cn('transition-opacity', loading && 'opacity-50')}>
          {nodes.length ? (
            <PaginatedResourceSection<ProductCardFragment>
              connection={products}
              as="ul"
              resourcesClassName="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6"
            >
              {({node, index}) => (
                <li key={node.id}>
                  <ProductCard product={node} loading={index < 6 ? 'eager' : 'lazy'} />
                </li>
              )}
            </PaginatedResourceSection>
          ) : (
            (emptyState ?? (
              <div className="rounded-brand border border-dashed border-border py-20 text-center">
                <p className="font-heading text-2xl">No products found</p>
                <p className="mt-2 text-sm text-muted">Try removing some filters.</p>
                {applied.length ? (
                  <ButtonLink to={`?${clearFilters(searchParams)}`} variant="outline" className="mt-6">
                    Clear filters
                  </ButtonLink>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {hasFilters ? (
        <Aside type="filters" heading="Filters" side="left">
          <div className="p-5">
            <FacetList filters={filters} currencyCode={currencyCode} />
          </div>
        </Aside>
      ) : null}
    </div>
  );
}

function labelForFilter(filters: ListingFilter[], key: string, value: string) {
  for (const filter of filters) {
    for (const v of filter.values) {
      const param = filterInputToParam(v.input as string);
      if (param?.key === key && param.value === value) return `${filter.label}: ${v.label}`;
    }
  }
  return undefined;
}

function SortSelect({options, value}: {options: {value: SortParam; label: string}[]; value: SortParam}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = useId();
  const hidden = Array.from(searchParams.entries()).filter(
    ([k]) => k !== 'sort' && k !== 'cursor' && k !== 'direction',
  );
  return (
    <Form method="get" className="flex items-center gap-2" preventScrollReset>
      {hidden.map(([k, v]) => (
        <input key={`${k}=${v}`} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor={id} className="text-sm text-muted">
        Sort by
      </label>
      <div className="relative">
        <select
          id={id}
          name="sort"
          value={value}
          onChange={(e) => {
            void navigate(`?${setSort(searchParams, e.target.value as SortParam)}`, {
              preventScrollReset: true,
            });
          }}
          className="h-10 appearance-none rounded-full border border-border bg-background py-0 pr-9 pl-4 text-sm font-medium focus:border-foreground focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </div>
      <noscript>
        <button type="submit" className="text-sm underline">
          Apply
        </button>
      </noscript>
    </Form>
  );
}

function FacetList({filters, currencyCode}: {filters: ListingFilter[]; currencyCode: string}) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {filters.map((filter) => (
        <details key={filter.id} className="group py-1" open>
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {filter.label}
            <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
          </summary>
          <div className="pb-4">
            {filter.type === 'PRICE_RANGE' ? (
              <PriceRangeFilter filter={filter} currencyCode={currencyCode} />
            ) : (
              <FacetValues filter={filter} />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function FacetValues({filter}: {filter: ListingFilter}) {
  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const isSwatch = filter.presentation === 'SWATCH' || filter.values.some((v) => v.swatch?.color);
  const values = expanded ? filter.values : filter.values.slice(0, 8);

  return (
    <>
      <ul className={cn(isSwatch ? 'flex flex-wrap gap-2' : 'space-y-1')}>
        {values.map((value) => {
          const input = value.input as string;
          const active = isFilterActive(searchParams, input);
          const hasCount = value.count >= 0;
          const disabled = hasCount && value.count === 0 && !active;
          const to = `?${toggleFilter(searchParams, input)}`;
          const label = hasCount ? `${value.label} (${value.count})` : value.label;

          if (isSwatch) {
            const color = value.swatch?.color;
            const image = value.swatch?.image?.previewImage?.url;
            return (
              <li key={value.id}>
                <Link
                  to={to}
                  preventScrollReset
                  rel="nofollow"
                  aria-label={label}
                  aria-current={active ? 'true' : undefined}
                  title={value.label}
                  className={cn(
                    'block size-8 rounded-full border-2 transition',
                    active ? 'border-foreground' : 'border-transparent ring-1 ring-border hover:ring-foreground',
                    disabled && 'pointer-events-none opacity-30',
                  )}
                  style={{
                    background: image ? `center/cover url(${JSON.stringify(image)})` : (color ?? undefined),
                  }}
                />
              </li>
            );
          }

          return (
            <li key={value.id}>
              <Link
                to={to}
                preventScrollReset
                rel="nofollow"
                role="checkbox"
                aria-checked={active}
                aria-disabled={disabled || undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md py-1.5 text-sm transition hover:text-foreground',
                  active ? 'text-foreground' : 'text-foreground/75',
                  disabled && 'pointer-events-none opacity-40',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex size-4.5 shrink-0 items-center justify-center rounded border transition',
                    active ? 'border-foreground bg-foreground text-background' : 'border-foreground/30',
                  )}
                >
                  {active ? <Icon name="check" className="size-3" strokeWidth={2.5} /> : null}
                </span>
                <span className="flex-1">{value.label}</span>
                {hasCount ? <span className="text-xs text-muted">{value.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {filter.values.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium underline underline-offset-4"
        >
          {expanded ? 'Show less' : `Show all ${filter.values.length}`}
        </button>
      ) : null}
    </>
  );
}

function PriceRangeFilter({filter, currencyCode}: {filter: ListingFilter; currencyCode: string}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const minId = useId();
  const maxId = useId();
  let bounds: {min?: number; max?: number} = {};
  try {
    const parsed = JSON.parse((filter.values[0]?.input as string) ?? '{}') as {price?: {min?: number; max?: number}};
    bounds = parsed.price ?? {};
  } catch {
    bounds = {};
  }
  const [min, setMin] = useState(searchParams.get('filter.v.price.gte') ?? '');
  const [max, setMax] = useState(searchParams.get('filter.v.price.lte') ?? '');

  useEffect(() => {
    setMin(searchParams.get('filter.v.price.gte') ?? '');
    setMax(searchParams.get('filter.v.price.lte') ?? '');
  }, [searchParams]);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const next = setPriceRange(
          searchParams,
          min === '' ? undefined : Number(min),
          max === '' ? undefined : Number(max),
        );
        void navigate(`?${next}`, {preventScrollReset: true});
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor={minId} className="mb-1 block text-xs text-muted">
            Min ({currencyCode})
          </label>
          <input
            id={minId}
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={min}
            placeholder={bounds.min !== undefined ? String(Math.floor(bounds.min)) : '0'}
            onChange={(e) => setMin(e.target.value)}
            className={cn(inputClasses, 'h-10 py-2')}
          />
        </div>
        <span aria-hidden className="mt-5 text-muted">
          –
        </span>
        <div className="flex-1">
          <label htmlFor={maxId} className="mb-1 block text-xs text-muted">
            Max ({currencyCode})
          </label>
          <input
            id={maxId}
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={max}
            placeholder={bounds.max !== undefined ? String(Math.ceil(bounds.max)) : ''}
            onChange={(e) => setMax(e.target.value)}
            className={cn(inputClasses, 'h-10 py-2')}
          />
        </div>
      </div>
      <Button type="submit" variant="outline" size="sm" fullWidth>
        Apply price
      </Button>
    </form>
  );
}

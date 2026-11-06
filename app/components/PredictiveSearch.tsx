import {useEffect, useId, useRef, useState} from 'react';
import {Form, Link, useFetcher, useNavigate} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';
import {Icon} from '~/components/ui/Icon';
import {Skeleton} from '~/components/ui/primitives';
import {urlWithTrackingParams, type PredictiveSearchReturn} from '~/lib/search';
import {siteConfig} from '~/config/site';

const DEBOUNCE_MS = 200;

/**
 * Predictive search backed by Shopify's `predictiveSearch` query through the
 * /search?predictive route. Submitting goes to full search results.
 */
export function PredictiveSearch() {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'predictive-search'});
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const {close} = useAside();
  const inputId = useId();
  const resultsId = useId();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = (value: string) => {
    setTerm(value);
    window.clearTimeout(timer.current);
    const q = value.trim();
    if (!q) return;
    timer.current = window.setTimeout(() => {
      void fetcher.load(`/search?predictive=1&limit=6&q=${encodeURIComponent(q)}`);
    }, DEBOUNCE_MS);
  };

  const q = term.trim();
  const items = fetcher.data?.term === q ? fetcher.data.result?.items : undefined;
  const total = fetcher.data?.term === q ? (fetcher.data.result?.total ?? 0) : 0;
  const loading = Boolean(q) && (fetcher.state !== 'idle' || fetcher.data?.term !== q);

  return (
    <div className="flex h-full flex-col">
      <Form
        method="get"
        action="/search"
        role="search"
        className="border-b border-border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q) return;
          close();
          void navigate(`/search?q=${encodeURIComponent(q)}`);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Icon name="search" className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            id={inputId}
            data-autofocus
            type="search"
            name="q"
            value={term}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search products, collections…"
            autoComplete="off"
            maxLength={100}
            aria-controls={resultsId}
            aria-describedby={`${resultsId}-status`}
            className="h-12 w-full rounded-full border border-border bg-surface pr-4 pl-11 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
      </Form>

      <p id={`${resultsId}-status`} className="sr-only" aria-live="polite">
        {q && !loading ? `${total} results` : ''}
      </p>

      <div id={resultsId} className="flex-1 overflow-y-auto p-5">
        {!q ? (
          <SearchSuggestions />
        ) : loading && !items ? (
          <div className="space-y-4" aria-hidden>
            {Array.from({length: 4}, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-16 shrink-0" />
                <div className="flex-1 space-y-2 py-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !total || !items ? (
          <div className="py-10 text-center">
            <p className="font-medium">No results for &ldquo;{q}&rdquo;</p>
            <p className="mt-1 text-sm text-muted">Check the spelling or try a broader term.</p>
            <SearchSuggestions />
          </div>
        ) : (
          <div className="space-y-8">
            {items.queries.length ? (
              <section aria-label="Suggestions">
                <ul className="flex flex-wrap gap-2">
                  {items.queries.map((suggestion) => (
                    <li key={suggestion.text}>
                      <button
                        type="button"
                        onClick={() => onChange(suggestion.text)}
                        className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground"
                      >
                        {suggestion.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {items.products.length ? (
              <section aria-labelledby={`${resultsId}-products`}>
                <h3 id={`${resultsId}-products`} className="eyebrow mb-3 font-body">
                  Products
                </h3>
                <ul className="space-y-1">
                  {items.products.map((product) => {
                    const variant = product.selectedOrFirstAvailableVariant;
                    const url = urlWithTrackingParams({
                      baseUrl: `/products/${product.handle}`,
                      trackingParams: product.trackingParameters,
                      term: q,
                    });
                    return (
                      <li key={product.id}>
                        <Link
                          to={url}
                          onClick={close}
                          className="flex items-center gap-3 rounded-brand p-2 transition hover:bg-surface"
                        >
                          <span className="block size-16 shrink-0 overflow-hidden rounded-[calc(var(--brand-radius)-0.25rem)] bg-surface">
                            {variant?.image ? (
                              <Image
                                data={variant.image}
                                alt={variant.image.altText ?? product.title}
                                width={64}
                                height={64}
                                aspectRatio="1/1"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{product.title}</span>
                            {variant?.price ? (
                              <span className="text-sm text-muted">
                                <Money data={variant.price} as="span" />
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {items.collections.length ? (
              <ResultLinks
                title="Collections"
                links={items.collections.map((c) => ({
                  id: c.id,
                  title: c.title,
                  to: urlWithTrackingParams({
                    baseUrl: `/collections/${c.handle}`,
                    trackingParams: c.trackingParameters,
                    term: q,
                  }),
                }))}
              />
            ) : null}
            {items.pages.length ? (
              <ResultLinks
                title="Pages"
                links={items.pages.map((p) => ({
                  id: p.id,
                  title: p.title,
                  to: urlWithTrackingParams({
                    baseUrl: `/pages/${p.handle}`,
                    trackingParams: p.trackingParameters,
                    term: q,
                  }),
                }))}
              />
            ) : null}
            {items.articles.length ? (
              <ResultLinks
                title="Articles"
                links={items.articles.map((a) => ({
                  id: a.id,
                  title: a.title,
                  to: urlWithTrackingParams({
                    baseUrl: `/blogs/${a.blog.handle}/${a.handle}`,
                    trackingParams: a.trackingParameters,
                    term: q,
                  }),
                }))}
              />
            ) : null}

            <Link
              to={`/search?q=${encodeURIComponent(q)}`}
              onClick={close}
              className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            >
              View all results for &ldquo;{q}&rdquo;
              <Icon name="arrowRight" className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultLinks({
  title,
  links,
}: {
  title: string;
  links: {id: string; title: string; to: string}[];
}) {
  const {close} = useAside();
  return (
    <section aria-label={title}>
      <h3 className="eyebrow mb-3 font-body">{title}</h3>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.id}>
            <Link to={link.to} onClick={close} className="block rounded-brand px-2 py-2 text-sm hover:bg-surface">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SearchSuggestions() {
  const {close} = useAside();
  return (
    <div className="mt-6 space-y-6 text-left">
      <section aria-label="Popular links">
        <h3 className="eyebrow mb-3 font-body">Popular</h3>
        <ul className="flex flex-wrap gap-2">
          {siteConfig.menus.fallbackHeader.slice(0, 5).map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={close}
                className="inline-block rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground"
              >
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

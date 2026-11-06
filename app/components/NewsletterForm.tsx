import {useEffect, useId, useRef} from 'react';
import {Link, useFetcher} from 'react-router';
import {Button} from '~/components/ui/Button';
import {Honeypot, inputClasses} from '~/components/ui/primitives';
import {cn} from '~/lib/cn';
import type {NewsletterActionData} from '~/routes/api.newsletter';

/**
 * Newsletter signup. Posts to /api/newsletter, which records explicit email
 * marketing consent in Shopify (or the configured provider). Never pre-checks
 * consent.
 */
export function NewsletterForm({
  tone = 'default',
  source = 'footer',
}: {
  tone?: 'default' | 'inverted';
  source?: string;
}) {
  const fetcher = useFetcher<NewsletterActionData>();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const busy = fetcher.state !== 'idle';
  const result = fetcher.data;

  useEffect(() => {
    if (result?.ok) formRef.current?.reset();
  }, [result]);

  return (
    <fetcher.Form ref={formRef} method="post" action="/api/newsletter" className="relative w-full" noValidate>
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          aria-invalid={result && !result.ok ? true : undefined}
          aria-describedby={`${id}-status ${id}-consent`}
          className={cn(
            inputClasses,
            'h-12 rounded-full px-5',
            tone === 'inverted' && 'border-white/25 bg-white/10 text-white placeholder:text-white/60',
          )}
        />
        <Button
          type="submit"
          size="lg"
          variant={tone === 'inverted' ? 'secondary' : 'primary'}
          loading={busy}
          className="h-12 shrink-0"
        >
          Subscribe
        </Button>
      </div>
      <p
        id={`${id}-consent`}
        className={cn('mt-3 text-xs', tone === 'inverted' ? 'text-white/70' : 'text-muted')}
      >
        By subscribing you agree to receive marketing emails. Unsubscribe anytime. See our{' '}
        <Link to="/policies/privacy-policy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={cn(
          'mt-2 min-h-5 text-sm font-medium',
          result?.ok ? 'text-success' : 'text-sale',
          tone === 'inverted' && result?.ok && 'text-white',
        )}
      >
        {result?.message ?? ''}
      </p>
    </fetcher.Form>
  );
}

/**
 * Small presentational primitives: Badge, Skeleton, SectionHeading,
 * Accordion, Rating, VisuallyHidden, Notice, Field.
 */
import {useId} from 'react';
import {Link} from 'react-router';
import {cn} from '~/lib/cn';
import {Icon, type IconName} from './Icon';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'sale' | 'accent' | 'success' | 'dark';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-secondary text-secondary-foreground',
    sale: 'bg-sale text-white',
    accent: 'bg-accent text-accent-foreground',
    success: 'bg-success/10 text-success',
    dark: 'bg-foreground text-background',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({className}: {className?: string}) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({count = 4}: {count?: number}) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({length: count}, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  as: Tag = 'h2',
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: {label: string; to: string};
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 md:mb-10',
        align === 'center'
          ? 'items-center text-center'
          : 'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <Tag id={id} className="text-3xl md:text-4xl">
          {title}
        </Tag>
        {description ? (
          <p className="mt-3 text-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          to={action.to}
          prefetch="intent"
          className="group inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          {action.label}
          <Icon
            name="arrowRight"
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}

/** Accessible disclosure built on native <details>/<summary>. */
export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={cn('group border-b border-border', className)}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <Icon
          name="plus"
          className="size-4 shrink-0 transition-transform duration-300 group-open:rotate-45"
        />
      </summary>
      <div className="pb-6 text-sm leading-7 text-foreground/80">
        {children}
      </div>
    </details>
  );
}

/** Star rating display. Only render with real review data. */
export function Rating({
  value,
  count,
  scaleMax = 5,
  size = 'sm',
}: {
  value: number;
  count?: number;
  scaleMax?: number;
  size?: 'sm' | 'md';
}) {
  const normalized = Math.max(0, Math.min(5, (value / scaleMax) * 5));
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4.5';
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`Rated ${value} out of ${scaleMax}`}
      >
        <span className="flex text-border">
          {Array.from({length: 5}, (_, i) => (
            <Icon key={i} name="star" filled className={iconSize} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-accent"
          style={{width: `${(normalized / 5) * 100}%`}}
        >
          {Array.from({length: 5}, (_, i) => (
            <Icon key={i} name="star" filled className={cn(iconSize, 'shrink-0')} />
          ))}
        </span>
      </span>
      {typeof count === 'number' ? (
        <span className="text-xs text-muted">
          ({count}
          <span className="sr-only"> reviews</span>)
        </span>
      ) : null}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children?: React.ReactNode;
  icon?: IconName;
}) {
  const tones = {
    info: 'border-border bg-surface',
    warning: 'border-amber-500/40 bg-amber-500/10',
    error: 'border-sale/40 bg-sale/10',
    success: 'border-success/40 bg-success/10',
  } as const;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-brand border p-4 text-sm', tones[tone])}
    >
      <Icon
        name={icon ?? (tone === 'error' || tone === 'warning' ? 'alert' : 'info')}
        className="mt-0.5 size-4 shrink-0"
      />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-foreground/80">{children}</div> : null}
      </div>
    </div>
  );
}

const inputClasses =
  'block w-full rounded-brand border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted transition focus:border-foreground focus:outline-none focus-visible:outline-2 aria-[invalid=true]:border-sale';

export function Field({
  label,
  name,
  type = 'text',
  error,
  hint,
  required,
  textarea,
  className,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  textarea?: boolean;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'name' | 'type'
>) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="text-sale">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(inputClasses, 'min-h-32')}
          {...props}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={inputClasses}
          {...props}
        />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-sale">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export {inputClasses};

/** Hidden anti-spam field — real users never see or fill it. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

import {forwardRef} from 'react';
import {Link, type LinkProps} from 'react-router';
import {cn} from '~/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'accent'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 shadow-soft hover:shadow-lift',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-border',
  outline:
    'border border-foreground/20 bg-transparent text-foreground hover:border-foreground hover:bg-foreground/5',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/5',
  accent:
    'bg-accent text-accent-foreground hover:opacity-90 shadow-soft hover:shadow-lift',
  link: 'bg-transparent p-0 text-foreground underline-offset-4 hover:underline',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-full px-4 text-sm',
  md: 'h-11 rounded-full px-6 text-sm',
  lg: 'h-13 rounded-full px-8 text-base',
  icon: 'size-10 rounded-full',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    base,
    variants[variant],
    variant === 'link' ? '' : sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      fullWidth,
      loading = false,
      className,
      children,
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses({variant, size, fullWidth, className})}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : null}
        {children}
      </button>
    );
  },
);

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...props
}: LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <Link
      className={buttonClasses({variant, size, fullWidth, className})}
      {...props}
    />
  );
}

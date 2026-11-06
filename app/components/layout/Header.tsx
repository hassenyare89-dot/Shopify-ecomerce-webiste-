import {Suspense, useEffect, useState} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {useAnalytics, useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {Icon} from '~/components/ui/Icon';
import {ThemeToggle} from '~/components/layout/ThemeToggle';
import {Logo} from '~/components/layout/Logo';
import type {NavItem} from '~/lib/menu';
import {useWishlist} from '~/lib/wishlist';
import {siteConfig} from '~/config/site';
import {cn} from '~/lib/cn';

interface HeaderProps {
  header: HeaderQuery;
  navigation: NavItem[];
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
}

export function Header({header, navigation, cart, isLoggedIn}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300',
        scrolled
          ? 'border-border bg-background/90 shadow-soft backdrop-blur-md'
          : 'border-transparent bg-background',
      )}
    >
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <MobileMenuToggle />
        <Link
          to="/"
          prefetch="intent"
          className="flex shrink-0 items-center"
          aria-label={`${siteConfig.name} home`}
        >
          <Logo shopLogo={header.shop.brand?.logo?.image ?? null} />
        </Link>
        <DesktopNav items={navigation} />
        <HeaderActions cart={cart} isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}

function DesktopNav({items}: {items: NavItem[]}) {
  return (
    <nav aria-label="Main" className="mx-auto hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => (
          <li key={item.id} className="group/nav relative">
            <NavItemLink
              item={item}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              {item.title}
              {item.items.length ? (
                <Icon
                  name="chevronDown"
                  className="size-3.5 transition group-hover/nav:rotate-180 group-focus-within/nav:rotate-180"
                />
              ) : null}
            </NavItemLink>
            {item.items.length ? (
              <div className="invisible absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100">
                <ul className="rounded-brand border border-border bg-background p-2 shadow-lift">
                  {item.items.map((child) => (
                    <li key={child.id}>
                      <NavItemLink
                        item={child}
                        className="block rounded-[calc(var(--brand-radius)-0.25rem)] px-3 py-2.5 text-sm transition hover:bg-surface"
                      >
                        {child.title}
                      </NavItemLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NavItemLink({
  item,
  className,
  children,
  onClick,
}: {
  item: NavItem;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  if (item.external) {
    return (
      <a href={item.to} className={className} rel="noopener noreferrer" target="_blank" onClick={onClick}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      end
      prefetch="intent"
      onClick={onClick}
      className={({isActive}) => cn(className, isActive && 'text-accent')}
    >
      {children}
    </NavLink>
  );
}

function MobileMenuToggle() {
  const {open} = useAside();
  return (
    <button
      type="button"
      className="-ml-2 inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/5 lg:hidden"
      onClick={() => open('mobile')}
      aria-label="Open menu"
    >
      <Icon name="menu" />
    </button>
  );
}

const actionClass =
  'relative inline-flex size-10 items-center justify-center rounded-full transition hover:bg-foreground/5';

function HeaderActions({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  const {open} = useAside();
  return (
    <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
      <button
        type="button"
        className={actionClass}
        onClick={() => open('search')}
        aria-label="Search"
        data-testid="search-toggle"
      >
        <Icon name="search" />
      </button>
      {siteConfig.theme.enableDarkMode ? (
        <span className="hidden sm:inline-flex">
          <ThemeToggle />
        </span>
      ) : null}
      {siteConfig.features.wishlist ? <WishlistLink /> : null}
      <Suspense fallback={<AccountLink loggedIn={false} />}>
        <Await resolve={isLoggedIn} errorElement={<AccountLink loggedIn={false} />}>
          {(loggedIn) => <AccountLink loggedIn={loggedIn} />}
        </Await>
      </Suspense>
      <Suspense fallback={<CartBadge count={null} />}>
        <Await resolve={cart}>
          <CartBanner />
        </Await>
      </Suspense>
    </div>
  );
}

function AccountLink({loggedIn}: {loggedIn: boolean}) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className={cn(actionClass, 'hidden sm:inline-flex')}
      aria-label={loggedIn ? 'Your account' : 'Sign in'}
    >
      <Icon name="user" />
    </NavLink>
  );
}

function WishlistLink() {
  const {count} = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = mounted ? count : 0;
  return (
    <NavLink
      to="/wishlist"
      prefetch="intent"
      className={cn(actionClass, 'hidden sm:inline-flex')}
      aria-label={shown ? `Wishlist, ${shown} saved items` : 'Wishlist'}
    >
      <Icon name="heart" />
      {shown ? <Counter value={shown} /> : null}
    </NavLink>
  );
}

function Counter({value}: {value: number}) {
  return (
    <span
      aria-hidden
      className="absolute top-0.5 right-0.5 inline-flex h-4.5 min-w-4.5 animate-fade-in items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] leading-none font-semibold text-accent-foreground"
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

function CartBadge({count}: {count: number | null}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();
  return (
    <a
      href="/cart"
      className={actionClass}
      data-testid="cart-toggle"
      aria-label={count ? `Cart, ${count} items` : 'Cart'}
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        });
      }}
    >
      <Icon name="bag" />
      {count ? <Counter value={count} /> : null}
    </a>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

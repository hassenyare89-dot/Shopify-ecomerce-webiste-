import {Await} from 'react-router';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/Aside';
import {Header, NavItemLink} from '~/components/layout/Header';
import {Footer} from '~/components/layout/Footer';
import {AnnouncementBar} from '~/components/layout/AnnouncementBar';
import {ThemeToggle} from '~/components/layout/ThemeToggle';
import {CartMain} from '~/components/CartMain';
import {PredictiveSearch} from '~/components/PredictiveSearch';
import {ToastProvider} from '~/components/ui/Toast';
import {Skeleton} from '~/components/ui/primitives';
import {Icon} from '~/components/ui/Icon';
import {buildNavigation, type NavItem} from '~/lib/menu';
import {siteConfig} from '~/config/site';
import {Link} from 'react-router';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const primaryDomainUrl = header?.shop?.primaryDomain?.url;
  const navigation = buildNavigation(header?.menu, {publicStoreDomain, primaryDomainUrl});

  return (
    <ToastProvider>
      <Aside.Provider>
        <CartAside cart={cart} />
        <Aside type="search" heading="Search" width="lg">
          <PredictiveSearch />
        </Aside>
        <MobileMenuAside navigation={navigation} />
        <div id="app-shell" className="flex min-h-dvh flex-col">
          <a
            href="#main-content"
            className="sr-only z-[70] rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <AnnouncementBar />
          <Header header={header} navigation={navigation} cart={cart} isLoggedIn={isLoggedIn} />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Footer
            footer={footer}
            publicStoreDomain={publicStoreDomain}
            primaryDomainUrl={primaryDomainUrl}
          />
        </div>
      </Aside.Provider>
    </ToastProvider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="Your cart">
      <Suspense
        fallback={
          <div className="space-y-4 p-5" aria-label="Loading cart" role="status">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        <Await resolve={cart}>
          {(cart) => <CartMain cart={cart} layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function MobileMenuAside({navigation}: {navigation: NavItem[]}) {
  const {close} = useAside();
  return (
    <Aside type="mobile" heading="Menu" side="left">
      <nav aria-label="Mobile" className="flex h-full flex-col">
        <ul className="divide-y divide-border px-5">
          {navigation.map((item) => (
            <li key={item.id}>
              {item.items.length ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {item.title}
                    <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
                  </summary>
                  <ul className="space-y-1 pb-4 pl-2">
                    <li>
                      <NavItemLink item={item} onClick={close} className="block py-2 text-muted">
                        All {item.title}
                      </NavItemLink>
                    </li>
                    {item.items.map((child) => (
                      <li key={child.id}>
                        <NavItemLink item={child} onClick={close} className="block py-2 text-muted">
                          {child.title}
                        </NavItemLink>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <NavItemLink item={item} onClick={close} className="block py-4 text-lg font-medium">
                  {item.title}
                </NavItemLink>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-1 border-t border-border p-5 text-sm">
          <Link to="/account" onClick={close} className="flex items-center gap-3 py-2">
            <Icon name="user" className="size-4" /> Account
          </Link>
          <Link to="/wishlist" onClick={close} className="flex items-center gap-3 py-2">
            <Icon name="heart" className="size-4" /> Wishlist
          </Link>
          <Link to="/contact" onClick={close} className="flex items-center gap-3 py-2">
            <Icon name="mail" className="size-4" /> Contact us
          </Link>
          {siteConfig.theme.enableDarkMode ? (
            <div className="flex items-center gap-1 pt-2">
              <ThemeToggle /> <span>Theme</span>
            </div>
          ) : null}
        </div>
      </nav>
    </Aside>
  );
}

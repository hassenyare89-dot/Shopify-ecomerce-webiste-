import {Suspense} from 'react';
import {Await, Link} from 'react-router';
import {useAnalytics} from '@shopify/hydrogen';
import type {FooterQuery} from 'storefrontapi.generated';
import {siteConfig} from '~/config/site';
import {NewsletterForm} from '~/components/NewsletterForm';
import {Icon, type IconName} from '~/components/ui/Icon';
import {buildNavigation} from '~/lib/menu';

const CARD_LABELS: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMERICAN_EXPRESS: 'American Express',
  DISCOVER: 'Discover',
  DINERS_CLUB: 'Diners Club',
  JCB: 'JCB',
};
const WALLET_LABELS: Record<string, string> = {
  APPLE_PAY: 'Apple Pay',
  ANDROID_PAY: 'Google Pay',
  GOOGLE_PAY: 'Google Pay',
  SHOPIFY_PAY: 'Shop Pay',
};

export function Footer({
  footer: footerPromise,
  publicStoreDomain,
  primaryDomainUrl,
}: {
  footer: Promise<FooterQuery | null>;
  publicStoreDomain: string;
  primaryDomainUrl?: string;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-heading text-2xl">{siteConfig.name}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{siteConfig.tagline}</p>
          <div className="mt-6 max-w-md">
            <p className="mb-3 text-sm font-semibold">{siteConfig.newsletter.heading}</p>
            <NewsletterForm source="footer" />
          </div>
          <SocialLinks />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
          {siteConfig.menus.footerColumns.map((column) => (
            <div key={column.title}>
              <p className="mb-4 text-sm font-semibold">{column.title}</p>
              <ul className="space-y-3 text-sm text-muted">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} prefetch="intent" className="hover:text-foreground">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Suspense fallback={<div />}>
            <Await resolve={footerPromise} errorElement={<div />}>
              {(footer) => (
                <div>
                  <p className="mb-4 text-sm font-semibold">Policies</p>
                  <ul className="space-y-3 text-sm text-muted">
                    {policyLinks(footer).map((p) => (
                      <li key={p.to}>
                        <Link to={p.to} prefetch="intent" className="hover:text-foreground">
                          {p.title}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link to="/cookie-policy" className="hover:text-foreground">
                        Cookie policy
                      </Link>
                    </li>
                    {buildNavigation(footer?.menu, {publicStoreDomain, primaryDomainUrl}, []).map(
                      (item) => (
                        <li key={item.id}>
                          {item.external ? (
                            <a href={item.to} rel="noopener noreferrer" className="hover:text-foreground">
                              {item.title}
                            </a>
                          ) : (
                            <Link to={item.to} className="hover:text-foreground">
                              {item.title}
                            </Link>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </Await>
          </Suspense>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <p>
              &copy; {year} {siteConfig.legal.businessName}. All rights reserved.
            </p>
            <PrivacyChoices />
          </div>
          <Suspense fallback={null}>
            <Await resolve={footerPromise} errorElement={null}>
              {(footer) => <PaymentMethods footer={footer} />}
            </Await>
          </Suspense>
        </div>
      </div>
    </footer>
  );
}

function policyLinks(footer: FooterQuery | null) {
  const shop = footer?.shop;
  return [
    shop?.privacyPolicy,
    shop?.termsOfService,
    shop?.refundPolicy,
    shop?.shippingPolicy,
    shop?.subscriptionPolicy,
  ]
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({title: p.title, to: `/policies/${p.handle}`}));
}

/** Payment methods reported by Shopify for this store (not hardcoded). */
function PaymentMethods({footer}: {footer: FooterQuery | null}) {
  const settings = footer?.shop?.paymentSettings;
  if (!settings) return null;
  const labels = [
    ...settings.supportedDigitalWallets.map((w) => WALLET_LABELS[w] ?? null),
    ...settings.acceptedCardBrands.map((c) => CARD_LABELS[c] ?? null),
  ].filter((l): l is string => Boolean(l));
  const unique = Array.from(new Set(labels));
  if (!unique.length) return null;
  return (
    <ul aria-label="Accepted payment methods" className="flex flex-wrap items-center justify-center gap-2">
      {unique.map((label) => (
        <li
          key={label}
          className="rounded-md border border-border bg-background px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground/80"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

const SOCIAL: {key: keyof typeof siteConfig.social; label: string; icon: IconName}[] = [
  {key: 'instagram', label: 'Instagram', icon: 'instagram'},
  {key: 'tiktok', label: 'TikTok', icon: 'play'},
  {key: 'pinterest', label: 'Pinterest', icon: 'map'},
  {key: 'facebook', label: 'Facebook', icon: 'user'},
  {key: 'youtube', label: 'YouTube', icon: 'play'},
  {key: 'x', label: 'X', icon: 'close'},
];

function SocialLinks() {
  const links = SOCIAL.filter((s) => siteConfig.social[s.key]);
  if (!links.length) return null;
  return (
    <ul className="mt-6 flex gap-2" aria-label="Social media">
      {links.map((s) => (
        <li key={s.key}>
          <a
            href={siteConfig.social[s.key] ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:border-foreground"
          >
            <Icon name={s.icon} className="size-4" />
            <span className="sr-only">{s.label} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Re-opens Shopify's consent preferences (Customer Privacy API). Falls back to
 * the cookie policy when the banner isn't enabled/loaded.
 */
function PrivacyChoices() {
  const {privacyBanner} = useAnalytics();
  if (!privacyBanner) {
    return (
      <Link to="/cookie-policy" className="underline-offset-4 hover:text-foreground hover:underline">
        Privacy choices
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => privacyBanner.showPreferences()}
      className="underline-offset-4 hover:text-foreground hover:underline"
    >
      Privacy choices
    </button>
  );
}

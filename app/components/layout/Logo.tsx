import {siteConfig} from '~/config/site';

/**
 * Brand logo: config logo → Shopify brand logo (Settings → Brand) → wordmark.
 */
export function Logo({
  shopLogo,
  className = 'h-7 w-auto lg:h-8',
}: {
  shopLogo?: {url: string; altText?: string | null} | null;
  className?: string;
}) {
  const {logo, name} = siteConfig;
  if (logo.src) {
    return (
      <img
        src={logo.src}
        alt={logo.alt || name}
        width={logo.width}
        height={logo.height}
        className={className}
      />
    );
  }
  if (shopLogo?.url) {
    return <img src={shopLogo.url} alt={shopLogo.altText || name} className={className} />;
  }
  return (
    <span className="font-heading text-xl font-semibold tracking-tight lg:text-2xl">
      {name}
    </span>
  );
}

/**
 * Homepage sections. Every section renders real Shopify data or
 * merchant-managed metaobject content, and hides itself when it has nothing
 * truthful to show.
 */
import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {ButtonLink} from '~/components/ui/Button';
import {Icon, type IconName} from '~/components/ui/Icon';
import {Accordion, Rating, SectionHeading} from '~/components/ui/primitives';
import {ProductRail} from '~/components/ProductRail';
import {ProductCard as ProductCardLite} from '~/components/ProductCard';
import {NewsletterForm} from '~/components/NewsletterForm';
import {Hero3D} from '~/components/home/Hero3D';
import type {
  ContentImage,
  FaqEntry,
  HeroSlide,
  PromoBanner,
  SocialPost,
  Testimonial,
} from '~/lib/content';
import {siteConfig} from '~/config/site';
import {cn} from '~/lib/cn';

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export function HeroSection({
  slide,
  productImages,
}: {
  slide: HeroSlide;
  /** Real product images used for the visual composition / 3D view. */
  productImages: ContentImage[];
}) {
  const visuals = productImages.slice(0, 3);
  const [ready3D, setReady3D] = useState(false);
  const enable3D = siteConfig.hero.enable3D && visuals.length > 0 && !slide.image;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-[var(--brand-hero)] text-white"
    >
      {slide.image ? (
        <Image
          data={slide.image}
          alt={slide.image.altText ?? ''}
          loading="eager"
          {...{fetchpriority: 'high'}}
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_40%,color-mix(in_oklab,var(--brand-accent)_45%,transparent),transparent_55%),radial-gradient(ellipse_at_20%_80%,rgb(255_255_255/0.08),transparent_50%)]"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/35 to-transparent"
      />

      <div className="container-page grid min-h-[78svh] items-center gap-10 py-16 md:min-h-[82svh] lg:grid-cols-2 lg:py-24">
        <div className="max-w-xl animate-fade-up">
          {slide.eyebrow ? (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {slide.eyebrow}
            </p>
          ) : null}
          <h1 id="hero-heading" className="text-5xl leading-[1.02] font-semibold sm:text-6xl lg:text-7xl">
            {slide.heading}
          </h1>
          {slide.subheading ? (
            <p className="mt-6 max-w-md text-lg text-white/80">{slide.subheading}</p>
          ) : null}
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink
              to={slide.ctaUrl ?? siteConfig.hero.primaryCta.to}
              size="lg"
              variant="secondary"
              className="bg-white text-[var(--brand-hero)] hover:bg-white/90"
            >
              {slide.ctaLabel ?? siteConfig.hero.primaryCta.label}
              <Icon name="arrowRight" className="size-4" />
            </ButtonLink>
            <ButtonLink
              to={slide.secondaryCtaUrl ?? siteConfig.hero.secondaryCta.to}
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:border-white hover:bg-white/10"
            >
              {slide.secondaryCtaLabel ?? siteConfig.hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        {visuals.length && !slide.image ? (
          <div className="relative mx-auto aspect-[5/4] w-full max-w-xl lg:max-w-none">
            {/* Static composition: always rendered (no-JS / reduced motion fallback). */}
            <StaticComposition images={visuals} hide={ready3D} />
            {enable3D ? (
              <Hero3D
                images={visuals}
                onReady={() => setReady3D(true)}
                className="absolute inset-0 hidden md:block"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StaticComposition({images, hide}: {images: ContentImage[]; hide: boolean}) {
  const positions = [
    'left-1/2 top-1/2 z-20 w-[52%] -translate-x-1/2 -translate-y-1/2',
    'left-[4%] top-[18%] z-10 w-[36%] -rotate-6',
    'right-[4%] top-[26%] z-10 w-[36%] rotate-6',
  ];
  return (
    <div
      className={cn('absolute inset-0 transition-opacity duration-700', hide && 'md:opacity-0')}
    >
      {images.map((image, i) => (
        <div
          key={image.url}
          className={cn(
            'absolute overflow-hidden rounded-brand shadow-2xl ring-1 ring-white/10',
            positions[i],
            i > 0 && 'hidden sm:block',
          )}
        >
          <Image
            data={image}
            alt={i === 0 ? (image.altText ?? '') : ''}
            aspectRatio="4/5"
            sizes="(min-width: 1024px) 25vw, 50vw"
            loading={i === 0 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories & collections                                                    */
/* -------------------------------------------------------------------------- */

export interface CollectionTile {
  id: string;
  handle: string;
  title: string;
  image?: ContentImage | null;
}

export function CategoriesSection({collections}: {collections: CollectionTile[]}) {
  if (!collections.length) return null;
  return (
    <section aria-labelledby="categories-heading" className="container-page py-16 md:py-24">
      <SectionHeading
        id="categories-heading"
        eyebrow="Browse"
        title="Shop by category"
        action={{label: 'All collections', to: '/collections'}}
      />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {collections.slice(0, 6).map((collection, i) => (
          <li key={collection.id} className={cn(i === 0 && 'col-span-2 row-span-2 lg:col-span-2')}>
            <Link
              to={`/collections/${collection.handle}`}
              prefetch="intent"
              className="group relative block h-full overflow-hidden rounded-brand bg-surface"
            >
              <div className={cn('relative', i === 0 ? 'aspect-square lg:aspect-auto lg:h-full' : 'aspect-[4/5]')}>
                {collection.image ? (
                  <Image
                    data={collection.image}
                    alt={collection.image.altText ?? ''}
                    sizes={i === 0 ? '(min-width: 1024px) 33vw, 100vw' : '(min-width: 1024px) 16vw, 50vw'}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out-expo group-hover:scale-105"
                  />
                ) : null}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
                  <span className={cn('font-heading', i === 0 ? 'text-2xl md:text-3xl' : 'text-lg')}>
                    {collection.title}
                  </span>
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-black">
                    <Icon name="arrowRight" className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeaturedCollectionSection({
  collection,
}: {
  collection: CollectionTile & {description?: string | null; products: ProductCardFragment[]};
}) {
  if (!collection.products.length) return null;
  return (
    <section className="container-page py-16 md:py-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <Link
          to={`/collections/${collection.handle}`}
          className="group relative block min-h-80 overflow-hidden rounded-brand bg-secondary"
        >
          {collection.image ? (
            <Image
              data={collection.image}
              alt={collection.image.altText ?? ''}
              sizes="(min-width: 1024px) 40vw, 100vw"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : null}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">Featured collection</p>
            <h2 className="mt-2 text-3xl md:text-4xl">{collection.title}</h2>
            {collection.description ? (
              <p className="mt-3 line-clamp-2 max-w-md text-white/80">{collection.description}</p>
            ) : null}
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 group-hover:underline">
              Shop the collection <Icon name="arrowRight" className="size-4" />
            </span>
          </div>
        </Link>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8">
          {collection.products.slice(0, 4).map((product) => (
            <li key={product.id}>
              <ProductCardLite product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function RailSection(props: React.ComponentProps<typeof ProductRail>) {
  if (!props.products.length) return null;
  return (
    <div className="container-page py-12 md:py-16">
      <ProductRail {...props} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Limited-time offer                                                          */
/* -------------------------------------------------------------------------- */

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!endsAt || now === null) return null;
  const diff = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/** Only rendered when the offer is enabled, has a real future end date and products. */
export function LimitedOfferSection({products}: {products: ProductCardFragment[]}) {
  const offer = siteConfig.limitedOffer;
  const remaining = useCountdown(offer.endsAt);
  const endsAtValid = offer.endsAt && new Date(offer.endsAt).getTime() > Date.now();
  if (!offer.enabled || !endsAtValid || !products.length) return null;

  return (
    <section aria-labelledby="offer-heading" className="container-page py-12 md:py-16">
      <div className="rounded-brand bg-secondary p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-sale">Ends soon</p>
            <h2 id="offer-heading" className="mt-2 text-3xl md:text-4xl">
              {offer.heading}
            </h2>
            <p className="mt-2 max-w-lg text-muted">{offer.body}</p>
            <Link to={offer.termsUrl} className="mt-2 inline-block text-xs underline underline-offset-4">
              Offer terms
            </Link>
          </div>
          {remaining ? (
            <div role="timer" aria-label="Time remaining" className="flex gap-2">
              {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
                <div key={unit} className="w-16 rounded-brand bg-background py-3 text-center shadow-soft">
                  <span className="block text-2xl font-semibold tabular-nums">
                    {String(remaining[unit]).padStart(2, '0')}
                  </span>
                  <span className="text-[0.65rem] tracking-wide text-muted uppercase">{unit}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <ProductRail title="On offer now" products={products} action={{label: 'Shop the offer', to: `/collections/${offer.collectionHandle}`}} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Promo banners                                                               */
/* -------------------------------------------------------------------------- */

export function PromoBannersSection({banners}: {banners: PromoBanner[]}) {
  if (!banners.length) return null;
  return (
    <section aria-label="Promotions" className="container-page py-12 md:py-16">
      <ul className={cn('grid gap-4 md:gap-6', banners.length > 1 && 'md:grid-cols-2')}>
        {banners.slice(0, 2).map((banner) => (
          <li key={banner.id}>
            <div className="group relative flex min-h-80 items-end overflow-hidden rounded-brand bg-secondary p-8 md:min-h-[26rem]">
              {banner.image ? (
                <Image
                  data={banner.image}
                  alt={banner.image.altText ?? ''}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : null}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <div className="relative max-w-md text-white">
                <h2 className="text-3xl">{banner.heading}</h2>
                {banner.body ? <p className="mt-2 text-white/85">{banner.body}</p> : null}
                {banner.ctaUrl ? (
                  <ButtonLink
                    to={banner.ctaUrl}
                    variant="secondary"
                    className="mt-5 bg-white text-[var(--brand-hero)] hover:bg-white/90"
                  >
                    {banner.ctaLabel ?? 'Shop now'}
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Social proof                                                                */
/* -------------------------------------------------------------------------- */

/** Testimonials from the `testimonial` metaobject only — never invented. */
export function TestimonialsSection({testimonials}: {testimonials: Testimonial[]}) {
  if (!testimonials.length) return null;
  return (
    <section aria-labelledby="testimonials-heading" className="bg-surface py-16 md:py-24">
      <div className="container-page">
        <SectionHeading id="testimonials-heading" eyebrow="Kind words" title="What our customers say" align="center" />
        <ul className="grid gap-6 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <li key={t.id}>
              <figure className="flex h-full flex-col rounded-brand border border-border bg-background p-7 shadow-soft">
                {t.rating ? <Rating value={t.rating} size="md" /> : null}
                <blockquote className="mt-4 flex-1 font-heading text-lg leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-semibold">{t.author}</span>
                  {t.location ? <span className="text-muted"> · {t.location}</span> : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Top-rated products, using real review-app metafields. Hidden if none rated. */
export function ReviewsSection({products}: {products: ProductCardFragment[]}) {
  if (!products.length) return null;
  return (
    <div className="container-page py-12 md:py-16">
      <ProductRail eyebrow="Loved by customers" title="Top rated" products={products} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand story, trust, FAQ, social, newsletter                                 */
/* -------------------------------------------------------------------------- */

export function BrandStorySection({image}: {image?: ContentImage | null}) {
  const story = siteConfig.brandStory;
  return (
    <section aria-labelledby="story-heading" className="container-page py-16 md:py-24">
      <div className="grid items-center gap-10 overflow-hidden rounded-brand bg-secondary md:grid-cols-2">
        <div className="relative aspect-[4/3] h-full md:aspect-auto md:min-h-[28rem]">
          {image ? (
            <Image
              data={image}
              alt={image.altText ?? ''}
              sizes="(min-width: 768px) 50vw, 100vw"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--brand-accent),transparent_60%)] opacity-30" />
          )}
        </div>
        <div className="p-8 md:p-12">
          <p className="eyebrow">Our story</p>
          <h2 id="story-heading" className="mt-3 text-3xl md:text-5xl">
            {story.heading}
          </h2>
          <p className="mt-5 max-w-lg leading-7 text-foreground/80">{story.body}</p>
          <ButtonLink to={story.cta.to} variant="outline" className="mt-8">
            {story.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section aria-label="Why shop with us" className="border-y border-border">
      <ul className="container-page grid grid-cols-2 gap-8 py-12 lg:grid-cols-4">
        {siteConfig.trust.map((item) => (
          <li key={item.title} className="flex flex-col items-start gap-3 sm:flex-row">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
              <Icon name={item.icon as IconName} />
            </span>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FaqPreviewSection({items}: {items: FaqEntry[]}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="container-page py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Help</p>
          <h2 id="faq-heading" className="mt-3 text-3xl md:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted">Can&rsquo;t find what you&rsquo;re looking for?</p>
          <div className="mt-6 flex gap-3">
            <ButtonLink to="/faq" variant="outline">
              All FAQs
            </ButtonLink>
            <ButtonLink to="/contact" variant="ghost">
              Contact us
            </ButtonLink>
          </div>
        </div>
        <div className="border-t border-border">
          {items.slice(0, 5).map((item) => (
            <Accordion key={item.id} title={item.question}>
              <p className="whitespace-pre-line">{item.answer}</p>
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialSection({posts}: {posts: SocialPost[]}) {
  if (!posts.length) return null;
  const instagram = siteConfig.social.instagram;
  return (
    <section aria-labelledby="social-heading" className="py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          id="social-heading"
          eyebrow="Community"
          title="As seen on social"
          align="center"
          action={instagram ? {label: 'Follow us', to: instagram} : undefined}
        />
      </div>
      <ul className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {posts.slice(0, 6).map((post) => {
          const content = (
            <>
              <Image
                data={post.image}
                alt={post.caption ?? post.image.altText ?? 'Social post'}
                aspectRatio="1/1"
                sizes="(min-width: 768px) 16vw, 33vw"
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                <Icon name="instagram" className="size-6" />
              </span>
            </>
          );
          return (
            <li key={post.id} className="group relative aspect-square overflow-hidden">
              {post.url ? (
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {content}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function NewsletterSection() {
  const n = siteConfig.newsletter;
  return (
    <section aria-labelledby="newsletter-heading" className="container-page py-16 md:py-24">
      <div className="relative overflow-hidden rounded-brand bg-primary px-6 py-14 text-primary-foreground md:px-16">
        <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 id="newsletter-heading" className="text-3xl md:text-5xl">
            {n.heading}
          </h2>
          <p className="mt-4 opacity-80">{n.body}</p>
          <div className="mx-auto mt-8 max-w-lg text-left">
            <NewsletterForm tone="inverted" source="homepage" />
          </div>
        </div>
      </div>
    </section>
  );
}

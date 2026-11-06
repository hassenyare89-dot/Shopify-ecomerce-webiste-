import {Image} from '@shopify/hydrogen';

export function CollectionHeader({
  title,
  description,
  image,
  eyebrow,
}: {
  title: string;
  description?: string | null;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
  eyebrow?: string;
}) {
  if (image) {
    return (
      <header className="relative mb-10 overflow-hidden rounded-brand bg-secondary">
        <Image
          data={image}
          alt={image.altText ?? ''}
          sizes="100vw"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/65 to-black/10" />
        <div className="relative max-w-2xl px-6 py-16 text-white md:px-12 md:py-24">
          {eyebrow ? <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">{eyebrow}</p> : null}
          <h1 className="text-4xl md:text-6xl">{title}</h1>
          {description ? <p className="mt-4 text-white/85">{description}</p> : null}
        </div>
      </header>
    );
  }
  return (
    <header className="mb-10 max-w-3xl">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h1 className="text-4xl md:text-6xl">{title}</h1>
      {description ? <p className="mt-4 text-muted">{description}</p> : null}
    </header>
  );
}

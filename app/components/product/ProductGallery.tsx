import {useEffect, useRef, useState} from 'react';
import {Image, MediaFile} from '@shopify/hydrogen';
import type {ProductMediaFragment} from 'storefrontapi.generated';
import {Icon} from '~/components/ui/Icon';
import {cn} from '~/lib/cn';

/**
 * Product media gallery:
 *  - images, Shopify-hosted video, external video (YouTube/Vimeo) and 3D models
 *  - swipeable scroll-snap carousel on touch devices, thumbnails on desktop
 *  - click/Enter to open a fullscreen zoom viewer (native <dialog>)
 *  - jumps to the selected variant's image
 */
export function ProductGallery({
  media,
  selectedImageUrl,
  title,
}: {
  media: ProductMediaFragment[];
  selectedImageUrl?: string | null;
  title: string;
}) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  // Follow the selected variant image.
  useEffect(() => {
    if (!selectedImageUrl) return;
    const index = media.findIndex(
      (m) => m.__typename === 'MediaImage' && m.image?.url === selectedImageUrl,
    );
    if (index >= 0) goTo(index, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageUrl]);

  function goTo(index: number, behavior: ScrollBehavior = 'smooth') {
    setActive(index);
    const el = scroller.current;
    if (el) el.scrollTo({left: el.clientWidth * index, behavior});
  }

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active) setActive(index);
  };

  if (!media.length) {
    return <div className="aspect-[4/5] rounded-brand bg-surface" aria-label="No product images" />;
  }

  return (
    <div className="flex min-w-0 flex-col-reverse gap-4 lg:flex-row" aria-roledescription="carousel" aria-label={`${title} media`}>
      {media.length > 1 ? (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[42rem] lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-y-auto">
          {media.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show media ${i + 1} of ${media.length}`}
                aria-current={i === active}
                className={cn(
                  'relative block size-16 overflow-hidden rounded-[calc(var(--brand-radius)-0.25rem)] bg-surface ring-offset-2 ring-offset-background transition lg:size-20',
                  i === active ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100',
                )}
              >
                {item.previewImage ? (
                  <Image
                    data={item.previewImage}
                    alt=""
                    width={96}
                    aspectRatio="1/1"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {item.__typename !== 'MediaImage' ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <Icon name={item.__typename === 'Model3d' ? 'cube' : 'play'} className="size-5" filled={item.__typename !== 'Model3d'} />
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-brand bg-surface"
        >
          {media.map((item, i) => (
            <div
              key={item.id}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${media.length}`}
              aria-hidden={i !== active}
            >
              {item.__typename === 'MediaImage' && item.image ? (
                <button
                  type="button"
                  className="group block h-full w-full cursor-zoom-in"
                  onClick={() => dialog.current?.showModal()}
                  aria-label="Zoom image"
                  tabIndex={i === active ? 0 : -1}
                >
                  <Image
                    data={item.image}
                    alt={item.image.altText || title}
                    aspectRatio="4/5"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    {...(i === 0 ? {fetchpriority: 'high'} : {})}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-4 bottom-4 inline-flex size-10 items-center justify-center rounded-full bg-background/85 opacity-0 shadow-soft backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon name="zoom" className="size-4" />
                  </span>
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center [&_iframe]:h-full [&_iframe]:w-full [&_model-viewer]:h-full [&_model-viewer]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
                  {i === active ? (
                    <MediaFile
                      data={item}
                      mediaOptions={{
                        video: {controls: true, playsInline: true, preload: 'metadata', muted: true},
                        externalVideo: {title: `${title} video`},
                        modelViewer: {cameraControls: true, autoRotate: true, alt: item.alt || `${title} 3D model`, ar: true} as never,
                      }}
                    />
                  ) : item.previewImage ? (
                    <Image data={item.previewImage} alt="" aspectRatio="4/5" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>

        {media.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden" aria-hidden>
            {media.map((m, i) => (
              <span key={m.id} className={cn('h-1.5 rounded-full bg-foreground/60 transition-all', i === active ? 'w-5 bg-foreground' : 'w-1.5')} />
            ))}
          </div>
        ) : null}
      </div>

      <ZoomDialog dialogRef={dialog} media={media} active={active} title={title} onChange={goTo} />
    </div>
  );
}

function ZoomDialog({
  dialogRef,
  media,
  active,
  title,
  onChange,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  media: ProductMediaFragment[];
  active: number;
  title: string;
  onChange: (i: number) => void;
}) {
  const images = media
    .map((m, index) => ({m, index}))
    .filter(({m}) => m.__typename === 'MediaImage' && m.image);
  const current = media[active]?.__typename === 'MediaImage' ? media[active] : images[0]?.m;
  const [origin, setOrigin] = useState('50% 50%');
  const [zoomed, setZoomed] = useState(false);
  const pos = images.findIndex(({index}) => index === active);

  const step = (dir: 1 | -1) => {
    if (!images.length) return;
    const nextPos = (Math.max(0, pos) + dir + images.length) % images.length;
    onChange(images[nextPos].index);
    setZoomed(false);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${title} image viewer`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-background p-0 backdrop:bg-black/60"
      onClose={() => setZoomed(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      }}
    >
      <div className="relative flex h-full items-center justify-center overflow-hidden">
        {current?.__typename === 'MediaImage' && current.image ? (
          <button
            type="button"
            className={cn('h-full w-full', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            onClick={() => setZoomed((z) => !z)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
          >
            <Image
              data={current.image}
              alt={current.image.altText || title}
              sizes="100vw"
              className="h-full w-full object-contain transition-transform duration-300"
              style={{transform: zoomed ? 'scale(2.2)' : 'none', transformOrigin: origin}}
            />
          </button>
        ) : null}
        <form method="dialog" className="absolute top-4 right-4">
          <button className="inline-flex size-11 items-center justify-center rounded-full bg-background shadow-soft" aria-label="Close image viewer">
            <Icon name="close" />
          </button>
        </form>
        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute left-4 inline-flex size-11 items-center justify-center rounded-full bg-background shadow-soft">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute right-4 inline-flex size-11 items-center justify-center rounded-full bg-background shadow-soft">
              <Icon name="chevronRight" />
            </button>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

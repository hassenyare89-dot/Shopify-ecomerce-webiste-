import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {siteConfig} from '~/config/site';
import {Icon} from '~/components/ui/Icon';

/**
 * Rotating announcement bar. Rotation pauses on hover/focus and is disabled
 * for users who prefer reduced motion (WCAG 2.2.2 Pause, Stop, Hide).
 */
export function AnnouncementBar({
  messages = siteConfig.announcements,
}: {
  messages?: ReadonlyArray<{text: string; to: string | null}>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (messages.length < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => window.clearInterval(id);
  }, [messages.length, paused]);

  if (!messages.length) return null;
  const message = messages[index];

  return (
    <div
      className="bg-primary text-primary-foreground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page flex h-9 items-center justify-center gap-3 text-xs font-medium tracking-wide">
        {messages.length > 1 ? (
          <button
            type="button"
            className="opacity-70 hover:opacity-100"
            aria-label="Previous announcement"
            onClick={() => setIndex((i) => (i - 1 + messages.length) % messages.length)}
          >
            <Icon name="chevronLeft" className="size-3.5" />
          </button>
        ) : null}
        <p key={index} className="animate-fade-in truncate" aria-live={paused ? 'polite' : 'off'}>
          {message.to ? (
            <Link to={message.to} className="underline-offset-4 hover:underline">
              {message.text}
            </Link>
          ) : (
            message.text
          )}
        </p>
        {messages.length > 1 ? (
          <button
            type="button"
            className="opacity-70 hover:opacity-100"
            aria-label="Next announcement"
            onClick={() => setIndex((i) => (i + 1) % messages.length)}
          >
            <Icon name="chevronRight" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

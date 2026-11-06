import {useEffect, useState} from 'react';
import {Icon} from '~/components/ui/Icon';

type Mode = 'light' | 'dark';

/** Toggles light/dark and remembers the choice in localStorage. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    setMode(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  const next: Mode = mode === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem('theme', next);
        } catch {
          // storage unavailable
        }
        setMode(next);
      }}
      className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-foreground/5"
      aria-label={mode ? `Switch to ${next} theme` : 'Toggle theme'}
    >
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

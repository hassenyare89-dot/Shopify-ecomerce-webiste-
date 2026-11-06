/**
 * Accessible slide-out drawer used for the cart, search, mobile menu and
 * collection filters.
 *
 * - role="dialog" + aria-modal with a labelled heading
 * - focus moves into the drawer on open, is trapped, and is restored on close
 * - Escape and backdrop click close it; body scroll is locked while open
 * - content outside is made `inert` for assistive tech
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useLocation} from 'react-router';
import {cn} from '~/lib/cn';
import {Icon} from '~/components/ui/Icon';

export type AsideType = 'search' | 'cart' | 'mobile' | 'filters' | 'closed';

type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Aside({
  children,
  heading,
  type,
  side = 'right',
  width = 'md',
  footer,
}: {
  children?: ReactNode;
  type: Exclude<AsideType, 'closed'>;
  heading: ReactNode;
  side?: 'left' | 'right';
  width?: 'md' | 'lg';
  footer?: ReactNode;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const main = document.getElementById('app-shell');
    main?.setAttribute('inert', '');
    const {overflow} = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element (prefer inputs, e.g. search).
    const raf = requestAnimationFrame(() => {
      const preferred = panel?.querySelector<HTMLElement>('[data-autofocus]');
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? first ?? panel)?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      main?.removeAttribute('inert');
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [expanded, close]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-[visibility] duration-300',
        expanded ? 'visible' : 'invisible delay-300',
      )}
      aria-hidden={!expanded}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close panel"
        onClick={close}
        className={cn(
          'absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          expanded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className={cn(
          'absolute top-0 flex h-full w-full flex-col bg-background shadow-lift outline-none transition-transform duration-300 ease-out-expo',
          width === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md',
          side === 'right' ? 'right-0' : 'left-0',
          expanded
            ? 'translate-x-0'
            : side === 'right'
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={headingId} className="font-body text-base font-semibold tracking-normal">
            {heading}
          </h2>
          <button
            type="button"
            onClick={close}
            className="-mr-2 inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {expanded || type === 'cart' ? children : null}
        </div>
        {footer ? <div className="border-t border-border">{footer}</div> : null}
      </div>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');
  const location = useLocation();
  const close = useCallback(() => setType('closed'), []);

  // Close any open drawer on navigation (except filters, which update the URL).
  useEffect(() => {
    setType((current) => (current === 'filters' ? current : 'closed'));
  }, [location.pathname]);

  const value = useMemo(() => ({type, open: setType, close}), [type, close]);
  return <AsideContext.Provider value={value}>{children}</AsideContext.Provider>;
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

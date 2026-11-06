/**
 * Toast notifications announced via an aria-live region.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {cn} from '~/lib/cn';
import {Icon} from './Icon';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: {label: string; onClick: () => void};
}

interface ToastContextValue {
  toast: (
    message: string,
    options?: {tone?: ToastTone; action?: ToastItem['action']; duration?: number},
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (message, {tone = 'success', action, duration = 4000} = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), {id, message, tone, action}]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({toast}), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-brand border border-border bg-background px-4 py-3 text-sm shadow-lift',
            )}
          >
            <Icon
              name={t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'info' : 'check'}
              className={cn(
                'size-4 shrink-0',
                t.tone === 'error' ? 'text-sale' : t.tone === 'success' ? 'text-success' : '',
              )}
            />
            <p className="flex-1">{t.message}</p>
            {t.action ? (
              <button
                type="button"
                className="font-semibold underline underline-offset-4"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-muted hover:text-foreground"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

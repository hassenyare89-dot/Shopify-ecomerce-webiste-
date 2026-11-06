/**
 * Structured JSON logger. Oxygen captures console output in the Shopify
 * admin (Hydrogen → Storefront → Logs) and can forward to a log drain.
 *
 * Never log secrets, tokens, full request bodies or personal data. Errors are
 * reduced to name/message/stack. Optionally forwards errors to an external
 * monitoring endpoint (e.g. a Sentry/Datadog intake) via ERROR_WEBHOOK_URL.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = /token|secret|password|authorization|cookie|email|phone|address/i;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 8).join('\n')};
  }
  return {message: String(error)};
}

export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'error') out.error = serializeError(value);
    else if (REDACT_KEYS.test(key)) out[key] = '[redacted]';
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
    } else out[key] = value;
  }
  return out;
}

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const entry = JSON.stringify({level, event, time: new Date().toISOString(), ...redact(fields)});
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  // eslint-disable-next-line no-console -- structured info logs are intentional
  else console.log(entry);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => write('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write('error', event, fields),
};

/** Fire-and-forget error report to an external monitoring webhook, if configured. */
export function reportError(
  env: {ERROR_WEBHOOK_URL?: string},
  waitUntil: ((p: Promise<unknown>) => void) | undefined,
  event: string,
  fields: Record<string, unknown>,
) {
  logger.error(event, fields);
  const url = env.ERROR_WEBHOOK_URL;
  if (!url || !url.startsWith('https://')) return;
  const body = JSON.stringify({event, time: new Date().toISOString(), ...redact(fields)});
  const send = fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body}).catch(() => undefined);
  waitUntil?.(send);
}

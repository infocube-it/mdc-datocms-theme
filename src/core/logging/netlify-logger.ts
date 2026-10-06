import { type Logger, plainEvent, type Severity } from './logger';

type Console = Pick<typeof globalThis.console, 'log' | 'warn' | 'error'>;

const consoleMethods: Record<Severity, keyof Console> = {
  debug: 'log',
  info: 'log',
  warning: 'warn',
  error: 'error',
};

/**
 * The default logger: one JSON line per event on the server console, which
 * Netlify collects in its function logs.
 */
export function createNetlifyLogger({ console = globalThis.console }: { console?: Console } = {}): Logger {
  return {
    log(event) {
      console[consoleMethods[event.severity]](JSON.stringify(plainEvent(event)));
    },
  };
}

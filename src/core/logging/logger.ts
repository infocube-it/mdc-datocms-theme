export type Severity = 'debug' | 'info' | 'warning' | 'error';

/** A significant event the Core or the Site reports to developers. */
export type LogEvent = {
  severity: Severity;
  message: string;
  context?: Record<string, unknown>;
};

/**
 * The logging adapter. The Core reports through it; a Site can swap the
 * default (Netlify logs) for another service, e.g. Sentry, via Site config.
 */
export interface Logger {
  log(event: LogEvent): void;
}

/**
 * The event as plain data, safe to serialize: errors in its context become
 * their name, message and stack. Never throws: logging must not break the
 * code that reports, so a context that can't be serialized is replaced.
 */
export function plainEvent({ severity, message, context }: LogEvent): LogEvent {
  if (!context) return { severity, message };
  try {
    return { severity, message, context: JSON.parse(JSON.stringify(context, replaceErrors)) };
  } catch (error) {
    return { severity, message, context: { unserializable: String(error) } };
  }
}

function replaceErrors(_key: string, value: unknown) {
  return value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
}

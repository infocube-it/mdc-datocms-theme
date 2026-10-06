import { describe, expect, it } from 'vitest';
import { createNetlifyLogger, type LogEvent, type Logger } from '@/core';
import { createMemoryLogger } from '@/core/testing';

/** A logger under test, plus a way to read back what it delivered. */
type LoggerUnderTest = { logger: Logger; delivered(): LogEvent[] };

function netlifyLoggerUnderTest(): LoggerUnderTest {
  const lines: string[] = [];
  const write = (line: unknown) => lines.push(String(line));
  const logger = createNetlifyLogger({ console: { log: write, warn: write, error: write } });
  return { logger, delivered: () => lines.map((line) => JSON.parse(line)) };
}

function memoryLoggerUnderTest(): LoggerUnderTest {
  const logger = createMemoryLogger();
  return { logger, delivered: () => logger.events };
}

describe.each([
  ['Netlify logger', netlifyLoggerUnderTest],
  ['in-memory logger', memoryLoggerUnderTest],
])('the %s', (_name, createLoggerUnderTest) => {
  it('delivers each event with its severity, message and context, in order', () => {
    const { logger, delivered } = createLoggerUnderTest();

    logger.log({ severity: 'info', message: 'Cache revalidated', context: { tags: ['all'] } });
    logger.log({ severity: 'warning', message: 'Label missing', context: { locale: 'de', key: 'send' } });
    logger.log({ severity: 'error', message: 'Webhook failed' });

    expect(delivered()).toEqual([
      { severity: 'info', message: 'Cache revalidated', context: { tags: ['all'] } },
      { severity: 'warning', message: 'Label missing', context: { locale: 'de', key: 'send' } },
      { severity: 'error', message: 'Webhook failed' },
    ]);
  });

  it('keeps the name and message of an error passed as context', () => {
    const { logger, delivered } = createLoggerUnderTest();

    logger.log({ severity: 'error', message: 'Webhook failed', context: { error: new TypeError('Bad payload') } });

    expect(delivered()[0]?.context?.error).toMatchObject({ name: 'TypeError', message: 'Bad payload' });
  });

  it('never throws, and still delivers the message, when the context cannot be serialized', () => {
    const { logger, delivered } = createLoggerUnderTest();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => logger.log({ severity: 'error', message: 'Webhook failed', context: { circular, id: 1n } })).not.toThrow();
    expect(delivered()).toEqual([
      { severity: 'error', message: 'Webhook failed', context: { unserializable: expect.any(String) } },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { createCore, defineSiteConfig, type SiteConfig } from '@/core';
import { createMemoryLogger } from '@/core/testing';
import { fakeSiteContentClient } from '../support/fake-site-content';

function setUp({ locales = ['it', 'en'], labels }: { locales?: string[]; labels?: SiteConfig['labels'] } = {}) {
  const logger = createMemoryLogger();
  const core = createCore(defineSiteConfig({ logger, labels }), {
    contentClient: fakeSiteContentClient({ locales, pages: [] }),
  });
  return { core, logger };
}

describe('Labels', () => {
  it('come from the Seed files in the requested locale', async () => {
    const { core, logger } = setUp();

    expect((await core.labelsFor('it'))('skipToContent')).toBe('Vai al contenuto');
    expect((await core.labelsFor('en'))('skipToContent')).toBe('Skip to content');
    expect(logger.events).toEqual([]);
  });

  it('can be overridden and extended by the Site, and a Site override wins', async () => {
    const { core } = setUp({
      labels: {
        it: { skipToContent: 'Salta al contenuto', bookVisit: 'Prenota una visita' },
        en: { bookVisit: 'Book a visit' },
      },
    });
    const italian = await core.labelsFor('it');
    const english = await core.labelsFor('en');

    expect(italian('skipToContent')).toBe('Salta al contenuto');
    expect(italian('bookVisit')).toBe('Prenota una visita');
    expect(english('skipToContent')).toBe('Skip to content');
    expect(english('bookVisit')).toBe('Book a visit');
  });

  it('fall back to the default locale, with a warning, when the locale has no Labels file', async () => {
    const { core, logger } = setUp({ locales: ['it', 'de'] });

    expect((await core.labelsFor('de'))('skipToContent')).toBe('Vai al contenuto');
    expect(logger.events).toEqual([
      {
        severity: 'warning',
        message: 'No Labels for this locale: using the default locale',
        context: { locale: 'de', defaultLocale: 'it' },
      },
    ]);
  });

  it('report each missing locale or Label once, however many pages show it', async () => {
    const { core, logger } = setUp({ locales: ['it', 'en', 'de'], labels: { it: { bookVisit: 'Prenota una visita' } } });

    for (let request = 0; request < 3; request++) {
      (await core.labelsFor('de'))('skipToContent');
      const english = await core.labelsFor('en');
      english('bookVisit');
      english('bookVisit');
    }

    expect(logger.events.map(({ message, context }) => [message, context?.locale])).toEqual([
      ['No Labels for this locale: using the default locale', 'de'],
      ['Label missing in this locale: using the default locale', 'en'],
    ]);
  });

  it('fall back to the default locale silently for a locale the Site does not offer', async () => {
    const { core, logger } = setUp();

    expect((await core.labelsFor('wp-admin'))('skipToContent')).toBe('Vai al contenuto');
    expect(logger.events).toEqual([]);
  });

  it('fall back to the default locale, with a warning, when a Label is missing in the locale', async () => {
    const { core, logger } = setUp({ labels: { it: { bookVisit: 'Prenota una visita' } } });

    expect((await core.labelsFor('en'))('bookVisit')).toBe('Prenota una visita');
    expect(logger.events).toEqual([
      {
        severity: 'warning',
        message: 'Label missing in this locale: using the default locale',
        context: { locale: 'en', defaultLocale: 'it', key: 'bookVisit' },
      },
    ]);
  });

  it('show the key, with an error, when a Label is missing in the default locale too', async () => {
    const { core, logger } = setUp();

    expect((await core.labelsFor('en'))('noSuchLabel')).toBe('noSuchLabel');
    expect(logger.events).toEqual([
      {
        severity: 'error',
        message: 'Label missing in the default locale',
        context: { locale: 'en', defaultLocale: 'it', key: 'noSuchLabel' },
      },
    ]);
  });
});

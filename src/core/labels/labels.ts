import type { ContentClient } from '../content/content-client';
import type { Logger, Severity } from '../logging/logger';
import { loadSiteLocales } from '../routing/site-locales';
import en from './seed/en';
import it from './seed/it';

/** Label text by key, for one locale. */
export type LocaleLabels = Record<string, string>;

/** Labels by locale, as the Seed ships them or a Site adds them. */
export type LabelsByLocale = Partial<Record<string, LocaleLabels>>;

/** Looks up a Label by key. */
export type Labels = (key: string) => string;

const seedLabels: LabelsByLocale = { it, en };

type LabelsContext = {
  contentClient: ContentClient;
  logger: Logger;
  /** The Site's own Labels: they extend the Seed's and win over them. */
  siteLabels?: LabelsByLocale;
  /** Problems already logged, so each is reported once per server process. */
  reported: Set<string>;
};

/**
 * The Labels of `locale`, from the Seed files merged with the Site's own.
 * What's missing in `locale` comes from the default locale, with a warning.
 */
export async function labelsFor(
  { contentClient, logger, siteLabels = {}, reported }: LabelsContext,
  locale: string,
): Promise<Labels> {
  const siteLocales = await loadSiteLocales(contentClient);
  const [defaultLocale = locale] = siteLocales;
  const labelsOf = (candidate: string): LocaleLabels | undefined =>
    seedLabels[candidate] || siteLabels[candidate]
      ? { ...seedLabels[candidate], ...siteLabels[candidate] }
      : undefined;

  function report(severity: Severity, message: string, key?: string) {
    const problem = JSON.stringify([message, locale, key]);
    if (reported.has(problem)) return;
    reported.add(problem);
    logger.log({ severity, message, context: { locale, defaultLocale, ...(key && { key }) } });
  }

  // A locale the Site doesn't offer only shows a 404 page: nothing to report.
  const offered = siteLocales.some((siteLocale) => siteLocale === locale);
  const labels = offered ? labelsOf(locale) : undefined;
  const defaultLabels = labelsOf(defaultLocale) ?? {};
  if (offered && !labels) report('warning', 'No Labels for this locale: using the default locale');

  return (key) => {
    const label = labels?.[key];
    if (label !== undefined) return label;

    const fallback = defaultLabels[key];
    if (fallback === undefined) {
      report('error', 'Label missing in the default locale', key);
      return key;
    }
    if (labels) report('warning', 'Label missing in this locale: using the default locale', key);
    return fallback;
  };
}

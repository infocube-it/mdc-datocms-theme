import type { LabelsByLocale } from './labels/labels';
import type { Logger } from './logging/logger';

/**
 * The developer-owned choices of a Site, kept in its code and read by the
 * Core. Fields are added here as Core features need them (invalidation mode,
 * Routable model order, adapters…).
 */
export type SiteConfig = {
  /** Replaces the default logger, which writes to Netlify logs. */
  logger?: Logger;
  /** The Site's own Labels by locale: they extend the Seed's and win over them. */
  labels?: LabelsByLocale;
};

export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

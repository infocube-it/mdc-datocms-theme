import type { LabelsByLocale } from './labels/labels';
import type { Logger } from './logging/logger';
import type { RoutableModel } from './routing/routable-model';

/**
 * The developer-owned choices of a Site, kept in its code and read by the
 * Core. Fields are added here as Core features need them (invalidation mode,
 * Routable model order, adapters…).
 */
export type SiteConfig = {
  /**
   * How a publish refreshes the cache. `global` (the default) revalidates
   * every page on each publish; pages keep serving their previous version
   * while they regenerate.
   */
  invalidationMode?: 'global';
  /** Replaces the default logger, which writes to Netlify logs. */
  logger?: Logger;
  /** The Site's own Labels by locale: they extend the Seed's and win over them. */
  labels?: LabelsByLocale;
  /**
   * The Routable models other than Page, each given its Paths by a Routing
   * rule in DatoCMS. When records of several models claim the same Path, the
   * first model in this list wins.
   */
  routableModels?: RoutableModel[];
};

export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

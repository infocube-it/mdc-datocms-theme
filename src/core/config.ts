/**
 * The developer-owned choices of a Site, kept in its code and read by the
 * Core. Fields are added here as Core features need them (invalidation mode,
 * Routable model order, adapters…).
 */
export type SiteConfig = Record<string, never>;

export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

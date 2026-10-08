import type { ContentClient } from '../content/content-client';
import { graphql } from '../content/graphql';
import type { RoutingRule } from './path-builder';
import type { SiteLocale } from './site-locales';

// One rule per Routable model: far fewer than the CDA's largest page size.
const RoutingRulesQuery = graphql(`
  query RoutingRules($locale: SiteLocale!) {
    allRoutingRules(locale: $locale, first: 500) {
      model
      prefix
      mainPage {
        id
      }
    }
  }
`);

/** Every Routing rule, with its prefix in `locale`, keyed by model API key. */
export async function loadRoutingRules(
  contentClient: ContentClient,
  locale: SiteLocale,
): Promise<Map<string, RoutingRule>> {
  const { allRoutingRules } = await contentClient.query(RoutingRulesQuery, { locale });
  return new Map(
    allRoutingRules.map((rule) => [
      rule.model,
      { model: rule.model, mainPageId: rule.mainPage.id, prefix: normalizedPrefix(rule.prefix) },
    ]),
  );
}

/** A prefix without stray slashes or spaces; an empty one is `null`. */
function normalizedPrefix(prefix: string | null): string | null {
  const segments = (prefix ?? '').split('/').map((segment) => segment.trim()).filter(Boolean);
  return segments.length > 0 ? segments.join('/') : null;
}

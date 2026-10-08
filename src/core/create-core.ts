import type { Metadata } from 'next';
import { revalidateTag as nextRevalidateTag } from 'next/cache';
import {
  type CacheInvalidation,
  type CacheInvalidationOptions,
  createCacheInvalidation,
} from './cache/invalidation';
import type { SiteConfig } from './config';
import type { ContentClient } from './content/content-client';
import { createDatoContentClient } from './content/dato-content-client';
import { type Labels, labelsFor } from './labels/labels';
import type { Logger } from './logging/logger';
import { createNetlifyLogger } from './logging/netlify-logger';
import { isDraftModeSecret, pathOnThisSite } from './preview/draft-mode';
import { type PreviewLink, type PreviewLinksRequest, previewLinks } from './preview/preview-links';
import type { Redirect } from './routing/redirect';
import { type PathRequest, type PathResolution, resolvePath } from './routing/resolve-path';
import { rootRedirect } from './routing/root-redirect';

export type Core = {
  readonly siteConfig: SiteConfig;
  /** Where the Core and the Site report significant events. */
  readonly logger: Logger;
  resolvePath(request: PathRequest): Promise<PathResolution>;
  /** Where the bare domain redirects, given the request's Accept-Language header. */
  rootRedirect(acceptLanguage: string | null): Promise<Redirect>;
  metadataFor(resolution: PathResolution): Metadata;
  /** The Labels of a locale, falling back to the default locale's. */
  labelsFor(locale: string): Promise<Labels>;
  /**
   * Where to send an Editor who asks to enter draft mode: the path to land
   * on, or `null` when the secret is wrong and draft mode must stay closed.
   */
  draftEnableTarget(request: { secret: string | null; path: string | null }): string | null;
  /** Whether `secret` is the secret that protects draft mode and the preview links. */
  isDraftModeSecret(secret: string | null): boolean;
  /** The links the DatoCMS Web Previews plugin shows for a record. */
  previewLinks(request: PreviewLinksRequest): Promise<PreviewLink[]>;
  /**
   * The webhook DatoCMS calls with `cda_cache_tags` after a publish. Needs
   * `Authorization: Bearer <CACHE_WEBHOOK_SECRET>`.
   */
  handleCacheTagsWebhook: CacheInvalidation['handleCacheTagsWebhook'];
  /**
   * Revalidates the whole cache. Called by a Netlify deploy notification
   * (signed with `CACHE_WEBHOOK_SECRET`) after a code deploy or a rollback, or
   * by hand with the bearer secret.
   */
  handleCacheFlush: CacheInvalidation['handleCacheFlush'];
};

export type CoreOptions = {
  /** Replaces the DatoCMS content client, e.g. with a fake in tests. */
  contentClient?: ContentClient;
  /** Replaces Next.js's `revalidateTag`, e.g. with a recorder in tests. */
  revalidateTag?: CacheInvalidationOptions['revalidateTag'];
};

export function createCore(siteConfig: SiteConfig, options: CoreOptions = {}): Core {
  const contentClient = options.contentClient ?? createDatoContentClient();
  // The Web Previews plugin calls without the Editor's draft mode cookie, yet
  // new Pages must get their links before they are published.
  const draftContentClient =
    options.contentClient ?? createDatoContentClient({ draftMode: async () => true });
  const logger = siteConfig.logger ?? createNetlifyLogger();
  const invalidation = createCacheInvalidation({
    logger,
    revalidateTag: options.revalidateTag ?? nextRevalidateTag,
  });
  const reportedLabelProblems = new Set<string>();

  return {
    siteConfig,
    logger,
    resolvePath: (request) => resolvePath(contentClient, siteConfig.routableModels ?? [], request),
    rootRedirect: (acceptLanguage) => rootRedirect(contentClient, acceptLanguage),
    metadataFor: (resolution) => (resolution.kind === 'record' ? resolution.record.metadata : {}),
    labelsFor: (locale) =>
      labelsFor(
        { contentClient, logger, siteLabels: siteConfig.labels, reported: reportedLabelProblems },
        locale,
      ),
    draftEnableTarget: ({ secret, path }) =>
      isDraftModeSecret(secret) ? pathOnThisSite(path) : null,
    isDraftModeSecret,
    previewLinks: (request) => previewLinks(draftContentClient, request),
    ...invalidation,
  };
}

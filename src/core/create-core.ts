import type { Metadata } from 'next';
import type { SiteConfig } from './config';
import type { ContentClient } from './content/content-client';
import { createDatoContentClient } from './content/dato-content-client';
import { type Labels, labelsFor } from './labels/labels';
import type { Logger } from './logging/logger';
import { createNetlifyLogger } from './logging/netlify-logger';
import { recordMetadata } from './metadata';
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
};

export type CoreOptions = {
  /** Replaces the DatoCMS content client, e.g. with a fake in tests. */
  contentClient?: ContentClient;
};

export function createCore(siteConfig: SiteConfig, options: CoreOptions = {}): Core {
  const contentClient = options.contentClient ?? createDatoContentClient();
  const logger = siteConfig.logger ?? createNetlifyLogger();
  const reportedLabelProblems = new Set<string>();

  return {
    siteConfig,
    logger,
    resolvePath: (request) => resolvePath(contentClient, request),
    rootRedirect: (acceptLanguage) => rootRedirect(contentClient, acceptLanguage),
    metadataFor: (resolution) =>
      resolution.kind === 'record' ? recordMetadata(resolution.record) : {},
    labelsFor: (locale) =>
      labelsFor(
        { contentClient, logger, siteLabels: siteConfig.labels, reported: reportedLabelProblems },
        locale,
      ),
  };
}

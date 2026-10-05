import type { Metadata } from 'next';
import type { SiteConfig } from './config';
import type { ContentClient } from './content/content-client';
import { createDatoContentClient } from './content/dato-content-client';
import { recordMetadata } from './metadata';
import type { Redirect } from './routing/redirect';
import { type PathRequest, type PathResolution, resolvePath } from './routing/resolve-path';
import { rootRedirect } from './routing/root-redirect';

export type Core = {
  readonly siteConfig: SiteConfig;
  resolvePath(request: PathRequest): Promise<PathResolution>;
  /** Where the bare domain redirects, given the request's Accept-Language header. */
  rootRedirect(acceptLanguage: string | null): Promise<Redirect>;
  metadataFor(resolution: PathResolution): Metadata;
};

export type CoreOptions = {
  /** Replaces the DatoCMS content client, e.g. with a fake in tests. */
  contentClient?: ContentClient;
};

export function createCore(siteConfig: SiteConfig, options: CoreOptions = {}): Core {
  const contentClient = options.contentClient ?? createDatoContentClient();

  return {
    siteConfig,
    resolvePath: (request) => resolvePath(contentClient, request),
    rootRedirect: (acceptLanguage) => rootRedirect(contentClient, acceptLanguage),
    metadataFor: (resolution) =>
      resolution.kind === 'record' ? recordMetadata(resolution.record) : {},
  };
}

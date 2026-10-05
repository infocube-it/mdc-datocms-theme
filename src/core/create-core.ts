import type { Metadata } from 'next';
import type { SiteConfig } from './config';
import type { ContentClient } from './content/content-client';
import { createDatoContentClient } from './content/dato-content-client';
import { recordMetadata } from './metadata';
import { type PathRequest, type PathResolution, resolvePath } from './routing/resolve-path';

export type Core = {
  readonly siteConfig: SiteConfig;
  resolvePath(request: PathRequest): Promise<PathResolution>;
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
    metadataFor: (resolution) =>
      resolution.kind === 'record' ? recordMetadata(resolution.record) : {},
  };
}

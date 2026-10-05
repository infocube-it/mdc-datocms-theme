import type { Metadata } from 'next';
import type { SiteConfig } from './config';
import type { ContentClient } from './content/content-client';
import { createDatoContentClient } from './content/dato-content-client';
import { recordMetadata } from './metadata';
import { type RouteRequest, type RouteResult, resolveRoute } from './routing/resolve-route';

export type Core = {
  readonly siteConfig: SiteConfig;
  resolveRoute(request: RouteRequest): Promise<RouteResult>;
  metadataFor(route: RouteResult): Metadata;
};

export type CoreOptions = {
  /** Replaces the DatoCMS content client, e.g. with a fake in tests. */
  contentClient?: ContentClient;
};

export function createCore(siteConfig: SiteConfig, options: CoreOptions = {}): Core {
  const contentClient = options.contentClient ?? createDatoContentClient();

  return {
    siteConfig,
    resolveRoute: (request) => resolveRoute(contentClient, request),
    metadataFor: (route) => (route.kind === 'record' ? recordMetadata(route.record) : {}),
  };
}

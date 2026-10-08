/*
 * The Core's public interface. Site code imports from `@/core` (and, in
 * tests, `@/core/testing`) only, never from files inside this folder, so the
 * Core can later become an npm package without rewrites.
 */
export { Breadcrumbs } from './breadcrumbs';
export { defineSiteConfig, type SiteConfig } from './config';
export type { ContentClient } from './content/content-client';
export { graphql, type ResultOf } from './content/graphql';
export { type Core, type CoreOptions, createCore } from './create-core';
export type { Labels, LabelsByLocale, LocaleLabels } from './labels/labels';
export type { LogEvent, Logger, Severity } from './logging/logger';
export { createNetlifyLogger } from './logging/netlify-logger';
export type { PreviewLink, PreviewLinksRequest } from './preview/preview-links';
export { RecordView } from './record-view';
export type { Breadcrumb } from './routing/path-builder';
export type { Redirect } from './routing/redirect';
export type { PathRequest, PathResolution } from './routing/resolve-path';
export {
  defineRoutableModel,
  type RecordRequest,
  type RoutableModel,
  type RoutableModelDefinition,
  type RoutableRecord,
} from './routing/routable-model';
export type { SiteLocale } from './routing/site-locales';

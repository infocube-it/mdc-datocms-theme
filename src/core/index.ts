/*
 * The Core's public interface. Site code imports from `@/core` (and, in
 * tests, `@/core/testing`) only, never from files inside this folder, so the
 * Core can later become an npm package without rewrites.
 */
export { defineSiteConfig, type SiteConfig } from './config';
export type { ContentClient } from './content/content-client';
export { type Core, type CoreOptions, createCore } from './create-core';
export type { Labels, LabelsByLocale, LocaleLabels } from './labels/labels';
export type { LogEvent, Logger, Severity } from './logging/logger';
export { createNetlifyLogger } from './logging/netlify-logger';
export { RecordView } from './record-view';
export type { Redirect } from './routing/redirect';
export type { RoutableRecord, PathRequest, PathResolution } from './routing/resolve-path';

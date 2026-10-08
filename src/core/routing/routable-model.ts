import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { ContentClient } from '../content/content-client';
import type { SiteLocale } from './site-locales';

/** A resolved record, ready to render, whatever its model. */
export type RoutableRecord = {
  id: string;
  /** The record's title, shown in breadcrumbs. */
  title: string;
  /** The record rendered with its model's template. */
  view: ReactNode;
  metadata: Metadata;
};

/** What a Routable model is asked for: a record by its slug in one locale. */
export type RecordRequest = { locale: SiteLocale; slug: string };

/**
 * A Routable model other than Page, as the Core sees it. Its records get
 * their Paths from the Routing rule naming `apiKey`; the resolver needs no
 * change to serve them.
 */
export type RoutableModel = {
  readonly apiKey: string;
  /** The record translated into `locale` with `slug` as its slug there, or `null`. */
  find(contentClient: ContentClient, request: RecordRequest): Promise<RoutableRecord | null>;
};

export type RoutableModelDefinition<Data extends { id: string }> = {
  /** The model's API key in DatoCMS, as its Routing rule names it. */
  apiKey: string;
  /**
   * Fetches the record translated into `locale` whose slug in that locale is
   * `slug`, with everything its template and metadata need, or `null`.
   */
  findBySlug(contentClient: ContentClient, request: RecordRequest): Promise<Data | null>;
  title(record: Data): string;
  render(record: Data): ReactNode;
  /** Defaults to the record's title as document title. */
  metadata?(record: Data): Metadata;
};

/** Declares a Routable model for the Site config's `routableModels`. */
export function defineRoutableModel<Data extends { id: string }>(
  definition: RoutableModelDefinition<Data>,
): RoutableModel {
  return {
    apiKey: definition.apiKey,
    async find(contentClient, request) {
      const record = await definition.findBySlug(contentClient, request);
      return record && routableRecord(definition, record);
    },
  };
}

export function routableRecord<Data extends { id: string }>(
  definition: Omit<RoutableModelDefinition<Data>, 'apiKey' | 'findBySlug'>,
  record: Data,
): RoutableRecord {
  const title = definition.title(record);
  return {
    id: record.id,
    title,
    view: definition.render(record),
    metadata: definition.metadata?.(record) ?? { title },
  };
}

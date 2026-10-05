import type { ContentClient } from '../content/content-client';
import { graphql } from '../content/graphql';
import type { PageTreeEntry } from './path-builder';
import type { SiteLocale } from './site-locales';

// The CDA's largest page size.
const BATCH_SIZE = 500;

const PageTreeQuery = graphql(`
  query PageTree($locale: SiteLocale!, $first: IntType!, $skip: IntType!) {
    allPages(
      locale: $locale
      first: $first
      skip: $skip
      filter: { _locales: { allIn: [$locale] } }
    ) {
      id
      slug
      parent {
        id
      }
    }
    _allPagesMeta(locale: $locale, filter: { _locales: { allIn: [$locale] } }) {
      count
    }
  }
`);

/** Every Page translated into `locale`, with its parent, in all its batches. */
export async function loadPageTree(
  contentClient: ContentClient,
  locale: SiteLocale,
): Promise<PageTreeEntry[]> {
  const entries: PageTreeEntry[] = [];
  let count = Infinity;

  while (entries.length < count) {
    const { allPages, _allPagesMeta } = await contentClient.query(PageTreeQuery, {
      locale,
      first: BATCH_SIZE,
      skip: entries.length,
    });
    if (allPages.length === 0) break;

    count = _allPagesMeta.count;
    entries.push(
      ...allPages.map((page) => ({ id: page.id, slug: page.slug, parentId: page.parent?.id ?? null })),
    );
  }

  return entries;
}

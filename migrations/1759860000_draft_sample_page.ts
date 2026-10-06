import type { Client } from '@datocms/cma-client-node';

/**
 * Seed reference schema, step 3: a sample Page whose latest draft differs from
 * its published version. The Playwright tests use it to check that draft mode
 * shows the draft and Visitors still see the published version.
 */
export default async function (client: Client) {
  const page = await client.itemTypes.find('page');
  const { locales } = await client.site.find();
  const localized = <T>(it: T, en: T) =>
    Object.fromEntries(locales.map((locale) => [locale, locale === 'it' ? it : en]));

  const record = await client.items.create({
    item_type: page,
    title: localized('Pagina con bozza (pubblicata)', 'Page with a draft (published)'),
    slug: localized('pagina-con-bozza', 'page-with-a-draft'),
    content: localized([], []),
  });
  await client.items.publish(record);

  // Left unpublished on purpose.
  await client.items.update(record.id, {
    title: localized('Pagina con bozza (bozza)', 'Page with a draft (draft)'),
  });
}

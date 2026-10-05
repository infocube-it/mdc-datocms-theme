import type { Client } from '@datocms/cma-client-node';

/**
 * Seed reference schema, step 2: Pages form a tree (DatoCMS hierarchical
 * sorting) and may lack a translation, which makes them a 404 in that locale.
 * Seeds a small tree so every Site starts with a nested Page to route to.
 */
export default async function (client: Client) {
  const page = await client.itemTypes.find('page');
  await client.itemTypes.update(page, { tree: true, all_locales_required: false });

  const { locales } = await client.site.find();
  const [defaultLocale, ...otherLocales] = locales;
  // Sample content is written for an Italian and English Site; any other
  // locale reuses the English text.
  const localized = <T>(it: T, en: T) =>
    Object.fromEntries(locales.map((locale) => [locale, locale === 'it' ? it : en]));

  async function createPublishedPage(fields: Record<string, unknown>) {
    const record = await client.items.create({ item_type: page, ...fields });
    await client.items.publish(record);
    return record;
  }

  const services = await createPublishedPage({
    title: localized('Servizi', 'Services'),
    slug: localized('servizi', 'services'),
    content: localized([], []),
  });
  const consulting = await createPublishedPage({
    parent_id: services.id,
    title: localized('Consulenza', 'Consulting'),
    slug: localized('consulenza', 'consulting'),
    content: localized([], []),
  });
  await createPublishedPage({
    parent_id: consulting.id,
    title: localized('Strategia digitale', 'Digital strategy'),
    slug: localized('strategia-digitale', 'digital-strategy'),
    content: localized([], []),
  });

  // Translated only in the default locale: a 404 in every other one.
  if (otherLocales.length > 0) {
    await createPublishedPage({
      parent_id: services.id,
      title: { [defaultLocale]: 'Formazione' },
      slug: { [defaultLocale]: 'formazione' },
      content: { [defaultLocale]: [] },
    });
  }
}

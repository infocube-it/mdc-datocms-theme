import type { Client } from '@datocms/cma-client-node';

/**
 * Seed reference schema, step 4: the Routing rule model, which gives the
 * records of a Routable model their Paths, and a sample Routable model
 * (article) with its rule and two sample records.
 *
 * A Site that adds a Routable model adds its api key to the `model` options
 * of the Routing rule in a migration of its own.
 */
export default async function (client: Client) {
  const page = await client.itemTypes.find('page');
  const { locales } = await client.site.find();
  const [defaultLocale = 'it', ...otherLocales] = locales;
  // Sample content is written for an Italian and English Site; any other
  // locale reuses the English text.
  const localized = <T>(it: T, en: T) =>
    Object.fromEntries(locales.map((locale) => [locale, locale === 'it' ? it : en]));

  // The sample Routable model.
  const article = await client.itemTypes.create({
    name: 'Article',
    api_key: 'article',
    draft_mode_active: true,
    collection_appearance: 'table',
    all_locales_required: false,
  });
  const articleTitle = await client.fields.create(article, {
    label: 'Title',
    field_type: 'string',
    api_key: 'title',
    localized: true,
    validators: { required: {} },
    appearance: { editor: 'single_line', parameters: { heading: true }, addons: [] },
  });
  await client.fields.create(article, {
    label: 'Slug',
    field_type: 'slug',
    api_key: 'slug',
    localized: true,
    validators: {
      required: {},
      slug_title_field: { title_field_id: articleTitle.id },
      slug_format: { predefined_pattern: 'webpage_slug' },
    },
    appearance: { editor: 'slug', parameters: { url_prefix: null, placeholder: null }, addons: [] },
  });
  await client.fields.create(article, {
    label: 'SEO',
    field_type: 'seo',
    api_key: 'seo',
    localized: true,
    validators: {},
    appearance: { editor: 'seo', parameters: {}, addons: [] },
  });
  await client.itemTypes.update(article, { title_field: articleTitle });

  // The Routing rule model.
  const routingRule = await client.itemTypes.create({
    name: 'Routing rule',
    api_key: 'routing_rule',
    draft_mode_active: false,
    collection_appearance: 'table',
    all_locales_required: false,
  });
  const model = await client.fields.create(routingRule, {
    label: 'Model',
    field_type: 'string',
    api_key: 'model',
    hint: 'The Routable model whose records this rule gives a Path to. One rule per model.',
    validators: {
      required: {},
      unique: {},
      enum: { values: ['article'] },
    },
    appearance: {
      editor: 'string_select',
      parameters: { options: [{ label: 'Article', value: 'article' }] },
      addons: [],
    },
  });
  await client.fields.create(routingRule, {
    label: 'Main page',
    field_type: 'link',
    api_key: 'main_page',
    hint: 'The Page that stands as the records’ parent in breadcrumbs. With an empty prefix, it also gives the records their Path.',
    validators: {
      required: {},
      item_item_type: {
        item_types: [page.id],
        on_publish_with_unpublished_references_strategy: 'fail',
        on_reference_unpublish_strategy: 'fail',
        on_reference_delete_strategy: 'fail',
      },
    },
    appearance: { editor: 'link_select', parameters: {}, addons: [] },
  });
  await client.fields.create(routingRule, {
    label: 'Prefix',
    field_type: 'string',
    api_key: 'prefix',
    localized: true,
    hint: 'The records’ Paths are /<locale>/<prefix>/<slug>. Leave empty to put them under the Main page’s Path.',
    validators: {
      format: {
        custom_pattern: '^[^/\\s]+(/[^/\\s]+)*$',
        description: 'Segments separated by “/”, without spaces or a leading or trailing “/”',
      },
    },
    appearance: { editor: 'single_line', parameters: { heading: false }, addons: [] },
  });
  await client.itemTypes.update(routingRule, { title_field: model });

  // Sample content: the Main page, the rule and two articles.
  async function createPublished(itemType: typeof page, fields: Record<string, unknown>) {
    const record = await client.items.create({ item_type: itemType, ...fields });
    await client.items.publish(record);
    return record;
  }

  const articles = await createPublished(page, {
    title: localized('Articoli', 'Articles'),
    slug: localized('articoli', 'articles'),
    content: localized([], []),
  });

  await client.items.create({
    item_type: routingRule,
    model: 'article',
    main_page: articles.id,
    prefix: localized('articolo', 'article'),
  });

  await createPublished(article, {
    title: localized('Il primo articolo', 'The first article'),
    slug: localized('primo-articolo', 'first-article'),
  });

  // Translated only in the default locale: a 404 in every other one.
  if (otherLocales.length > 0) {
    await createPublished(article, {
      title: { [defaultLocale]: 'Un articolo solo in italiano' },
      slug: { [defaultLocale]: 'solo-italiano' },
    });
  }
}

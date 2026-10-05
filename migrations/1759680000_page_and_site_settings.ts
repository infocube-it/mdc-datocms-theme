import type { Client } from '@datocms/cma-client-node';

/**
 * Seed reference schema, step 1: the Page model and the Site settings
 * singleton with its Home page link, plus a first Home page so a new project
 * renders something at each locale root.
 */
export default async function (client: Client) {
  const page = await client.itemTypes.create({
    name: 'Page',
    api_key: 'page',
    draft_mode_active: true,
    collection_appearance: 'table',
  });

  const pageTitle = await client.fields.create(page, {
    label: 'Title',
    field_type: 'string',
    api_key: 'title',
    localized: true,
    validators: { required: {} },
    appearance: { editor: 'single_line', parameters: { heading: true }, addons: [] },
  });

  await client.fields.create(page, {
    label: 'Slug',
    field_type: 'slug',
    api_key: 'slug',
    localized: true,
    validators: {
      required: {},
      slug_title_field: { title_field_id: pageTitle.id },
      slug_format: { predefined_pattern: 'webpage_slug' },
    },
    appearance: {
      editor: 'slug',
      parameters: { url_prefix: null, placeholder: null },
      addons: [],
    },
  });

  // The page-builder field. Blocks are added to its validator as the Core
  // and the Site register them.
  await client.fields.create(page, {
    label: 'Content',
    field_type: 'rich_text',
    api_key: 'content',
    localized: true,
    validators: { rich_text_blocks: { item_types: [] } },
    appearance: { editor: 'rich_text', parameters: { start_collapsed: false }, addons: [] },
  });

  await client.itemTypes.update(page, { title_field: pageTitle });

  const siteSettings = await client.itemTypes.create({
    name: 'Site settings',
    api_key: 'site_settings',
    singleton: true,
    draft_mode_active: false,
  });

  await client.fields.create(siteSettings, {
    label: 'Home page',
    field_type: 'link',
    api_key: 'home_page',
    hint: 'The Page served at each locale root.',
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

  const { locales } = await client.site.find();
  const inEveryLocale = <T>(value: T) =>
    Object.fromEntries(locales.map((locale) => [locale, value]));

  const home = await client.items.create({
    item_type: page,
    title: inEveryLocale('Home'),
    slug: inEveryLocale('home'),
    content: inEveryLocale([]),
  });
  await client.items.publish(home);

  await client.items.create({ item_type: siteSettings, home_page: home.id });
}

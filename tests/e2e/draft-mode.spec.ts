import { expect, test } from '@playwright/test';

// Runs against the Page seeded by migrations/1759860000_draft_sample_page.ts:
// published as "Page with a draft (published)", latest draft "… (draft)".
// Needs DRAFT_MODE_SECRET and the CDA token, from the environment or `.env.local`.

const secret = process.env.DRAFT_MODE_SECRET ?? '';
const path = '/en/page-with-a-draft';
const published = 'Page with a draft (published)';
const draft = 'Page with a draft (draft)';

const enableUrl = (secretValue = secret) =>
  `/api/draft/enable?secret=${encodeURIComponent(secretValue)}&path=${encodeURIComponent(path)}`;

test.describe('draft mode', () => {
  test('shows the latest draft to the Editor and the published version to a Visitor', async ({
    page,
    browser,
  }) => {
    await page.goto(enableUrl());
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(draft);

    const visitor = await browser.newPage();
    await visitor.goto(path);
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(published);
    await visitor.close();
  });

  test('ends from the Site', async ({ page }) => {
    await page.goto(enableUrl());
    await page.getByRole('link', { name: 'Exit draft mode' }).click();

    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(published);
    await expect(page.getByRole('link', { name: 'Exit draft mode' })).toHaveCount(0);
  });

  test('refuses a wrong secret, and never redirects off the Site', async ({ request }) => {
    const wrong = await request.get(enableUrl('wrong'), { maxRedirects: 0 });
    expect(wrong.status()).toBe(401);

    const offSite = await request.get(
      `/api/draft/enable?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent('//evil.example')}`,
      { maxRedirects: 0 },
    );
    expect(new URL(offSite.headers().location, 'http://site.invalid').pathname).toBe('/');
    expect(offSite.headers().location).not.toContain('secret');
  });
});

test.describe('the Web Previews plugin endpoint', () => {
  const payload = (apiKey: string, id: string) => ({
    data: { item: { id }, itemType: { attributes: { api_key: apiKey } } },
  });

  async function sampleRecordId() {
    const response = await fetch('https://graphql.datocms.com/', {
      method: 'POST',
      headers: {
        Authorization: process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ page(locale: en, filter: { slug: { eq: "page-with-a-draft" } }) { id } }',
      }),
    });
    return (await response.json()).data.page.id as string;
  }

  test('answers with a draft link for each locale the Page is translated into', async ({ page, request }) => {
    const response = await request.post(
      `/api/preview-links?secret=${encodeURIComponent(secret)}`,
      payload('page', await sampleRecordId()),
    );
    const { previewLinks } = await response.json();
    expect(previewLinks.map((link: { label: string }) => link.label)).toEqual(['Draft (it)', 'Draft (en)']);

    // Following a link enters draft mode on that locale's Path.
    const english = new URL(previewLinks[1].url);
    await page.goto(`${english.pathname}${english.search}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(draft);
  });

  test('has no links for other models', async ({ request }) => {
    const response = await request.post(
      `/api/preview-links?secret=${encodeURIComponent(secret)}`,
      payload('article', '1'),
    );
    expect((await response.json()).previewLinks).toEqual([]);
  });

  test('refuses a wrong secret', async ({ request }) => {
    const response = await request.post('/api/preview-links?secret=wrong', payload('page', '1'));
    expect(response.status()).toBe(401);
  });
});

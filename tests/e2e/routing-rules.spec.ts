import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against the sample articles and the Routing rule seeded by
// migrations/1759950000_routing_rules_and_article.ts.

test.describe('an article', () => {
  test('is served at its Routing rule’s localized prefix plus its slug', async ({ page }) => {
    const response = await page.goto('/it/articolo/primo-articolo');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Il primo articolo');
    await expect(page).toHaveTitle('Il primo articolo');

    await page.goto('/en/article/first-article');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The first article');
  });

  test('sits under its Main page in the breadcrumbs, with no accessibility violations', async ({ page }) => {
    await page.goto('/it/articolo/primo-articolo');

    const breadcrumbs = page.getByRole('navigation', { name: 'Percorso di navigazione' });
    await expect(breadcrumbs.getByRole('link')).toHaveText(['Home', 'Articoli']);
    await expect(breadcrumbs.getByRole('link', { name: 'Articoli' })).toHaveAttribute('href', '/it/articoli');
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText('Il primo articolo');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('is not found in a locale it has no translation for', async ({ request }) => {
    expect((await request.get('/it/articolo/solo-italiano')).status()).toBe(200);
    expect((await request.get('/en/article/solo-italiano')).status()).toBe(404);
  });
});

test.describe('a nested Page', () => {
  test('sits under its ancestors in the breadcrumbs', async ({ page }) => {
    await page.goto('/en/services/consulting/digital-strategy');

    const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumbs.getByRole('link')).toHaveText(['Home', 'Services', 'Consulting']);
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText('Digital strategy');
  });
});

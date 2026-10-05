import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test('is server-rendered at the default locale root', async ({ request }) => {
    const response = await request.get('/it');

    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/<h1>[^<]+<\/h1>/);
  });

  test('shows its title and has no accessibility violations', async ({ page }) => {
    await page.goto('/it');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).not.toBeEmpty();
    await expect(page).toHaveTitle(await heading.innerText());

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

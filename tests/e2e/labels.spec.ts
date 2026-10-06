import { expect, test } from '@playwright/test';

test.describe('Labels', () => {
  test('appear in the page’s locale', async ({ page }) => {
    await page.goto('/it');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.getByRole('link', { name: 'Vai al contenuto' })).toHaveAttribute('href', '#content');

    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#content');
  });
});

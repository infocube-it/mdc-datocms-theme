import { expect, type APIRequestContext, test } from '@playwright/test';

// Runs against the Page tree seeded by migrations/1759770000_page_tree.ts.

async function redirectOf(request: APIRequestContext, path: string, acceptLanguage?: string) {
  const response = await request.get(path, {
    maxRedirects: 0,
    headers: acceptLanguage ? { 'Accept-Language': acceptLanguage } : {},
  });
  return { status: response.status(), location: response.headers().location };
}

test.describe('the bare domain', () => {
  test('redirects temporarily to the browser’s language when the Site offers it', async ({ request }) => {
    expect(await redirectOf(request, '/', 'en-GB,en;q=0.9')).toEqual({ status: 302, location: expect.stringMatching(/\/en$/) });
  });

  test('redirects temporarily to the default locale otherwise', async ({ request }) => {
    expect(await redirectOf(request, '/', 'de-DE,de;q=0.9')).toEqual({ status: 302, location: expect.stringMatching(/\/it$/) });
  });
});

test.describe('the Home page', () => {
  test('redirects permanently from its own Path to the locale root', async ({ request }) => {
    // Next.js page redirects answer 308, its permanent equivalent of 301.
    expect(await redirectOf(request, '/it/home')).toEqual({ status: 308, location: '/it' });
    expect(await redirectOf(request, '/en/home')).toEqual({ status: 308, location: '/en' });
  });
});

test.describe('a nested Page', () => {
  test('is served at its localized Path in every locale', async ({ page }) => {
    const response = await page.goto('/it/servizi/consulenza/strategia-digitale');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Strategia digitale');

    await page.goto('/en/services/consulting/digital-strategy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Digital strategy');
  });
});

test.describe('not found', () => {
  test('answers a Page missing a translation in the requested locale', async ({ request }) => {
    expect((await request.get('/it/servizi/formazione')).status()).toBe(200);
    expect((await request.get('/en/services/formazione')).status()).toBe(404);
  });

  test('answers an unknown Path', async ({ request }) => {
    expect((await request.get('/it/non-esiste')).status()).toBe(404);
    expect((await request.get('/it/consulenza')).status()).toBe(404);
  });
});

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('enhanced action applies fragments and toast without navigating', async ({ page }) => {
  let assignRequests = 0;

  await page.route('**/dist/**', async (route) => {
    const url = new URL(route.request().url());
    const assetPath = url.pathname.replace(/^\/dist\//, 'dist/');
    await route.fulfill({
      contentType: 'text/javascript',
      body: await readFile(resolve(assetPath), 'utf8'),
    });
  });
  await page.route('**/assign', async (route) => {
    assignRequests += 1;
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['x-goadmin-enhance']).toBe('1');
    expect(request.headers().accept).toBe('application/vnd.go-admin.enhanced+json');
    await route.fulfill({
      contentType: 'application/vnd.go-admin.enhanced+json',
      body: JSON.stringify({
        ok: true,
        toasts: [{ type: 'success', message: 'Assignment updated.' }],
        fragments: [
          {
            selector: '[data-family-locale-coverage]',
            mode: 'replace',
            html: '<section data-family-locale-coverage>Ready</section>',
          },
          {
            selector: '[data-family-assignments]',
            mode: 'replace',
            html: '<section data-family-assignments><a href="/editor/fr">Open editor</a></section>',
          },
        ],
      }),
    });
  });
  await page.route('http://enhanced-action.test/', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <meta name="csrf-token" content="browser-csrf">
        <form data-enhance-action method="post" action="/assign">
          <input name="target_locale" value="fr">
          <button type="submit">Assign</button>
        </form>
        <section data-family-locale-coverage>Missing</section>
        <section data-family-assignments>None</section>
        <script type="module">
          import { initEnhancedActions } from '/dist/shared/enhanced-action.js';
          window.__toasts = [];
          initEnhancedActions(document, {
            toast: {
              success(message) { window.__toasts.push(message); }
            }
          });
          window.__ready = true;
        </script>`,
    });
  });

  await page.goto('http://enhanced-action.test/');
  await expect.poll(() => page.evaluate(() => window.__ready === true)).toBe(true);
  const startURL = page.url();
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations.push(frame.url());
    }
  });

  await page.getByRole('button', { name: 'Assign' }).click();

  await expect(page.locator('[data-family-locale-coverage]')).toContainText('Ready');
  await expect(page.locator('[data-family-assignments]')).toContainText('Open editor');
  await expect.poll(() => page.evaluate(() => window.__toasts)).toEqual(['Assignment updated.']);
  expect(page.url()).toBe(startURL);
  expect(navigations).toEqual([]);
  expect(assignRequests).toBe(1);
});

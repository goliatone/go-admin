import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const canonicalCSS = readFileSync(resolve(assetsDir, 'output.css'), 'utf8');

function shellFixture(theme: string) {
  const dark = theme === 'dark';
  const variables = dark
    ? '--admin-shell-background:#111827;--admin-header-background:#1f2937;--admin-header-border:#374151;--color-text-primary:#f9fafb;--color-text-secondary:#d1d5db'
    : '--admin-shell-background:#f9fafb;--admin-header-background:#ffffff;--admin-header-border:#e5e7eb;--color-text-primary:#111827;--color-text-secondary:#6b7280';
  return `<!doctype html>
<html lang="en" data-theme="${theme}" style="${variables}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/assets/output.css">
    <style>@media (max-width: 767px) { #sidebar { display: none; } }</style>
  </head>
  <body class="admin-theme-root flex h-screen overflow-hidden">
    <div class="admin-layout flex w-full h-screen overflow-hidden" data-admin-shell>
      <aside id="sidebar" style="width:220px;flex:0 0 220px" aria-label="Admin navigation">Navigation</aside>
      <main class="admin-main flex-1 min-w-0 flex flex-col overflow-hidden" data-admin-shell-main>
        <header class="admin-page-header px-8 py-3 border-b" data-admin-page-header>
          <div class="admin-page-header__row flex items-center justify-between gap-4">
            <div class="admin-page-heading-group flex items-center gap-4 min-w-0 flex-1">
              <nav aria-label="Breadcrumb" class="admin-breadcrumbs" data-host-breadcrumbs>
                <ol class="admin-breadcrumbs__list flex flex-wrap items-center gap-2 text-sm">
                  <li><a class="admin-breadcrumbs__link" href="#">Dashboard</a></li>
                  <li aria-hidden="true" class="admin-breadcrumbs__separator">/</li>
                  <li><span class="admin-breadcrumbs__current" aria-current="page">Records</span></li>
                </ol>
              </nav>
              <div class="admin-page-header__titles min-w-0 flex-1"><h1>Records</h1></div>
            </div>
            <div class="admin-page-header__actions flex items-center gap-3 flex-shrink-0" data-admin-page-actions>
              <button class="btn btn-secondary">Import records</button>
              <button class="btn btn-secondary">Export selection</button>
              <button class="btn btn-primary">Create record</button>
            </div>
          </div>
        </header>
        <div class="admin-shell-content flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" data-admin-shell-content>
          <section class="admin-page-content flex-1 overflow-y-auto p-8" data-page-scroll-owner>
            <div style="height:1200px;flex:none">Scrollable content</div>
          </section>
        </div>
        <footer class="admin-shell-footer border-t px-8 py-3" data-admin-shell-footer>Host footer</footer>
      </main>
    </div>
  </body>
</html>`;
}

async function routeShellFixture(page: Page) {
  await page.route('http://admin-shell.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/assets/output.css') {
      await route.fulfill({ contentType: 'text/css', body: canonicalCSS });
      return;
    }
    await route.fulfill({
      contentType: 'text/html',
      body: shellFixture(url.searchParams.get('theme') ?? 'light'),
    });
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme} canonical shell keeps one landmark set and an inner scroll owner`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await routeShellFixture(page);
    await page.goto(`http://admin-shell.test/admin?theme=${theme}`);

    await expect(page.locator('[data-admin-shell]')).toHaveCount(1);
    await expect(page.locator('[data-admin-page-header]')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(1);
    await expect(page.locator('[data-host-breadcrumbs]')).toBeVisible();
    await expect(page.locator('[data-admin-shell-footer]')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const scrollOwner = document.querySelector('[data-page-scroll-owner]') as HTMLElement;
      const footer = document.querySelector('[data-admin-shell-footer]') as HTMLElement;
      return {
        documentFits: document.documentElement.scrollHeight <= window.innerHeight,
        contentScrolls: scrollOwner.scrollHeight > scrollOwner.clientHeight,
        footerBottom: Math.round(footer.getBoundingClientRect().bottom),
        viewportHeight: window.innerHeight,
        headerBackground: getComputedStyle(document.querySelector('[data-admin-page-header]')!).backgroundColor,
      };
    });
    expect(geometry.documentFits).toBe(true);
    expect(geometry.contentScrolls).toBe(true);
    expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.headerBackground).toBe(theme === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)');
  });
}

test('narrow shell contains header actions and preserves content scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await routeShellFixture(page);
  await page.goto('http://admin-shell.test/admin?theme=light');

  await expect(page.locator('#sidebar')).toBeHidden();
  const geometry = await page.evaluate(() => {
    const actions = document.querySelector('[data-admin-page-actions]') as HTMLElement;
    const main = document.querySelector('[data-admin-shell-main]') as HTMLElement;
    const scrollOwner = document.querySelector('[data-page-scroll-owner]') as HTMLElement;
    const actionsRect = actions.getBoundingClientRect();
    return {
      mainWidth: Math.round(main.getBoundingClientRect().width),
      actionsLeft: Math.round(actionsRect.left),
      actionsRight: Math.round(actionsRect.right),
      actionsScrollable: actions.scrollWidth > actions.clientWidth,
      documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      contentScrolls: scrollOwner.scrollHeight > scrollOwner.clientHeight,
    };
  });
  expect(geometry.mainWidth).toBe(390);
  expect(geometry.actionsLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.actionsRight).toBeLessThanOrEqual(390);
  expect(geometry.actionsScrollable).toBe(true);
  expect(geometry.documentFits).toBe(true);
  expect(geometry.contentScrolls).toBe(true);
});

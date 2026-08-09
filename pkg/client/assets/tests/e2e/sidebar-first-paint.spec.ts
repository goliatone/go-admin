import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const sidebarStateSource = readFileSync(resolve(assetsDir, 'sidebar-state.js'), 'utf8');
const sidebarRuntimeSource = readFileSync(resolve(assetsDir, 'sidebar.js'), 'utf8');
const sidebarCSS = readFileSync(resolve(assetsDir, 'output.css'), 'utf8');

const pageHTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="/assets/sidebar-state.js" data-admin-sidebar-state></script>
    <link rel="stylesheet" href="/assets/sidebar.css">
    <style>
      html, body { margin: 0; }
      .admin-layout { display: flex; min-height: 100vh; }
      #sidebar { box-sizing: border-box; flex: 0 0 auto; }
      .admin-main { flex: 1 1 auto; min-width: 0; }
      .sidebar-header, .sidebar-brand-link, .sidebar-brand { display: flex; }
    </style>
  </head>
  <body class="admin-theme-root">
    <button id="sidebar-mobile-toggle" aria-expanded="false" aria-label="Open navigation"></button>
    <div id="sidebar-backdrop" hidden></div>
    <div class="admin-layout">
      <aside id="sidebar" class="sidebar" data-collapsed="false" data-mobile-open="false"
             style="width: var(--admin-sidebar-width, var(--sidebar-width, 240px))">
        <div class="sidebar-header">
          <a class="sidebar-brand-link" href="#">
            <span class="sidebar-brand sidebar-brand-expanded">Expanded brand</span>
            <span class="sidebar-brand sidebar-brand-collapsed">C</span>
          </a>
          <button id="sidebar-toggle" class="sidebar-toggle-btn" aria-expanded="true" aria-label="Collapse sidebar"></button>
        </div>
        <nav>
          <a class="nav-item" href="#"><span class="nav-text">Dashboard</span></a>
        </nav>
      </aside>
      <main class="admin-main">Admin content</main>
    </div>
    <script>
      (() => {
        const root = document.documentElement;
        const sidebar = document.getElementById('sidebar');
        const main = document.querySelector('.admin-main');
        window.__sidebarBeforeRuntime = {
          rootCollapsed: root.getAttribute('data-admin-sidebar-collapsed'),
          rootReady: root.getAttribute('data-admin-sidebar-ready'),
          sidebarCollapsed: sidebar.getAttribute('data-collapsed'),
          width: sidebar.getBoundingClientRect().width,
          mainLeft: main.getBoundingClientRect().left,
          transition: getComputedStyle(sidebar).transition,
          expandedDisplay: getComputedStyle(document.querySelector('.sidebar-brand-expanded')).display,
          compactDisplay: getComputedStyle(document.querySelector('.sidebar-brand-collapsed')).display,
          navTextDisplay: getComputedStyle(document.querySelector('.nav-text')).display,
          animationCount: sidebar.getAnimations().length,
        };
      })();
    </script>
    <script src="/assets/sidebar.js"></script>
  </body>
</html>`;

async function routeSidebarFixture(page: Page) {
  await page.route('http://sidebar.test/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/assets/sidebar-state.js') {
      await route.fulfill({ contentType: 'text/javascript', body: sidebarStateSource });
      return;
    }
    if (pathname === '/assets/sidebar.js') {
      await route.fulfill({ contentType: 'text/javascript', body: sidebarRuntimeSource });
      return;
    }
    if (pathname === '/assets/sidebar.css') {
      await route.fulfill({ contentType: 'text/css', body: sidebarCSS });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: pageHTML });
  });
}

test('persisted desktop collapse is correct before the sidebar runtime loads', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await routeSidebarFixture(page);
  await page.addInitScript(() => {
    localStorage.setItem('admin-sidebar-collapsed', 'true');
  });

  await page.goto('http://sidebar.test/admin');

  const firstPaint = await page.evaluate(() => window.__sidebarBeforeRuntime);
  expect(firstPaint).toEqual({
    rootCollapsed: 'true',
    rootReady: 'false',
    sidebarCollapsed: 'false',
    width: 64,
    mainLeft: 64,
    transition: 'none',
    expandedDisplay: 'none',
    compactDisplay: 'flex',
    navTextDisplay: 'none',
    animationCount: 0,
  });

  await expect(page.locator('html')).toHaveAttribute('data-admin-sidebar-ready', 'true');
  await expect(page.locator('#sidebar')).toHaveAttribute('data-collapsed', 'true');
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#sidebar-toggle')).toHaveAttribute('aria-label', 'Expand sidebar');

  const toggled = await page.evaluate(async () => {
    document.getElementById('sidebar-toggle')?.click();
    await new Promise(requestAnimationFrame);
    const sidebar = document.getElementById('sidebar');
    return {
      rootCollapsed: document.documentElement.getAttribute('data-admin-sidebar-collapsed'),
      sidebarCollapsed: sidebar?.getAttribute('data-collapsed'),
      stored: localStorage.getItem('admin-sidebar-collapsed'),
      animationCount: sidebar?.getAnimations().length ?? 0,
    };
  });
  expect(toggled).toEqual({
    rootCollapsed: 'false',
    sidebarCollapsed: 'false',
    stored: 'false',
    animationCount: 1,
  });
});

test('persisted desktop collapse does not leak into the narrow drawer', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 720 });
  await routeSidebarFixture(page);
  await page.addInitScript(() => {
    localStorage.setItem('admin-sidebar-collapsed', 'true');
  });

  await page.goto('http://sidebar.test/admin');

  const firstPaint = await page.evaluate(() => window.__sidebarBeforeRuntime);
  expect(firstPaint.rootCollapsed).toBe('false');
  expect(firstPaint.rootReady).toBe('false');
  expect(firstPaint.width).toBe(260);
  expect(firstPaint.animationCount).toBe(0);

  await expect(page.locator('#sidebar')).toHaveAttribute('data-collapsed', 'false');
  await expect(page.locator('#sidebar')).toHaveAttribute('data-mobile-open', 'false');
  await expect(page.locator('#sidebar')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => localStorage.getItem('admin-sidebar-collapsed'))).toBe('true');
});

declare global {
  interface Window {
    __sidebarBeforeRuntime: {
      rootCollapsed: string | null;
      rootReady: string | null;
      sidebarCollapsed: string | null;
      width: number;
      mainLeft: number;
      transition: string;
      expandedDisplay: string;
      compactDisplay: string;
      navTextDisplay: string;
      animationCount: number;
    };
  }
}

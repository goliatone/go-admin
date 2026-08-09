import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(assetsDir, '../../..');

const sidebarStateSource = readFileSync(resolve(assetsDir, 'sidebar-state.js'), 'utf8');
const sidebarRuntimeSource = readFileSync(resolve(assetsDir, 'sidebar.js'), 'utf8');
const cssVariants = [
  { name: 'canonical', source: readFileSync(resolve(assetsDir, 'output.css'), 'utf8') },
  { name: 'quickstart', source: readFileSync(resolve(repoRoot, 'quickstart/assets/sidebar.css'), 'utf8') },
];

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
      <script>
        (() => {
          const sidebar = document.getElementById('sidebar');
          window.__sidebarBeforeRuntime = {
            rootCollapsed: document.documentElement.getAttribute('data-admin-sidebar-collapsed'),
            rootReady: document.documentElement.getAttribute('data-admin-sidebar-ready'),
            sidebarCollapsed: sidebar.getAttribute('data-collapsed'),
            mainPresent: Boolean(document.querySelector('.admin-main')),
            width: sidebar.getBoundingClientRect().width,
            transition: getComputedStyle(sidebar).transition,
            animationCount: sidebar.getAnimations().length,
          };
        })();
      </script>
      <script src="/assets/sidebar.js"></script>
      <script>
        (() => {
          const root = document.documentElement;
          const sidebar = document.getElementById('sidebar');
          const toggle = document.getElementById('sidebar-toggle');
          window.__sidebarAfterRuntimeBeforeContent = {
            rootCollapsed: root.getAttribute('data-admin-sidebar-collapsed'),
            rootReady: root.getAttribute('data-admin-sidebar-ready'),
            sidebarCollapsed: sidebar.getAttribute('data-collapsed'),
            sidebarHidden: sidebar.getAttribute('aria-hidden'),
            toggleExpanded: toggle.getAttribute('aria-expanded'),
            toggleLabel: toggle.getAttribute('aria-label'),
            mainPresent: Boolean(document.querySelector('.admin-main')),
            width: sidebar.getBoundingClientRect().width,
            transition: getComputedStyle(sidebar).transition,
            expandedDisplay: getComputedStyle(document.querySelector('.sidebar-brand-expanded')).display,
            compactDisplay: getComputedStyle(document.querySelector('.sidebar-brand-collapsed')).display,
            navTextDisplay: getComputedStyle(document.querySelector('.nav-text')).display,
            animationCount: sidebar.getAnimations().length,
          };
        })();
      </script>
      <main class="admin-main">
        Admin content
        <aside id="secondary-sidebar" class="sidebar" style="width: 320px">
          <span class="nav-text">Secondary navigation</span>
        </aside>
      </main>
    </div>
  </body>
</html>`;

async function routeSidebarFixture(page: Page, css: string) {
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
      await route.fulfill({ contentType: 'text/css', body: css });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: pageHTML });
  });
}

for (const variant of cssVariants) {
  test(`${variant.name}: persisted desktop collapse is synchronized before main content`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await routeSidebarFixture(page, variant.source);
    await page.addInitScript(() => localStorage.setItem('admin-sidebar-collapsed', 'true'));

    await page.goto('http://sidebar.test/admin');

    const preRuntime = await page.evaluate(() => window.__sidebarBeforeRuntime);
    expect(preRuntime).toEqual({
      rootCollapsed: 'true',
      rootReady: 'false',
      sidebarCollapsed: 'false',
      mainPresent: false,
      width: 64,
      transition: 'none',
      animationCount: 0,
    });
    const firstPaint = await page.evaluate(() => window.__sidebarAfterRuntimeBeforeContent);
    expect(firstPaint).toEqual({
      rootCollapsed: 'true',
      rootReady: 'false',
      sidebarCollapsed: 'true',
      sidebarHidden: null,
      toggleExpanded: 'false',
      toggleLabel: 'Expand sidebar',
      mainPresent: false,
      width: 64,
      transition: 'none',
      expandedDisplay: 'none',
      compactDisplay: 'flex',
      navTextDisplay: 'none',
      animationCount: 0,
    });

    await expect(page.locator('html')).toHaveAttribute('data-admin-sidebar-ready', 'true');
    await expect(page.locator('.admin-main')).toHaveJSProperty('offsetLeft', 64);
    await expect(page.locator('#secondary-sidebar')).toHaveCSS('width', '320px');
    await expect(page.locator('#secondary-sidebar .nav-text')).not.toHaveCSS('display', 'none');

    const toggled = await page.evaluate(async () => {
      document.getElementById('sidebar-toggle')?.click();
      await new Promise(requestAnimationFrame);
      const sidebar = document.getElementById('sidebar');
      return {
        rootCollapsed: document.documentElement.getAttribute('data-admin-sidebar-collapsed'),
        sidebarCollapsed: sidebar?.getAttribute('data-collapsed'),
        stored: localStorage.getItem('admin-sidebar-collapsed'),
        transitionProperty: getComputedStyle(sidebar!).transitionProperty,
        animationCount: sidebar?.getAnimations().length ?? 0,
      };
    });
    expect(toggled).toEqual({
      rootCollapsed: 'false',
      sidebarCollapsed: 'false',
      stored: 'false',
      transitionProperty: 'width',
      animationCount: 1,
    });
  });

  test(`${variant.name}: narrow drawer ignores persisted desktop collapse and animates transform`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 720 });
    await routeSidebarFixture(page, variant.source);
    await page.addInitScript(() => localStorage.setItem('admin-sidebar-collapsed', 'true'));

    await page.goto('http://sidebar.test/admin');

    const preRuntime = await page.evaluate(() => window.__sidebarBeforeRuntime);
    expect(preRuntime).toEqual({
      rootCollapsed: 'false',
      rootReady: 'false',
      sidebarCollapsed: 'false',
      mainPresent: false,
      width: 260,
      transition: 'none',
      animationCount: 0,
    });
    const firstPaint = await page.evaluate(() => window.__sidebarAfterRuntimeBeforeContent);
    expect(firstPaint.rootCollapsed).toBe('false');
    expect(firstPaint.rootReady).toBe('false');
    expect(firstPaint.sidebarCollapsed).toBe('false');
    expect(firstPaint.sidebarHidden).toBe('true');
    expect(firstPaint.mainPresent).toBe(false);
    expect(firstPaint.width).toBe(260);
    expect(firstPaint.transition).toBe('none');
    expect(firstPaint.animationCount).toBe(0);

    await expect(page.locator('html')).toHaveAttribute('data-admin-sidebar-ready', 'true');
    expect(await page.evaluate(() => localStorage.getItem('admin-sidebar-collapsed'))).toBe('true');

    const opened = await page.evaluate(async () => {
      document.getElementById('sidebar-mobile-toggle')?.click();
      await new Promise(requestAnimationFrame);
      const sidebar = document.getElementById('sidebar')!;
      return {
        mobileOpen: sidebar.getAttribute('data-mobile-open'),
        hidden: sidebar.getAttribute('aria-hidden'),
        toggleExpanded: document.getElementById('sidebar-mobile-toggle')?.getAttribute('aria-expanded'),
        stored: localStorage.getItem('admin-sidebar-collapsed'),
        transitionProperty: getComputedStyle(sidebar).transitionProperty,
        animationCount: sidebar.getAnimations().length,
      };
    });
    expect(opened).toEqual({
      mobileOpen: 'true',
      hidden: 'false',
      toggleExpanded: 'true',
      stored: 'true',
      transitionProperty: 'transform',
      animationCount: 1,
    });

    await page.waitForTimeout(250);
    const closed = await page.evaluate(async () => {
      document.getElementById('sidebar-backdrop')?.click();
      await new Promise(requestAnimationFrame);
      const sidebar = document.getElementById('sidebar')!;
      return {
        mobileOpen: sidebar.getAttribute('data-mobile-open'),
        hidden: sidebar.getAttribute('aria-hidden'),
        toggleExpanded: document.getElementById('sidebar-mobile-toggle')?.getAttribute('aria-expanded'),
        transitionProperty: getComputedStyle(sidebar).transitionProperty,
        animationCount: sidebar.getAnimations().length,
      };
    });
    expect(closed).toEqual({
      mobileOpen: 'false',
      hidden: 'true',
      toggleExpanded: 'false',
      transitionProperty: 'transform',
      animationCount: 1,
    });
  });

  test(`${variant.name}: desktop-to-narrow resize switches motion axes without width animation`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await routeSidebarFixture(page, variant.source);
    await page.addInitScript(() => localStorage.setItem('admin-sidebar-collapsed', 'true'));
    await page.goto('http://sidebar.test/admin');
    await expect(page.locator('html')).toHaveAttribute('data-admin-sidebar-ready', 'true');
    await page.waitForTimeout(350);

    await page.setViewportSize({ width: 800, height: 720 });
    await expect(page.locator('#sidebar')).toHaveAttribute('data-collapsed', 'false');

    const resized = await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      const sidebar = document.getElementById('sidebar')!;
      return {
        rootCollapsed: document.documentElement.getAttribute('data-admin-sidebar-collapsed'),
        width: sidebar.getBoundingClientRect().width,
        transitionProperty: getComputedStyle(sidebar).transitionProperty,
        widthAnimations: sidebar.getAnimations().filter((animation) => {
          const frames = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
          return frames.some((frame) => Object.hasOwn(frame, 'width'));
        }).length,
      };
    });
    expect(resized).toEqual({
      rootCollapsed: 'false',
      width: 260,
      transitionProperty: 'transform',
      widthAnimations: 0,
    });
  });

  test(`${variant.name}: reduced motion keeps sidebar transitions effectively disabled`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 720 });
    await routeSidebarFixture(page, variant.source);
    await page.addInitScript(() => localStorage.setItem('admin-sidebar-collapsed', 'true'));
    await page.goto('http://sidebar.test/admin');
    await expect(page.locator('html')).toHaveAttribute('data-admin-sidebar-ready', 'true');

    const durationMilliseconds = await page.evaluate(() => {
      const duration = getComputedStyle(document.getElementById('sidebar')!).transitionDuration;
      return duration.split(',').reduce((maximum, value) => {
        const trimmed = value.trim();
        const milliseconds = trimmed.endsWith('ms')
          ? Number.parseFloat(trimmed)
          : Number.parseFloat(trimmed) * 1000;
        return Math.max(maximum, milliseconds);
      }, 0);
    });
    expect(durationMilliseconds).toBeLessThanOrEqual(0.001);
  });
}

declare global {
  interface Window {
    __sidebarBeforeRuntime: {
      rootCollapsed: string | null;
      rootReady: string | null;
      sidebarCollapsed: string | null;
      mainPresent: boolean;
      width: number;
      transition: string;
      animationCount: number;
    };
    __sidebarAfterRuntimeBeforeContent: {
      rootCollapsed: string | null;
      rootReady: string | null;
      sidebarCollapsed: string | null;
      sidebarHidden: string | null;
      toggleExpanded: string | null;
      toggleLabel: string | null;
      mainPresent: boolean;
      width: number;
      transition: string;
      expandedDisplay: string;
      compactDisplay: string;
      navTextDisplay: string;
      animationCount: number;
    };
  }
}

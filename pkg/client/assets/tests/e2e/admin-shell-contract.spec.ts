import { expect, test } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const quickstartDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../quickstart');
const shellBaseURL = process.env.ADMIN_SHELL_E2E_BASE_URL || 'http://127.0.0.1:4179';
let server: ChildProcessWithoutNullStreams | undefined;
let serverOutput = '';

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(120_000);
  if (!process.env.ADMIN_SHELL_E2E_BASE_URL) {
    server = spawn('go', ['run', './cmd/admin-shell-e2e-server'], {
      cwd: quickstartDir,
      env: { ...process.env, ADMIN_SHELL_E2E_ADDR: '127.0.0.1:4179' },
      stdio: 'pipe',
      detached: true,
    });
    server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
    server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  }

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`admin shell E2E host exited early (${server.exitCode}):\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${shellBaseURL}/healthz`);
      if (response.ok) return;
    } catch {
      // The Go host is still compiling or binding its listener.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`admin shell E2E host did not become ready:\n${serverOutput}`);
});

test.afterAll(() => {
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
});

test('actual CRUD, module, and dashboard routes share one selected host shell', async ({ page }) => {
  const routes = ['users', 'activity', 'feature-flags', 'media', 'translations', 'dashboard', 'extensions/reports'];
  for (const route of routes) {
    for (const variant of ['default', 'light', 'dark', 'contrast']) {
      await page.goto(`${shellBaseURL}/admin/${route}?variant=${variant}`);

      await expect(page.locator('[data-admin-shell]')).toHaveCount(1);
      await expect(page.locator('[data-admin-page-header]')).toHaveCount(1);
      await expect(page.locator('[data-admin-shell-content]')).toHaveCount(1);
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(1);
      await expect(page.locator(`[data-host-breadcrumbs="${variant === 'contrast' ? 'contrast' : 'default'}"]`)).toBeVisible();
      await expect(page.locator('[data-host-footer]')).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-theme', variant);

      const documentOwners = await page.locator('html').count();
      expect(documentOwners).toBe(1);
    }
  }
});

test('real-host component gallery exposes the supported anatomy and theme states', async ({ page }) => {
  for (const variant of ['default', 'light', 'dark', 'contrast']) {
    await page.goto(`${shellBaseURL}/admin/component-gallery?variant=${variant}`);
    for (const selector of [
      '[data-gallery-modal]',
      '.action-menu__trigger',
      '.status-chip',
      '.filter-panel__trigger',
      '.filter-panel__form',
      '.quick-filter',
      '[data-gallery-buttons] .btn',
    ]) {
      await expect(page.locator(selector).first()).toBeVisible();
    }
    await expect(page.locator('.action-menu__content')).toHaveCount(1);
    await expect(page.locator('link[data-product-styles]')).toHaveCount(1);
    const styles = await page.evaluate(() => {
      const menu = document.querySelector('.action-menu__content') as HTMLElement;
      const filter = document.querySelector('.filter-panel') as HTMLElement;
      const filterForm = document.querySelector('.filter-panel__form') as HTMLElement;
      const chip = document.querySelector('.status-chip') as HTMLElement;
      return {
        menuBackground: getComputedStyle(menu).backgroundColor,
        filterBackground: getComputedStyle(filter).backgroundColor,
        filterFormBackground: getComputedStyle(filterForm).backgroundColor,
        chipDisplay: getComputedStyle(chip).display,
        documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(styles.menuBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.filterBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.filterFormBackground).toBe(styles.filterBackground);
    if (variant === 'contrast') expect(styles.menuBackground).toBe('rgb(31, 41, 55)');
    if (variant === 'dark') expect(styles.menuBackground).toBe('rgb(17, 24, 39)');
    expect(styles.chipDisplay).toBe('inline-flex');
    expect(styles.documentFits).toBe(true);
  }
});

test('actual wide CRUD page keeps document fixed and scroll ownership inside the shell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${shellBaseURL}/admin/users?variant=contrast`);

  await expect(page.locator('#datatable-body tr')).toHaveCount(10);

  const geometry = await page.evaluate(() => {
    const scrollOwner = document.querySelector('.admin-page-content') as HTMLElement;
    const footer = document.querySelector('[data-admin-shell-footer]') as HTMLElement;
    const header = document.querySelector('[data-admin-page-header]') as HTMLElement;
    return {
      documentLocked: window.scrollY === 0 && getComputedStyle(document.documentElement).overflow === 'hidden',
      contentScrolls: scrollOwner.scrollHeight > scrollOwner.clientHeight,
      footerBottom: Math.round(footer.getBoundingClientRect().bottom),
      viewportHeight: window.innerHeight,
      headerBackground: getComputedStyle(header).backgroundColor,
    };
  });
  expect(geometry.documentLocked).toBe(true);
  expect(geometry.contentScrolls).toBe(true);
  expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.headerBackground).toBe('rgb(31, 41, 55)');

  const scrollOwner = page.locator('.admin-page-content');
  await scrollOwner.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scrollOwner.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('actual narrow CRUD page contains actions and uses the responsive sidebar disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto(`${shellBaseURL}/admin/users?variant=default`);

  await expect(page.locator('#datatable-body tr')).toHaveCount(10);

  const mobileToggle = page.locator('#sidebar-mobile-toggle');
  await expect(mobileToggle).toBeVisible();
  await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
  await mobileToggle.click();
  await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#sidebar')).toHaveAttribute('data-mobile-open', 'true');

  const geometry = await page.evaluate(() => {
    const actions = document.querySelector('[data-admin-page-actions]') as HTMLElement;
    const main = document.querySelector('[data-admin-shell-main]') as HTMLElement;
    const scrollOwner = document.querySelector('.admin-page-content') as HTMLElement;
    const actionsRect = actions.getBoundingClientRect();
    return {
      mainWidth: Math.round(main.getBoundingClientRect().width),
      actionsLeft: Math.round(actionsRect.left),
      actionsRight: Math.round(actionsRect.right),
      documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      contentScrolls: scrollOwner.scrollHeight > scrollOwner.clientHeight,
    };
  });
  expect(geometry.mainWidth).toBeLessThanOrEqual(390);
  expect(geometry.actionsLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.actionsRight).toBeLessThanOrEqual(390);
  expect(geometry.documentFits).toBe(true);
  expect(geometry.contentScrolls).toBe(true);
});

test('gallery keyboard, focus, disabled, and reduced-motion contracts remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${shellBaseURL}/admin/component-gallery?variant=contrast`);

  const menuTrigger = page.locator('.action-menu__trigger');
  await menuTrigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.locator('.action-menu__content');
  await expect(menu).toBeVisible();
  await expect(menuTrigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.action-menu__item').first()).toBeFocused();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(1280);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(menuTrigger).toBeFocused();

  const summary = page.locator('.filter-panel__trigger');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.filter-panel')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(page.locator('.filter-panel')).toHaveAttribute('open', '');
  await expect(page.locator('[data-gallery-buttons] button[disabled]')).toBeDisabled();

  const openModal = page.locator('#gallery-open-modal');
  await openModal.focus();
  await openModal.click();
  const dialog = page.locator('[data-go-admin-modal="true"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-label', 'Gallery dialog');
  await expect(dialog.locator('[data-modal-focus]')).toBeFocused();
  const motion = await page.evaluate(() => {
    const backdrop = document.querySelector('.go-admin-modal') as HTMLElement;
    const dialog = document.querySelector('[data-go-admin-modal="true"]') as HTMLElement;
    const body = dialog.querySelector('.go-admin-modal__body') as HTMLElement;
    return {
      modal: getComputedStyle(backdrop).transitionDuration,
      menu: getComputedStyle(document.querySelector('.action-menu__trigger') as HTMLElement).transitionDuration,
      radius: getComputedStyle(dialog).borderRadius,
      maxWidth: getComputedStyle(dialog).maxWidth,
      maxHeight: getComputedStyle(dialog).maxHeight,
      bodyPadding: getComputedStyle(body).padding,
      backdropPadding: getComputedStyle(backdrop).padding,
    };
  });
  expect(parseFloat(motion.modal)).toBeLessThanOrEqual(0.001);
  expect(parseFloat(motion.menu)).toBeLessThanOrEqual(0.001);
  expect(motion.radius).toBe('18px');
  expect(motion.maxWidth).toBe('640px');
  expect(motion.maxHeight).toBe('504px');
  expect(motion.bodyPadding).toBe('18px 24px');
  expect(motion.backdropPadding).toBe('12px');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(openModal).toBeFocused();
});

test('gallery components and representative pages stay contained at narrow width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(`${shellBaseURL}/admin/component-gallery?variant=dark`);
  await page.locator('#gallery-open-modal').click();
  const dialog = page.locator('[data-go-admin-modal="true"]');
  await expect(dialog).toBeVisible();
  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector('[data-go-admin-modal="true"]') as HTMLElement;
    const filter = document.querySelector('.filter-panel') as HTMLElement;
    const quickFilters = document.querySelector('.quick-filters') as HTMLElement;
    const dialogRect = dialog.getBoundingClientRect();
    return {
      documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      dialogFits: dialogRect.left >= 0 && dialogRect.right <= window.innerWidth && dialogRect.top >= 0 && dialogRect.bottom <= window.innerHeight,
      filterFits: filter.scrollWidth <= filter.clientWidth,
      quickFiltersFit: quickFilters.scrollWidth <= quickFilters.clientWidth,
    };
  });
  expect(geometry).toEqual({ documentFits: true, dialogFits: true, filterFits: true, quickFiltersFit: true });
  await page.keyboard.press('Escape');

  for (const route of ['users', 'media', 'translations', 'dashboard', 'extensions/reports']) {
    await page.goto(`${shellBaseURL}/admin/${route}?variant=dark`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('[data-admin-page-actions]')).toBeInViewport();
  }
});

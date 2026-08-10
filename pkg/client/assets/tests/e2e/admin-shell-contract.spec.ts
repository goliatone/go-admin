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
  for (const route of ['users', 'media', 'dashboard']) {
    for (const variant of ['default', 'contrast']) {
      await page.goto(`${shellBaseURL}/admin/${route}?variant=${variant}`);

      await expect(page.locator('[data-admin-shell]')).toHaveCount(1);
      await expect(page.locator('[data-admin-page-header]')).toHaveCount(1);
      await expect(page.locator('[data-admin-shell-content]')).toHaveCount(1);
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(1);
      await expect(page.locator(`[data-host-breadcrumbs="${variant}"]`)).toBeVisible();
      await expect(page.locator('[data-host-footer]')).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-theme', variant);

      const documentOwners = await page.locator('html').count();
      expect(documentOwners).toBe(1);
    }
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

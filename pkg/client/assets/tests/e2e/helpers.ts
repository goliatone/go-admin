import { Page, expect, Locator } from '@playwright/test';

/**
 * E2E Test Helpers for go-admin Translation UX
 *
 * Common utilities for authentication, navigation, and assertions.
 */

/**
 * Default admin credentials (format: username/username.pwd)
 */
export const DEFAULT_CREDENTIALS = {
  username: 'admin',
  password: 'admin.pwd',
};

/**
 * Login to admin panel
 */
export async function login(
  page: Page,
  credentials = DEFAULT_CREDENTIALS
): Promise<void> {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

  // Fill login form
  await page.fill(
    'input[name="identifier"], input[name="username"], input[name="email"], input[placeholder="Enter your email address"]',
    credentials.username
  );
  await page.fill('input[name="password"]', credentials.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to admin dashboard
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
}

async function openTranslationPanel(page: Page): Promise<void> {
  let toggle = page.locator('#translation-panel-toggle');
  if (await toggle.count() === 0) {
    toggle = page.getByRole('button', { name: /^Translation$/ }).last();
  }
  if (await toggle.count() === 0) {
    return;
  }

  const panel = page.locator('#translation-panel');
  if (await panel.count() === 0) {
    return;
  }

  const hidden = await panel.evaluate((element) => element.classList.contains('hidden'));
  if (hidden) {
    await toggle.click();
    await expect(panel).toBeVisible();
  }
}

async function waitForViewMode(page: Page, mode: 'flat' | 'grouped' | 'matrix'): Promise<void> {
  await expect.poll(() => Promise.resolve(new URL(page.url()).searchParams.get('view_mode')), {
    timeout: 10000,
  }).toBe(mode);

  switch (mode) {
    case 'flat':
      await expect.poll(async () => page.locator('tr.group-header, [data-group-header="true"]').count(), {
        timeout: 10000,
      }).toBe(0);
      await expect.poll(async () => page.locator('tbody tr').count(), {
        timeout: 10000,
      }).toBeGreaterThan(0);
      return;
    case 'grouped':
      await expect.poll(async () => {
        const headerCount = await page.locator('tr.group-header, [data-group-header="true"]').count();
        const fallbackCount = await page.locator('.grouped-mode-warning, [data-grouped-fallback]').count();
        return headerCount + fallbackCount;
      }, {
        timeout: 10000,
      }).toBeGreaterThan(0);
      return;
    case 'matrix':
      await expect(page.locator('.translation-view-mode-btn[data-view-mode="matrix"], [data-view-mode="matrix"]').first()).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => page.locator('tbody tr').count(), {
        timeout: 10000,
      }).toBeGreaterThan(0);
      return;
  }
}

function actionRowLocator(page: Page): Locator {
  return page.locator(
    'tbody tr:has([data-dropdown-trigger], [data-action], [data-action-id], button[aria-label="Actions menu"]), [data-row]:has([data-dropdown-trigger], [data-action], [data-action-id], button[aria-label="Actions menu"])'
  );
}

async function openRowActionsMenu(page: Page, rowIndex: number): Promise<Locator> {
  const row = actionRowLocator(page).nth(rowIndex);
  const trigger = row.locator('[data-dropdown-trigger], button[aria-label="Actions menu"]').first();
  if (await trigger.count() === 0) {
    return row;
  }

  const menu = row.locator('.actions-menu').first();
  if (await menu.count() === 0) {
    await trigger.click();
    return row;
  }

  const hidden = await menu.evaluate((element) => element.classList.contains('hidden'));
  if (hidden) {
    await trigger.click();
    await expect(menu).toBeVisible();
  }
  return row;
}

/**
 * Navigate to a content panel list view
 */
export async function navigateToPanel(
  page: Page,
  panelName: string
): Promise<void> {
  const path = ['pages', 'posts', 'news'].includes(panelName)
    ? `/admin/content/${panelName}`
    : `/admin/${panelName}`;
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait for DataGrid to load
  await page.waitForSelector('[data-testid="data-grid"], .data-grid, table', { timeout: 10000 });
  await openTranslationPanel(page);
}

/**
 * Navigate to translation dashboard
 */
export async function navigateToTranslationDashboard(page: Page): Promise<void> {
  await page.goto('/admin/translations/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(
    '[data-dashboard-toolbar="true"], [data-dashboard="true"], [data-dashboard-table], [data-dashboard-error="true"], [data-dashboard-refresh-button]',
    { timeout: 10000 }
  );
}

export async function navigateToTranslationQueue(page: Page): Promise<void> {
  await page.goto('/admin/translations/queue', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-assignment-id], [data-queue-state="empty"], [data-review-preset-id]', { timeout: 10000 });
}

/**
 * Get current view mode from DataGrid
 */
export async function getViewMode(page: Page): Promise<string | null> {
  const viewModeToggle = page.locator('[data-view-mode]');
  if (await viewModeToggle.count() > 0) {
    return viewModeToggle.getAttribute('data-view-mode');
  }
  // Check URL parameter
  const url = new URL(page.url());
  return url.searchParams.get('view_mode');
}

/**
 * Set view mode (flat, grouped, matrix)
 */
export async function setViewMode(
  page: Page,
  mode: 'flat' | 'grouped' | 'matrix'
): Promise<void> {
  await openTranslationPanel(page);
  const modeButton = page.locator(`[data-view-mode="${mode}"], button:has-text("${mode}")`);
  if (await modeButton.count() > 0) {
    await modeButton.first().click();
  } else {
    // Fallback: navigate with URL param
    const url = new URL(page.url());
    url.searchParams.set('view_mode', mode);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  }
  await waitForViewMode(page, mode);
}

/**
 * Get all visible row actions for a specific row
 */
export async function getRowActions(page: Page, rowIndex: number): Promise<string[]> {
  const row = await openRowActionsMenu(page, rowIndex);
  const actionButtons = row.locator('[data-action]:visible, .action-item:visible, button[data-action-name]:visible, [data-action-id]:visible');
  const actions: string[] = [];
  const count = await actionButtons.count();
  for (let i = 0; i < count; i++) {
    const actionName = await actionButtons.nth(i).getAttribute('data-action') ||
                       await actionButtons.nth(i).getAttribute('data-action-name') ||
                       await actionButtons.nth(i).textContent();
    if (actionName) {
      actions.push(actionName.trim());
    }
  }
  return actions;
}

/**
 * Check if an action is disabled with reason
 */
export async function isActionDisabled(
  page: Page,
  rowIndex: number,
  actionName: string
): Promise<{ disabled: boolean; reason?: string }> {
  const row = await openRowActionsMenu(page, rowIndex);
  const action = row.locator(`[data-action="${actionName}"]:visible, [data-action-id="${actionName}"]:visible, button:has-text("${actionName}"):visible`).first();

  if (await action.count() === 0) {
    return { disabled: false };
  }

  const ariaDisabled = await action.getAttribute('aria-disabled');
  const dataDisabled = await action.getAttribute('data-disabled');
  const disabled = ariaDisabled === 'true' || dataDisabled === 'true';

  let reason: string | undefined;
  if (disabled) {
    reason = await action.getAttribute('title') || await action.getAttribute('data-reason') || undefined;
  }

  return { disabled, reason };
}

/**
 * Get grouped row headers (in grouped mode)
 */
export async function getGroupHeaders(page: Page): Promise<Locator[]> {
  const headers = page.locator('tr[data-group-header="true"], [data-group-header="true"], .group-header');
  const count = await headers.count();
  const result: Locator[] = [];
  for (let i = 0; i < count; i++) {
    const header = headers.nth(i);
    if (await header.isVisible()) {
      result.push(header);
    }
  }
  return result;
}

/**
 * Expand or collapse a group
 */
export async function toggleGroup(page: Page, groupId: string): Promise<void> {
  const groupHeader = page.locator(`[data-group-id="${groupId}"], tr[data-group-id="${groupId}"]`);
  const toggle = groupHeader.locator('[data-expand-toggle], .expand-toggle, button');
  await toggle.first().click();
  await page.waitForTimeout(300); // Wait for animation
}

/**
 * Click Expand All button
 */
export async function expandAll(page: Page): Promise<void> {
  await openTranslationPanel(page);
  const expandAllBtn = page.locator('[data-expand-all], button:has-text("Expand All")');
  if (await expandAllBtn.count() > 0) {
    await expandAllBtn.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Click Collapse All button
 */
export async function collapseAll(page: Page): Promise<void> {
  await openTranslationPanel(page);
  const collapseAllBtn = page.locator('[data-collapse-all], button:has-text("Collapse All")');
  if (await collapseAllBtn.count() > 0) {
    await collapseAllBtn.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Get matrix cell status for a specific row and locale
 */
export async function getMatrixCellStatus(
  page: Page,
  rowIndex: number,
  locale: string
): Promise<string | null> {
  const row = page.locator('tbody tr, [data-row]').nth(rowIndex);
  const cell = row.locator(`[data-locale="${locale}"], .locale-${locale}`);
  if (await cell.count() === 0) {
    return null;
  }
  return cell.getAttribute('data-status') ||
         cell.locator('.status-icon').getAttribute('data-status') ||
         cell.textContent();
}

/**
 * Open create translation modal for a row
 */
export async function openCreateTranslationModal(
  page: Page,
  rowIndex: number
): Promise<boolean> {
  const row = await openRowActionsMenu(page, rowIndex);
  const createBtn = row.locator('[data-action="create_translation"]:visible, button:has-text("Add Translation"):visible, button:has-text("Create Translation"):visible');
  if (await createBtn.count() === 0) {
    return false;
  }
  await createBtn.first().click();
  try {
    await page.waitForSelector('[role="dialog"], .modal, .payload-modal', { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recommended locale from create translation modal
 */
export async function getRecommendedLocaleInModal(page: Page): Promise<string | null> {
  const modal = page.locator('[role="dialog"], .modal, .payload-modal');
  const recommendedOption = modal.locator('[data-recommended="true"], .recommended, input[checked] + label:has-text("recommended")');
  if (await recommendedOption.count() > 0) {
    return recommendedOption.getAttribute('data-locale') ||
           recommendedOption.textContent();
  }
  return null;
}

/**
 * Get available locales in create translation modal
 */
export async function getAvailableLocalesInModal(page: Page): Promise<string[]> {
  const modal = page.locator('[role="dialog"], .modal, .payload-modal');
  const options = modal.locator('input[type="radio"], select option, [data-locale]');
  const locales: string[] = [];
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const locale = await options.nth(i).getAttribute('value') ||
                   await options.nth(i).getAttribute('data-locale') ||
                   await options.nth(i).textContent();
    if (locale) {
      locales.push(locale.trim());
    }
  }
  return locales;
}

/**
 * Close any open modal
 */
export async function closeModal(page: Page): Promise<void> {
  const closeBtn = page.locator('[role="dialog"] [aria-label="Close"], .modal-close, button:has-text("Cancel")');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
    await page.waitForSelector('[role="dialog"], .modal', { state: 'hidden', timeout: 3000 });
  }
}

/**
 * Get quick filter buttons
 */
export async function getQuickFilters(page: Page): Promise<{ name: string; disabled: boolean }[]> {
  await openTranslationPanel(page);
  const filters = page.locator('[data-quick-filter], .quick-filter button, .quick-filter-btn');
  const result: { name: string; disabled: boolean }[] = [];
  const count = await filters.count();
  for (let i = 0; i < count; i++) {
    const filter = filters.nth(i);
    const name = await filter.getAttribute('data-filter-name') ||
                 await filter.textContent() || '';
    const disabled = (await filter.getAttribute('aria-disabled')) === 'true' ||
                     (await filter.getAttribute('disabled')) !== null;
    result.push({ name: name.trim(), disabled });
  }
  return result;
}

/**
 * Apply a quick filter
 */
export async function applyQuickFilter(page: Page, filterName: string): Promise<void> {
  const filter = page.locator(`[data-quick-filter="${filterName}"], .quick-filter button:has-text("${filterName}")`);
  await filter.first().click();
  await page.waitForTimeout(150);
}

/**
 * Get status legend items
 */
export async function getStatusLegendItems(page: Page): Promise<string[]> {
  await openTranslationPanel(page);
  const legend = page.locator('[data-status-legend], .status-legend, #translation-status-legend');
  const items = legend.locator('.status-legend-item, .legend-item, [data-legend-item]');
  const result: string[] = [];
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const text = await items.nth(i).textContent();
    if (text) {
      result.push(text.trim());
    }
  }
  return result;
}

/**
 * Wait for toast notification and get its content
 */
export async function waitForToast(page: Page): Promise<string | null> {
  const toast = page.locator('[role="alert"], .toast, .notification');
  await toast.waitFor({ state: 'visible', timeout: 5000 });
  return toast.textContent();
}

/**
 * Check if element has visible reason text
 */
export async function hasVisibleReason(locator: Locator): Promise<boolean> {
  const reason = await locator.getAttribute('title') ||
                 await locator.getAttribute('data-reason') ||
                 await locator.locator('.reason-text, .tooltip').textContent();
  return !!reason && reason.trim().length > 0;
}

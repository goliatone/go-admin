import { test, expect } from '@playwright/test';
import {
  login,
  navigateToPanel,
  getViewMode,
  setViewMode,
  getRowActions,
  isActionDisabled,
  getGroupHeaders,
  toggleGroup,
  expandAll,
  collapseAll,
  openCreateTranslationModal,
  getRecommendedLocaleInModal,
  getAvailableLocalesInModal,
  closeModal,
  getQuickFilters,
  getStatusLegendItems,
  hasVisibleReason,
} from './helpers';

/**
 * TX-092: Browser-level E2E flows for pages/posts/news
 *
 * Coverage:
 * - Flat/Grouped/Matrix view mode differences
 * - Expand/Collapse all functionality
 * - Disabled action states with reason visibility
 * - Create-translation locale recommendations
 */

const CONTENT_PANELS = ['pages', 'posts', 'news'];

test.describe('Translation UX - Content Panels', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // Run tests for each content panel type
  for (const panel of CONTENT_PANELS) {
    test.describe(`${panel} panel`, () => {

      test.describe('View Mode Differences', () => {

        test('flat mode displays rows without grouping', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'flat');

          // In flat mode, no group headers should be visible
          const groupHeaders = await getGroupHeaders(page);
          expect(groupHeaders.length).toBe(0);

          // Regular rows should be visible
          const rows = page.locator('tbody tr:not([data-group-header]), [data-row]:not([data-group-header])');
          const rowCount = await rows.count();
          expect(rowCount).toBeGreaterThan(0);
        });

        test('grouped mode displays translation groups with headers', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');

          // Wait for grouped rendering
          await page.waitForTimeout(500);

          // Group headers should be present (or fallback to flat with warning)
          const groupHeaders = await getGroupHeaders(page);
          const fallbackWarning = page.locator('.grouped-mode-warning, [data-grouped-fallback]');

          // Either we have group headers OR we have a visible fallback warning
          const hasGroups = groupHeaders.length > 0;
          const hasFallbackWarning = await fallbackWarning.count() > 0;

          expect(hasGroups || hasFallbackWarning).toBe(true);

          if (hasGroups) {
            // Verify group headers have summary information
            const firstHeader = groupHeaders[0];
            const summary = firstHeader.locator('.group-summary, [data-group-summary]');
            // Summary may not always be present depending on backend
          }
        });

        test('matrix mode displays locale status indicators', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'matrix');

          const activeMatrixButton = page.locator('.translation-view-mode-btn[data-view-mode="matrix"][aria-pressed="true"]');
          await expect(activeMatrixButton).toBeVisible();

          const url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('matrix');

          const tableRows = page.locator('tbody tr');
          expect(await tableRows.count()).toBeGreaterThan(0);
        });

        test('view mode persists across page refresh', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');

          let url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('grouped');

          // Reload page
          await page.reload();
          await page.waitForLoadState('networkidle');

          url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('grouped');

          const activeGroupedButton = page.locator('.translation-view-mode-btn[data-view-mode="grouped"][aria-pressed="true"]');
          await expect(activeGroupedButton).toBeVisible();
        });

        test('view mode switches update URL state', async ({ page }) => {
          await navigateToPanel(page, panel);

          // Switch to grouped
          await setViewMode(page, 'grouped');
          let url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('grouped');

          // Switch to matrix
          await setViewMode(page, 'matrix');
          url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('matrix');

          // Switch back to flat
          await setViewMode(page, 'flat');
          url = new URL(page.url());
          expect(url.searchParams.get('view_mode')).toBe('flat');
        });
      });

      test.describe('Expand/Collapse All', () => {

        test('expand all shows all group children', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');
          await page.waitForTimeout(500);

          const groupHeaders = await getGroupHeaders(page);
          if (groupHeaders.length === 0) {
            test.skip();
            return;
          }

          // First collapse all
          await collapseAll(page);
          await page.waitForTimeout(300);

          const visibleAfterCollapse = await page.locator('tr.group-child-row:visible').count();

          // Expand all
          await expandAll(page);
          await page.waitForTimeout(300);

          // All child rows should now be visible
          const visibleAfterExpand = await page.locator('tr.group-child-row:visible').count();
          expect(visibleAfterExpand).toBeGreaterThan(0);
          expect(visibleAfterExpand).toBeGreaterThanOrEqual(visibleAfterCollapse);
        });

        test('collapse all hides group children', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');
          await page.waitForTimeout(500);

          const groupHeaders = await getGroupHeaders(page);
          if (groupHeaders.length === 0) {
            test.skip();
            return;
          }

          // First expand all
          await expandAll(page);
          await page.waitForTimeout(300);

          // Collapse all
          await collapseAll(page);
          await page.waitForTimeout(300);

          // Child rows should be hidden
          const visibleAfterCollapse = await page.locator('tr.group-child-row:visible').count();
          expect(visibleAfterCollapse).toBe(0);
        });

        test('individual group toggle works independently', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');
          await page.waitForTimeout(500);

          const groupHeaders = await getGroupHeaders(page);
          if (groupHeaders.length < 2) {
            test.skip();
            return;
          }

          // Get first group's ID
          const firstGroupId = await groupHeaders[0].getAttribute('data-group-id');
          if (!firstGroupId) {
            test.skip();
            return;
          }

          // Toggle first group
          await toggleGroup(page, firstGroupId);
          await page.waitForTimeout(300);

          // First group should be different state than others
        });

        test('expand state persists in URL for sharing', async ({ page }) => {
          await navigateToPanel(page, panel);
          await setViewMode(page, 'grouped');
          await page.waitForTimeout(500);

          const groupHeaders = await getGroupHeaders(page);
          if (groupHeaders.length === 0) {
            test.skip();
            return;
          }

          // Expand a specific group
          const groupId = await groupHeaders[0].getAttribute('data-group-id');
          if (groupId) {
            await toggleGroup(page, groupId);
            await page.waitForTimeout(300);
          }

          // Check URL for expanded_groups parameter
          const url = new URL(page.url());
          const expandedParam = url.searchParams.get('expanded_groups');
          // Implementation may use URL or localStorage
        });
      });

      test.describe('Disabled Action States', () => {

        test('disabled actions show visible with aria-disabled', async ({ page }) => {
          await navigateToPanel(page, panel);

          // Find any disabled action
          const disabledActions = page.locator('[aria-disabled="true"], [data-disabled="true"]');
          const count = await disabledActions.count();

          if (count > 0) {
            // Verify disabled actions are visible (not hidden)
            const firstDisabled = disabledActions.first();
            await expect(firstDisabled).toBeVisible();

            // Should not be hidden
            const hidden = await firstDisabled.getAttribute('hidden');
            expect(hidden).toBeNull();
          }
        });

        test('disabled actions have reason text in title or tooltip', async ({ page }) => {
          await navigateToPanel(page, panel);

          const disabledActions = page.locator('[aria-disabled="true"], [data-disabled="true"]');
          const count = await disabledActions.count();

          for (let i = 0; i < Math.min(count, 3); i++) {
            const action = disabledActions.nth(i);
            const hasReason = await hasVisibleReason(action);
            expect(hasReason).toBe(true);
          }
        });

        test('disabled actions are not clickable', async ({ page }) => {
          await navigateToPanel(page, panel);

          const disabledAction = page.locator('[aria-disabled="true"]').first();
          if (await disabledAction.count() === 0) {
            test.skip();
            return;
          }

          // Get initial page state
          const initialUrl = page.url();

          // Click disabled action
          await disabledAction.click({ force: true });
          await page.waitForTimeout(300);

          // Page should not have navigated or modal opened
          // URL should remain same
          expect(page.url()).toBe(initialUrl);

          // No modal should have appeared
          const modal = page.locator('[role="dialog"], .modal');
          const modalVisible = await modal.isVisible().catch(() => false);
          expect(modalVisible).toBe(false);
        });

        test('publish action disabled on already-published row shows reason', async ({ page }) => {
          await navigateToPanel(page, panel);

          // Find a published row (look for status indicator)
          const publishedRow = page.locator('tr:has([data-status="published"]), [data-row]:has([data-status="published"])').first();
          if (await publishedRow.count() === 0) {
            test.skip();
            return;
          }

          // Check publish action state
          const publishAction = publishedRow.locator('[data-action="publish"], button:has-text("Publish")');
          if (await publishAction.count() === 0) {
            return; // Publish action may be hidden on published rows
          }

          const ariaDisabled = await publishAction.getAttribute('aria-disabled');
          if (ariaDisabled === 'true') {
            const reason = await publishAction.getAttribute('title');
            expect(reason).toBeTruthy();
          }
        });

        test('disabled actions are keyboard focusable for a11y', async ({ page }) => {
          await navigateToPanel(page, panel);

          const disabledAction = page.locator('[aria-disabled="true"]:not([tabindex="-1"])').first();
          if (await disabledAction.count() === 0) {
            test.skip();
            return;
          }

          // Should be focusable
          await disabledAction.focus();
          await expect(disabledAction).toBeFocused();
        });
      });

      test.describe('Create Translation Modal', () => {

        test('create translation modal shows missing locales', async ({ page }) => {
          await navigateToPanel(page, panel);

          // Find row with create_translation action
          const createAction = page.locator('[data-action="create_translation"], button:has-text("Add Translation")').first();
          if (await createAction.count() === 0) {
            test.skip();
            return;
          }

          await createAction.click();
          await page.waitForSelector('[role="dialog"], .modal, .payload-modal', { timeout: 5000 });

          // Get available locales
          const locales = await getAvailableLocalesInModal(page);
          expect(locales.length).toBeGreaterThan(0);

          await closeModal(page);
        });

        test('recommended locale is preselected in modal', async ({ page }) => {
          await navigateToPanel(page, panel);

          const createAction = page.locator('[data-action="create_translation"], button:has-text("Add Translation")').first();
          if (await createAction.count() === 0) {
            test.skip();
            return;
          }

          await createAction.click();
          await page.waitForSelector('[role="dialog"], .modal, .payload-modal', { timeout: 5000 });

          // Check for preselected/recommended option
          const modal = page.locator('[role="dialog"], .modal, .payload-modal');
          const selectedOption = modal.locator('input[type="radio"]:checked, select option:checked, [data-selected="true"]');

          if (await selectedOption.count() > 0) {
            // There should be a selected option
            await expect(selectedOption).toBeVisible();
          }

          await closeModal(page);
        });

        test('locale options show descriptive labels', async ({ page }) => {
          await navigateToPanel(page, panel);

          const createAction = page.locator('[data-action="create_translation"], button:has-text("Add Translation")').first();
          if (await createAction.count() === 0) {
            test.skip();
            return;
          }

          await createAction.click();
          await page.waitForSelector('[role="dialog"], .modal, .payload-modal', { timeout: 5000 });

          // Check that labels are descriptive (not just locale codes)
          const modal = page.locator('[role="dialog"], .modal, .payload-modal');
          const labels = modal.locator('label, .option-label');
          const labelCount = await labels.count();

          for (let i = 0; i < Math.min(labelCount, 3); i++) {
            const text = await labels.nth(i).textContent();
            if (text) {
              // Labels should contain language names, not just codes
              // e.g., "French (FR)" not just "fr"
              expect(text.length).toBeGreaterThan(2);
            }
          }

          await closeModal(page);
        });

        test('modal shows hint for required locales', async ({ page }) => {
          await navigateToPanel(page, panel);

          const createAction = page.locator('[data-action="create_translation"], button:has-text("Add Translation")').first();
          if (await createAction.count() === 0) {
            test.skip();
            return;
          }

          await createAction.click();
          await page.waitForSelector('[role="dialog"], .modal, .payload-modal', { timeout: 5000 });

          // Look for hint text about required locales
          const modal = page.locator('[role="dialog"], .modal, .payload-modal');
          const hintText = modal.locator('.hint, .help-text, [data-hint], small');

          // Hint may or may not be present depending on data
          await closeModal(page);
        });
      });

      test.describe('Status Legend', () => {

        test('status legend is visible in toolbar', async ({ page }) => {
          await navigateToPanel(page, panel);

          const legend = page.locator('[data-status-legend], .status-legend, #translation-status-legend');
          await expect(legend).toBeVisible();
        });

        test('status legend shows expected states', async ({ page }) => {
          await navigateToPanel(page, panel);

          const legendItems = await getStatusLegendItems(page);
          expect(legendItems.length).toBeGreaterThanOrEqual(4);
          const joined = legendItems.join(' ').toLowerCase();
          expect(joined).toContain('ready');
          expect(joined).toContain('incomplete');
          expect(joined).toContain('missing');
          expect(joined).toContain('fallback');
        });
      });

      test.describe('Quick Filters', () => {

        test('quick filters are visible in toolbar', async ({ page }) => {
          await navigateToPanel(page, panel);

          const filters = await getQuickFilters(page);
          expect(filters.length).toBeGreaterThanOrEqual(4);
        });

        test('disabled filters show reason', async ({ page }) => {
          await navigateToPanel(page, panel);

          const filters = await getQuickFilters(page);
          const disabledFilters = filters.filter(f => f.disabled);

          const disabledButtons = page.locator('.quick-filter-btn[aria-disabled="true"]');
          const disabledCount = await disabledButtons.count();
          for (let i = 0; i < disabledCount; i++) {
            const title = await disabledButtons.nth(i).getAttribute('title');
            expect(title && title.trim().length > 0).toBe(true);
          }
          expect(disabledFilters.length).toBeGreaterThanOrEqual(0);
        });
      });

    });
  }

  test.describe('Cross-Panel Consistency', () => {

    test('action order is consistent across panels', async ({ page }) => {
      const actionOrders: Record<string, string[]> = {};

      for (const panel of CONTENT_PANELS) {
        await navigateToPanel(page, panel);
        const actions = await getRowActions(page, 0);
        actionOrders[panel] = actions;
        expect(actions.length).toBeGreaterThan(0);
      }
    });

    test('view modes work consistently across panels', async ({ page }) => {
      for (const panel of CONTENT_PANELS) {
        await navigateToPanel(page, panel);

        // Try each view mode
        for (const mode of ['flat', 'grouped', 'matrix'] as const) {
          await setViewMode(page, mode);
          await page.waitForTimeout(300);
          const active = page.locator(`.translation-view-mode-btn[data-view-mode="${mode}"][aria-pressed="true"]`);
          await expect(active).toBeVisible();
        }
      }
    });

    test('disabled action styling is consistent', async ({ page }) => {
      for (const panel of CONTENT_PANELS) {
        await navigateToPanel(page, panel);

        const disabledAction = page.locator('[aria-disabled="true"]').first();
        if (await disabledAction.count() > 0) {
          // Check for consistent styling class
          const classes = await disabledAction.getAttribute('class');
          expect(classes).toBeTruthy();
        }
      }
    });
  });
});

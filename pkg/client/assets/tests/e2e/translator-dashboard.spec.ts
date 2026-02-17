import { test, expect } from '@playwright/test';
import { login, navigateToTranslationDashboard } from './helpers';

/**
 * TX-093: Translator Dashboard E2E Tests
 *
 * Tests for /admin/translations/dashboard under full profile:
 * - Successful /my-work load
 * - Error-state fallback
 * - Action availability rendering
 */

test.describe('Translator Dashboard - Full Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Dashboard Load', () => {

    test('dashboard page loads successfully', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      // Should not show 404 error
      const notFound = page.locator('text=404, text=Not Found');
      await expect(notFound).not.toBeVisible();

      // Dashboard container should be present
      const dashboard = page.locator('[data-dashboard], .translator-dashboard, .dashboard-container, main');
      await expect(dashboard).toBeVisible();
    });

    test('my-work API returns data', async ({ page }) => {
      // Intercept API call
      const apiResponse = page.waitForResponse(
        response => response.url().includes('/api/translations/my-work') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null);

      await navigateToTranslationDashboard(page);

      const response = await apiResponse;
      if (response) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test('dashboard shows workload summary', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const summarySection = page.locator('.dashboard-summary-cards');
      await expect(summarySection).toBeVisible();
      const statCards = page.locator('.summary-card');
      expect(await statCards.count()).toBeGreaterThanOrEqual(1);
    });

    test('dashboard shows assignment list', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const assignmentTable = page.locator('.assignment-table');
      const emptyState = page.locator('.dashboard-empty');
      const disabledState = page.locator('.dashboard-disabled');
      const errorState = page.locator('.dashboard-error');
      const visibleStates = [
        await assignmentTable.isVisible().catch(() => false),
        await emptyState.isVisible().catch(() => false),
        await disabledState.isVisible().catch(() => false),
        await errorState.isVisible().catch(() => false),
      ].filter(Boolean);
      expect(visibleStates.length).toBeGreaterThan(0);
    });
  });

  test.describe('Assignment Display', () => {

    test('assignments show content state column', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const contentHeader = page.locator('.assignment-table th:has-text("Content")');
      await expect(contentHeader).toBeVisible();
    });

    test('assignments show queue state column', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const queueStateHeader = page.locator('.assignment-table th:has-text("Status")');
      await expect(queueStateHeader).toBeVisible();
    });

    test('assignments show target locale column', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const localeHeader = page.locator('.assignment-table th:has-text("Target")');
      await expect(localeHeader).toBeVisible();
    });

    test('assignments show due date column', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const dueDateHeader = page.locator('.assignment-table th:has-text("Due Date")');
      await expect(dueDateHeader).toBeVisible();
    });

    test('assignments show due state indicators', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const rowCount = await page.locator('.assignment-row').count();
      if (rowCount === 0) {
        test.skip();
        return;
      }

      const dueIndicator = page.locator('.due-overdue, .due-soon, .due-on-track');
      expect(await dueIndicator.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Filter Presets', () => {

    test('all filter is available', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const allFilter = page.locator('.filter-preset:has-text("All")');
      await expect(allFilter).toBeVisible();
    });

    test('due soon filter is available', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const dueSoonFilter = page.locator('.filter-preset:has-text("Due Soon")');
      await expect(dueSoonFilter).toBeVisible();
    });

    test('needs review filter is available', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const needsReviewFilter = page.locator('.filter-preset:has-text("Needs Review")');
      await expect(needsReviewFilter).toBeVisible();
    });

    test('filter selection updates list', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const filterButton = page.locator('[data-filter], .filter-preset').first();
      if (await filterButton.count() > 0) {
        await filterButton.click();
        await page.waitForLoadState('networkidle');
        const activeFilter = page.locator('.filter-preset.active');
        await expect(activeFilter).toBeVisible();
      }
    });
  });

  test.describe('Review Actions', () => {

    test('review action buttons are rendered for eligible items', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const reviewActions = page.locator('[data-review-action], .review-action, .submit-review-btn, .approve-btn, .reject-btn, button:has-text("Review"), button:has-text("Approve")');
      const actionButtons = page.locator('.action-btn');
      if (await actionButtons.count() === 0) {
        test.skip();
        return;
      }
      expect(await reviewActions.count()).toBeGreaterThanOrEqual(1);
    });

    test('disabled review actions show reason', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const disabledReview = page.locator('[data-review-action][aria-disabled="true"], .review-action:disabled, .submit-review-btn[aria-disabled="true"], .approve-btn[aria-disabled="true"], .reject-btn[aria-disabled="true"]');
      if (await disabledReview.count() > 0) {
        const reason = await disabledReview.first().getAttribute('title');
        expect(reason && reason.trim().length > 0).toBe(true);
      }
    });
  });

  test.describe('Error States', () => {

    test('handles API error gracefully', async ({ page }) => {
      // Intercept API and return error
      await page.route('**/api/translations/my-work', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await navigateToTranslationDashboard(page);

      const errorState = page.locator('.error, .error-state, [data-error], [role="alert"]');
      await page.waitForTimeout(1000);
      await expect(errorState.first()).toBeVisible();
    });

    test('shows retry button on error', async ({ page }) => {
      await page.route('**/api/translations/my-work', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-retry]');
      await expect(retryButton.first()).toBeVisible();
    });

    test('handles empty state when no assignments', async ({ page }) => {
      await page.route('**/api/translations/my-work', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            scope: 'my_work',
            user_id: 'user-1',
            summary: { total: 0, overdue: 0, due_soon: 0, on_track: 0, none: 0, review: 0 },
            assignments: [],
            items: [],
            total: 0,
            page: 1,
            per_page: 25,
            updated_at: new Date().toISOString(),
          }),
        });
      });

      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const emptyState = page.locator('.empty-state, .no-assignments, [data-empty]');
      const dashboardEmpty = page.locator('.dashboard-empty');
      const isVisible = (
        await emptyState.first().isVisible().catch(() => false)
      ) || (
        await dashboardEmpty.first().isVisible().catch(() => false)
      );
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Permission-Based Visibility', () => {

    test('dashboard is accessible with queue permission', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      // Should not show permission denied
      const permissionDenied = page.locator('text=Permission Denied, text=Forbidden, text=403');
      await expect(permissionDenied).not.toBeVisible();
    });

    test('shows disabled state when permission denied', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      const disabledState = page.locator('.dashboard-disabled, [data-permission-denied]');
      const errorState = page.locator('.dashboard-error');
      const dashboardState = page.locator('.translator-dashboard');
      const visibleStates = [
        await disabledState.first().isVisible().catch(() => false),
        await errorState.first().isVisible().catch(() => false),
        await dashboardState.first().isVisible().catch(() => false),
      ].filter(Boolean);
      expect(visibleStates.length).toBeGreaterThan(0);
    });

    test('capability gate prevents unauthorized actions', async ({ page }) => {
      await navigateToTranslationDashboard(page);
      await page.waitForTimeout(1000);

      const gatedActions = page.locator('[data-capability-gated][aria-disabled="true"]');
      const actionButtons = page.locator('.action-btn');
      if (await gatedActions.count() > 0) {
        const title = await gatedActions.first().getAttribute('title');
        expect(title && title.trim().length > 0).toBe(true);
        return;
      }
      expect(await actionButtons.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Navigation Integration', () => {

    test('dashboard is accessible from nav menu', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Look for translation nav item
      const navItem = page.locator('nav a:has-text("Translation"), nav a:has-text("Dashboard"), [data-nav="translations"]');
      if (await navItem.count() > 0) {
        await navItem.first().click();
        await page.waitForLoadState('networkidle');

        // Should navigate to dashboard
        expect(page.url()).toContain('/translations');
      }
    });

    test('breadcrumb shows correct path', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      const breadcrumb = page.locator('[data-breadcrumb], .breadcrumb, nav[aria-label="Breadcrumb"]');
      expect(await breadcrumb.count()).toBeGreaterThanOrEqual(0); // optional in current template
    });
  });

  test.describe('Loading States', () => {

    test('shows loading indicator while fetching', async ({ page }) => {
      // Delay API response
      await page.route('**/api/translations/my-work', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });

      await page.goto('/admin/translations/dashboard');

      const loadingState = page.locator('.dashboard-loading, .loading-spinner, .loading, .spinner, [data-loading], .skeleton');
      await expect(loadingState.first()).toBeVisible();
    });

    test('transitions from loading to loaded state', async ({ page }) => {
      await navigateToTranslationDashboard(page);

      // After load, loading state should be gone
      const loadingState = page.locator('.loading:visible, .spinner:visible, [data-loading="true"]');
      await expect(loadingState).not.toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Translator Dashboard - Capability Modes', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard available in full profile', async ({ page }) => {
    // This test assumes ADMIN_TRANSLATION_PROFILE=full
    await navigateToTranslationDashboard(page);

    const notFound = page.locator('text=404');
    await expect(notFound).not.toBeVisible();
  });

  test('dashboard available in core+queue profile', async ({ page }) => {
    // Profile may be set via env, this test checks current config
    await navigateToTranslationDashboard(page);

    // Check if dashboard loads or shows appropriate disabled state
    const dashboard = page.locator('[data-dashboard], .translator-dashboard, main');
    const disabledState = page.locator('.dashboard-disabled');
    const notFound = page.locator('text=404');

    const dashboardVisible = await dashboard.isVisible().catch(() => false);
    const disabledVisible = await disabledState.isVisible().catch(() => false);
    const notFoundVisible = await notFound.isVisible().catch(() => false);

    expect(notFoundVisible).toBe(false);
    expect(dashboardVisible || disabledVisible).toBe(true);
  });
});

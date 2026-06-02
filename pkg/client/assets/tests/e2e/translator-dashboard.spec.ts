import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login, navigateToTranslationDashboard } from './helpers';

const dashboardFixtures = JSON.parse(
  readFileSync(new URL('../../../../../admin/testdata/translation_dashboard_contract_fixtures.json', import.meta.url), 'utf8')
);

function fixtureState(name: 'empty' | 'healthy' | 'degraded' | 'alert_triggering') {
  return JSON.parse(JSON.stringify(dashboardFixtures.states[name]));
}

test.describe('Translation Dashboard - Manager Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('renders manager cards and healthy empty tables from fixtures', async ({ page }) => {
    await page.route('**/admin/api/translations/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureState('healthy')),
      });
    });

    await navigateToTranslationDashboard(page);

    await expect(page.locator('[data-dashboard-toolbar="true"]')).toBeVisible();
    // After polish, cards show short labels with full context in title
    const myTasksCard = page.locator('[data-dashboard-card="my_tasks"]');
    await expect(myTasksCard).toBeVisible();
    await expect(myTasksCard).toContainText('Tasks');
    await expect(myTasksCard).toHaveAttribute('title', /My Tasks/);
    await expect(page.locator('[data-dashboard-table="top_overdue_assignments"]')).toBeVisible();
    await expect(page.locator('[data-dashboard-table="top_overdue_assignments"]')).toContainText('Showing 0 of 0');
    await expect(page.locator('[data-dashboard-link="assignment"]')).toHaveCount(0);
    await expect(page.locator('[data-dashboard-refresh-button]').first()).toBeVisible();
  });

  test('renders explicit empty state messaging for cleared scopes', async ({ page }) => {
    await page.route('**/admin/api/translations/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureState('empty')),
      });
    });

    await navigateToTranslationDashboard(page);

    await expect(page.locator('[data-dashboard-empty="true"]')).toBeVisible();
    await expect(page.locator('[data-dashboard-empty="true"]')).toContainText('This scope is clear right now.');
    await expect(page.locator('[data-dashboard-refresh-button]').first()).toBeVisible();
  });

  test('renders degraded-data messaging and blocked-family actions', async ({ page }) => {
    await page.route('**/admin/api/translations/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureState('degraded')),
      });
    });

    await navigateToTranslationDashboard(page);

    await expect(page.locator('[data-dashboard-degraded="true"]')).toBeVisible();
    // After polish, raw alert codes like DEGRADED_DATA are not visible text
    // Alert information is shown through the summary banner with human-readable labels
    const alertBanner = page.locator('[data-dashboard-alerts-section="true"]');
    await expect(alertBanner).toBeVisible();
    // Verify alert code is in data attribute but not visible text
    await expect(page.locator('[data-alert-code="DEGRADED_DATA"]')).toBeAttached();
    // Verify blocked families card is present (tables may be in tabs)
    await expect(page.locator('[data-dashboard-card="blocked_families"]')).toBeVisible();
  });

  test('retry recovers from an initial dashboard failure', async ({ page }) => {
    let call = 0;
    await page.route('**/admin/api/translations/dashboard**', async (route) => {
      call += 1;
      if (call === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: {
            'x-request-id': 'req-503',
          },
          body: JSON.stringify({ error: 'dashboard offline' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureState('alert_triggering')),
      });
    });

    await navigateToTranslationDashboard(page);

    await expect(page.locator('[data-dashboard-error="true"]')).toBeVisible();
    await page.locator('[data-dashboard-refresh-button]').first().click();
    await expect(page.locator('[data-dashboard="true"]')).toBeVisible();
    await expect(page.locator('[data-dashboard-inline-error="true"]')).toHaveCount(0);
    // After polish, cards show short labels with full context in title
    const blockedCard = page.locator('[data-dashboard-card="blocked_families"]');
    await expect(blockedCard).toBeVisible();
    await expect(blockedCard).toContainText('Blocked');
    await expect(blockedCard).toHaveAttribute('title', /Blocked Families/);
  });

  test('blocked-family drilldown opens the families UI page instead of the API feed', async ({ page }) => {
    await page.route('**/admin/api/translations/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureState('alert_triggering')),
      });
    });
    await navigateToTranslationDashboard(page);

    const blockedDrilldown = page.locator('[data-dashboard-drilldown="blocked_families"]').first();
    await expect(blockedDrilldown).toHaveAttribute('href', /^\/admin\/translations\/families\b/);
    await expect(blockedDrilldown).not.toHaveAttribute('href', /\/admin\/api\//);
    await blockedDrilldown.click();

    await expect(page).toHaveURL(/\/admin\/translations\/families\?readiness_state=blocked/);
    expect(new URL(page.url()).pathname).not.toContain('/admin/api/');
  });
});

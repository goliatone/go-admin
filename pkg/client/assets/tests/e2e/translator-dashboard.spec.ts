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
    await expect(page.locator('[data-dashboard-card="my_tasks"]')).toContainText('My Tasks');
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
    await expect(page.locator('[data-dashboard-alerts="true"]')).toContainText('DEGRADED_DATA');
    await expect(page.locator('[data-dashboard-table="blocked_families"] [data-dashboard-link="family"]').first()).toBeVisible();
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
    await expect(page.locator('[data-dashboard-card="blocked_families"]')).toContainText('Blocked Families');
  });
});

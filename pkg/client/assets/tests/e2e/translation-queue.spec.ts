import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login, navigateToTranslationQueue } from './helpers';

const fixturePath = new URL('../../../../../admin/testdata/translation_queue_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));

test.describe('Translation Queue MVP', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('open claim release path works from the queue screen', async ({ page }) => {
    await navigateToTranslationQueue(page);

    const claimButton = page.locator('[data-action="claim"]:not([disabled])').first();
    await expect(claimButton).toBeVisible();
    const assignmentId = await claimButton.getAttribute('data-assignment-id');
    expect(assignmentId).toBeTruthy();

    await claimButton.click();
    await expect(page.locator('[data-feedback-kind="success"]')).toContainText('Assignment claimed');

    const row = page.locator(`[data-assignment-id="${assignmentId}"]`);
    await expect(row).toContainText('In Progress');

    const releaseButton = row.locator('[data-action="release"]:not([disabled])').first();
    await expect(releaseButton).toBeVisible();
    await releaseButton.click();

    await expect(page.locator('[data-feedback-kind="success"]')).toContainText('released back to the pool');
    await expect(row).toContainText('Pending');
  });

  test('disabled action reason parity uses the published backend fixture contract', async ({ page }) => {
    await page.route('**/api/translations/assignments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meta: {
            ...fixtures.states.permission_denied.meta,
            ...fixtures.meta,
          },
          data: fixtures.states.permission_denied.data,
        }),
      });
    });

    await navigateToTranslationQueue(page);

    const disabledClaim = page.locator('[data-action="claim"][disabled]').first();
    await expect(disabledClaim).toBeVisible();
    await expect(disabledClaim).toHaveAttribute('title', /missing permission: admin\.translations\.claim/);
    await expect(disabledClaim).toHaveAttribute('aria-disabled', 'true');
  });
});

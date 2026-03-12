import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from './helpers';

const fixturePath = new URL('../../../../../admin/testdata/translation_editor_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));
const assignmentID = 'tqa_editor';

test.describe('Translation Assignment Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('save draft flow renders the full editor and persists changes', async ({ page }) => {
    await page.route(`**/api/translations/assignments/${assignmentID}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.detail),
      });
    });
    await page.route('**/api/translations/variants/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.variant_update),
      });
    });

    await page.goto(`/admin/translations/assignments/${assignmentID}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-translation-editor="true"]')).toBeVisible();
    await expect(page.locator('[data-history-entry="comment:last_rejection_reason"]')).toBeVisible();
    await expect(page.locator('text=homepage-brief.pdf')).toBeVisible();

    await page.locator('[data-field-input="title"]').fill('Guide de publication');
    await page.locator('[data-action="save-draft"]').click();

    await expect(page.locator('[data-editor-feedback-kind="success"]')).toContainText('Draft saved');
    await expect(page.locator('[data-autosave-state="saved"]')).toContainText('Draft saved');
  });

  test('autosave conflict shows a recoverable banner', async ({ page }) => {
    await page.route(`**/api/translations/assignments/${assignmentID}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.detail),
      });
    });
    await page.route('**/api/translations/variants/*', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.autosave_conflict),
      });
    });

    await page.goto(`/admin/translations/assignments/${assignmentID}/edit`);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-field-input="body"]').fill('Conflit autosave');
    await page.waitForTimeout(900);

    await expect(page.locator('[data-editor-feedback-kind="conflict"]')).toContainText('Autosave conflict');
    await expect(page.locator('[data-action="reload-server-state"]')).toBeVisible();
    await expect(page.locator('[data-autosave-state="conflict"]')).toContainText('Conflict detected');
  });

  test('submit for review supports auto-approve response', async ({ page }) => {
    await page.route(`**/api/translations/assignments/${assignmentID}*`, async (route) => {
      const url = route.request().url();
      if (url.includes('/actions/submit_review')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.no_review_auto_approve),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.detail),
      });
    });
    await page.route('**/api/translations/variants/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.variant_update),
      });
    });

    await page.goto(`/admin/translations/assignments/${assignmentID}/edit`);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-action="submit-review"]').click();

    await expect(page.locator('[data-editor-feedback-kind="success"]')).toContainText('auto-approved');
  });
});

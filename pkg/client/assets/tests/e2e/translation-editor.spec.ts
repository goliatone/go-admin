import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login } from './helpers';

const fixturePath = new URL('../../../../../admin/testdata/translation_editor_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));
const assignmentID = 'tqa_editor';

function makeSubmitReadyFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.qa_results = {
    ...next.data.qa_results,
    findings: [],
    submit_blocked: false,
    summary: {
      finding_count: 0,
      warning_count: 0,
      blocker_count: 0,
    },
    categories: {
      style: {
        ...next.data.qa_results.categories.style,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
      terminology: {
        ...next.data.qa_results.categories.terminology,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
    },
  };
  return next;
}

function makeReviewReadyFixture() {
  const next = makeSubmitReadyFixture();
  next.data.status = 'review';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'review',
    queue_state: 'review',
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    submit_review: {
      ...next.data.assignment_action_states.submit_review,
      enabled: false,
      reason: 'assignment must be in review',
      reason_code: 'INVALID_STATUS',
    },
  };
  next.data.review_action_states = {
    ...next.data.review_action_states,
    approve: {
      enabled: true,
      permission: 'admin.translations.approve',
    },
    reject: {
      enabled: true,
      permission: 'admin.translations.approve',
    },
    archive: {
      enabled: true,
      permission: 'admin.translations.manage',
    },
  };
  return next;
}

function makeAutosaveConflictFixture() {
  return {
    error: {
      text_code: 'VERSION_CONFLICT',
      message: 'translation variant version conflict',
      metadata: {
        actual_version: 3,
        latest_server_state_record: {
          row_version: 3,
          fields: {
            title: 'Guide de publication serveur',
          },
        },
      },
    },
  };
}

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
        body: JSON.stringify(makeAutosaveConflictFixture()),
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
        body: JSON.stringify(makeSubmitReadyFixture()),
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

  test('qa blockers keep submit disabled and expose a blocker message', async ({ page }) => {
    await page.route(`**/api/translations/assignments/${assignmentID}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.detail),
      });
    });

    await page.goto(`/admin/translations/assignments/${assignmentID}/edit`);
    await page.waitForLoadState('networkidle');

    const submitButton = page.locator('[data-action="submit-review"]');
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveAttribute('title', /Resolve QA blockers before submitting for review\./);
    await expect(page.locator('text=Submit is blocked until blockers are resolved.')).toBeVisible();
    await expect(page.locator('[data-editor-panel="review-actions"]')).toHaveCount(0);
    await expect(page.locator('[data-editor-panel="management-actions"]')).toBeVisible();
  });

  test('review assignments render review and management actions separately', async ({ page }) => {
    let detailLoads = 0;
    await page.route(`**/api/translations/assignments/${assignmentID}*`, async (route) => {
      const url = route.request().url();
      if (url.includes('/actions/approve')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.review_approve),
        });
        return;
      }
      detailLoads += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detailLoads === 1 ? makeReviewReadyFixture() : makeSubmitReadyFixture()),
      });
    });

    await page.goto(`/admin/translations/assignments/${assignmentID}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-editor-panel="review-actions"]')).toBeVisible();
    await expect(page.locator('[data-editor-panel="management-actions"]')).toBeVisible();
    await expect(page.locator('[data-editor-panel="review-actions"] [data-action="approve"]')).toBeVisible();
    await expect(page.locator('[data-editor-panel="review-actions"] [data-action="reject"]')).toBeVisible();
    await expect(page.locator('[data-editor-panel="management-actions"] [data-action="archive"]')).toBeVisible();

    await page.locator('[data-editor-panel="review-actions"] [data-action="approve"]').click();

    await expect(page.locator('[data-editor-feedback-kind="success"]')).toContainText('Assignment approved');
    await expect(page.locator('[data-editor-panel="review-actions"]')).toHaveCount(0);
    await expect(page.locator('[data-editor-panel="management-actions"]')).toBeVisible();
  });
});

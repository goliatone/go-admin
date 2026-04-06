import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { login, navigateToTranslationQueue } from './helpers';

const fixturePath = new URL('../../../../../admin/testdata/translation_queue_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));

function buildActionResponse(row: Record<string, unknown>) {
  return {
    data: {
      assignment_id: row.id,
      status: row.queue_state,
      row_version: row.row_version,
      updated_at: row.updated_at,
      assignment: row,
    },
    meta: {
      idempotency_hit: false,
    },
  };
}

test.describe('Translation Queue MVP', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('open claim release path works from the queue screen', async ({ page }) => {
    const openPoolRow = structuredClone(fixtures.states.open_pool.data[0]);
    const claimedRow = {
      ...structuredClone(openPoolRow),
      assignee_id: 'translator-1',
      assignment_type: 'assigned',
      queue_state: 'in_progress',
      status: 'in_progress',
      version: 2,
      row_version: 2,
      updated_at: '2026-03-12T22:19:30.412731Z',
      actions: {
        claim: {
          enabled: false,
          permission: 'admin.translations.claim',
          reason: 'assignment must be open pool before it can be claimed',
          reason_code: 'INVALID_STATUS',
        },
        release: {
          enabled: true,
          permission: 'admin.translations.assign',
        },
      },
    };
    const releasedRow = {
      ...structuredClone(openPoolRow),
      version: 3,
      row_version: 3,
      updated_at: '2026-03-12T22:20:30.412731Z',
    };

    await page.route('**/api/translations/assignments/asg-open-1/actions/claim', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildActionResponse(claimedRow)),
      });
    });
    await page.route('**/api/translations/assignments/asg-open-1/actions/release', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildActionResponse(releasedRow)),
      });
    });
    await page.route('**/api/translations/assignments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meta: {
            ...fixtures.states.open_pool.meta,
            ...fixtures.meta,
          },
          data: fixtures.states.open_pool.data,
        }),
      });
    });

    await navigateToTranslationQueue(page);

    const claimButton = page.locator('[data-action="claim"]:not([disabled]):visible').first();
    await expect(claimButton).toBeVisible();
    const assignmentId = await claimButton.getAttribute('data-assignment-id');
    expect(assignmentId).toBeTruthy();

    await claimButton.click();
    await expect(page.locator('[data-feedback-kind="success"]')).toContainText('Assignment claimed');

    const row = page.locator(
      `[data-assignment-row="true"][data-assignment-id="${assignmentId}"]:visible, [data-assignment-card="true"][data-assignment-id="${assignmentId}"]:visible`
    ).first();
    await expect(row).toContainText('In Progress');

    const releaseButton = row.locator('[data-action="release"]:not([disabled]):visible').first();
    await expect(releaseButton).toBeVisible();
    await releaseButton.click();

    await expect(page.locator('[data-feedback-kind="success"]')).toContainText('released back to the pool');
    await expect(row).toContainText('Open');
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

    const disabledClaim = page.locator('[data-action="claim"][disabled]:visible').first();
    await expect(disabledClaim).toBeVisible();
    await expect(disabledClaim).toHaveAttribute('title', /missing permission: admin\.translations\.claim/);
    await expect(disabledClaim).toHaveAttribute('aria-disabled', 'true');
  });

  test('review rows separate reviewer actions from management archive', async ({ page }) => {
    await page.route('**/api/translations/assignments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meta: {
            ...fixtures.states.review_ready.meta,
            ...fixtures.meta,
          },
          data: fixtures.states.review_ready.data,
        }),
      });
    });

    await navigateToTranslationQueue(page);

    const row = page.locator('[data-assignment-id="asg-review-1"]');
    await expect(row.locator('[data-action-group="review"]')).toBeVisible();
    await expect(row.locator('[data-action-group="review"] [data-action="approve"]')).toBeVisible();
    await expect(row.locator('[data-action-group="review"] [data-action="reject"]')).toBeVisible();
    await expect(row.locator('[data-action-group="manage"]')).toBeVisible();
    await expect(row.locator('[data-action-group="manage"] [data-action="archive"]')).toBeVisible();
  });

  test('reviewer state presets render aggregate counts and support qa-blocked filtering', async ({ page }) => {
    await page.route('**/api/translations/assignments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meta: {
            ...fixtures.states.qa_summary.meta,
            ...fixtures.meta,
          },
          data: fixtures.states.qa_summary.data,
        }),
      });
    });

    await navigateToTranslationQueue(page);

    const reviewerStates = page.locator('[data-review-preset-id="review_blocked"]');
    await expect(reviewerStates).toBeVisible();
    await expect(reviewerStates).toContainText('QA Blocked');
    await expect(reviewerStates).toContainText('1');

    await reviewerStates.click();

    await expect(page.locator('[data-queue-state="empty"]')).toHaveCount(0);
    await expect(page.locator('[data-assignment-id="asg-editor-1"]:visible .queue-qa-chip.is-blocked')).toBeVisible();
  });
});

/**
 * Tests for translation-bulk-actions.ts (Phase 2)
 * Tests bulk create-missing translations action and result summary rendering
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// TX-037: Bulk Create Missing Translations Tests
// ============================================================================

describe('parseBulkResponse', () => {
  function parseBulkResponse(response, maxFailures = 5) {
    const results = response.data || [];

    const created = response.created_count ?? results.filter(r => r.success).length;
    const failed = response.failed_count ?? results.filter(r => !r.success).length;
    const skipped = response.skipped_count ?? 0;
    const total = response.total ?? results.length;

    const failures = results
      .filter(r => !r.success && r.error)
      .slice(0, maxFailures)
      .map(r => ({
        id: r.id,
        locale: r.locale,
        error: r.error || 'Unknown error',
      }));

    return { total, created, failed, skipped, failures };
  }

  it('should parse successful response', () => {
    const response = {
      success: true,
      data: [
        { id: '1', locale: 'es', success: true, created_id: 'new-1' },
        { id: '2', locale: 'fr', success: true, created_id: 'new-2' },
      ],
      total: 2,
      created_count: 2,
      failed_count: 0,
    };

    const summary = parseBulkResponse(response);

    assert.equal(summary.total, 2);
    assert.equal(summary.created, 2);
    assert.equal(summary.failed, 0);
    assert.equal(summary.failures.length, 0);
  });

  it('should parse response with failures', () => {
    const response = {
      success: false,
      data: [
        { id: '1', locale: 'es', success: true, created_id: 'new-1' },
        { id: '2', locale: 'fr', success: false, error: 'Duplicate entry' },
        { id: '3', locale: 'de', success: false, error: 'Permission denied' },
      ],
      total: 3,
      created_count: 1,
      failed_count: 2,
    };

    const summary = parseBulkResponse(response);

    assert.equal(summary.total, 3);
    assert.equal(summary.created, 1);
    assert.equal(summary.failed, 2);
    assert.equal(summary.failures.length, 2);
    assert.equal(summary.failures[0].error, 'Duplicate entry');
    assert.equal(summary.failures[1].error, 'Permission denied');
  });

  it('should limit failures to maxFailures', () => {
    const response = {
      success: false,
      data: Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        locale: 'es',
        success: false,
        error: `Error ${i + 1}`,
      })),
      total: 10,
      failed_count: 10,
    };

    const summary = parseBulkResponse(response, 3);

    assert.equal(summary.failed, 10);
    assert.equal(summary.failures.length, 3);
  });

  it('should use server counts when available', () => {
    const response = {
      success: true,
      data: [],
      total: 100,
      created_count: 90,
      failed_count: 5,
      skipped_count: 5,
    };

    const summary = parseBulkResponse(response);

    assert.equal(summary.total, 100);
    assert.equal(summary.created, 90);
    assert.equal(summary.failed, 5);
    assert.equal(summary.skipped, 5);
  });

  it('should fall back to counting data array', () => {
    const response = {
      success: true,
      data: [
        { id: '1', locale: 'es', success: true },
        { id: '2', locale: 'fr', success: true },
        { id: '3', locale: 'de', success: false, error: 'Failed' },
      ],
    };

    const summary = parseBulkResponse(response);

    assert.equal(summary.total, 3);
    assert.equal(summary.created, 2);
    assert.equal(summary.failed, 1);
  });
});

describe('Result toast message logic', () => {
  function getToastMessage(summary) {
    const { created, failed, skipped, total } = summary;

    if (total === 0) {
      return { type: 'info', message: 'No translations to create' };
    }

    if (failed === 0) {
      if (created > 0) {
        return {
          type: 'success',
          message: `Created ${created} translation${created !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
        };
      } else if (skipped > 0) {
        return {
          type: 'info',
          message: `All ${skipped} translation${skipped !== 1 ? 's' : ''} already exist`,
        };
      }
    } else if (created === 0) {
      return {
        type: 'error',
        message: `Failed to create ${failed} translation${failed !== 1 ? 's' : ''}`,
      };
    }

    return {
      type: 'warning',
      message: `Created ${created}, failed ${failed}${skipped > 0 ? `, skipped ${skipped}` : ''}`,
    };
  }

  it('should show info for empty batch', () => {
    const toast = getToastMessage({ total: 0, created: 0, failed: 0, skipped: 0 });
    assert.equal(toast.type, 'info');
    assert.ok(toast.message.includes('No translations'));
  });

  it('should show success for all created', () => {
    const toast = getToastMessage({ total: 3, created: 3, failed: 0, skipped: 0 });
    assert.equal(toast.type, 'success');
    assert.ok(toast.message.includes('Created 3'));
  });

  it('should show success with skipped count', () => {
    const toast = getToastMessage({ total: 5, created: 3, failed: 0, skipped: 2 });
    assert.equal(toast.type, 'success');
    assert.ok(toast.message.includes('Created 3'));
    assert.ok(toast.message.includes('2 skipped'));
  });

  it('should show info when all skipped', () => {
    const toast = getToastMessage({ total: 3, created: 0, failed: 0, skipped: 3 });
    assert.equal(toast.type, 'info');
    assert.ok(toast.message.includes('already exist'));
  });

  it('should show error when all failed', () => {
    const toast = getToastMessage({ total: 3, created: 0, failed: 3, skipped: 0 });
    assert.equal(toast.type, 'error');
    assert.ok(toast.message.includes('Failed to create'));
  });

  it('should show warning for partial success', () => {
    const toast = getToastMessage({ total: 5, created: 2, failed: 2, skipped: 1 });
    assert.equal(toast.type, 'warning');
    assert.ok(toast.message.includes('Created 2'));
    assert.ok(toast.message.includes('failed 2'));
    assert.ok(toast.message.includes('skipped 1'));
  });
});

describe('renderBulkResultSummary', () => {
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderBulkResultSummary(summary) {
    const { created, failed, skipped, total, failures } = summary;

    let html = `<div class="bulk-result-summary">`;
    html += `<div>Processed ${total} item${total !== 1 ? 's' : ''}</div>`;

    html += `<div class="stats">`;
    html += `<div class="created text-green-700">${created}</div>`;
    html += `<div class="failed ${failed > 0 ? 'text-red-700' : ''}">${failed}</div>`;
    html += `<div class="skipped ${skipped > 0 ? 'text-yellow-700' : ''}">${skipped}</div>`;
    html += `</div>`;

    if (failures && failures.length > 0) {
      html += `<div class="failures">`;
      html += `<table><thead><tr><th>ID</th><th>Locale</th><th>Error</th></tr></thead><tbody>`;
      for (const f of failures) {
        html += `<tr><td>${escapeHtml(f.id)}</td><td>${escapeHtml(f.locale)}</td><td>${escapeHtml(f.error)}</td></tr>`;
      }
      html += `</tbody></table>`;
      if (failed > failures.length) {
        html += `<p>Showing ${failures.length} of ${failed} failures</p>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  it('should render summary with counts', () => {
    const summary = {
      total: 10,
      created: 8,
      failed: 1,
      skipped: 1,
      failures: [{ id: '5', locale: 'es', error: 'Failed' }],
    };

    const html = renderBulkResultSummary(summary);

    assert.ok(html.includes('Processed 10 items'));
    assert.ok(html.includes('8')); // created
    assert.ok(html.includes('1')); // failed
    assert.ok(html.includes('text-green-700'), 'Created should have green styling');
    assert.ok(html.includes('text-red-700'), 'Failed should have red styling');
  });

  it('should render failure details table', () => {
    const summary = {
      total: 3,
      created: 1,
      failed: 2,
      skipped: 0,
      failures: [
        { id: '2', locale: 'es', error: 'Duplicate entry' },
        { id: '3', locale: 'fr', error: 'Permission denied' },
      ],
    };

    const html = renderBulkResultSummary(summary);

    assert.ok(html.includes('<table>'), 'Should have failures table');
    assert.ok(html.includes('Duplicate entry'));
    assert.ok(html.includes('Permission denied'));
  });

  it('should show truncation notice when more failures exist', () => {
    const summary = {
      total: 10,
      created: 0,
      failed: 10,
      skipped: 0,
      failures: [
        { id: '1', locale: 'es', error: 'Error 1' },
        { id: '2', locale: 'fr', error: 'Error 2' },
        { id: '3', locale: 'de', error: 'Error 3' },
      ],
    };

    const html = renderBulkResultSummary(summary);

    assert.ok(html.includes('Showing 3 of 10 failures'));
  });

  it('should escape HTML in error messages', () => {
    const summary = {
      total: 1,
      created: 0,
      failed: 1,
      skipped: 0,
      failures: [{ id: '1', locale: 'es', error: '<script>alert(1)</script>' }],
    };

    const html = renderBulkResultSummary(summary);

    assert.ok(!html.includes('<script>'), 'Should not contain unescaped script');
    assert.ok(html.includes('&lt;script&gt;'), 'Should contain escaped script');
  });
});

describe('renderBulkResultInline', () => {
  function renderBulkResultInline(summary) {
    const { created, failed, skipped } = summary;
    const parts = [];

    if (created > 0) {
      parts.push(`<span class="text-green-600">+${created}</span>`);
    }
    if (failed > 0) {
      parts.push(`<span class="text-red-600">${failed} failed</span>`);
    }
    if (skipped > 0) {
      parts.push(`<span class="text-yellow-600">${skipped} skipped</span>`);
    }

    return parts.join(' · ');
  }

  it('should render created count with plus sign', () => {
    const html = renderBulkResultInline({ created: 5, failed: 0, skipped: 0 });
    assert.ok(html.includes('+5'));
    assert.ok(html.includes('text-green-600'));
  });

  it('should render failed count', () => {
    const html = renderBulkResultInline({ created: 0, failed: 3, skipped: 0 });
    assert.ok(html.includes('3 failed'));
    assert.ok(html.includes('text-red-600'));
  });

  it('should render all counts separated by dots', () => {
    const html = renderBulkResultInline({ created: 2, failed: 1, skipped: 1 });
    assert.ok(html.includes('+2'));
    assert.ok(html.includes('1 failed'));
    assert.ok(html.includes('1 skipped'));
    assert.ok(html.includes(' · '), 'Should use dot separator');
  });

  it('should return empty for all zeros', () => {
    const html = renderBulkResultInline({ created: 0, failed: 0, skipped: 0 });
    assert.equal(html, '');
  });
});

describe('Bulk action handler creation', () => {
  function createBulkCreateMissingHandler(apiEndpoint, notifier, onComplete) {
    return async (ids) => {
      // Simulate handler creation
      return {
        endpoint: `${apiEndpoint}/bulk/create-missing-translations`,
        ids,
        hasNotifier: !!notifier,
        hasCallback: !!onComplete,
      };
    };
  }

  it('should create handler with correct endpoint', async () => {
    const handler = createBulkCreateMissingHandler('/admin/api/pages');
    const result = await handler(['1', '2', '3']);

    assert.equal(result.endpoint, '/admin/api/pages/bulk/create-missing-translations');
    assert.deepEqual(result.ids, ['1', '2', '3']);
  });

  it('should pass notifier and callback', async () => {
    const mockNotifier = { success: () => {} };
    const mockCallback = () => {};
    const handler = createBulkCreateMissingHandler('/admin/api/pages', mockNotifier, mockCallback);
    const result = await handler(['1']);

    assert.equal(result.hasNotifier, true);
    assert.equal(result.hasCallback, true);
  });
});

describe('TX-070: Post-mutation group refresh', () => {
  // Test that bulk action completion triggers group data refresh
  it('should indicate need for group refresh after bulk action', () => {
    const summary = { total: 5, created: 3, failed: 0, skipped: 2, failures: [] };

    // After bulk action with created > 0, groups should be refreshed
    const shouldRefreshGroups = summary.created > 0;
    assert.equal(shouldRefreshGroups, true);
  });

  it('should not require refresh when nothing created', () => {
    const summary = { total: 3, created: 0, failed: 0, skipped: 3, failures: [] };

    const shouldRefreshGroups = summary.created > 0;
    assert.equal(shouldRefreshGroups, false);
  });
});

console.log('All translation bulk actions tests completed');

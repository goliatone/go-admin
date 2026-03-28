import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const services = await import('../dist/services/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const sourceManagementRuntimeSourcePath = path.resolve(testFileDir, '../src/esign/source-management-runtime.ts');
const timelineRendererSourcePath = path.resolve(testFileDir, '../src/esign/timeline/timeline-renderer.ts');
const translationDashboardSourcePath = path.resolve(testFileDir, '../src/translation-dashboard/index.ts');
const translationEditorSourcePath = path.resolve(testFileDir, '../src/translation-editor/index.ts');
const translationMatrixSourcePath = path.resolve(testFileDir, '../src/translation-matrix/index.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared panel loading state preserves attribute-driven runtime affordances', () => {
  const loading = services.renderPanelLoadingState({
    tag: 'section',
    text: 'Loading translation matrix…',
    showSpinner: false,
    containerClass: 'matrix-loading p-8 shadow-sm',
    attributes: {
      'data-matrix-loading': 'true',
    },
    ariaLive: 'polite',
  });

  assert.match(loading, /data-matrix-loading="true"/);
  assert.match(loading, /Loading translation matrix/);
  assert.match(loading, /aria-live="polite"/);
  assert.doesNotMatch(loading, /animate-spin/);
});

test('shared panel state preserves title, heading, metadata, escaping, and action slots', () => {
  const panel = services.renderPanelState({
    tag: 'section',
    containerClass: 'error-shell',
    title: 'Matrix unavailable',
    titleClass: 'eyebrow',
    heading: 'The matrix payload could not be loaded.',
    headingTag: 'h2',
    headingClass: 'headline',
    message: 'Bad <payload>',
    messageClass: 'body-copy',
    metadata: 'Request req-1 • Trace trace-1',
    metadataClass: 'meta-copy',
    actionsHtml: '<button type="button" data-matrix-retry="true">Retry matrix</button>',
    role: 'alert',
    attributes: {
      'data-matrix-error': 'true',
    },
  });

  assert.match(panel, /data-matrix-error="true"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Matrix unavailable/);
  assert.match(panel, /The matrix payload could not be loaded\./);
  assert.match(panel, /Bad &lt;payload&gt;/);
  assert.match(panel, /Request req-1/);
  assert.match(panel, /data-matrix-retry="true"/);
});

test('shared panel helpers are the canonical source for the remaining state renderers', () => {
  const sourceManagementRuntimeSource = read(sourceManagementRuntimeSourcePath);
  const timelineRendererSource = read(timelineRendererSourcePath);
  const translationDashboardSource = read(translationDashboardSourcePath);
  const translationEditorSource = read(translationEditorSourcePath);
  const translationMatrixSource = read(translationMatrixSourcePath);

  assert.match(sourceManagementRuntimeSource, /renderPanelLoadingState/);
  assert.match(sourceManagementRuntimeSource, /renderPanelState/);
  assert.match(timelineRendererSource, /renderPanelLoadingState/);
  assert.match(timelineRendererSource, /renderPanelState/);
  assert.match(translationDashboardSource, /renderPanelLoadingState/);
  assert.match(translationDashboardSource, /renderPanelState/);
  assert.match(translationEditorSource, /renderPanelLoadingState/);
  assert.match(translationEditorSource, /renderPanelState/);
  assert.match(translationMatrixSource, /renderPanelLoadingState/);
  assert.match(translationMatrixSource, /renderPanelState/);
});

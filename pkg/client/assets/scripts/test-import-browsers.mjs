#!/usr/bin/env node

/**
 * Quantitative layout/accessibility gates for the public BulkImportModal.
 *
 * JSDOM has no layout engine, so the compose/review height, scroll ownership,
 * first-row reachability and target-size contracts in REQUIREMENTS R11/R12 can
 * only be proven in a real browser. This harness serves the built public
 * artifacts, drives the fixture through every workflow state, records the
 * measurements, and asserts the recorded gates.
 *
 *   node ./scripts/test-import-browsers.mjs              # assert gates
 *   node ./scripts/test-import-browsers.mjs --baseline   # record only
 */

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const baselineOnly = process.argv.includes('--baseline');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  const path = resolve(root, `.${pathname}`);
  if (!path.startsWith(`${root}/`) || !statSafe(path)) {
    response.writeHead(404).end('not found');
    return;
  }
  response.setHeader('content-type', types.get(extname(path)) || 'application/octet-stream');
  response.end(readFileSync(path));
});

function statSafe(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Evidence identity per REQUIREMENTS R12: never report a dirty tree as released. */
function artifactIdentity() {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  let revision = 'unknown';
  let dirty = true;
  try {
    revision = git('rev-parse', '--short', 'HEAD');
    dirty = git('status', '--porcelain', '--', '.').length > 0;
  } catch {
    // Evidence stays conservative when git metadata is unavailable.
  }
  const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  return {
    lane: 'source-harness',
    note: dirty
      ? 'Dirty local checkout. Source-harness evidence only; not released-version or live host parity.'
      : 'Clean local checkout. Source-harness evidence only; not live host parity.',
    revision,
    dirty,
    clientPackageVersion: version,
    artifact: 'dist-public (public build)',
  };
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 860 },
  laptop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  narrow: { width: 375, height: 812 },
  zoom200: { width: 640, height: 430 },
};

const CSV = { name: 'fixture-contacts-2026-q3.csv', mimeType: 'text/csv', buffer: Buffer.from('first_name,last_name,email\n') };

async function openFixture(page, origin, options = {}) {
  await page.goto(`${origin}/tests/fixtures/import/bulk-import.html`);
  await page.waitForFunction(() => window.importFixtureReady === true);
  await page.evaluate((config) => window.importFixture.configure(config), options);
  await page.evaluate(() => window.importFixture.open());
  await page.locator('[data-go-admin-modal].go-admin-import').waitFor();
}

async function selectFile(page) {
  await page.setInputFiles('[data-go-admin-modal].go-admin-import [data-import-file]', CSV);
  await page.waitForFunction(() => Boolean(document.querySelector('[data-import-file-name]')?.textContent));
}

async function clickPrimary(page) {
  await page.locator('[data-go-admin-modal].go-admin-import [data-import-primary]').click();
}

async function confirmApply(page) {
  await page.locator('[data-modal-confirm]').click();
}

async function settle(page, states) {
  await page.waitForFunction(
    (expected) => expected.includes(document.querySelector('[data-go-admin-modal].go-admin-import')?.dataset.importState || ''),
    states,
    { timeout: 5000 },
  );
}

/** Drive one named workflow state and return its measurements. */
async function driveScenario(page, origin, scenario, viewport, { maximize = false, sources, longCopy = false, rowCount = 12 } = {}) {
  await page.setViewportSize(viewport);
  await openFixture(page, origin, { scenario, sources, longCopy, rowCount });
  if (maximize) await page.locator('[data-import-maximize]').click();

  if (scenario === 'aggregate') {
    const tabs = await page.locator('[data-import-source-tab]').count();
    if (tabs > 1) {
      await page.locator('[data-import-source-tab="1"]').click();
      await page.waitForFunction(() => document.querySelector('[data-import-source-tab="1"]')?.getAttribute('aria-selected') === 'true');
    }
    await clickPrimary(page);
    await settle(page, ['preview-ready']);
  } else if (scenario !== 'idle') {
    await selectFile(page);
    if (scenario !== 'selected') {
      await clickPrimary(page);
      if (scenario === 'previewing') {
        await settle(page, ['previewing']);
      } else {
        await settle(page, ['preview-ready', 'recoverable-error', 'terminal-error']);
        if (['partial', 'complete', 'unknown', 'terminal-error', 'applying'].includes(scenario)) {
          await clickPrimary(page);
          await confirmApply(page);
          await settle(page, scenario === 'applying'
            ? ['applying']
            : ['complete', 'recoverable-error', 'terminal-error']);
        }
      }
    }
  }
  const measurement = await page.evaluate(() => window.importFixture.measure());
  return { ...measurement, scenario, viewport: `${viewport.width}x${viewport.height}`, maximize };
}

const REVIEW_STATES = new Set(['preview-ready', 'applying', 'complete', 'partial', 'unknown', 'truncated', 'ineligible', 'aggregate']);

/** REQUIREMENTS R11/R12 acceptance gates. */
function assertGates(records, failures) {
  const find = (scenario, viewport, maximize = false) =>
    records.find((record) => record.scenario === scenario && record.viewport === viewport && record.maximize === maximize);
  const fail = (message) => failures.push(message);

  for (const record of records) {
    if (record.dropzone?.bothShown) {
      fail(`${record.scenario}@${record.viewport}: empty and selected dropzone content render together`);
    }
    if (!record.dialogWithinViewport) {
      fail(`${record.scenario}@${record.viewport}${record.maximize ? ' maximized' : ''}: dialog escapes the visual viewport`);
    }
    if (REVIEW_STATES.has(record.scenario)) {
      if (record.phase !== 'review') fail(`${record.scenario}@${record.viewport}: expected data-import-phase="review", got ${record.phase}`);
      if (!record.bannerVisible) fail(`${record.scenario}@${record.viewport}: result banner is not visible inside the modal body`);
      if (record.nestedVerticalScroll) fail(`${record.scenario}@${record.viewport}: review has a nested body+report vertical scroll trap`);
    }
    if (record.primary && record.primary.disabled && /preview/i.test(record.primary.text) && ['complete', 'partial', 'terminal-error'].includes(record.scenario)) {
      fail(`${record.scenario}@${record.viewport}: settled state still shows a disabled Preview primary`);
    }
    if (record.primary && record.primary.height < 32 && record.viewport !== '375x812') {
      fail(`${record.scenario}@${record.viewport}: primary action target is ${record.primary.height}px (min 32px)`);
    }
    if (record.primary && record.viewport === '375x812' && record.primary.height < 44) {
      fail(`${record.scenario}@${record.viewport}: narrow primary action target is ${record.primary.height}px (min 44px)`);
    }
    if (record.dismissTarget && (record.dismissTarget.height < 32 || record.dismissTarget.width < 32)) {
      fail(`${record.scenario}@${record.viewport}: dismiss control is ${record.dismissTarget.width}x${record.dismissTarget.height} (min 32x32)`);
    }
  }

  // R11/R12 sizes the exposed result surface (banner-adjacent metrics, filters,
  // bounds and table), which is the region an operator reads, not the table
  // viewport alone. Both numbers are recorded so neither can drift silently.
  const normal = find('preview-ready', '1280x860');
  if (normal) {
    if (normal.composeHeight > 64) fail(`preview-ready@1280x860: review input chrome is ${normal.composeHeight}px (max 64px)`);
    if (normal.reportRegionHeight < 400) fail(`preview-ready@1280x860: report region is ${normal.reportRegionHeight}px (min 400px)`);
  }
  const maximized = find('preview-ready', '1280x860', true);
  if (maximized) {
    if (maximized.composeHeight > 64) fail(`preview-ready@1280x860 maximized: review input chrome is ${maximized.composeHeight}px (max 64px)`);
    if (maximized.reportRegionHeight < 540) fail(`preview-ready@1280x860 maximized: report region is ${maximized.reportRegionHeight}px (min 540px)`);
  }
  const narrow = find('preview-ready', '375x812');
  if (narrow) {
    if (!narrow.firstRowVisible) fail('preview-ready@375x812: first report row is not reachable without scrolling past compose');
    if (!narrow.footerWithinViewport) fail('preview-ready@375x812: footer actions are outside the visual viewport');
  }
  const compose = find('idle', '640x430');
  if (compose && !compose.bodyScrolls && compose.body.scrollHeight > compose.body.clientHeight + 1) {
    fail('idle@640x430: compose content is unreachable at 200% zoom');
  }
  const aggregate = find('aggregate', '1280x860');
  if (aggregate) {
    if (aggregate.rowsRendered > 0) fail('aggregate@1280x860: aggregate detail mode rendered a row table');
    if (aggregate.filterPills > 0) fail('aggregate@1280x860: aggregate detail mode rendered row filters');
  }
}

await new Promise((listening) => server.listen(0, '127.0.0.1', listening));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const failures = [];
const records = [];

try {
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const matrix = [
    ['idle', VIEWPORTS.desktop, {}],
    ['idle', VIEWPORTS.zoom200, {}],
    ['selected', VIEWPORTS.desktop, {}],
    ['previewing', VIEWPORTS.desktop, {}],
    ['preview-ready', VIEWPORTS.desktop, {}],
    ['preview-ready', VIEWPORTS.desktop, { maximize: true }],
    ['preview-ready', VIEWPORTS.laptop, {}],
    ['preview-ready', VIEWPORTS.tablet, {}],
    ['preview-ready', VIEWPORTS.narrow, {}],
    ['preview-ready', VIEWPORTS.desktop, { longCopy: true }],
    ['ineligible', VIEWPORTS.desktop, {}],
    ['truncated', VIEWPORTS.desktop, { rowCount: 100 }],
    ['truncated', VIEWPORTS.desktop, { rowCount: 100, maximize: true }],
    ['applying', VIEWPORTS.desktop, {}],
    ['complete', VIEWPORTS.desktop, {}],
    ['partial', VIEWPORTS.desktop, {}],
    ['unknown', VIEWPORTS.desktop, {}],
    ['terminal-error', VIEWPORTS.desktop, {}],
    ['aggregate', VIEWPORTS.desktop, {}],
    ['aggregate', VIEWPORTS.narrow, {}],
    ['idle', VIEWPORTS.desktop, { sources: 'aggregate-only' }],
  ];

  const media = [
    ['forced-colors', { forcedColors: 'active' }, {}],
    ['rtl', {}, { direction: 'rtl' }],
  ];
  for (const [label, mediaOptions, docOptions] of media) {
    try {
      await page.emulateMedia({ reducedMotion: 'reduce', ...mediaOptions });
      await page.setViewportSize(VIEWPORTS.desktop);
      await openFixture(page, origin, { scenario: 'preview-ready' });
      if (docOptions.direction) await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
      await selectFile(page);
      await clickPrimary(page);
      await settle(page, ['preview-ready']);
      const probe = await page.evaluate(() => {
        const dialog = document.querySelector('[data-go-admin-modal].go-admin-import');
        const box = (selector) => {
          const rect = dialog.querySelector(selector)?.getBoundingClientRect();
          return rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null;
        };
        return {
          ...window.importFixture.measure(),
          icon: box('.go-admin-import__action-icon'),
          badge: box('.go-admin-import__outcome'),
          documentOverflowsHorizontally: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });
      records.push({ ...probe, scenario: label, viewport: '1280x860', maximize: false });
      // Masked icons and tone badges are the first things forced colors strips,
      // and RTL is where a fixed-direction layout escapes the viewport.
      if (!probe.icon?.w || !probe.icon?.h) failures.push(`${label}: header action icons collapsed`);
      if (!probe.badge?.w || !probe.badge?.h) failures.push(`${label}: outcome badges collapsed`);
      if (!probe.bannerVisible) failures.push(`${label}: result banner is not visible`);
      if (!probe.dialogWithinViewport) failures.push(`${label}: dialog escapes the visual viewport`);
      if (probe.documentOverflowsHorizontally) failures.push(`${label}: page scrolls horizontally`);
    } catch (error) {
      failures.push(`${label}: media probe failed: ${error?.message || error}`);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });

  for (const [scenario, viewport, options] of matrix) {
    try {
      records.push(await driveScenario(page, origin, scenario, viewport, options));
    } catch (error) {
      const label = `${scenario}@${viewport.width}x${viewport.height}${options.maximize ? ' maximized' : ''}`;
      records.push({ scenario, viewport: `${viewport.width}x${viewport.height}`, maximize: Boolean(options.maximize), error: String(error?.message || error) });
      failures.push(`${label}: scenario could not be driven: ${error?.message || error}`);
    }
  }
  await context.close();
} finally {
  await browser.close();
  await new Promise((closed) => server.close(closed));
}

assertGates(records, failures);
process.stdout.write(`${JSON.stringify({ evidence: artifactIdentity(), testedAt: new Date().toISOString(), records, failures }, null, 2)}\n`);

if (failures.length && !baselineOnly) {
  process.stderr.write(`\n${failures.length} import layout gate failure(s):\n${failures.map((entry) => `  - ${entry}`).join('\n')}\n`);
  process.exit(1);
}

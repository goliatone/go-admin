#!/usr/bin/env node
// Exercise shipped Activity assets without a CRM stylesheet or running app.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const template = readFileSync(resolve(root, '../templates/resources/activity/list.html'), 'utf8');
const table = template.match(/<table class="activity-table[\s\S]*?<\/table>/)?.[0];
assert.ok(table, 'Activity table template missing');
const fixture = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/dist/styles/activity.css">
<style>*{box-sizing:border-box}body{margin:0;padding:16px;font-family:sans-serif}table{width:100%;border-collapse:collapse}.overflow-x-auto{overflow-x:auto}#activity-timeline-container{overflow:hidden}#activity-timeline{padding:16px}</style>
<div id="activity-timeline-container"><div id="activity-timeline"></div></div><div class="overflow-x-auto">${table}</div>`;
const server = createServer((req, res) => {
  const path = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (path === '/') { res.setHeader('Content-Type', 'text/html'); res.end(fixture); return; }
  const file = resolve(root, `.${path}`);
  if (!file.startsWith(`${root}/dist/`)) { res.writeHead(404).end(); return; }
  try {
    res.setHeader('Content-Type', extname(file) === '.css' ? 'text/css' : 'text/javascript');
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.ACTIVITY_BROWSER_CHANNEL ? { channel: process.env.ACTIVITY_BROWSER_CHANNEL } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      const { ActivityManager, TimelineRenderer } = await import('/dist/activity/index.js');
      const identifiers = ['a'.repeat(254), '界'.repeat(254), '<img src=x onerror="window.activityXSS=true">'];
      const entries = identifiers.map((identifier, index) => ({
        id: `long-${index}`, actor: 'Authentication Gateway',
        action: `Failed sign-in · Attempted username: ${identifier}`, action_key: 'auth.login.failure',
        object: 'authentication', channel: 'authentication',
        metadata: { attempted_identifier: identifier }, created_at: '2026-09-28T12:00:00Z',
      }));
      new TimelineRenderer(document.querySelector('#activity-timeline')).render(entries);
      const manager = new ActivityManager({ apiPath: '/unused', basePath: '/admin' });
      const body = document.querySelector('#activity-table-body');
      for (const entry of entries) {
        const { mainRow, detailsRow } = manager.createRowPair(entry);
        body.append(mainRow, detailsRow);
      }
      manager.wireMetadataToggles();
      for (const button of document.querySelectorAll('[data-timeline-metadata], [data-metadata-toggle]')) button.click();
    });
    const problems = await page.evaluate(() => {
      const problems = [];
      function inside(node, parent, name, text = false) {
        if (!node || !parent) { problems.push(`${name}: missing`); return; }
        const bounds = parent.getBoundingClientRect();
        let rects = [node.getBoundingClientRect()];
        if (text) { const range = document.createRange(); range.selectNodeContents(node); rects = [...range.getClientRects()]; }
        for (const rect of rects) if (rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) {
          problems.push(`${name}: ${rect.width}px exceeds ${bounds.width}px`); break;
        }
      }
      const cards = [...document.querySelectorAll('.timeline-entry-card')];
      const rows = [...document.querySelectorAll('.activity-row')];
      if (cards.length !== 3 || rows.length !== 3) problems.push('missing rows');
      for (const card of cards) {
        const badge = card.querySelector('.timeline-action-badge');
        inside(card, document.querySelector('#activity-timeline-container'), 'card');
        inside(badge, card, 'badge');
        inside(badge.querySelector('span'), badge, 'badge text', true);
        inside(card.querySelector('.timeline-entry-sentence'), card, 'timeline sentence', true);
      }
      for (const row of rows) {
        inside(row.children[2].firstElementChild, row.children[2], 'table sentence', true);
        const label = row.querySelector('.activity-action-label');
        if (getComputedStyle(label).textOverflow !== 'ellipsis') problems.push('compact action badge lost ellipsis');
      }
      for (const item of document.querySelectorAll('.activity-metadata-item')) {
        inside(item, item.parentElement, 'metadata cell');
        inside(item.lastElementChild, item, 'metadata text', true);
        if (item.getBoundingClientRect().height === 0) problems.push('metadata not expanded');
      }
      for (const identifier of ['a'.repeat(254), '界'.repeat(254)]) {
        for (const selector of ['#activity-timeline', '#activity-table-body']) {
          if (!document.querySelector(selector).textContent.includes(`Attempted username: ${identifier}`)) problems.push(`${selector}: truncated identifier`);
        }
      }
      if (window.activityXSS || document.querySelector('#activity-timeline img, #activity-table-body img')) problems.push('unescaped markup');
      return problems;
    });
    assert.deepEqual(problems, [], `Activity geometry at ${width}px`);
    process.stdout.write(`Activity shipped assets: ${width}px timeline/table, expanded metadata and hostile markup passed\n`);
  }
  assert.deepEqual(errors, [], 'browser errors');
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

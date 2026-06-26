import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(testDir, '..');
const repoRoot = path.resolve(assetsDir, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertSidebarRuntimeCollapsesOnNarrow(relativePath) {
  const dom = new JSDOM(`
    <!doctype html>
    <aside id="sidebar" data-collapsed="false"></aside>
    <button id="sidebar-toggle"></button>
  `, {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  window.matchMedia = () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  });
  window.localStorage.setItem('admin-sidebar-collapsed', 'false');
  window.eval(read(relativePath));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  assert.equal(
    window.document.getElementById('sidebar').getAttribute('data-collapsed'),
    'true',
    `${relativePath} collapses the sidebar on narrow viewports`,
  );
}

function assertBuiltShellResponsiveCss(relativePath) {
  const css = read(relativePath);

  assert.match(
    css,
    /\[data-dashboard-shell\]\s+\.dashboard-shell__region:not\(\[data-collapsed=?true\]\)/,
    `${relativePath} limits mobile full-width shell sizing to expanded regions`,
  );
  assert.match(
    css,
    /\.dashboard-shell__region\[data-collapsed=?true\][\s\S]*width:\s*var\(--dashboard-shell-rail-collapsed,\s*0(?:px)?\)!important/,
    `${relativePath} preserves collapsed mobile shell rail sizing`,
  );
}

test('admin layout reserves only the compact sidebar rail on narrow viewports', () => {
  const layout = read('pkg/client/templates/layout.html');
  const css = read('pkg/client/assets/input.css');
  const sidebarRuntime = read('pkg/client/assets/sidebar.js');

  assert.match(layout, /class="admin-layout\b[^"]*"/, 'layout wrapper exposes admin-layout hook');
  assert.match(layout, /class="admin-main\b[^"]*min-w-0[^"]*"/, 'main content can shrink without overflow');

  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.admin-layout[\s\S]*padding-left:\s*64px/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.admin-main[\s\S]*width:\s*calc\(100vw - 64px\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.sidebar[\s\S]*position:\s*fixed/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.sidebar\[data-collapsed="true"\][\s\S]*width:\s*64px !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\[data-dashboard-shell\][\s\S]*flex-direction:\s*column !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__region:not\(\[data-collapsed="true"\]\)[\s\S]*width:\s*100% !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__region\[data-collapsed="true"\][\s\S]*width:\s*var\(--dashboard-shell-rail-collapsed, 0px\) !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__splitter[\s\S]*display:\s*none !important/);

  assert.match(sidebarRuntime, /matchMedia\('\(max-width: 1023px\)'\)/);
  assert.match(sidebarRuntime, /narrowSidebarQuery\.matches[\s\S]*data-collapsed', 'true'/);
});

test('built app CSS preserves collapsed mobile shell regions', () => {
  assertBuiltShellResponsiveCss('pkg/client/assets/output.css');
  assertBuiltShellResponsiveCss('pkg/client/assets/dist/output.css');
});

test('sidebar runtimes collapse to the rail on narrow viewports', () => {
  assertSidebarRuntimeCollapsesOnNarrow('pkg/client/assets/sidebar.js');
  assertSidebarRuntimeCollapsesOnNarrow('quickstart/assets/sidebar.js');
});

test('quickstart fallback sidebar assets mirror narrow layout behavior', () => {
  const css = read('quickstart/assets/sidebar.css');
  const sidebarRuntime = read('quickstart/assets/sidebar.js');

  assert.match(css, /#sidebar\[data-collapsed="true"\]\s*\{[\s\S]*width:\s*64px !important/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar[\s\S]*position:\s*fixed/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar\[data-collapsed="true"\][\s\S]*max-width:\s*64px/);
  assert.match(css, /#sidebar\[data-collapsed="true"\]\s+\.nav-text,[\s\S]*display:\s*none !important/);
  assert.match(css, /#sidebar\[data-collapsed="true"\]\s+\.sidebar-search-container\s*\{[\s\S]*display:\s*none !important/);
  assert.match(css, /\.menu-group-ellipsis\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /#sidebar\[data-collapsed="true"\]\s+\.menu-group-ellipsis\s*\{[\s\S]*display:\s*block !important/);
  assert.match(css, /#sidebar\[data-collapsed="true"\]\s+nav\s*\{[\s\S]*padding-left:\s*0 !important/);
  assert.match(sidebarRuntime, /matchMedia\('\(max-width: 1023px\)'\)/);
  assert.match(sidebarRuntime, /narrowSidebarQuery\.matches[\s\S]*data-collapsed', 'true'/);
});

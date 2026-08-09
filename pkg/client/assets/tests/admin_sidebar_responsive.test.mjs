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

function installMatchMedia(window, matches) {
  const mediaQueryList = {
    matches,
    addEventListener() {},
    removeEventListener() {},
  };
  window.matchMedia = () => mediaQueryList;
  return mediaQueryList;
}

function sidebarFixture(extra = '') {
  return `
    <!doctype html>
    <button id="sidebar-mobile-toggle" aria-expanded="false"></button>
    <div id="sidebar-backdrop" hidden></div>
    <aside id="sidebar" data-collapsed="false" data-mobile-open="false">
      <span class="sidebar-brand-expanded">Expanded</span>
      <span class="sidebar-brand-collapsed">Compact</span>
      <a class="nav-item" href="/admin"><span class="nav-text">Dashboard</span></a>
      ${extra}
    </aside>
    <button id="sidebar-toggle" aria-expanded="true" aria-label="Collapse sidebar"></button>
  `;
}

function assertSidebarRuntimeUsesDrawerOnNarrow(relativePath) {
  const dom = new JSDOM(sidebarFixture(), {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  installMatchMedia(window, true);
  window.localStorage.setItem('admin-sidebar-collapsed', 'false');
  window.eval(read('pkg/client/assets/sidebar-state.js'));
  window.eval(read(relativePath));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  assert.equal(
    window.document.getElementById('sidebar').getAttribute('data-collapsed'),
    'false',
    `${relativePath} keeps the drawer content expanded on narrow viewports`,
  );
  assert.equal(window.document.getElementById('sidebar').getAttribute('data-mobile-open'), 'false');
  assert.equal(window.document.getElementById('sidebar').getAttribute('aria-hidden'), 'true');
  assert.equal(window.document.getElementById('sidebar-mobile-toggle').getAttribute('aria-expanded'), 'false');

  window.document.getElementById('sidebar-mobile-toggle').click();
  assert.equal(window.document.getElementById('sidebar').getAttribute('data-mobile-open'), 'true');
  assert.equal(window.document.getElementById('sidebar').getAttribute('aria-hidden'), 'false');
  assert.equal(window.document.getElementById('sidebar-backdrop').hidden, false);
  assert.equal(window.document.documentElement.classList.contains('sidebar-mobile-open'), true);

  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(window.document.getElementById('sidebar').getAttribute('data-mobile-open'), 'false');
  assert.equal(window.document.activeElement, window.document.getElementById('sidebar-mobile-toggle'));
}

function assertBuiltShellResponsiveCss(relativePath) {
  const css = read(relativePath);

  assert.match(
    css,
    /\[data-admin-sidebar-collapsed=?true\][^{]*#sidebar/,
    `${relativePath} consumes pre-paint sidebar root state`,
  );
  assert.match(
    css,
    /\[data-admin-sidebar-ready=?true\][^{]*\.admin-theme-root[^}]*#sidebar/,
    `${relativePath} gates sidebar motion behind runtime readiness`,
  );
  assert.doesNotMatch(
    css,
    /\[data-admin-sidebar-(?:collapsed|ready)=?true\][^{]*\.admin-theme-root[^,{]*\.sidebar(?:\W|$)/,
    `${relativePath} must not project global sidebar state onto secondary .sidebar elements`,
  );

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

test('sidebar pre-paint state resolves persisted true, false, and missing values synchronously', () => {
  for (const relativePath of [
    'pkg/client/assets/sidebar-state.js',
    'quickstart/assets/sidebar-state.js',
  ]) {
    for (const scenario of [
      { stored: 'true', expected: 'true' },
      { stored: 'false', expected: 'false' },
      { stored: null, expected: 'false' },
    ]) {
      const dom = new JSDOM(sidebarFixture(), {
        runScripts: 'outside-only',
        url: 'http://localhost/admin',
      });
      const { window } = dom;
      installMatchMedia(window, false);
      if (scenario.stored !== null) {
        window.localStorage.setItem('admin-sidebar-collapsed', scenario.stored);
      }

      window.eval(read(relativePath));

      assert.equal(
        window.document.documentElement.getAttribute('data-admin-sidebar-collapsed'),
        scenario.expected,
        `${relativePath} projects stored value ${String(scenario.stored)} synchronously`,
      );
      assert.equal(
        window.document.documentElement.getAttribute('data-admin-sidebar-ready'),
        'false',
        `${relativePath} keeps initial transitions disabled`,
      );
      assert.equal(
        window.document.getElementById('sidebar').getAttribute('data-collapsed'),
        'false',
        `${relativePath} leaves element synchronization to the adjacent runtime`,
      );
    }
  }
});

test('pre-paint root state drives complete compact fallback presentation', () => {
  const css = read('quickstart/assets/sidebar.css');
  const dom = new JSDOM(sidebarFixture(), {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  const style = window.document.createElement('style');
  style.textContent = css;
  window.document.head.append(style);
  installMatchMedia(window, false);
  window.localStorage.setItem('admin-sidebar-collapsed', 'true');

  window.eval(read('quickstart/assets/sidebar-state.js'));

  const sidebar = window.document.getElementById('sidebar');
  assert.equal(window.getComputedStyle(sidebar).width, '64px');
  assert.equal(window.getComputedStyle(sidebar).transition, 'none');
  assert.equal(window.getComputedStyle(sidebar.querySelector('.sidebar-brand-expanded')).display, 'none');
  assert.equal(window.getComputedStyle(sidebar.querySelector('.sidebar-brand-collapsed')).display, 'flex');
  assert.equal(window.getComputedStyle(sidebar.querySelector('.nav-text')).display, 'none');
});

test('pre-paint root state is isolated to the global sidebar', () => {
  const css = read('quickstart/assets/sidebar.css');
  const dom = new JSDOM(sidebarFixture(), {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  window.document.body.insertAdjacentHTML('beforeend', `
    <aside id="secondary-sidebar" class="sidebar" style="width: 320px">
      <span class="nav-text">Secondary navigation</span>
    </aside>
  `);
  const style = window.document.createElement('style');
  style.textContent = css;
  window.document.head.append(style);
  installMatchMedia(window, false);
  window.localStorage.setItem('admin-sidebar-collapsed', 'true');

  window.eval(read('quickstart/assets/sidebar-state.js'));

  const secondary = window.document.getElementById('secondary-sidebar');
  assert.equal(window.getComputedStyle(secondary).width, '320px');
  assert.notEqual(window.getComputedStyle(secondary.querySelector('.nav-text')).display, 'none');
});

test('sidebar runtimes ignore submenu and group contracts outside the global sidebar', () => {
  for (const relativePath of [
    'pkg/client/assets/sidebar.js',
    'quickstart/assets/sidebar.js',
  ]) {
    const dom = new JSDOM(sidebarFixture(), {
      runScripts: 'outside-only',
      url: 'http://localhost/admin',
    });
    const { window } = dom;
    window.document.body.insertAdjacentHTML('beforeend', `
      <section id="module-submenu" data-submenu-toggle="module" data-expanded="true">
        <button class="nav-item">Module submenu</button>
        <div data-submenu="module" class="submenu expanded"></div>
      </section>
      <section id="module-group" data-group-toggle="module-tools" data-expanded="true">
        <button>Module group</button>
        <div data-group="module-tools" class="expanded"></div>
      </section>
    `);
    installMatchMedia(window, false);
    window.eval(read('pkg/client/assets/sidebar-state.js'));
    window.eval(read(relativePath));

    window.document.querySelector('#module-submenu button').click();
    window.document.querySelector('#module-group button').click();
    assert.equal(window.document.getElementById('module-submenu').getAttribute('data-expanded'), 'true');
    assert.equal(window.document.getElementById('module-group').getAttribute('data-expanded'), 'true');
  }
});

test('sidebar runtime synchronizes DOM, ARIA, readiness, and persisted desktop state', () => {
  const dom = new JSDOM(sidebarFixture(), {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  const frames = [];
  installMatchMedia(window, false);
  window.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  window.localStorage.setItem('admin-sidebar-collapsed', 'true');
  window.eval(read('pkg/client/assets/sidebar-state.js'));
  window.eval(read('pkg/client/assets/sidebar.js'));

  const root = window.document.documentElement;
  const sidebar = window.document.getElementById('sidebar');
  const toggle = window.document.getElementById('sidebar-toggle');
  assert.equal(sidebar.getAttribute('data-collapsed'), 'true');
  assert.equal(sidebar.getAttribute('data-sidebar-runtime-initialized'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Expand sidebar');
  assert.equal(root.getAttribute('data-admin-sidebar-ready'), 'false');

  frames.shift()(0);
  assert.equal(root.getAttribute('data-admin-sidebar-ready'), 'false');
  frames.shift()(16);
  assert.equal(root.getAttribute('data-admin-sidebar-ready'), 'true');

  toggle.click();
  assert.equal(root.getAttribute('data-admin-sidebar-collapsed'), 'false');
  assert.equal(sidebar.getAttribute('data-collapsed'), 'false');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Collapse sidebar');
  assert.equal(window.localStorage.getItem('admin-sidebar-collapsed'), 'false');
});

test('sidebar runtime preserves expanded state for persisted false and missing values', () => {
  for (const relativePath of [
    'pkg/client/assets/sidebar.js',
    'quickstart/assets/sidebar.js',
  ]) {
    for (const stored of ['false', null]) {
      const dom = new JSDOM(sidebarFixture(), {
        runScripts: 'outside-only',
        url: 'http://localhost/admin',
      });
      const { window } = dom;
      installMatchMedia(window, false);
      if (stored !== null) {
        window.localStorage.setItem('admin-sidebar-collapsed', stored);
      }
      window.eval(read('pkg/client/assets/sidebar-state.js'));
      window.eval(read(relativePath));

      const sidebar = window.document.getElementById('sidebar');
      const toggle = window.document.getElementById('sidebar-toggle');
      assert.equal(sidebar.getAttribute('data-collapsed'), 'false');
      assert.equal(toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(toggle.getAttribute('aria-label'), 'Collapse sidebar');
      assert.equal(window.localStorage.getItem('admin-sidebar-collapsed'), stored);
    }
  }
});

test('sidebar state fails safely when browser storage is unavailable', () => {
  const dom = new JSDOM(sidebarFixture(`
    <div data-submenu-toggle="reports" data-expanded="true">
      <button class="nav-item"><span class="submenu-indicator"></span></button>
      <div data-submenu="reports" class="submenu expanded"></div>
    </div>
  `), {
    runScripts: 'outside-only',
    url: 'http://localhost/admin',
  });
  const { window } = dom;
  installMatchMedia(window, false);
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new window.DOMException('Storage denied', 'SecurityError');
    },
  });

  assert.doesNotThrow(() => window.eval(read('pkg/client/assets/sidebar-state.js')));
  assert.doesNotThrow(() => window.eval(read('pkg/client/assets/sidebar.js')));
  assert.equal(window.document.documentElement.getAttribute('data-admin-sidebar-collapsed'), 'false');
  assert.equal(window.document.getElementById('sidebar').getAttribute('data-collapsed'), 'false');
  assert.equal(window.document.getElementById('sidebar').getAttribute('data-sidebar-runtime-initialized'), 'true');
  assert.doesNotThrow(() => window.document.getElementById('sidebar-toggle').click());
});

test('admin layout uses an off-canvas sidebar drawer on narrow viewports', () => {
  const layout = read('pkg/client/templates/layout.html');
  const css = read('pkg/client/assets/input.css');
  const sidebarRuntime = read('pkg/client/assets/sidebar.js');
  const sidebarState = read('pkg/client/assets/sidebar-state.js');

  assert.match(layout, /class="admin-layout\b[^"]*"/, 'layout wrapper exposes admin-layout hook');
  assert.match(layout, /class="admin-main\b[^"]*min-w-0[^"]*"/, 'main content can shrink without overflow');

  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.admin-layout[\s\S]*padding-left:\s*0/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.admin-main[\s\S]*width:\s*100vw/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar[\s\S]*position:\s*fixed/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar[\s\S]*transform:\s*translateX\(-100%\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar\[data-mobile-open="true"\][\s\S]*transform:\s*translateX\(0\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.sidebar-mobile-toggle[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.admin-theme-root\s+\.sidebar[\s\S]*background-color:\s*var\(--admin-sidebar-background/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*#sidebar[\s\S]*transition-duration:\s*0\.001ms !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\[data-dashboard-shell\][\s\S]*flex-direction:\s*column !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__region:not\(\[data-collapsed="true"\]\)[\s\S]*width:\s*100% !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__region\[data-collapsed="true"\][\s\S]*width:\s*var\(--dashboard-shell-rail-collapsed, 0px\) !important/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dashboard-shell__splitter[\s\S]*display:\s*none !important/);

  assert.match(sidebarState, /narrowMediaQuery = '\(max-width: 1023px\)'/);
  assert.match(sidebarRuntime, /sidebarState\.narrowMediaQuery/);
  assert.match(sidebarRuntime, /narrowSidebarQuery\.matches[\s\S]*setMobileOpen\(false\)/);
});

test('built app CSS preserves collapsed mobile shell regions', () => {
  assertBuiltShellResponsiveCss('pkg/client/assets/output.css');
  assertBuiltShellResponsiveCss('pkg/client/assets/dist/output.css');
});

test('sidebar runtimes use an accessible drawer on narrow viewports', () => {
  assertSidebarRuntimeUsesDrawerOnNarrow('pkg/client/assets/sidebar.js');
  assertSidebarRuntimeUsesDrawerOnNarrow('quickstart/assets/sidebar.js');
});

test('quickstart fallback sidebar assets mirror narrow layout behavior', () => {
  const css = read('quickstart/assets/sidebar.css');
  const sidebarRuntime = read('quickstart/assets/sidebar.js');
  const sidebarState = read('quickstart/assets/sidebar-state.js');

  assert.match(css, /:root\[data-admin-sidebar-collapsed="true"\]\s+#sidebar\s*\{[\s\S]*width:\s*64px !important/);
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*:root\[data-admin-sidebar-ready="true"\]\s+#sidebar\s*\{[^}]*transition:\s*width/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*:root\[data-admin-sidebar-ready="true"\]\s+#sidebar\s*\{[^}]*transition:\s*transform/);
  assert.doesNotMatch(css, /:root\[data-admin-sidebar-ready="true"\]\s+#sidebar\s*\{[^}]*transition:\s*width[^}]*\}\s*@media \(max-width:/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar[\s\S]*position:\s*fixed/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar[\s\S]*transform:\s*translateX\(-100%\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*#sidebar\[data-mobile-open="true"\][\s\S]*transform:\s*translateX\(0\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*\.sidebar-mobile-toggle[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\[data-admin-sidebar-collapsed="true"\]\s+#sidebar\s+\.nav-text,[\s\S]*display:\s*none !important/);
  assert.match(css, /\[data-admin-sidebar-collapsed="true"\]\s+#sidebar\s+\.sidebar-search-container\s*\{[\s\S]*display:\s*none !important/);
  assert.match(css, /\.menu-group-ellipsis\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\[data-admin-sidebar-collapsed="true"\]\s+#sidebar\s+\.menu-group-ellipsis\s*\{[\s\S]*display:\s*block !important/);
  assert.match(css, /\[data-admin-sidebar-collapsed="true"\]\s+#sidebar\s+nav\s*\{[\s\S]*padding-left:\s*0 !important/);
  assert.match(sidebarState, /narrowMediaQuery = '\(max-width: 1023px\)'/);
  assert.match(sidebarRuntime, /sidebarState\.narrowMediaQuery/);
  assert.match(sidebarRuntime, /narrowSidebarQuery\.matches[\s\S]*setMobileOpen\(false\)/);
});

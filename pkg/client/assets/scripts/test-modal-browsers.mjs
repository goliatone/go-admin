#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { webkit as previousWebKit } from 'playwright-previous';

const root = resolve(import.meta.dirname, '..');
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

async function verifyBrowser(label, browserType, launchOptions, origin) {
  const browser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${origin}/tests/fixtures/modal/server-rendered-form.html`);
    await page.waitForFunction(() => window.modalFixtureReady === true);
    const userAgent = await page.evaluate(() => navigator.userAgent);

    await page.evaluate(() => {
      const button = document.querySelector('#open-customer-modal');
      button.focus();
      button.click();
    });
    const dialog = page.locator('[data-go-admin-modal="true"]');
    await dialog.waitFor();
    const handle = await dialog.elementHandle();
    if (!handle) throw new Error(`${label}: dialog handle unavailable`);
    if (await dialog.getAttribute('aria-labelledby') !== 'customer-modal-title') {
      throw new Error(`${label}: accessible name relationship missing`);
    }
    if (await page.evaluate(() => document.activeElement?.getAttribute('name')) !== 'name') {
      throw new Error(`${label}: initial focus missing`);
    }
    await page.keyboard.press('Shift+Tab');
    if (await page.evaluate(() => document.activeElement?.getAttribute('type')) !== 'submit') {
      throw new Error(`${label}: backward focus wrap failed`);
    }
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.getAttribute('name')) !== 'name') {
      throw new Error(`${label}: forward focus wrap failed`);
    }

    await page.locator('form[data-server-form]').evaluate((form) => form.requestSubmit());
    if (!(await page.evaluate(() => document.activeElement?.id === 'customer-validation-summary'))) {
      throw new Error(`${label}: validation summary focus missing`);
    }
    const sameContainer = await page.evaluate((element) => element === window.modalFixture.modal.dialogElement(), handle);
    if (!sameContainer) throw new Error(`${label}: content replacement discarded the dialog container`);

    await page.evaluate(() => { document.body.style.zoom = '2'; });
    const desktopRect = await dialog.boundingBox();
    if (!desktopRect || desktopRect.x < 0 || desktopRect.y < 0 || desktopRect.x + desktopRect.width > 1280 || desktopRect.y + desktopRect.height > 800) {
      throw new Error(`${label}: 200% zoom containment failed`);
    }

    await page.keyboard.press('Escape');
    if (await dialog.count()) throw new Error(`${label}: reduced-motion close did not clean up immediately`);
    if (!(await page.evaluate(() => document.activeElement?.id === 'open-customer-modal'))) {
      throw new Error(`${label}: invoking focus was not restored`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.body.style.zoom = '1'; });
    await page.evaluate(() => {
      const button = document.querySelector('#open-customer-modal');
      button.focus();
      button.click();
    });
    const mobileRect = await page.locator('[data-go-admin-modal="true"]').boundingBox();
    if (!mobileRect || mobileRect.x < 0 || mobileRect.y < 0 || mobileRect.x + mobileRect.width > 390 || mobileRect.y + mobileRect.height > 844) {
      throw new Error(`${label}: mobile containment failed`);
    }
    await context.close();
    return { label, userAgent };
  } finally {
    await browser.close();
  }
}

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;

try {
  const matrix = [
    ['Chrome current', chromium, { channel: 'chrome' }],
    ['Chrome previous baseline', chromium, {}],
    ['Safari/WebKit current', webkit, {}],
    ['Safari/WebKit previous baseline', previousWebKit, {}],
  ];

  const results = [];
  for (const [label, browserType, options] of matrix) {
    results.push(await verifyBrowser(label, browserType, options, origin));
  }
  process.stdout.write(`${JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2)}\n`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

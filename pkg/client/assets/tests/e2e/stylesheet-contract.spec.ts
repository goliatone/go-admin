import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(import.meta.dirname, '../../output.css'), 'utf8');

test('compiled stylesheet preserves scoped forms and dynamic public utilities', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head></head><body>
    <input id="host" type="text" value="Host-owned control">
    ${['admin-theme-root', 'site-shell', 'admin-forms-root'].map((root, i) => `
      <section class="${root}"><input id="scoped-${i}" type="text" value="Scoped control"></section>
    `).join('')}
    <section class="admin-theme-root">
      <button id="single" class="btn btn-primary">Save changes</button>
      <button id="multi" class="btn btn-warning btn-multiline">Multiple lines</button>
      <div class="admin-select"><select id="select" class="admin-select__field"><option>Ready</option></select></div>
      <div id="hidden" class="hidden flex">Hidden panel</div>
      <div id="modal-size" class="max-w-3xl w-full">Modal width</div>
      <span id="status" class="status-badge status-active">Active</span>
    </section>
  </body></html>`);
  await page.addStyleTag({ content: css });
  await expect(page.locator('#host')).toHaveCSS('padding-top', '0px');
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(`#scoped-${i}`)).toHaveCSS('padding-top', '8px');
    await expect(page.locator(`#scoped-${i}`)).toHaveCSS('appearance', 'none');
  }
  await expect(page.locator('#single')).toHaveCSS('white-space', 'nowrap');
  await expect(page.locator('#multi')).toHaveCSS('white-space', 'normal');
  await expect(page.locator('#select')).toHaveCSS('appearance', 'none');
  await expect(page.locator('#hidden')).toBeHidden();
  await expect(page.locator('#modal-size')).toHaveCSS('max-width', '768px');
  await expect(page.locator('#status')).toHaveCSS('display', 'inline-flex');
  await page.locator('#scoped-2').focus();
  await expect(page.locator('#scoped-2')).not.toHaveCSS('box-shadow', 'none');
});

import { JSDOM } from 'jsdom';
import { readFile } from 'fs/promises';

const fixtureURL = new URL('../../../admin/testdata/translation_queue_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

const { AssignmentQueueScreen } = await import('./dist/translation-queue/index.js');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { 
  url: 'http://localhost/admin/translations/queue' 
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Document = dom.window.Document;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.URL = dom.window.URL;
globalThis.URLSearchParams = dom.window.URLSearchParams;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalThis, 'location', { value: dom.window.location, configurable: true });

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  headers: { get() { return null; } },
  clone() { return this; },
  async json() {
    return {
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta, review_aggregate_counts: {} },
      data: fixtures.states.open_pool.data,
    };
  },
  async text() { return '{}'; },
});

const screen = new AssignmentQueueScreen({
  endpoint: '/admin/api/translations/assignments',
});

const root = dom.window.document.getElementById('root');
screen.mount(root);

await new Promise(resolve => setTimeout(resolve, 10));

const html = root.innerHTML;
console.log(html.includes('data-review-selector-toggle'));
console.log(html.includes('disabled'));
console.log(html.includes('Reviewer queue states'));
console.log(html.match(/Reviewer[^<]{0,100}/g));

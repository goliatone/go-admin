import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:9090/' });
globalThis.window = dom.window;
globalThis.self = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLFormElement = dom.window.HTMLFormElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.customElements = dom.window.customElements;

const {
  applyPanelActionNavigation,
  DebugStream,
  doctorNavigation,
  renderDoctorPanel,
  consoleStyles,
} = await import('../dist/debug/index.js');

test('doctor navigation actions expose a safe target and render a local navigation control', () => {
  const action = {
    kind: 'navigate',
    cta: 'Open search repair',
    applicable: true,
    runnable: true,
    metadata: {
      panel_id: 'operational_commands',
      state: { action_id: 'search_repair', payload: { indexes: ['archive_media'] } },
    },
  };
  assert.deepEqual(doctorNavigation(action), {
    panelID: 'operational_commands',
    state: action.metadata.state,
  });
  assert.equal(doctorNavigation({ ...action, metadata: { panel_id: '../unsafe' } }), null);

  const html = renderDoctorPanel({
    verdict: 'error',
    checks: [{ id: 'search', status: 'error', action }],
  }, consoleStyles);
  assert.match(html, /data-doctor-action-navigate="operational_commands"/);
  assert.doesNotMatch(html, /data-doctor-action-run="search"/);

  const invalidHTML = renderDoctorPanel({
    verdict: 'error',
    checks: [{ id: 'search', status: 'error', action: { ...action, metadata: { panel_id: '../unsafe' } } }],
  }, consoleStyles);
  assert.doesNotMatch(invalidHTML, /data-doctor-action-(?:navigate|run)=/);
  assert.match(invalidHTML, /disabled/);
});

test('navigation state selects and prefills a generic panel action without submitting it', () => {
	const root = document.createElement('section');
	root.innerHTML = `
	  <select data-panel-action-picker="operational_commands">
		<option value="other">Other</option>
		<option value="dispatch_search_repair">Repair search</option>
	  </select>
	  <div data-panel-action-choice="other"></div>
	  <div data-panel-action-choice="dispatch_search_repair" hidden>
		<form data-panel-action-form data-panel-id="operational_commands" data-action-id="dispatch_search_repair">
		  <textarea data-action-field="indexes" data-action-field-path="payload.indexes" data-action-field-kind="string_list"></textarea>
		  <input type="checkbox" data-action-field="force_reindex" data-action-field-path="payload.force_reindex" data-action-field-kind="boolean">
		</form>
	  </div>
	`;
	const picker = root.querySelector('[data-panel-action-picker]');
	picker.addEventListener('change', () => {
	  root.querySelectorAll('[data-panel-action-choice]').forEach((choice) => {
		choice.hidden = choice.dataset.panelActionChoice !== picker.value;
	  });
	});
	const form = root.querySelector('form');
	let submitted = false;
	form.addEventListener('submit', () => { submitted = true; });

	const applied = applyPanelActionNavigation(root, 'operational_commands', {
	  action_id: 'dispatch_search_repair',
	  payload: { payload: { indexes: ['archive_media', 'site_content'], force_reindex: false } },
	});

	assert.equal(applied, true);
	assert.equal(picker.value, 'dispatch_search_repair');
	assert.equal(root.querySelector('[data-panel-action-choice="dispatch_search_repair"]').hidden, false);
	assert.equal(form.querySelector('[data-action-field="indexes"]').value, 'archive_media\nsite_content');
	assert.equal(form.querySelector('[data-action-field="force_reindex"]').checked, false);
	assert.equal(submitted, false);
});

test('snapshot invalidation requests a viewer-scoped snapshot without forwarding shared payload', () => {
	class FakeWebSocket {
	  static OPEN = 1;
	  static CONNECTING = 0;
	  static instances = [];
	  readyState = FakeWebSocket.OPEN;
	  sent = [];
	  constructor() {
		FakeWebSocket.instances.push(this);
	  }
	  send(value) { this.sent.push(value); }
	  close() {}
	}
	globalThis.WebSocket = FakeWebSocket;
	const forwarded = [];
	const stream = new DebugStream({ url: 'ws://127.0.0.1/debug/ws', onEvent: (event) => forwarded.push(event) });
	stream.connect();
	const socket = FakeWebSocket.instances[0];
	socket.onmessage({ data: JSON.stringify({ type: 'snapshot_invalidated', payload: { forbidden: true } }) });

	assert.deepEqual(socket.sent.map((value) => JSON.parse(value)), [{ type: 'snapshot' }]);
	assert.deepEqual(forwarded, []);
	stream.close();
});

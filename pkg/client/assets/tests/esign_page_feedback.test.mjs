import test from 'node:test';
import assert from 'node:assert/strict';

const esignUtils = await import('../dist/esign/index.js');

function withMockBrowserGlobals(setup, callback) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousLocalStorage = globalThis.localStorage;

  const state = setup();

  if ('window' in state) {
    globalThis.window = state.window;
  }
  if ('document' in state) {
    globalThis.document = state.document;
  }
  if ('requestAnimationFrame' in state) {
    globalThis.requestAnimationFrame = state.requestAnimationFrame;
  }
  if ('localStorage' in state) {
    globalThis.localStorage = state.localStorage;
  }

  try {
    callback(state);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.localStorage = previousLocalStorage;
  }
}

test('Google Drive Utils: resolveAccountId prefers query, template, then storage', () => {
  withMockBrowserGlobals(
    () => {
      const storage = new Map([['esign.google.account_id', 'stored-account']]);
      return {
        localStorage: {
          getItem(key) {
            return storage.get(key) ?? null;
          },
          setItem(key, value) {
            storage.set(key, value);
          },
          removeItem(key) {
            storage.delete(key);
          },
        },
      };
    },
    () => {
      assert.equal(
        esignUtils.resolveAccountId(new URLSearchParams('account_id=query-account'), 'template-account'),
        'query-account'
      );
      assert.equal(
        esignUtils.resolveAccountId(new URLSearchParams(''), 'template-account'),
        'template-account'
      );
      assert.equal(esignUtils.resolveAccountId(new URLSearchParams('')), 'stored-account');
    }
  );
});

test('Google Drive Utils: saveAccountId removes stale values and applyAccountIdToPath updates query state', () => {
  withMockBrowserGlobals(
    () => {
      const storage = new Map();
      return {
        window: {
          location: { origin: 'https://example.test' },
        },
        localStorage: {
          getItem(key) {
            return storage.get(key) ?? null;
          },
          setItem(key, value) {
            storage.set(key, value);
          },
          removeItem(key) {
            storage.delete(key);
          },
        },
        storage,
      };
    },
    ({ storage }) => {
      esignUtils.saveAccountId('  scoped-account  ');
      assert.equal(storage.get('esign.google.account_id'), 'scoped-account');

      esignUtils.saveAccountId('');
      assert.equal(storage.has('esign.google.account_id'), false);

      assert.equal(
        esignUtils.applyAccountIdToPath('/admin/esign?foo=1&account_id=old#drive', 'next-account'),
        '/admin/esign?foo=1&account_id=next-account#drive'
      );
      assert.equal(
        esignUtils.applyAccountIdToPath('/admin/esign?foo=1&account_id=old#drive', ''),
        '/admin/esign?foo=1#drive'
      );
    }
  );
});

test('E-Sign page feedback helpers: announcePageMessage updates live region and announcer', () => {
  withMockBrowserGlobals(
    () => {
      let appendedNode = null;

      const document = {
        querySelector() {
          return null;
        },
        createElement() {
          return {
            attributes: {},
            textContent: '',
            setAttribute(name, value) {
              this.attributes[name] = value;
            },
            appendChild() {},
          };
        },
        createTextNode(text) {
          return { textContent: text };
        },
        body: {
          appendChild(node) {
            appendedNode = node;
            return node;
          },
        },
      };

      return {
        document,
        requestAnimationFrame(callback) {
          callback();
          return 0;
        },
        getAppendedNode() {
          return appendedNode;
        },
      };
    },
    ({ getAppendedNode }) => {
      const liveRegion = { textContent: '' };

      esignUtils.announcePageMessage(liveRegion, 'Account scope updated');

      assert.equal(liveRegion.textContent, 'Account scope updated');
      assert.equal(getAppendedNode()?.textContent, 'Account scope updated');
    }
  );
});

test('E-Sign page feedback helpers: showPageToast uses toast manager and alert fallback', () => {
  withMockBrowserGlobals(
    () => {
      const calls = [];
      return {
        window: {
          toastManager: {
            success(message) {
              calls.push(['success', message]);
            },
          },
          alert(message) {
            calls.push(['alert', message]);
          },
        },
        calls,
      };
    },
    ({ calls, window }) => {
      esignUtils.showPageToast('Connected', 'success');
      window.toastManager = undefined;
      esignUtils.showPageToast('Import failed', 'error', { alertFallback: true });

      assert.deepEqual(calls, [
        ['success', 'Connected'],
        ['alert', 'Error: Import failed'],
      ]);
    }
  );
});

export type {
  MenuRecord,
  MenuItemNode,
  MenuBindingRecord,
  MenuViewProfileRecord,
  MenuBuilderContracts,
} from './types.js';
export type { EntryNavigationConfig, EntryNavigationState, NavigationOverrideValue } from '../entry-navigation/index.js';

export { MenuBuilderAPIClient, MenuBuilderAPIError } from './api-client.js';
export { MenuBuilderStore } from './store.js';
import { MenuBuilderUI, initMenuBuilder } from './editor.js';
import { EntryNavigationOverrideUI, initEntryNavigationOverrides } from '../entry-navigation/index.js';
import { onReady } from '../shared/dom-ready.js';
export { MenuBuilderUI, EntryNavigationOverrideUI, initMenuBuilder, initEntryNavigationOverrides };
export {
  parseMenuContracts,
  parseMenuRecord,
  parseMenuItemNode,
  parseMenuBindingRecord,
  parseMenuViewProfileRecord,
  parseNavigationOverrides,
} from './guards.js';

onReady(() => {
  document.querySelectorAll<HTMLElement>('[data-menu-builder-root]').forEach((root) => {
    if (root.dataset.initialized === 'true') return;
    initMenuBuilder(root)
      .then(() => {
        root.dataset.initialized = 'true';
      })
      .catch((error: unknown) => {
        console.error('[menu-builder] failed to initialize', error);
        root.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${error instanceof Error ? error.message : String(error)}</div>`;
      });
  });

});

// Debug browser state (active panel, panel order, toolbar layout, command
// recall). A server-issued identity namespace scopes every key by console,
// application, environment, actor and scope. Without one, Debug runs as its
// explicitly unscoped legacy adapter and keeps the existing keys; ambiguous
// legacy values are never copied into a configured identity. Storage failures
// are ignored: this state is a convenience, never state of record.
//
// Kept dependency-light because the deferred toolbar bootstrap imports it.

import { consolePreferenceKey } from '../../console/preference-key.js';

export type DebugStateArea = 'local' | 'session';

export interface DebugBrowserState {
  /** True when keys are scoped to a server-issued identity namespace. */
  readonly scoped: boolean;
  get(key: string, area?: DebugStateArea): string | null;
  set(key: string, value: string, area?: DebugStateArea): void;
  remove(key: string, area?: DebugStateArea): void;
}

export type DebugStorageProvider = {
  local?: Storage | null;
  session?: Storage | null;
};

function storageFor(area: DebugStateArea, provider: DebugStorageProvider | null): Storage | null {
  try {
    if (provider) {
      return (area === 'local' ? provider.local : provider.session) ?? null;
    }
    return (area === 'local' ? globalThis.localStorage : globalThis.sessionStorage) ?? null;
  } catch {
    return null;
  }
}

export function createDebugBrowserState(
  namespace?: string | null,
  provider: DebugStorageProvider | null = null
): DebugBrowserState {
  const scope = typeof namespace === 'string' ? namespace.trim() : '';
  const keyFor = (key: string): string => (scope ? consolePreferenceKey(scope, key) : key);
  return {
    scoped: scope !== '',
    get: (key, area = 'local') => {
      try {
        return storageFor(area, provider)?.getItem(keyFor(key)) ?? null;
      } catch {
        return null;
      }
    },
    set: (key, value, area = 'local') => {
      try {
        storageFor(area, provider)?.setItem(keyFor(key), value);
      } catch {
        // Ignore blocked or unavailable browser storage.
      }
    },
    remove: (key, area = 'local') => {
      try {
        storageFor(area, provider)?.removeItem(keyFor(key));
      } catch {
        // Ignore blocked or unavailable browser storage.
      }
    },
  };
}

// Identity-namespaced browser state for console hosts. Keys never cross
// console, application, environment, actor or scope; storage failures are
// tolerated because preferences are conveniences, not state of record.

import { consolePreferenceKey } from './preference-key.js';
import type { ConsoleIdentity } from './types.js';

export type ConsoleStorageArea = 'local' | 'session';

export type ConsoleStorageProvider = {
  local?: Storage | null;
  session?: Storage | null;
};

export { consolePreferenceKey };

/**
 * Stable namespace for an identity. Mirrors the server's unambiguous identity
 * encoding so separators inside IDs cannot alias another identity.
 */
export function consoleIdentityNamespace(identity: ConsoleIdentity): string {
  return JSON.stringify({
    console_id: identity.console_id,
    application_id: identity.application_id,
    environment_id: identity.environment_id,
    actor_id: identity.actor_id,
    scope_key: identity.scope_key,
  });
}

function defaultStorage(area: ConsoleStorageArea): Storage | null {
  try {
    const storage = area === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export class ConsolePreferences {
  private readonly prefix: string;
  private readonly provider: ConsoleStorageProvider | null;

  constructor(namespace: string, provider: ConsoleStorageProvider | null = null) {
    this.prefix = consolePreferenceKey(namespace, '');
    this.provider = provider;
  }

  /** Fully qualified storage key for a preference name. */
  keyFor(name: string): string {
    return `${this.prefix}${name}`;
  }

  get(name: string, area: ConsoleStorageArea = 'local'): string | null {
    const storage = this.storage(area);
    if (!storage) return null;
    try {
      return storage.getItem(this.keyFor(name));
    } catch {
      return null;
    }
  }

  set(name: string, value: string, area: ConsoleStorageArea = 'local'): boolean {
    const storage = this.storage(area);
    if (!storage) return false;
    try {
      storage.setItem(this.keyFor(name), value);
      return true;
    } catch {
      return false;
    }
  }

  remove(name: string, area: ConsoleStorageArea = 'local'): void {
    const storage = this.storage(area);
    if (!storage) return;
    try {
      storage.removeItem(this.keyFor(name));
    } catch {
      // Ignore blocked or unavailable browser storage.
    }
  }

  /** Remove every key in this namespace from both storage areas. */
  clear(): void {
    for (const area of ['local', 'session'] as ConsoleStorageArea[]) {
      const storage = this.storage(area);
      if (!storage) continue;
      try {
        const keys: string[] = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key && key.startsWith(this.prefix)) keys.push(key);
        }
        keys.forEach((key) => storage.removeItem(key));
      } catch {
        // Ignore blocked or unavailable browser storage.
      }
    }
  }

  private storage(area: ConsoleStorageArea): Storage | null {
    if (this.provider) {
      const storage = area === 'local' ? this.provider.local : this.provider.session;
      return storage ?? null;
    }
    return defaultStorage(area);
  }
}

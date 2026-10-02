// Identity-namespaced browser state for console hosts. Keys never cross
// console, application, environment, actor or scope; storage failures are
// tolerated because preferences are conveniences, not state of record.

import type { ConsoleIdentity } from './types.js';

export type ConsoleStorageArea = 'local' | 'session';

export type ConsoleStorageProvider = {
  local?: Storage | null;
  session?: Storage | null;
};

/** Mapping for a one-time copy of an unscoped legacy key into a namespace. */
export type LegacyPreferenceKey = {
  legacyKey: string;
  key: string;
  area: ConsoleStorageArea;
};

const KEY_PREFIX = 'go-admin:console:';

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
    this.prefix = `${KEY_PREFIX}${namespace}:`;
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

  getJSON<T>(name: string, area: ConsoleStorageArea = 'local'): T | null {
    const raw = this.get(name, area);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON(name: string, value: unknown, area: ConsoleStorageArea = 'local'): boolean {
    let raw: string;
    try {
      raw = JSON.stringify(value);
    } catch {
      return false;
    }
    return this.set(name, raw, area);
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

  /**
   * Move unscoped legacy values into this namespace once. A namespaced value
   * wins; the legacy key is removed either way so no later identity inherits
   * it. Returns the number of values copied.
   */
  migrateLegacy(entries: LegacyPreferenceKey[]): number {
    let migrated = 0;
    entries.forEach(({ legacyKey, key, area }) => {
      const storage = this.storage(area);
      if (!storage || !legacyKey) return;
      try {
        const legacy = storage.getItem(legacyKey);
        if (legacy === null) return;
        if (storage.getItem(this.keyFor(key)) === null) {
          storage.setItem(this.keyFor(key), legacy);
          migrated += 1;
        }
        storage.removeItem(legacyKey);
      } catch {
        // Ignore blocked or unavailable browser storage.
      }
    });
    return migrated;
  }

  private storage(area: ConsoleStorageArea): Storage | null {
    if (this.provider) {
      const storage = area === 'local' ? this.provider.local : this.provider.session;
      return storage ?? null;
    }
    return defaultStorage(area);
  }
}

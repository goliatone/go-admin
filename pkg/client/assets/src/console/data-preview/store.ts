// Launches remembered across page navigations in this browser tab, so an
// operator returning from a preview sees the session they left (and can still
// close it), and a launch sent without a definitive answer can still be
// replayed with its request ID. Only exact selections, surface labels,
// session locators and request IDs are kept: never a launch URL, expiry or
// anything a view showed. Entries are bounded, scoped to the console identity
// (application, environment, actor and scope) and dropped after a day; the
// server re-authorizes every one of them before anything is shown.

import { isRecord, oneOf, parseSelection, str, type ExploreSelection } from '../data-explorer/contract.js';
import { PREVIEW_LIMITS, previewID, type PreviewSurface } from './contract.js';
import { launchStoreKey } from './keys.js';

export type StoredLaunch = {
  selection: ExploreSelection;
  surface: PreviewSurface;
  /** Session locator, once the server answered with one. */
  session_id?: string;
  /** Request ID of a launch sent without a definitive answer. */
  request_id?: string;
  at: number;
};

export type LaunchStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export { LAUNCH_STORE_PREFIX } from './keys.js';
export const LAUNCH_STORE_LIMIT = 16;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The tab's session storage, or null where it is unavailable or blocked. */
export function defaultLaunchStorage(): LaunchStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function parseStored(value: unknown, now: number): StoredLaunch | null {
  if (!isRecord(value) || !isRecord(value.surface)) return null;
  const selection = parseSelection(value.selection);
  const surface = { id: previewID(value.surface.id), label: str(value.surface.label), kind: oneOf(value.surface.kind, ['screen', 'report'] as const) };
  const at = typeof value.at === 'number' && Number.isFinite(value.at) ? value.at : NaN;
  if (!selection || selection.context !== 'prepared' || !surface.id || !surface.label || surface.label.length > PREVIEW_LIMITS.labelBytes || !surface.kind) return null;
  if (!(now - at < MAX_AGE_MS) || at > now + MAX_AGE_MS) return null;
  const out: StoredLaunch = { selection, surface: surface as PreviewSurface, at };
  const session = previewID(value.session_id);
  const request = typeof value.request_id === 'string' && REQUEST_ID.test(value.request_id) ? value.request_id : '';
  if (session) out.session_id = session;
  if (request) out.request_id = request;
  return session || request ? out : null;
}

export class LaunchStore {
  private readonly storage: LaunchStorage | null;
  private readonly key: string;
  private readonly now: () => number;

  constructor(storage: LaunchStorage | null, scope: string, now: () => number) {
    this.storage = storage;
    this.key = launchStoreKey(scope);
    this.now = now;
  }

  /** Remembered launches, oldest first; malformed, foreign-shaped or old entries are dropped. */
  read(): StoredLaunch[] {
    if (!this.storage) return [];
    try {
      const raw: unknown = JSON.parse(this.storage.getItem(this.key) || '[]');
      if (!Array.isArray(raw)) return [];
      const now = this.now();
      return raw.map((item) => parseStored(item, now)).filter((item): item is StoredLaunch => item !== null).slice(-LAUNCH_STORE_LIMIT);
    } catch {
      return [];
    }
  }

  write(entries: StoredLaunch[]): void {
    if (!this.storage) return;
    try {
      const kept = entries.slice(-LAUNCH_STORE_LIMIT);
      if (kept.length === 0) this.storage.removeItem(this.key);
      else this.storage.setItem(this.key, JSON.stringify(kept));
    } catch {
      // Full or blocked storage: launches are simply not remembered.
    }
  }

  wipe(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(this.key);
    } catch {
      // Blocked storage holds nothing to wipe.
    }
  }
}

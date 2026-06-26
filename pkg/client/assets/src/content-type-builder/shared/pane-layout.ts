/**
 * Shared Pane Layout Controller
 *
 * A small, surface-agnostic primitive that gives the content-modeling builders
 * (Content Types and Block Library) the same collapsible / resizable / focusable
 * pane behavior, with persistence, so the two surfaces do not drift again.
 *
 * Responsibilities:
 *  - Collapse / expand named side rails.
 *  - Resize rails via a draggable splitter, clamped to sensible min/max widths.
 *  - Enter a "focus" (maximize) mode for a single pane, hiding sibling chrome.
 *  - Persist collapsed state, rail widths, and focus preference per surface under
 *    a versioned storage key, restoring (and clamping) them on the next visit.
 *
 * The controller only owns lightweight DOM state: it toggles `data-collapsed`
 * on rails, sets inline width on resizable rails, sets `data-pane-focus` on the
 * root, and keeps ARIA state on the controls. All visual styling lives in CSS so
 * the same controller drives JS-rendered (Content Types) and SSR (Block Library)
 * shells.
 *
 * DOM contract (all queried within the controller root):
 *  - Rail:          `[data-pane-rail="<id>"]`
 *  - Collapse btn:  `[data-pane-toggle="<id>"]`   (aria-expanded reflects state)
 *  - Resize handle: `[data-pane-resize="<id>"]`   (drag to resize rail <id>)
 *  - Focus toggle:  `[data-pane-focus-toggle="<paneId>"]` (aria-pressed reflects)
 *  - Focus exit:    `[data-pane-focus-exit]`       (clears focus mode)
 */

export const PANE_LAYOUT_VERSION = 1;
const STORAGE_PREFIX = 'cm-pane';

export type PaneRailEdge = 'leading' | 'trailing';

export interface PaneRailDef {
  /** Stable rail id, e.g. "list" or "palette". */
  id: string;
  /** Whether the rail can be resized via a splitter handle. */
  resizable?: boolean;
  /** Which edge the splitter sits on. A left rail uses "trailing", a right rail "leading". */
  edge?: PaneRailEdge;
  /** Minimum width (px) when resizable. */
  min?: number;
  /** Maximum width (px) when resizable. */
  max?: number;
  /** Default width (px) when resizable and nothing is persisted. */
  defaultWidth?: number;
  /** Whether the rail starts collapsed when nothing is persisted. */
  defaultCollapsed?: boolean;
}

export interface PaneLayoutConfig {
  /** Surface namespace for persistence, e.g. "content-types" or "block-library". */
  surface: string;
  /** Schema version for the persisted payload; bump to invalidate stale prefs. */
  version?: number;
  /** Rail definitions. */
  rails: PaneRailDef[];
  /** Valid focus/maximize targets. Empty disables focus mode. */
  focusPanes?: string[];
  /** Injectable storage (tests). Defaults to a safe localStorage wrapper. */
  storage?: StorageLike | null;
  /** Called after any state change with a snapshot of the current state. */
  onChange?: (state: PaneLayoutState) => void;
}

export interface PaneRailState {
  collapsed: boolean;
  /** Persisted width (px) for resizable rails; null means "use CSS default". */
  width: number | null;
}

export interface PaneLayoutState {
  rails: Record<string, PaneRailState>;
  focus: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// Pure helpers (no DOM) — independently unit-testable
// ---------------------------------------------------------------------------

/** Clamp a finite number into [min, max]; returns null for non-finite input. */
export function clampWidth(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(hi, Math.max(lo, n));
}

/** Versioned, surface-scoped storage key. */
export function paneStorageKey(config: PaneLayoutConfig): string {
  const version = config.version ?? PANE_LAYOUT_VERSION;
  return `${STORAGE_PREFIX}:v${version}:${config.surface}`;
}

/** Build the default state from config (used when nothing is persisted). */
export function defaultPaneState(config: PaneLayoutConfig): PaneLayoutState {
  const rails: Record<string, PaneRailState> = {};
  for (const rail of config.rails) {
    rails[rail.id] = {
      collapsed: rail.defaultCollapsed === true,
      width: rail.resizable && typeof rail.defaultWidth === 'number'
        ? clampWidth(rail.defaultWidth, rail.min ?? 0, rail.max ?? rail.defaultWidth)
        : null,
    };
  }
  return { rails, focus: null };
}

/**
 * Coerce an arbitrary (possibly stale or hostile) persisted payload into a valid
 * state for the current config. Unknown rails are dropped, widths are clamped to
 * each rail's [min, max], and an out-of-range focus target is reset to null.
 */
export function sanitizePaneState(raw: unknown, config: PaneLayoutConfig): PaneLayoutState {
  const base = defaultPaneState(config);
  if (!raw || typeof raw !== 'object') return base;

  const parsed = raw as { rails?: unknown; focus?: unknown };
  const railsIn = parsed.rails && typeof parsed.rails === 'object'
    ? (parsed.rails as Record<string, unknown>)
    : {};

  for (const rail of config.rails) {
    const stored = railsIn[rail.id];
    if (!stored || typeof stored !== 'object') continue;
    const s = stored as { collapsed?: unknown; width?: unknown };
    if (typeof s.collapsed === 'boolean') {
      base.rails[rail.id].collapsed = s.collapsed;
    }
    if (rail.resizable) {
      const clamped = clampWidth(s.width, rail.min ?? 0, rail.max ?? Number.MAX_SAFE_INTEGER);
      // A stored null/invalid width legitimately means "use CSS default".
      base.rails[rail.id].width = clamped;
    } else {
      base.rails[rail.id].width = null;
    }
  }

  const focusPanes = config.focusPanes ?? [];
  if (typeof parsed.focus === 'string' && focusPanes.includes(parsed.focus)) {
    base.focus = parsed.focus;
  }

  return base;
}

// ---------------------------------------------------------------------------
// Safe storage
// ---------------------------------------------------------------------------

/**
 * Returns a storage wrapper that never throws (private mode, blocked storage).
 * Falls back to an in-memory map when persistent storage is unavailable.
 */
export function createSafeStorage(preferred?: StorageLike | null): StorageLike {
  let backing: StorageLike | null = preferred ?? null;
  if (backing === null && typeof preferred === 'undefined') {
    try {
      backing = typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      backing = null;
    }
  }

  const memory = new Map<string, string>();
  return {
    getItem(key) {
      if (backing) {
        try {
          return backing.getItem(key);
        } catch {
          /* fall through to memory */
        }
      }
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key, value) {
      if (backing) {
        try {
          backing.setItem(key, value);
          return;
        } catch {
          /* fall through to memory */
        }
      }
      memory.set(key, value);
    },
    removeItem(key) {
      if (backing) {
        try {
          backing.removeItem(key);
        } catch {
          /* fall through to memory */
        }
      }
      memory.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// DOM controller
// ---------------------------------------------------------------------------

export class PaneLayoutController {
  private readonly root: HTMLElement;
  private readonly config: PaneLayoutConfig;
  private readonly railDefs: Map<string, PaneRailDef>;
  private readonly storage: StorageLike;
  private readonly storageKey: string;
  private state: PaneLayoutState;
  private readonly cleanups: Array<() => void> = [];
  private dragCleanup: (() => void) | null = null;

  constructor(root: HTMLElement, config: PaneLayoutConfig) {
    this.root = root;
    this.config = config;
    this.railDefs = new Map(config.rails.map((rail) => [rail.id, rail]));
    this.storage = createSafeStorage(config.storage);
    this.storageKey = paneStorageKey(config);
    this.state = this.restore();
  }

  /** Restore persisted state, falling back to clamped defaults. */
  private restore(): PaneLayoutState {
    let raw: unknown = null;
    const stored = this.storage.getItem(this.storageKey);
    if (stored) {
      try {
        raw = JSON.parse(stored);
      } catch {
        raw = null;
      }
    }
    return sanitizePaneState(raw, this.config);
  }

  private persist(): void {
    this.storage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  private emitChange(): void {
    if (this.config.onChange) {
      this.config.onChange(this.getState());
    }
  }

  /** Public, defensive snapshot of the current state. */
  getState(): PaneLayoutState {
    return {
      focus: this.state.focus,
      rails: Object.fromEntries(
        Object.entries(this.state.rails).map(([id, rail]) => [id, { ...rail }]),
      ),
    };
  }

  /** Wire DOM, apply restored state, and return self for chaining. */
  init(): this {
    this.apply();
    this.bindControls();
    return this;
  }

  // --- state mutations --------------------------------------------------

  setRailCollapsed(id: string, collapsed: boolean, opts?: { persist?: boolean }): void {
    const rail = this.state.rails[id];
    if (!rail || rail.collapsed === collapsed) return;
    rail.collapsed = collapsed;
    this.applyRail(id);
    if (opts?.persist !== false) this.persist();
    this.emitChange();
  }

  toggleRail(id: string): void {
    const rail = this.state.rails[id];
    if (!rail) return;
    this.setRailCollapsed(id, !rail.collapsed);
  }

  setRailWidth(id: string, width: number, opts?: { persist?: boolean }): void {
    const def = this.railDefs.get(id);
    const rail = this.state.rails[id];
    if (!def || !def.resizable || !rail) return;
    rail.width = clampWidth(width, def.min ?? 0, def.max ?? Number.MAX_SAFE_INTEGER);
    this.applyRail(id);
    if (opts?.persist !== false) this.persist();
    this.emitChange();
  }

  setFocus(paneId: string | null, opts?: { persist?: boolean }): void {
    const focusPanes = this.config.focusPanes ?? [];
    const next = paneId && focusPanes.includes(paneId) ? paneId : null;
    if (this.state.focus === next) return;
    this.state.focus = next;
    this.applyFocus();
    if (opts?.persist !== false) this.persist();
    this.emitChange();
  }

  toggleFocus(paneId: string): void {
    this.setFocus(this.state.focus === paneId ? null : paneId);
  }

  // --- DOM application --------------------------------------------------

  /** Apply the whole state to the DOM. */
  apply(): void {
    for (const id of Object.keys(this.state.rails)) {
      this.applyRail(id);
    }
    this.applyFocus();
  }

  private applyRail(id: string): void {
    const rail = this.state.rails[id];
    const def = this.railDefs.get(id);
    if (!rail || !def) return;

    const el = this.root.querySelector<HTMLElement>(`[data-pane-rail="${id}"]`);
    if (el) {
      el.setAttribute('data-collapsed', rail.collapsed ? 'true' : 'false');
      if (def.resizable && rail.width != null && !rail.collapsed) {
        el.style.flexBasis = `${rail.width}px`;
        el.style.width = `${rail.width}px`;
      } else {
        // Let CSS own width when collapsed or when no explicit width is set.
        el.style.removeProperty('flex-basis');
        el.style.removeProperty('width');
      }
    }

    const toggles = this.root.querySelectorAll<HTMLElement>(`[data-pane-toggle="${id}"]`);
    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-expanded', rail.collapsed ? 'false' : 'true');
      toggle.setAttribute('data-pane-collapsed', rail.collapsed ? 'true' : 'false');
    });
  }

  private applyFocus(): void {
    if (this.state.focus) {
      this.root.setAttribute('data-pane-focus', this.state.focus);
    } else {
      this.root.removeAttribute('data-pane-focus');
    }
    const toggles = this.root.querySelectorAll<HTMLElement>('[data-pane-focus-toggle]');
    toggles.forEach((toggle) => {
      const target = toggle.getAttribute('data-pane-focus-toggle') ?? '';
      toggle.setAttribute('aria-pressed', this.state.focus === target ? 'true' : 'false');
    });
  }

  // --- control binding --------------------------------------------------

  private bindControls(): void {
    const onToggleClick = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-pane-toggle]');
      if (!target || !this.root.contains(target)) return;
      const id = target.getAttribute('data-pane-toggle');
      if (id) {
        event.preventDefault();
        this.toggleRail(id);
      }
    };

    const onFocusClick = (event: Event) => {
      const exit = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-pane-focus-exit]');
      if (exit && this.root.contains(exit)) {
        event.preventDefault();
        this.setFocus(null);
        return;
      }
      const toggle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-pane-focus-toggle]');
      if (toggle && this.root.contains(toggle)) {
        const paneId = toggle.getAttribute('data-pane-focus-toggle');
        if (paneId) {
          event.preventDefault();
          this.toggleFocus(paneId);
        }
      }
    };

    const onResizeStart = (event: Event) => {
      const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-pane-resize]');
      if (!handle || !this.root.contains(handle)) return;
      const id = handle.getAttribute('data-pane-resize');
      if (id) this.beginResize(id, event as MouseEvent);
    };

    this.root.addEventListener('click', onToggleClick);
    this.root.addEventListener('click', onFocusClick);
    this.root.addEventListener('mousedown', onResizeStart);

    this.cleanups.push(() => {
      this.root.removeEventListener('click', onToggleClick);
      this.root.removeEventListener('click', onFocusClick);
      this.root.removeEventListener('mousedown', onResizeStart);
    });
  }

  private beginResize(id: string, event: MouseEvent): void {
    const def = this.railDefs.get(id);
    const rail = this.state.rails[id];
    const el = this.root.querySelector<HTMLElement>(`[data-pane-rail="${id}"]`);
    if (!def || !def.resizable || !rail || !el) return;
    if (rail.collapsed) return;

    event.preventDefault();
    this.endResize();

    const startX = event.clientX;
    const startWidth = rail.width ?? el.getBoundingClientRect().width;
    const edge: PaneRailEdge = def.edge ?? 'trailing';

    const onMove = (move: MouseEvent) => {
      const dx = move.clientX - startX;
      const delta = edge === 'leading' ? -dx : dx;
      this.setRailWidth(id, startWidth + delta, { persist: false });
    };

    const onUp = () => {
      this.endResize();
      this.persist();
    };

    const ownerDoc = el.ownerDocument || document;
    ownerDoc.addEventListener('mousemove', onMove);
    ownerDoc.addEventListener('mouseup', onUp);
    this.root.setAttribute('data-pane-resizing', id);

    this.dragCleanup = () => {
      ownerDoc.removeEventListener('mousemove', onMove);
      ownerDoc.removeEventListener('mouseup', onUp);
      this.root.removeAttribute('data-pane-resizing');
      this.dragCleanup = null;
    };
  }

  private endResize(): void {
    if (this.dragCleanup) this.dragCleanup();
  }

  /** Remove listeners. Persisted state and applied DOM are left intact. */
  destroy(): void {
    this.endResize();
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;
  }
}

/**
 * Convenience factory. Returns null when the root is missing so callers can
 * safely no-op on surfaces that have not rendered the shell.
 */
export function createPaneLayout(
  root: HTMLElement | null,
  config: PaneLayoutConfig,
): PaneLayoutController | null {
  if (!root) return null;
  return new PaneLayoutController(root, config).init();
}

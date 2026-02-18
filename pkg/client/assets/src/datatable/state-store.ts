import type { ColumnFilter, SortColumn } from './behaviors/types.js';
import type { ViewMode, GroupExpandMode } from './grouped-mode.js';

export type DataGridStateStoreMode = 'local' | 'preferences';

export interface DataGridPersistedState {
  version: 1;
  viewMode?: ViewMode;
  expandMode?: GroupExpandMode;
  expandedGroups?: string[];
  hiddenColumns?: string[];
  columnOrder?: string[];
  updatedAt?: number;
}

export interface DataGridShareState {
  version: 1;
  search?: string;
  page?: number;
  perPage?: number;
  filters?: ColumnFilter[];
  sort?: SortColumn[];
  persisted?: DataGridPersistedState;
  updatedAt?: number;
}

export interface DataGridStateStore {
  hydrate?(): Promise<void>;
  loadPersistedState(): DataGridPersistedState | null;
  savePersistedState(state: DataGridPersistedState): void;
  clearPersistedState(): void;
  createShareState(state: DataGridShareState): string | null;
  resolveShareState(token: string): DataGridShareState | null;
}

export interface DataGridStateStoreConfig {
  key: string;
  mode?: DataGridStateStoreMode;
  preferencesEndpoint?: string;
  resource?: string;
  syncDebounceMs?: number;
  maxShareEntries?: number;
}

const PERSISTED_PREFIX = 'datagrid.state.';
const SHARE_PREFIX = 'datagrid.share.';
const SHARE_INDEX_KEY = 'datagrid.share.index';
const DEFAULT_MAX_SHARE_ENTRIES = 20;

function toStorageKey(value: string): string {
  const trimmed = String(value || '').trim();
  return trimmed || 'default';
}

function normalizeStringArray(value: unknown, options: { allowEmpty?: boolean } = {}): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  if (out.length === 0) {
    return options.allowEmpty === true ? [] : undefined;
  }
  return Array.from(new Set(out));
}

function normalizePersistedState(value: unknown): DataGridPersistedState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const out: DataGridPersistedState = { version: 1 };

  if (record.viewMode === 'flat' || record.viewMode === 'grouped' || record.viewMode === 'matrix') {
    out.viewMode = record.viewMode;
  }
  if (record.expandMode === 'all' || record.expandMode === 'none' || record.expandMode === 'explicit') {
    out.expandMode = record.expandMode;
  }
  const expanded = normalizeStringArray(record.expandedGroups, { allowEmpty: true });
  if (expanded !== undefined) out.expandedGroups = expanded;
  const hiddenColumns = normalizeStringArray(record.hiddenColumns, { allowEmpty: true });
  if (hiddenColumns !== undefined) out.hiddenColumns = hiddenColumns;
  const columnOrder = normalizeStringArray(record.columnOrder);
  if (columnOrder) out.columnOrder = columnOrder;
  if (typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)) {
    out.updatedAt = record.updatedAt;
  }
  return out;
}

function normalizeShareState(value: unknown): DataGridShareState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const out: DataGridShareState = { version: 1 };

  if (typeof record.search === 'string') {
    const search = record.search.trim();
    if (search) out.search = search;
  }
  if (typeof record.page === 'number' && Number.isFinite(record.page)) {
    out.page = Math.max(1, Math.trunc(record.page));
  }
  if (typeof record.perPage === 'number' && Number.isFinite(record.perPage)) {
    out.perPage = Math.max(1, Math.trunc(record.perPage));
  }
  if (Array.isArray(record.filters)) {
    out.filters = record.filters as ColumnFilter[];
  }
  if (Array.isArray(record.sort)) {
    out.sort = record.sort as SortColumn[];
  }
  const persisted = normalizePersistedState(record.persisted);
  if (persisted) {
    out.persisted = persisted;
  }
  if (typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)) {
    out.updatedAt = record.updatedAt;
  }
  return out;
}

function normalizePreferencesEndpoint(value?: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/api/preferences';
  return trimmed.replace(/\/+$/, '');
}

function normalizeResource(value?: string): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '');
}

function newShareToken(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}${rand}`.slice(0, 16);
}

interface ShareIndexEntry {
  token: string;
  updatedAt: number;
}

function loadShareIndex(maxEntries: number): ShareIndexEntry[] {
  try {
    const raw = localStorage.getItem(SHARE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map((entry): ShareIndexEntry | null => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const rec = entry as Record<string, unknown>;
        const token = typeof rec.token === 'string' ? rec.token.trim() : '';
        const updatedAt = typeof rec.updatedAt === 'number' ? rec.updatedAt : 0;
        if (!token || !Number.isFinite(updatedAt)) return null;
        return { token, updatedAt };
      })
      .filter((entry): entry is ShareIndexEntry => entry !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    if (normalized.length <= maxEntries) {
      return normalized;
    }
    return normalized.slice(0, maxEntries);
  } catch {
    return [];
  }
}

function saveShareIndex(index: ShareIndexEntry[]): void {
  try {
    localStorage.setItem(SHARE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Ignore storage failures.
  }
}

export class LocalDataGridStateStore implements DataGridStateStore {
  protected readonly key: string;
  protected readonly persistedStorageKey: string;
  protected readonly maxShareEntries: number;

  constructor(config: DataGridStateStoreConfig) {
    const normalizedKey = toStorageKey(config.key);
    this.key = normalizedKey;
    this.persistedStorageKey = `${PERSISTED_PREFIX}${normalizedKey}`;
    this.maxShareEntries = Math.max(1, config.maxShareEntries || DEFAULT_MAX_SHARE_ENTRIES);
  }

  loadPersistedState(): DataGridPersistedState | null {
    try {
      const raw = localStorage.getItem(this.persistedStorageKey);
      if (!raw) return null;
      return normalizePersistedState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  savePersistedState(state: DataGridPersistedState): void {
    const normalized = normalizePersistedState(state);
    if (!normalized) return;
    if (!normalized.updatedAt) {
      normalized.updatedAt = Date.now();
    }
    try {
      localStorage.setItem(this.persistedStorageKey, JSON.stringify(normalized));
    } catch {
      // Ignore storage failures.
    }
  }

  clearPersistedState(): void {
    try {
      localStorage.removeItem(this.persistedStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  createShareState(state: DataGridShareState): string | null {
    const normalized = normalizeShareState(state);
    if (!normalized) return null;
    if (!normalized.updatedAt) {
      normalized.updatedAt = Date.now();
    }
    const token = newShareToken();
    const storageKey = `${SHARE_PREFIX}${token}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(normalized));
      const nextIndex = loadShareIndex(this.maxShareEntries)
        .filter((entry) => entry.token !== token);
      nextIndex.unshift({ token, updatedAt: normalized.updatedAt });
      while (nextIndex.length > this.maxShareEntries) {
        const removed = nextIndex.pop();
        if (removed) {
          localStorage.removeItem(`${SHARE_PREFIX}${removed.token}`);
        }
      }
      saveShareIndex(nextIndex);
      return token;
    } catch {
      return null;
    }
  }

  resolveShareState(token: string): DataGridShareState | null {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) return null;
    try {
      const raw = localStorage.getItem(`${SHARE_PREFIX}${normalizedToken}`);
      if (!raw) return null;
      return normalizeShareState(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}

export class PreferencesDataGridStateStore extends LocalDataGridStateStore {
  private readonly preferencesEndpoint: string;
  private readonly resource: string;
  private readonly syncDebounceMs: number;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: DataGridStateStoreConfig) {
    super(config);
    this.preferencesEndpoint = normalizePreferencesEndpoint(config.preferencesEndpoint);
    this.resource = normalizeResource(config.resource) || this.key;
    this.syncDebounceMs = Math.max(100, config.syncDebounceMs || 1000);
  }

  private get serverStateKey(): string {
    return `ui.datagrid.${this.resource}.state`;
  }

  async hydrate(): Promise<void> {
    try {
      const url = this.buildKeysQueryURL(this.serverStateKey);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const record = this.extractFirstRecord(payload);
      if (!record) return;
      const effective = this.extractMap(record.effective);
      const raw = this.extractMap(record.raw);
      const candidate = effective[this.serverStateKey] ?? raw[this.serverStateKey];
      const normalized = normalizePersistedState(candidate);
      if (normalized) {
        super.savePersistedState(normalized);
      }
    } catch {
      // Ignore hydrate failures and fall back to local cache.
    }
  }

  override savePersistedState(state: DataGridPersistedState): void {
    super.savePersistedState(state);
    const normalized = normalizePersistedState(state);
    if (!normalized) return;
    this.scheduleServerSync(normalized);
  }

  override clearPersistedState(): void {
    super.clearPersistedState();
    this.scheduleServerClear();
  }

  private scheduleServerSync(state: DataGridPersistedState): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      void this.syncToServer(state);
    }, this.syncDebounceMs);
  }

  private scheduleServerClear(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      void this.clearServerState();
    }, this.syncDebounceMs);
  }

  private async syncToServer(state: DataGridPersistedState): Promise<void> {
    try {
      await fetch(this.preferencesEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          raw: {
            [this.serverStateKey]: state,
          },
        }),
      });
    } catch {
      // Ignore sync failures and keep local state authoritative.
    }
  }

  private async clearServerState(): Promise<void> {
    try {
      await fetch(this.preferencesEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          clear_raw_keys: [this.serverStateKey],
        }),
      });
    } catch {
      // Ignore clear failures.
    }
  }

  private buildKeysQueryURL(key: string): string {
    const separator = this.preferencesEndpoint.includes('?') ? '&' : '?';
    return `${this.preferencesEndpoint}${separator}keys=${encodeURIComponent(key)}`;
  }

  private extractFirstRecord(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const root = payload as Record<string, unknown>;
    const records = Array.isArray(root.records)
      ? root.records
      : Array.isArray(root.data)
        ? root.data
        : [];
    if (records.length === 0) return null;
    const first = records[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      return null;
    }
    return first as Record<string, unknown>;
  }

  private extractMap(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}

export function createDataGridStateStore(config: DataGridStateStoreConfig): DataGridStateStore {
  const mode = config.mode || 'local';
  if (mode === 'preferences') {
    return new PreferencesDataGridStateStore(config);
  }
  return new LocalDataGridStateStore(config);
}

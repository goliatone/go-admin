export interface SyncCoreResourceRef {
  kind: string;
  id: string;
  scope?: Record<string, string>;
}

export interface SyncCoreResourceSnapshot<T = unknown> {
  ref: SyncCoreResourceRef;
  data: T;
  revision: number;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SyncCoreMutationResponse<T = unknown> {
  snapshot: SyncCoreResourceSnapshot<T>;
  applied: boolean;
  replay: boolean;
}

export interface SyncCoreConflict<T = unknown> {
  code: 'STALE_REVISION';
  message: string;
  currentRevision?: number;
  latestSnapshot: SyncCoreResourceSnapshot<T> | null;
  staleSnapshot: SyncCoreResourceSnapshot<T> | null;
}

export interface SyncCoreError<T = unknown> {
  code: string;
  message: string;
  currentRevision?: number;
  retriable?: boolean;
  conflict?: SyncCoreConflict<T>;
  resource?: SyncCoreResourceSnapshot<T>;
  details?: unknown;
}

export interface SyncCoreResourceState<T = unknown> {
  ref: SyncCoreResourceRef;
  status: string;
  snapshot: SyncCoreResourceSnapshot<T> | null;
  invalidated: boolean;
  invalidationReason?: string;
  queueDepth: number;
  error: SyncCoreError<T> | null;
  conflict: SyncCoreConflict<T> | null;
}

export interface SyncCoreMutationInput<P = unknown> {
  ref: SyncCoreResourceRef;
  operation: string;
  payload: P;
  expectedRevision?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncCoreResource<T = unknown, P = unknown> {
  getSnapshot(): SyncCoreResourceSnapshot<T> | null;
  getState(): SyncCoreResourceState<T>;
  subscribe(listener: (state: SyncCoreResourceState<T>) => void): () => void;
  load(): Promise<SyncCoreResourceSnapshot<T>>;
  mutate(
    input: SyncCoreMutationInput<P> | (Omit<SyncCoreMutationInput<P>, 'ref'> & { ref?: SyncCoreResourceRef }),
  ): Promise<SyncCoreMutationResponse<T>>;
  invalidate(reason?: string): void;
  refresh(options?: { force?: boolean }): Promise<SyncCoreResourceSnapshot<T>>;
}

export interface SyncCoreTransport {
  load<T>(ref: SyncCoreResourceRef): Promise<SyncCoreResourceSnapshot<T>>;
  mutate<T, P>(input: SyncCoreMutationInput<P>): Promise<SyncCoreMutationResponse<T>>;
}

export interface SyncCoreModule {
  createInMemoryCache(): {
    set<T>(ref: SyncCoreResourceRef, snapshot: SyncCoreResourceSnapshot<T> | null): unknown;
    clear(ref: SyncCoreResourceRef): void;
  };
  createFetchSyncTransport(options?: Record<string, unknown>): SyncCoreTransport;
  createSyncEngine(options: Record<string, unknown>): {
    resource<T, P = unknown>(ref: SyncCoreResourceRef): SyncCoreResource<T, P>;
  };
  parseReadEnvelope<T>(ref: SyncCoreResourceRef, payload: unknown): SyncCoreResourceSnapshot<T>;
}

declare global {
  interface Window {
    __esignSyncCoreLoader?: (clientBasePath: string) => Promise<SyncCoreModule>;
    __esignSyncCoreModule?: SyncCoreModule;
  }
}

const syncCoreModuleCache = new Map<string, Promise<SyncCoreModule>>();

export async function loadSyncCoreModule(clientBasePath: string): Promise<SyncCoreModule> {
  const normalizedBasePath = String(clientBasePath || '').trim().replace(/\/+$/, '');
  if (normalizedBasePath === '') {
    throw new Error('sync.client_base_path is required to load sync-core');
  }

  if (typeof window !== 'undefined' && window.__esignSyncCoreModule) {
    return validateSyncCoreModule(window.__esignSyncCoreModule);
  }

  if (!syncCoreModuleCache.has(normalizedBasePath)) {
    syncCoreModuleCache.set(normalizedBasePath, importSyncCoreModule(normalizedBasePath));
  }
  return syncCoreModuleCache.get(normalizedBasePath)!;
}

async function importSyncCoreModule(clientBasePath: string): Promise<SyncCoreModule> {
  if (typeof window !== 'undefined' && typeof window.__esignSyncCoreLoader === 'function') {
    return validateSyncCoreModule(await window.__esignSyncCoreLoader(clientBasePath));
  }

  const runtimeURL = `${clientBasePath}/index.js`;
  const imported = await import(/* @vite-ignore */ runtimeURL);
  return validateSyncCoreModule(imported as SyncCoreModule);
}

function validateSyncCoreModule(module: SyncCoreModule): SyncCoreModule {
  if (
    !module
    || typeof module.createInMemoryCache !== 'function'
    || typeof module.createFetchSyncTransport !== 'function'
    || typeof module.createSyncEngine !== 'function'
    || typeof module.parseReadEnvelope !== 'function'
  ) {
    throw new TypeError('Invalid sync-core runtime module');
  }
  return module;
}

import type {
  BoundMutationRequest,
  MutationRequest,
  MutationResponse,
  ResourceRef,
  ResourceSnapshot,
  SyncConflict,
  SyncError,
  SyncEnvelopeError,
  SyncResource,
  SyncResourceListener,
  SyncResourceState,
  SyncRetryPolicy,
} from "./contracts";
import type { SyncTransport } from "./transport";
import { cloneValue } from "./internal/clone";

interface CacheEntry<T> {
  ref: ResourceRef;
  snapshot: ResourceSnapshot<T> | null;
  invalidated: boolean;
  invalidationReason?: string;
}

interface ResourceRecord<T = unknown> {
  ref: ResourceRef;
  key: string;
  state: SyncResourceState<T>;
  listeners: Set<SyncResourceListener<T>>;
  inFlightLoad: Promise<ResourceSnapshot<T>> | null;
  loadRequestID: number;
  queue: MutationQueueEntry<T>[];
  processingQueue: boolean;
}

interface MutationQueueEntry<T> {
  input: MutationRequest<unknown> | BoundMutationRequest<unknown>;
  resolve: (value: MutationResponse<T>) => void;
  reject: (reason: unknown) => void;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export interface InMemorySyncCache {
  get<T>(ref: ResourceRef): CacheEntry<T> | null;
  set<T>(ref: ResourceRef, snapshot: ResourceSnapshot<T> | null): CacheEntry<T>;
  invalidate(ref: ResourceRef, reason?: string): CacheEntry<unknown>;
  clear(ref: ResourceRef): void;
}

export interface SyncEngine {
  resource<T, P = unknown>(ref: ResourceRef): SyncResource<T, P>;
  getState<T>(ref: ResourceRef): SyncResourceState<T> | null;
  invalidate(ref: ResourceRef, reason?: string): void;
}

export interface SyncEngineOptions {
  transport: SyncTransport;
  cache?: InMemorySyncCache;
  retry?: Partial<SyncRetryPolicy>;
  random?: () => number;
  wait?: (delayMs: number) => Promise<void>;
}

export interface CreateSyncResourceOptions extends SyncEngineOptions {
  ref: ResourceRef;
}

const RETRIABLE_ERROR_CODES = new Set([
  "RATE_LIMITED",
  "TEMPORARY_FAILURE",
  "TRANSPORT_UNAVAILABLE",
]);

export const DEFAULT_RETRY_POLICY: SyncRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2_000,
  jitterRatio: 0.2,
};

export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  const cache = options.cache ?? createInMemoryCache();
  const retryPolicy = resolveRetryPolicy(options.retry);
  const random = options.random ?? Math.random;
  const wait = options.wait ?? defaultWait;
  const records = new Map<string, ResourceRecord<unknown>>();

  return {
    resource<T, P = unknown>(ref: ResourceRef): SyncResource<T, P> {
      const record = getOrCreateRecord<T>(ref);

      return {
        getSnapshot() {
          return cloneSnapshot(record.state.snapshot);
        },
        getState() {
          return cloneState(record.state);
        },
        subscribe(listener: SyncResourceListener<T>) {
          record.listeners.add(listener);
          listener(cloneState(record.state));
          return () => {
            record.listeners.delete(listener);
          };
        },
        async load() {
          if (record.state.snapshot && !record.state.invalidated) {
            return cloneRequiredSnapshot(record.state.snapshot);
          }
          return fetchRecord(record, "load", false);
        },
        async mutate(input: MutationRequest<P> | BoundMutationRequest<P>) {
          return enqueueMutation(record, input);
        },
        invalidate(reason?: string) {
          invalidateRecord(record, reason);
        },
        async refresh(options?: { force?: boolean }) {
          return fetchRecord(record, "refresh", options?.force ?? false);
        },
      };
    },
    getState<T>(ref: ResourceRef) {
      const existing = records.get(createResourceKey(ref));
      return existing ? cloneState(existing.state as SyncResourceState<T>) : null;
    },
    invalidate(ref: ResourceRef, reason?: string) {
      invalidateRecord(getOrCreateRecord(ref), reason);
    },
  };

  function getOrCreateRecord<T>(ref: ResourceRef): ResourceRecord<T> {
    const key = createResourceKey(ref);
    const existing = records.get(key);
    if (existing) {
      return existing as ResourceRecord<T>;
    }

    const cached = cache.get<T>(ref);
    const record: ResourceRecord<T> = {
      ref: cloneRef(ref),
      key,
      state: {
        ref: cloneRef(ref),
        status: cached?.snapshot ? "ready" : "idle",
        snapshot: cloneSnapshot(cached?.snapshot ?? null),
        invalidated: cached?.invalidated ?? false,
        invalidationReason: cached?.invalidationReason,
        queueDepth: 0,
        error: null,
        conflict: null,
      },
      listeners: new Set(),
      inFlightLoad: null,
      loadRequestID: 0,
      queue: [],
      processingQueue: false,
    };

    records.set(key, record as ResourceRecord<unknown>);
    return record;
  }

  function invalidateRecord<T>(record: ResourceRecord<T>, reason?: string): void {
    const entry = cache.invalidate(record.ref, reason);
    record.state = {
      ...record.state,
      invalidated: entry.invalidated,
      invalidationReason: entry.invalidationReason,
    };
    emit(record);
  }

  async function fetchRecord<T>(
    record: ResourceRecord<T>,
    mode: "load" | "refresh",
    force: boolean,
  ): Promise<ResourceSnapshot<T>> {
    if (record.inFlightLoad && !force) {
      return record.inFlightLoad;
    }
    const requestID = record.loadRequestID + 1;
    record.loadRequestID = requestID;

    record.state = {
      ...record.state,
      status: record.state.snapshot ? "refreshing" : "loading",
      error: null,
      conflict: null,
    };
    emit(record);

    const task = options.transport
      .load<T>(cloneRef(record.ref))
      .then((snapshot) => {
        const nextSnapshot = cloneRequiredSnapshot(snapshot);
        if (requestID !== record.loadRequestID) {
          if (record.inFlightLoad) {
            return record.inFlightLoad;
          }
          return cloneRequiredSnapshot(record.state.snapshot ?? nextSnapshot);
        }
        cache.set(record.ref, nextSnapshot);
        record.state = {
          ...record.state,
          status: "ready",
          snapshot: nextSnapshot,
          invalidated: false,
          invalidationReason: undefined,
          error: null,
          conflict: null,
        };
        emit(record);
        return cloneRequiredSnapshot(nextSnapshot);
      })
      .catch((error: unknown) => {
        const normalized = normalizeSyncError(record.ref, error, record.state.snapshot);
        if (requestID !== record.loadRequestID) {
          if (record.inFlightLoad) {
            return record.inFlightLoad;
          }
          if (record.state.snapshot && !record.state.invalidated) {
            return cloneRequiredSnapshot(record.state.snapshot);
          }
          throw normalized;
        }
        record.state = {
          ...record.state,
          status: normalized.conflict ? "conflict" : "error",
          error: normalized,
          conflict: normalized.conflict ?? null,
        };
        emit(record);
        throw normalized;
      })
      .finally(() => {
        if (record.inFlightLoad === task) {
          record.inFlightLoad = null;
        }
      });

    record.inFlightLoad = task;
    return task;
  }

  async function enqueueMutation<T, P>(
    record: ResourceRecord<T>,
    input: MutationRequest<P> | BoundMutationRequest<P>,
  ): Promise<MutationResponse<T>> {
    const deferred = createDeferred<MutationResponse<T>>();
    record.queue.push({
      input: input as MutationRequest<unknown> | BoundMutationRequest<unknown>,
      resolve: deferred.resolve,
      reject: deferred.reject,
    });
    record.state = {
      ...record.state,
      queueDepth: record.queue.length,
    };
    emit(record);

    void processMutationQueue(record, options.transport, cache, retryPolicy, random, wait);
    return deferred.promise;
  }
}

export function createSyncResource<T, P = unknown>(
  options: CreateSyncResourceOptions,
): SyncResource<T, P> {
  return createSyncEngine(options).resource<T, P>(options.ref);
}

export function createInMemoryCache(): InMemorySyncCache {
  const entries = new Map<string, CacheEntry<unknown>>();

  return {
    get<T>(ref: ResourceRef): CacheEntry<T> | null {
      const entry = entries.get(createResourceKey(ref));
      if (!entry) {
        return null;
      }
      return {
        ref: cloneRef(entry.ref),
        snapshot: cloneSnapshot(entry.snapshot as ResourceSnapshot<T> | null),
        invalidated: entry.invalidated,
        invalidationReason: entry.invalidationReason,
      };
    },
    set<T>(ref: ResourceRef, snapshot: ResourceSnapshot<T> | null): CacheEntry<T> {
      const key = createResourceKey(ref);
      const entry: CacheEntry<T> = {
        ref: cloneRef(ref),
        snapshot: cloneSnapshot(snapshot),
        invalidated: false,
        invalidationReason: undefined,
      };
      entries.set(key, entry as CacheEntry<unknown>);
      return {
        ref: cloneRef(entry.ref),
        snapshot: cloneSnapshot(entry.snapshot),
        invalidated: entry.invalidated,
        invalidationReason: entry.invalidationReason,
      };
    },
    invalidate(ref: ResourceRef, reason?: string): CacheEntry<unknown> {
      const key = createResourceKey(ref);
      const existing = entries.get(key);
      const entry: CacheEntry<unknown> = {
        ref: cloneRef(ref),
        snapshot: cloneSnapshot(existing?.snapshot ?? null),
        invalidated: true,
        invalidationReason: reason,
      };
      entries.set(key, entry);
      return {
        ref: cloneRef(entry.ref),
        snapshot: cloneSnapshot(entry.snapshot),
        invalidated: entry.invalidated,
        invalidationReason: entry.invalidationReason,
      };
    },
    clear(ref: ResourceRef) {
      entries.delete(createResourceKey(ref));
    },
  };
}

export function createResourceKey(ref: ResourceRef): string {
  return [
    encodeURIComponent(ref.kind),
    encodeURIComponent(ref.id),
    serializeScope(ref.scope),
  ].join("::");
}

export function normalizeSyncError<T>(
  ref: ResourceRef,
  error: unknown,
  snapshot: ResourceSnapshot<T> | null,
): SyncError<T> {
  if (isSyncEnvelopeError<T>(error)) {
    const conflict = normalizeConflict(error, snapshot);
    return {
      code: error.code,
      message: error.message,
      details: cloneValue(error.details),
      currentRevision: error.currentRevision,
      resource: cloneSnapshot(error.resource ?? null) ?? undefined,
      retriable: !conflict && RETRIABLE_ERROR_CODES.has(error.code),
      cause: error,
      conflict: conflict ?? undefined,
    };
  }

  return {
    code: "TEMPORARY_FAILURE",
    message: error instanceof Error ? error.message : "sync operation failed",
    retriable: true,
    cause: error,
  };
}

export function isSyncEnvelopeError<T = unknown>(error: unknown): error is SyncEnvelopeError<T> {
  return Boolean(error) && typeof error === "object" && typeof (error as { code?: unknown }).code === "string";
}

async function processMutationQueue<T>(
  record: ResourceRecord<T>,
  transport: SyncTransport,
  cache: InMemorySyncCache,
  retryPolicy: SyncRetryPolicy,
  random: () => number,
  wait: (delayMs: number) => Promise<void>,
): Promise<void> {
  if (record.processingQueue) {
    return;
  }
  record.processingQueue = true;

  try {
    while (record.queue.length > 0) {
      const entry = record.queue[0];
      record.state = {
        ...record.state,
        status: "saving",
        error: null,
        conflict: null,
        queueDepth: record.queue.length,
      };
      emit(record);

      try {
        const request = resolveMutationRequest(record, entry.input);
        const response = await performMutationWithRetry(
          record,
          transport,
          request,
          retryPolicy,
          random,
          wait,
        );
        const nextSnapshot = cloneRequiredSnapshot(response.snapshot);
        cacheSnapshot(cache, record, nextSnapshot);
        record.queue.shift();
        record.state = {
          ...record.state,
          status: record.queue.length > 0 ? "saving" : "ready",
          snapshot: nextSnapshot,
          invalidated: false,
          invalidationReason: undefined,
          queueDepth: record.queue.length,
          error: null,
          conflict: null,
        };
        emit(record);
        entry.resolve({
          snapshot: cloneRequiredSnapshot(nextSnapshot),
          applied: response.applied,
          replay: response.replay,
        });
        continue;
      } catch (error) {
        const normalized = normalizeSyncError(record.ref, error, record.state.snapshot);
        const nextStatus = normalized.conflict ? "conflict" : "error";
        record.state = {
          ...record.state,
          status: nextStatus,
          queueDepth: 0,
          error: normalized,
          conflict: normalized.conflict ?? null,
        };
        const pending = record.queue.splice(0);
        emit(record);
        for (const pendingEntry of pending) {
          pendingEntry.reject(normalized);
        }
      }
    }
  } finally {
    record.processingQueue = false;
  }
}

async function performMutationWithRetry<T>(
  record: ResourceRecord<T>,
  transport: SyncTransport,
  request: MutationRequest<unknown>,
  retryPolicy: SyncRetryPolicy,
  random: () => number,
  wait: (delayMs: number) => Promise<void>,
): Promise<MutationResponse<T>> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < retryPolicy.maxAttempts) {
    try {
      return await transport.mutate<T, unknown>(request);
    } catch (error) {
      const normalized = normalizeSyncError(record.ref, error, record.state.snapshot);
      lastError = normalized;
      attempt += 1;

      if (!normalized.retriable || attempt >= retryPolicy.maxAttempts) {
        throw normalized;
      }

      await wait(calculateRetryDelay(attempt, retryPolicy, random));
    }
  }

  throw lastError ?? new Error("mutation queue exhausted retries");
}

function cacheSnapshot<T>(
  cache: InMemorySyncCache,
  record: ResourceRecord<T>,
  snapshot: ResourceSnapshot<T>,
): void {
  const cacheEntry = cache.set(record.ref, snapshot);
  record.state = {
    ...record.state,
    snapshot: cloneSnapshot(cacheEntry.snapshot),
    invalidated: false,
    invalidationReason: undefined,
  };
}

function resolveRetryPolicy(overrides?: Partial<SyncRetryPolicy>): SyncRetryPolicy {
  return {
    maxAttempts: overrides?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    baseDelayMs: overrides?.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs,
    maxDelayMs: overrides?.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
    jitterRatio: overrides?.jitterRatio ?? DEFAULT_RETRY_POLICY.jitterRatio,
  };
}

function resolveMutationRequest<T>(
  record: ResourceRecord<T>,
  input: MutationRequest<unknown> | BoundMutationRequest<unknown>,
): MutationRequest<unknown> {
  const ref = "ref" in input && input.ref ? input.ref : record.ref;
  if (createResourceKey(ref) !== record.key) {
    throw invalidMutationError("mutation request ref must match the bound sync resource");
  }

  const expectedRevision = input.expectedRevision ?? record.state.snapshot?.revision;
  if (expectedRevision === undefined) {
    throw invalidMutationError("resource must be loaded before mutate unless expectedRevision is provided");
  }

  return {
    ref: cloneRef(record.ref),
    operation: input.operation,
    payload: cloneValue(input.payload),
    expectedRevision,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata ? cloneValue(input.metadata) : undefined,
  };
}

function calculateRetryDelay(
  attempt: number,
  retryPolicy: SyncRetryPolicy,
  random: () => number,
): number {
  const cappedBase = Math.min(
    retryPolicy.maxDelayMs,
    retryPolicy.baseDelayMs * 2 ** Math.max(0, attempt - 1),
  );
  if (retryPolicy.jitterRatio <= 0) {
    return cappedBase;
  }
  const jitterWindow = cappedBase * retryPolicy.jitterRatio;
  const jitterOffset = (random() * 2 - 1) * jitterWindow;
  return Math.max(0, Math.round(cappedBase + jitterOffset));
}

function normalizeConflict<T>(
  error: SyncEnvelopeError<T>,
  snapshot: ResourceSnapshot<T> | null,
): SyncConflict<T> | null {
  if (error.code !== "STALE_REVISION") {
    return null;
  }

  return {
    code: "STALE_REVISION",
    message: error.message,
    currentRevision: error.currentRevision,
    latestSnapshot: cloneSnapshot(error.resource ?? null),
    staleSnapshot: cloneSnapshot(snapshot),
  };
}

function emit<T>(record: ResourceRecord<T>): void {
  const state = cloneState(record.state);
  for (const listener of record.listeners) {
    listener(state);
  }
}

function serializeScope(scope?: Record<string, string>): string {
  if (!scope) {
    return "";
  }
  return Object.keys(scope)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(scope[key] ?? "")}`)
    .join("&");
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

function cloneState<T>(state: SyncResourceState<T>): SyncResourceState<T> {
  return {
    ref: cloneRef(state.ref),
    status: state.status,
    snapshot: cloneSnapshot(state.snapshot),
    invalidated: state.invalidated,
    invalidationReason: state.invalidationReason,
    queueDepth: state.queueDepth,
    error: cloneError(state.error),
    conflict: cloneConflict(state.conflict),
  };
}

function cloneError<T>(error: SyncError<T> | null): SyncError<T> | null {
  if (!error) {
    return null;
  }
  return {
    code: error.code,
    message: error.message,
    details: isObject(error.details) ? { ...error.details } : error.details,
    currentRevision: error.currentRevision,
    resource: cloneSnapshot(error.resource ?? null) ?? undefined,
    retriable: error.retriable,
    cause: error.cause,
    conflict: cloneConflict(error.conflict ?? null) ?? undefined,
  };
}

function cloneConflict<T>(conflict: SyncConflict<T> | null): SyncConflict<T> | null {
  if (!conflict) {
    return null;
  }
  return {
    code: conflict.code,
    message: conflict.message,
    currentRevision: conflict.currentRevision,
    latestSnapshot: cloneSnapshot(conflict.latestSnapshot),
    staleSnapshot: cloneSnapshot(conflict.staleSnapshot),
  };
}

function cloneRequiredSnapshot<T>(snapshot: ResourceSnapshot<T>): ResourceSnapshot<T> {
  return cloneSnapshot(snapshot) as ResourceSnapshot<T>;
}

function cloneSnapshot<T>(snapshot: ResourceSnapshot<T> | null | undefined): ResourceSnapshot<T> | null {
  if (!snapshot) {
    return null;
  }
  return {
    ref: cloneRef(snapshot.ref),
    data: cloneValue(snapshot.data),
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    metadata: isObject(snapshot.metadata) ? cloneValue(snapshot.metadata) : snapshot.metadata,
  };
}

function cloneRef(ref: ResourceRef): ResourceRef {
  return {
    kind: ref.kind,
    id: ref.id,
    scope: ref.scope ? { ...ref.scope } : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function defaultWait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function invalidMutationError(message: string): SyncEnvelopeError {
  return {
    code: "INVALID_MUTATION",
    message,
  };
}

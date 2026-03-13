import type { ResourceRef, ResourceSnapshot, SyncError, SyncEnvelopeError, SyncResource, SyncResourceState, SyncRetryPolicy } from "./contracts";
import type { SyncTransport } from "./transport";
interface CacheEntry<T> {
    ref: ResourceRef;
    snapshot: ResourceSnapshot<T> | null;
    invalidated: boolean;
    invalidationReason?: string;
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
export declare const DEFAULT_RETRY_POLICY: SyncRetryPolicy;
export declare function createSyncEngine(options: SyncEngineOptions): SyncEngine;
export declare function createSyncResource<T, P = unknown>(options: CreateSyncResourceOptions): SyncResource<T, P>;
export declare function createInMemoryCache(): InMemorySyncCache;
export declare function createResourceKey(ref: ResourceRef): string;
export declare function normalizeSyncError<T>(ref: ResourceRef, error: unknown, snapshot: ResourceSnapshot<T> | null): SyncError<T>;
export declare function isSyncEnvelopeError<T = unknown>(error: unknown): error is SyncEnvelopeError<T>;
export {};

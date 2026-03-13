export type Unsubscribe = () => void;
export interface ResourceRef {
    kind: string;
    id: string;
    scope?: Record<string, string>;
}
export interface ResourceSnapshot<T> {
    ref: ResourceRef;
    data: T;
    revision: number;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
export interface MutationRequest<P = unknown> {
    ref: ResourceRef;
    operation: string;
    payload: P;
    expectedRevision?: number;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}
export interface MutationResponse<T> {
    snapshot: ResourceSnapshot<T>;
    applied: boolean;
    replay: boolean;
}
export type SyncResourceStatus = "idle" | "loading" | "ready" | "refreshing" | "saving" | "conflict" | "error";
export type SyncErrorCode = "NOT_FOUND" | "STALE_REVISION" | "IDEMPOTENCY_REPLAY" | "INVALID_MUTATION" | "TRANSPORT_UNAVAILABLE" | "RATE_LIMITED" | "TEMPORARY_FAILURE" | (string & {});
export interface SyncEnvelopeError<T = unknown> {
    code: SyncErrorCode;
    message: string;
    details?: unknown;
    currentRevision?: number;
    resource?: ResourceSnapshot<T>;
}
export interface SyncConflict<T = unknown> {
    code: "STALE_REVISION";
    message: string;
    currentRevision?: number;
    latestSnapshot: ResourceSnapshot<T> | null;
    staleSnapshot: ResourceSnapshot<T> | null;
}
export interface SyncError<T = unknown> extends SyncEnvelopeError<T> {
    retriable: boolean;
    cause?: unknown;
    conflict?: SyncConflict<T>;
}
export interface SyncResourceState<T> {
    ref: ResourceRef;
    status: SyncResourceStatus;
    snapshot: ResourceSnapshot<T> | null;
    invalidated: boolean;
    invalidationReason?: string;
    queueDepth: number;
    error: SyncError<T> | null;
    conflict: SyncConflict<T> | null;
}
export type SyncResourceListener<T> = (state: SyncResourceState<T>) => void;
export type BoundMutationRequest<P = unknown> = Omit<MutationRequest<P>, "ref"> & {
    ref?: ResourceRef;
};
export interface SyncRetryPolicy {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
}
export interface SyncResource<T, P = unknown> {
    getSnapshot(): ResourceSnapshot<T> | null;
    getState(): SyncResourceState<T>;
    subscribe(listener: SyncResourceListener<T>): Unsubscribe;
    load(): Promise<ResourceSnapshot<T>>;
    mutate(input: MutationRequest<P> | BoundMutationRequest<P>): Promise<MutationResponse<T>>;
    invalidate(reason?: string): void;
    refresh(options?: {
        force?: boolean;
    }): Promise<ResourceSnapshot<T>>;
}

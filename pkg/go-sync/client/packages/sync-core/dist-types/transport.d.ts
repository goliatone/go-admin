import type { MutationRequest, MutationResponse, ResourceRef, ResourceSnapshot, Unsubscribe } from "./contracts";
export interface SyncTransport {
    load<T>(ref: ResourceRef): Promise<ResourceSnapshot<T>>;
    mutate<T, P>(input: MutationRequest<P>): Promise<MutationResponse<T>>;
    subscribe?(ref: ResourceRef, listener: (snapshot: ResourceSnapshot<unknown> | null) => void): Unsubscribe;
}
export interface FetchResponseLike {
    ok: boolean;
    status: number;
    text(): Promise<string>;
}
export interface FetchRequestInitLike {
    body?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    method?: string;
}
export type FetchLike = (input: string, init?: FetchRequestInitLike) => Promise<FetchResponseLike>;
export interface FetchSyncTransportContext<P = unknown> {
    requestKind: "load" | "mutate";
    method: "GET" | "PATCH" | "POST";
    ref: ResourceRef;
    input?: MutationRequest<P>;
}
export interface FetchSyncTransportOptions {
    baseURL?: string;
    fetch?: FetchLike;
    credentials?: RequestCredentials;
    headers?: Record<string, string> | ((context: FetchSyncTransportContext) => Record<string, string> | Promise<Record<string, string>>);
    actionOperations?: string[] | ((input: MutationRequest<unknown>) => boolean);
}
export declare function createFetchSyncTransport(options?: FetchSyncTransportOptions): SyncTransport;

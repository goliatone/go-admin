import type { ResourceSnapshot, SyncResource } from "./contracts";
export type RefreshPolicyTrigger = "initial_load" | "route_reentry" | "window_focus" | "conflict_acknowledged";
export interface RefreshEventTargetLike {
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
}
export interface RefreshVisibilityTargetLike {
    visibilityState?: string;
}
export interface RefreshPolicyOptions<T> {
    focusTarget?: RefreshEventTargetLike | null;
    visibilityTarget?: RefreshVisibilityTargetLike | null;
    onError?: (error: unknown, trigger: RefreshPolicyTrigger) => void;
    refreshOptions?: {
        force?: boolean;
    };
}
export interface SyncRefreshPolicy<T> {
    start(): Promise<ResourceSnapshot<T> | null>;
    stop(): void;
    trigger(trigger: RefreshPolicyTrigger): Promise<ResourceSnapshot<T> | null>;
    refreshOnRouteReentry(): Promise<ResourceSnapshot<T> | null>;
    refreshOnFocus(): Promise<ResourceSnapshot<T> | null>;
    refreshAfterConflictAcknowledgement(): Promise<ResourceSnapshot<T> | null>;
}
export declare function createRefreshPolicy<T>(resource: SyncResource<T>, options?: RefreshPolicyOptions<T>): SyncRefreshPolicy<T>;

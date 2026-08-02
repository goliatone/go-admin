export interface ActionRemediation {
    label?: string;
    href?: string;
    kind?: string;
}
export interface ActionState {
    enabled: boolean;
    reason?: string;
    reason_code?: string;
    severity?: string;
    kind?: string;
    permission?: string;
    metadata?: Record<string, unknown> | null;
    remediation?: ActionRemediation | null;
    available_transitions?: string[];
}
export interface ActionStateMap {
    [actionName: string]: ActionState;
}
export interface ActionStateRecord {
    _action_state?: ActionStateMap;
}
export interface BulkActionStateMap {
    [actionName: string]: ActionState;
}
export interface BulkActionStateConfig {
    selection_sensitive?: boolean;
    selection_state_endpoint?: string;
    debounce_ms?: number;
}
export interface ActionBlockCodeSource {
    reason_code?: unknown;
    textCode?: unknown;
    text_code?: unknown;
    error?: ActionBlockCodeSource | null;
}
export type ActionBlockCodeInput = string | null | undefined | ActionBlockCodeSource;
export declare function normalizeActionBlockCode(input: ActionBlockCodeInput): string | null;
export declare function normalizeActionState(value: unknown): ActionState | null;
export declare function normalizeActionStateMap(value: unknown): ActionStateMap;
export declare function normalizeBulkActionStateMap(value: unknown): BulkActionStateMap;
export declare function normalizeBulkActionStateConfig(value: unknown): BulkActionStateConfig | null;
export declare function normalizeActionStateRecord<T extends Record<string, unknown>>(value: T | null | undefined): (T & ActionStateRecord) | null;
export declare function normalizeActionStateMeta<T extends Record<string, unknown>>(value: T | null | undefined): T | null;
export declare function normalizeBulkActionStateResponse(value: unknown): {
    bulk_action_state: BulkActionStateMap;
    selection?: Record<string, unknown>;
} | null;
export declare function normalizeListActionStatePayload<T extends Record<string, unknown>>(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null;
export declare function normalizeDetailActionStatePayload<T extends Record<string, unknown>>(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null;
export declare function resolveActionState(record: Record<string, unknown>, actionName: string): ActionState | null;
//# sourceMappingURL=action-contracts.d.ts.map
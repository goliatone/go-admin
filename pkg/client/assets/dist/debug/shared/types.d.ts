export type RequestEntry = {
    id?: string;
    timestamp?: string;
    method?: string;
    path?: string;
    status?: number;
    duration?: number;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    error?: string;
};
export type SQLEntry = {
    id?: string;
    timestamp?: string;
    query?: string;
    args?: unknown[];
    duration?: number;
    row_count?: number;
    error?: string;
};
export type LogEntry = {
    timestamp?: string;
    level?: string;
    message?: string;
    fields?: Record<string, unknown>;
    source?: string;
};
export type RouteEntry = {
    method?: string;
    path?: string;
    name?: string;
    handler?: string;
    middleware?: string[];
    summary?: string;
    tags?: string[];
};
export type CustomLogEntry = {
    timestamp?: string;
    category?: string;
    message?: string;
    fields?: Record<string, unknown>;
};
export type CustomSnapshot = {
    data?: Record<string, unknown>;
    logs?: CustomLogEntry[];
};
export type DebugSnapshot = {
    template?: Record<string, unknown>;
    session?: Record<string, unknown>;
    requests?: RequestEntry[];
    sql?: SQLEntry[];
    logs?: LogEntry[];
    config?: Record<string, unknown>;
    routes?: RouteEntry[];
    custom?: CustomSnapshot;
    repl_commands?: unknown;
    [key: string]: unknown;
};
export type PanelOptions = {
    slowThresholdMs?: number;
    newestFirst?: boolean;
};
export type DurationResult = {
    text: string;
    isSlow: boolean;
};
//# sourceMappingURL=types.d.ts.map
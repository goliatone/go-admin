export type RequestEntry = {
    id?: string;
    timestamp?: string;
    session_id?: string;
    user_id?: string;
    method?: string;
    path?: string;
    status?: number;
    duration?: number;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    error?: string;
    content_type?: string;
    request_body?: string;
    request_size?: number;
    body_truncated?: boolean;
    response_headers?: Record<string, string>;
    response_body?: string;
    response_size?: number;
    remote_ip?: string;
};
export type SQLEntry = {
    id?: string;
    timestamp?: string;
    session_id?: string;
    user_id?: string;
    query?: string;
    args?: unknown[];
    duration?: number;
    row_count?: number;
    error?: string;
};
export type LogEntry = {
    timestamp?: string;
    session_id?: string;
    user_id?: string;
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
export type JSErrorEntry = {
    id?: string;
    timestamp?: string;
    session_id?: string;
    user_id?: string;
    type?: string;
    message?: string;
    source?: string;
    line?: number;
    column?: number;
    stack?: string;
    url?: string;
    user_agent?: string;
    extra?: Record<string, unknown>;
};
export type DebugSnapshot = {
    template?: Record<string, unknown>;
    session?: Record<string, unknown>;
    sessions?: DebugUserSession[];
    requests?: RequestEntry[];
    sql?: SQLEntry[];
    logs?: LogEntry[];
    jserrors?: JSErrorEntry[];
    config?: Record<string, unknown>;
    routes?: RouteEntry[];
    custom?: CustomSnapshot;
    repl_commands?: unknown;
    [key: string]: unknown;
};
export type DebugUserSession = {
    session_id?: string;
    user_id?: string;
    username?: string;
    ip?: string;
    user_agent?: string;
    current_page?: string;
    started_at?: string;
    last_activity?: string;
    request_count?: number;
    metadata?: Record<string, unknown>;
};
export type PanelOptions = {
    slowThresholdMs?: number;
    newestFirst?: boolean;
};
export type DurationResult = {
    text: string;
    isSlow: boolean;
};
export type PermissionEntry = {
    permission: string;
    required: boolean;
    in_claims: boolean;
    allows: boolean;
    diagnosis: string;
    status: 'ok' | 'error' | 'warning' | 'info';
    module?: string;
};
export type PermissionsUserInfo = {
    user_id?: string;
    username?: string;
    role?: string;
    tenant_id?: string;
    org_id?: string;
};
export type PermissionsSummary = {
    module_count: number;
    required_keys: number;
    claims_keys: number;
    missing_keys: number;
};
export type PermissionsSnapshot = {
    verdict: 'healthy' | 'missing_grants' | 'claims_stale' | 'scope_mismatch' | 'error';
    enabled_modules: string[];
    required_permissions: Record<string, string>;
    claims_permissions: string[];
    permission_checks: Record<string, boolean>;
    missing_permissions: string[];
    entries: PermissionEntry[];
    summary: PermissionsSummary;
    next_actions: string[];
    user_info: PermissionsUserInfo;
};
//# sourceMappingURL=types.d.ts.map
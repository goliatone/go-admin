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
    doctor?: DoctorReport;
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
export type DoctorSeverity = 'ok' | 'info' | 'warn' | 'error';
export type DoctorFinding = {
    check_id?: string;
    severity?: DoctorSeverity;
    code?: string;
    component?: string;
    message?: string;
    hint?: string;
    metadata?: Record<string, unknown>;
};
export type DoctorActionState = {
    label?: string;
    cta?: string;
    description?: string;
    kind?: 'manual' | 'auto';
    allowed_statuses?: DoctorSeverity[];
    requires_confirmation?: boolean;
    confirm_text?: string;
    applicable?: boolean;
    runnable?: boolean;
    metadata?: Record<string, unknown>;
};
export type DoctorCheckResult = {
    id: string;
    label?: string;
    description?: string;
    help?: string;
    status?: DoctorSeverity;
    summary?: string;
    duration_ms?: number;
    findings?: DoctorFinding[];
    action?: DoctorActionState;
    metadata?: Record<string, unknown>;
};
export type DoctorSummary = {
    checks?: number;
    ok?: number;
    info?: number;
    warn?: number;
    error?: number;
};
export type DoctorReport = {
    generated_at?: string;
    verdict?: DoctorSeverity;
    summary?: DoctorSummary;
    checks?: DoctorCheckResult[];
    findings?: DoctorFinding[];
    next_actions?: string[];
};
//# sourceMappingURL=types.d.ts.map
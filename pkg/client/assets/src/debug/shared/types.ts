// Shared type definitions for debug panels
// Used by both the full debug console and the debug toolbar

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
  id?: string;
  timestamp?: string;
  session_id?: string;
  user_id?: string;
  level?: string;
  message?: string;
  logger?: string;
  caller?: LogCaller;
  trace_id?: string;
  span_id?: string;
  request_id?: string;
  fields?: Record<string, unknown>;
  source?: string;
};

export type LogCaller = {
  function?: string;
  file?: string;
  line?: number;
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

export type DeploymentSnapshot = {
  application?: {
    id?: string;
    name?: string;
    version?: string;
  };
  environment?: {
    name?: string;
    color?: string;
  };
  persona?: DeploymentPersona;
  build?: {
    commit_sha?: string;
    commit_short?: string;
    git_ref?: string;
    build_time?: string;
    modified?: boolean;
    source?: string;
    go_version?: string;
  };
  runtime?: {
    instance_name?: string;
    instance_id?: string;
    instance_source?: string;
    hostname?: string;
    started_at?: string;
    uptime?: string;
  };
};

export type DeploymentPersona = {
  name?: string;
  algorithm?: string;
  version?: string;
  source?: string;
  visual?: DeploymentPersonaVisual;
};

export type DeploymentPersonaVisual = {
  kind?: 'monogram' | 'image' | string;
  text?: string;
  alt?: string;
  background?: string;
  foreground?: string;
  media_type?: string;
  data?: string;
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
  deployment?: DeploymentSnapshot;
  repl_commands?: unknown;
  // Allow extra panels via index signature
  [key: string]: unknown;
};

export type PanelUIRendererKind =
  | 'metrics'
  | 'key_value'
  | 'identity'
  | 'table'
  | 'status_list'
  | 'timeline'
  | 'json'
  | 'stack';

export type ServerPanelUIView = {
  renderer?: string;
  title?: string;
  bind?: string;
  options?: Record<string, unknown>;
  sections?: ServerPanelUIView[];
};

export type ServerPanelUI = {
  schema_version?: string;
  views?: {
    console?: ServerPanelUIView;
    toolbar?: ServerPanelUIView;
  };
  count?: {
    bind?: string;
    mode?: string;
    label?: string;
  };
  filters?: Array<{
    id?: string;
    label?: string;
    kind?: string;
    bind?: string;
    options?: string[];
  }>;
  events?: {
    mode?: string;
    bind?: string;
    key?: string;
    max_entries?: number;
    /** Row order for list views: 'newest_first' to prepend, else chronological. */
    order?: string;
  };
  action_layout?: {
    mode?: string;
    picker_label?: string;
    empty_text?: string;
  };
  actions?: Array<{
    id?: string;
    label?: string;
    submit_label?: string;
    kind?: string;
    confirm_text?: string;
    requires_confirm?: boolean;
    hidden?: boolean;
    refresh?: boolean;
    update_policy?: string;
    payload?: Record<string, unknown>;
    fields?: Array<{
      name?: string;
      label?: string;
      kind?: string;
      payload_path?: string;
      placeholder?: string;
      description?: string;
      help?: string;
      required?: boolean;
      sensitive?: boolean;
      options?: string[];
      option_items?: Array<{
        value?: string;
        label?: string;
        description?: string;
        disabled?: boolean;
        metadata?: Record<string, unknown>;
      }>;
      option_source?: {
        id?: string;
        label?: string;
        dynamic?: boolean;
        cache_scope?: string;
        params?: Record<string, unknown>;
      };
      default?: unknown;
      display_hints?: Record<string, unknown>;
    }>;
  }>;
  metadata?: Record<string, unknown>;
};

export type ServerPanelDefinition = {
  id?: string;
  label?: string;
  icon?: string;
  span?: number;
  snapshot_key?: string;
  event_types?: string[];
  supports_toolbar?: boolean;
  category?: string;
  order?: number;
  version?: string;
  metadata?: Record<string, unknown>;
  ui?: ServerPanelUI;
};

export type ServerPanelDefinitionsResponse = {
  panels?: ServerPanelDefinition[];
  version?: string;
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

// Panel rendering options
export type PanelOptions = {
  slowThresholdMs?: number;
  newestFirst?: boolean;
};

// Duration result type for formatDuration
export type DurationResult = {
  text: string;
  isSlow: boolean;
};

// Permissions debug panel types
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
  required_permissions: Record<string, string>; // permission -> module
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
  kind?: 'manual' | 'auto' | 'navigate';
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

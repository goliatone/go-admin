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
  // Allow extra panels via index signature
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

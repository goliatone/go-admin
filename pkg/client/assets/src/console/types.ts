// Neutral operator-console contracts shared by Debug and other console hosts.
// Panel schema types mirror the Go `console.PanelUI` schema (version 1); the
// snapshot/event envelopes carry console identity, watermarks and revisions.

/** Current declarative panel UI schema version understood by the client. */
export const PANEL_UI_SCHEMA_VERSION = '1';

export type PanelUIRendererKind =
  | 'metrics'
  | 'key_value'
  | 'identity'
  | 'table'
  | 'status_list'
  | 'timeline'
  | 'json'
  | 'stack'
  | 'cards'
  | 'list';

/** Server-computed tones (unknown tones render neutral). */
export type PanelTone = 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'planned';

/** One generic ordered step (`format: "steps"`). */
export type PanelUIStep = { label?: string; state?: string; tone?: string };

/** Bounded progress (`format: "progress"`). */
export type PanelUIProgress = { completed?: number; total?: number; label?: string };

/**
 * Reference to a declared action of the panel that renders it. Records carry
 * references under a view's `actions_bind`; the client resolves them against
 * the request-scoped declarations and never executes anything else.
 */
export type PanelUIActionRef = { panel_id?: string; action_id?: string; emphasis?: string };

/** One record of a panel (outcome links and highlights). */
export type PanelUIRecordRef = { panel_id?: string; record_key?: string };

export type ServerPanelUIView = {
  renderer?: string;
  title?: string;
  bind?: string;
  options?: Record<string, unknown>;
  sections?: ServerPanelUIView[];
  /** One-line section caption. */
  description?: string;
  /** The view's own empty-state guidance. */
  empty?: string;
  /** Navigation to another panel of the same console. */
  link?: { label?: string; panel_id?: string };
  /** Section header action slot. */
  actions?: PanelUIActionRef[];
};

export type ServerPanelUIActionField = {
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
    /** Options load page by page from the console's options route. */
    paginated?: boolean;
    searchable?: boolean;
  };
  default?: unknown;
  display_hints?: Record<string, unknown>;
  /** Rendered inside the form's Advanced disclosure. */
  advanced?: boolean;
  /** Client-side generator; `request_id` binds the ID to the request draft. */
  generate?: string;
  min?: number;
  max?: number;
};

export type PanelUIDetail = { label?: string; value?: string; format?: string };
export type PanelUIChange = { label?: string; before?: string; after?: string; format?: string };

export type ServerPanelUIAction = {
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
  fields?: ServerPanelUIActionField[];
  /** Empty or `available` executes; any other value is display metadata only. */
  availability?: string;
  reason?: string;
  /** Client capabilities this declaration needs to execute safely. */
  requires?: string[];
  drawer?: {
    eyebrow?: string;
    title?: string;
    effect?: string;
    effect_tone?: string;
    steps?: PanelUIStep[];
    details?: PanelUIDetail[];
    note?: string;
  };
  /** Explicit secondary submitter, e.g. Preview plan. */
  secondary_submit?: { label?: string; field?: string; value?: unknown };
  confirmation?: {
    title?: string;
    message?: string;
    changes?: PanelUIChange[];
    note?: string;
    confirm_label?: string;
    tone?: string;
  };
  /** Opaque selector stored with a submitted request ID for reconciliation. */
  request_scope?: string;
};

/** Structured confirmation for consequential actions. */
export type PanelUIActionConfirmation = NonNullable<ServerPanelUIAction['confirmation']>;

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
    /** Badge tone, or the bound row field holding one (`matching_rows`). */
    tone?: string;
    tone_bind?: string;
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
  actions?: ServerPanelUIAction[];
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

/** Options handed to panel renderers. */
export type PanelOptions = {
  slowThresholdMs?: number;
  newestFirst?: boolean;
  /**
   * Scope for generated element IDs. Hosts that mount several consoles in one
   * document set a unique value so labels and controls never collide.
   */
  idScope?: string;
};

/** Avatar visual accepted by the identity renderer. Never raw markup. */
export type PersonaVisual = {
  kind?: 'monogram' | 'image' | string;
  text?: string;
  alt?: string;
  background?: string;
  foreground?: string;
  media_type?: string;
  data?: string;
};

export type Persona = {
  name?: string;
  algorithm?: string;
  version?: string;
  source?: string;
  visual?: PersonaVisual;
};

/**
 * Trusted identity resolved by the host (never from request payloads). Every
 * field participates in record, preference and delivery isolation.
 */
export type ConsoleIdentity = {
  console_id: string;
  application_id: string;
  environment_id: string;
  actor_id: string;
  scope_key: string;
};

/** One authorized record. Data is the record payload bound by panel views. */
export type ConsoleRecord = {
  record_key: string;
  target_id?: string;
  generation?: number;
  revision: number;
  data?: unknown;
};

/** Authorized panel definition plus its records. */
export type ConsolePanelSnapshot = ServerPanelDefinition & {
  records?: ConsoleRecord[];
};

/**
 * Authorized snapshot for one console identity. `watermark` is the last stream
 * sequence reflected in the snapshot; newer events are applied on top of it.
 */
export type ConsoleSnapshot = ConsoleIdentity & {
  watermark: number;
  panels: ConsolePanelSnapshot[];
};

export type ConsoleEventKind = 'upsert' | 'delete' | 'invalidate';

/**
 * Server-issued live record event. Sequences are contiguous per identity
 * stream; revisions are monotonic per record. An `invalidate` event without a
 * panel requests console-wide snapshot recovery.
 */
export type ConsoleEvent = ConsoleIdentity & {
  panel_id?: string;
  record_key?: string;
  target_id?: string;
  generation?: number;
  revision?: number;
  data?: unknown;
  sequence: number;
  kind: ConsoleEventKind;
};

/**
 * Routes resolved by the host's URL manager and passed verbatim. The client
 * never derives module URLs; `actions` and `lookup` may carry `{panel_id}`,
 * `{action_id}` and `{record_key}` (or `:panel`, `:action`, `:record`)
 * placeholders that the client fills with encoded IDs.
 */
export type ConsoleRoutes = {
  page?: string;
  panels?: string;
  snapshot: string;
  actions?: string;
  preferences?: string;
  live?: string;
  lookup?: string;
  /** Paginated field options: `:panel`, `:action`, `:field` placeholders. */
  options?: string;
  /** Pending-request status: `:panel`, `:request` placeholders. */
  requests?: string;
};

export type ConsoleBootstrap = ConsoleIdentity & {
  title?: string;
  urls: ConsoleRoutes;
  /** Opaque identity namespace for browser state. */
  preferences_namespace?: string;
  snapshot?: ConsoleSnapshot;
};

/** Recovery an error response permits the client to offer. */
export type ConsoleErrorAction = 'retry' | 'reload' | 'none';

/** Safe structured error. Denied responses never carry record payloads. */
export type ConsoleError = {
  status: number;
  code: string;
  message: string;
  fields: Record<string, string>;
  action: ConsoleErrorAction;
};

/** Panel action response (`PanelActionResult` on the server). */
export type PanelActionResult = {
  ok?: boolean;
  message?: string;
  data?: unknown;
  refresh?: boolean;
  errors?: Record<string, unknown>;
  event?: unknown;
  tone?: string;
  code?: string;
  /** Planned/dry-run outcome: never presented as executed. */
  planned?: boolean;
  /** The row the outcome concerns. */
  record?: PanelUIRecordRef;
  /** Declared actions the actor may take next. */
  follow_up?: PanelUIActionRef[];
};

/** One page of a paginated option source. */
export type PanelOptionPage = {
  items?: Array<{ value?: string; label?: string; description?: string; disabled?: boolean }>;
  next_cursor?: string;
  selected?: Array<{ value?: string; label?: string; description?: string; disabled?: boolean }>;
};

/** Pending-request reconciliation status. */
export type PanelRequestStatus = {
  status?: 'claimed' | 'unclaimed' | 'expired' | 'unknown' | string;
  message?: string;
  result?: PanelActionResult;
  retry_until?: string;
};

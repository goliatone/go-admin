// Request drafts and the session pending-request ledger (ADR-0003). A draft
// belongs to one console instance and declared action, never to rendered DOM:
// rerenders, snapshots and drawer reconstruction reuse its IDs and frozen
// payloads. Identical resubmission replays the submitted ID and payload; a
// changed input or submitter starts explicitly identified new work; unknown
// delivery must be reconciled before new work. The ledger keeps only bounded,
// non-sensitive unresolved requests so a reload can reconcile them first.

/** Submit path: the declared primary submit or the secondary (e.g. Preview plan). */
export type ConsoleRequestMode = 'primary' | 'secondary';

/**
 * - `pending`: in flight.
 * - `uncertain`: sent without a definitive answer (timeout, network, gateway).
 * - `checking`: a status lookup is in flight.
 * - `unclaimed`: the host has no claim inside its retry window.
 * - `unknown`: the host could not determine the claim; check again or start new work.
 * - `expired`: the host can no longer confirm the request (retry window or gone).
 * - `resolved`: definitively answered; unchanged resubmission still replays it.
 */
export type ConsoleRequestState = 'pending' | 'uncertain' | 'checking' | 'unclaimed' | 'unknown' | 'expired' | 'resolved';

export type ConsoleSubmittedRequest = {
  id: string;
  mode: ConsoleRequestMode;
  /** Complete normalized payload frozen at first submission. */
  payload: Record<string, unknown>;
  /** Canonical work input, excluding generated request fields. */
  signature: string;
  /** First submission time (RFC 3339). */
  submittedAt: string;
  /** Host-declared reconciliation scope (`request_scope`). */
  scope: string;
  state: ConsoleRequestState;
  /** Latest host-declared claim deadline; never inferred from submission time. */
  retryUntil?: string;
  /** Restored without sensitive or oversized input: only reconciliation remains. */
  partial?: boolean;
  /** Safe status text for the drawer and banners. */
  message?: string;
};

export type ConsoleRequestDraft = {
  panelID: string;
  actionID: string;
  /** ID reserved for the next new work. Empty when generation is unavailable. */
  nextID: string;
  /** Latest submitted request; replay target for identical resubmission. */
  current: ConsoleSubmittedRequest | null;
};

export type ConsoleSubmitDecision =
  | { kind: 'replay'; request: ConsoleSubmittedRequest }
  | { kind: 'new'; id: string }
  | { kind: 'blocked'; reason: string; check?: boolean };

export const REQUEST_ID_UNAVAILABLE_REASON = 'This browser cannot create a request ID. Use a current browser to run this action.';
export const REQUEST_IN_FLIGHT_REASON = 'This request is still being sent.';
export const REQUEST_UNCERTAIN_REASON = 'The earlier request may have been received. Check its status before starting new work.';
export const REQUEST_EXPIRED_REASON = 'The earlier request can no longer be confirmed. Start a new request to continue.';
export const REQUEST_UNKNOWN_REASON = 'The earlier request\u2019s state is unknown. Check again, or start a new request.';
export const REQUEST_PARTIAL_REASON = 'This request was restored without all of its input. Check its status or start a new request.';

const LEDGER_LIMIT = 16;
const LEDGER_PAYLOAD_LIMIT = 8192;
const LEDGER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
};

/**
 * Cryptographically random UUID v4, or '' when the browser offers no
 * cryptographic source. Never falls back to timestamps or Math.random.
 */
export function generateRequestID(source: CryptoLike | undefined = (globalThis as { crypto?: CryptoLike }).crypto): string {
  try {
    if (typeof source?.randomUUID === 'function') {
      const id = source.randomUUID().toLowerCase();
      if (UUID_PATTERN.test(id)) return id;
    }
    if (typeof source?.getRandomValues === 'function') {
      const bytes = source.getRandomValues(new Uint8Array(16));
      if (!bytes) return '';
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // Unavailable or blocked crypto: submission stays disabled.
  }
  return '';
}

export function validRequestID(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Canonical JSON with sorted keys, so equal inputs compare equal. */
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJSON(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJSON(item)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function draftKey(panelID: string, actionID: string): string {
  return `${panelID}\u0000${actionID}`;
}

export function newRequestDraft(panelID: string, actionID: string, generate: () => string = generateRequestID): ConsoleRequestDraft {
  return { panelID, actionID, nextID: generate(), current: null };
}

/** Unresolved requests keep their draft; new work waits for reconciliation. */
export function requestUnresolved(request: ConsoleSubmittedRequest | null | undefined): boolean {
  return Boolean(request) && request!.state !== 'resolved';
}

/** A replay needs current, bounded host authority, even after a settled result. */
export function canReplayRequest(request: ConsoleSubmittedRequest, now: number = Date.now()): boolean {
  if (request.partial || !['uncertain', 'unclaimed', 'resolved'].includes(request.state)) return false;
  const deadline = Date.parse(request.retryUntil || '');
  return Number.isFinite(deadline) && now < deadline;
}

/** Apply reconciliation without treating an unbounded answer as a replay grant. */
export function applyRequestStatus(request: ConsoleSubmittedRequest, status: string, retryUntil: unknown, now: number = Date.now()): ConsoleRequestState {
  const deadline = typeof retryUntil === 'string' ? Date.parse(retryUntil) : NaN;
  request.retryUntil = Number.isFinite(deadline) ? new Date(deadline).toISOString() : undefined;
  if (status === 'claimed') {
    request.state = 'resolved';
  } else if (status === 'unclaimed' && Number.isFinite(deadline)) {
    request.state = now < deadline ? 'unclaimed' : 'expired';
  } else {
    request.state = status === 'unclaimed' || status === 'unknown' ? 'unknown' : 'expired';
  }
  return request.state;
}

/**
 * Decide what a submission means for a draft:
 * identical mode and input replay the submitted request; anything else is new
 * work, which waits while delivery of the current request is unknown.
 */
export function decideSubmission(draft: ConsoleRequestDraft, mode: ConsoleRequestMode, signature: string): ConsoleSubmitDecision {
  const current = draft.current;
  if (current && current.state === 'pending') {
    return { kind: 'blocked', reason: REQUEST_IN_FLIGHT_REASON };
  }
  if (current && current.state === 'checking') {
    return { kind: 'blocked', reason: REQUEST_UNCERTAIN_REASON, check: true };
  }
  if (current && current.mode === mode && current.signature === signature) {
    // Resubmitting under expired or unknown claim authority could acquire a new claim.
    if (current.state === 'expired') return { kind: 'blocked', reason: REQUEST_EXPIRED_REASON };
    if (current.state === 'unknown') return { kind: 'blocked', reason: REQUEST_UNKNOWN_REASON, check: true };
    if (current.partial) return { kind: 'blocked', reason: REQUEST_PARTIAL_REASON, check: true };
    if (!canReplayRequest(current)) return { kind: 'blocked', reason: REQUEST_UNCERTAIN_REASON, check: true };
    return { kind: 'replay', request: current };
  }
  if (current && current.state === 'uncertain') {
    return { kind: 'blocked', reason: REQUEST_UNCERTAIN_REASON, check: true };
  }
  if (!validRequestID(draft.nextID)) {
    return { kind: 'blocked', reason: REQUEST_ID_UNAVAILABLE_REASON };
  }
  return { kind: 'new', id: draft.nextID };
}

/** Freeze a new submission on the draft and reserve a fresh ID for later work. */
export function freezeSubmission(
  draft: ConsoleRequestDraft,
  id: string,
  mode: ConsoleRequestMode,
  payload: Record<string, unknown>,
  signature: string,
  scope: string,
  generate: () => string = generateRequestID,
  now: Date = new Date(),
): ConsoleSubmittedRequest {
  const request: ConsoleSubmittedRequest = {
    id,
    mode,
    payload: JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
    signature,
    submittedAt: now.toISOString(),
    scope,
    state: 'pending',
  };
  draft.current = request;
  if (draft.nextID === id) draft.nextID = generate();
  return request;
}

/**
 * Explicit new work (New request / Start new request): forget the current
 * request link once it is safe to do so. Unknown delivery must be reconciled
 * first; requests in flight cannot be abandoned.
 */
export function startNewRequest(draft: ConsoleRequestDraft, generate: () => string = generateRequestID): boolean {
  const current = draft.current;
  if (current && (current.state === 'pending' || current.state === 'checking' || current.state === 'uncertain')) {
    return false;
  }
  draft.current = null;
  if (!validRequestID(draft.nextID)) draft.nextID = generate();
  return true;
}

/** ID shown read-only in the form: the latest submitted request, else the reserved one. */
export function displayedRequestID(draft: ConsoleRequestDraft): string {
  return draft.current?.id || draft.nextID;
}

// ---------------------------------------------------------------------------
// Session ledger

export type ConsoleLedgerEntry = {
  panel_id: string;
  action_id: string;
  request_id: string;
  mode: ConsoleRequestMode;
  scope: string;
  submitted_at: string;
  signature: string;
  state: ConsoleRequestState;
  retry_until?: string;
  /** Non-sensitive frozen payload; absent when it was sensitive or oversized. */
  payload?: Record<string, unknown>;
};

export type ConsoleLedgerStore = {
  get(): string | null;
  set(value: string): boolean;
  remove(): void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseEntry(value: unknown, now: number): ConsoleLedgerEntry | null {
  if (!isRecord(value)) return null;
  const entry: ConsoleLedgerEntry = {
    panel_id: text(value.panel_id).toLowerCase(),
    action_id: text(value.action_id).toLowerCase(),
    request_id: text(value.request_id).toLowerCase(),
    mode: value.mode === 'secondary' ? 'secondary' : 'primary',
    scope: text(value.scope).slice(0, 200),
    submitted_at: text(value.submitted_at),
    signature: typeof value.signature === 'string' ? value.signature.slice(0, LEDGER_PAYLOAD_LIMIT) : '',
    state: (['pending', 'uncertain', 'checking', 'unclaimed', 'unknown', 'expired'] as const).includes(value.state as never)
      ? value.state as ConsoleRequestState
      : 'uncertain',
    payload: isRecord(value.payload) ? value.payload : undefined,
    retry_until: text(value.retry_until) || undefined,
  };
  const submitted = Date.parse(entry.submitted_at);
  if (!entry.panel_id || !entry.action_id || !validRequestID(entry.request_id) || Number.isNaN(submitted)) return null;
  if (now - submitted > LEDGER_MAX_AGE_MS || submitted - now > 5 * 60 * 1000) return null;
  return entry;
}

/**
 * Bounded session-local ledger of unresolved requests for one identity
 * namespace. Storage failures degrade to in-memory drafts with visible
 * uncertainty; nothing here is a state of record.
 */
export class ConsoleRequestLedger {
  private readonly store: ConsoleLedgerStore | null;

  constructor(store: ConsoleLedgerStore | null) {
    this.store = store;
  }

  entries(now: number = Date.now()): ConsoleLedgerEntry[] {
    const raw = this.store?.get();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => parseEntry(item, now)).filter((entry): entry is ConsoleLedgerEntry => entry !== null).slice(-LEDGER_LIMIT);
    } catch {
      return [];
    }
  }

  /**
   * Record an unresolved request. Sensitive or oversized input stores neither
   * payload nor signature, so a restored request can be reconciled but never
   * resubmitted with partial input.
   */
  put(draft: ConsoleRequestDraft, request: ConsoleSubmittedRequest, sensitive: boolean): boolean {
    if (!this.store) return false;
    const entry: ConsoleLedgerEntry = {
      panel_id: draft.panelID,
      action_id: draft.actionID,
      request_id: request.id,
      mode: request.mode,
      scope: request.scope,
      submitted_at: request.submittedAt,
      signature: request.signature,
      state: request.state === 'resolved' ? 'uncertain' : request.state,
      retry_until: request.retryUntil,
    };
    const payload = JSON.stringify(request.payload);
    if (!sensitive && !request.partial && payload.length <= LEDGER_PAYLOAD_LIMIT && entry.signature.length <= LEDGER_PAYLOAD_LIMIT) {
      entry.payload = JSON.parse(payload) as Record<string, unknown>;
    } else {
      // The signature is derived from the input, so it never outlives the payload.
      entry.signature = '';
    }
    const entries = this.entries().filter((item) => item.request_id !== entry.request_id
      && !(item.panel_id === entry.panel_id && item.action_id === entry.action_id));
    entries.push(entry);
    return this.write(entries.slice(-LEDGER_LIMIT));
  }

  remove(requestID: string): void {
    if (!this.store) return;
    const entries = this.entries();
    const next = entries.filter((entry) => entry.request_id !== requestID);
    if (next.length !== entries.length) this.write(next);
  }

  clear(): void {
    this.store?.remove();
  }

  private write(entries: ConsoleLedgerEntry[]): boolean {
    if (!this.store) return false;
    if (entries.length === 0) {
      this.store.remove();
      return true;
    }
    return this.store.set(JSON.stringify(entries));
  }
}

/** Rebuild a draft for a restored ledger entry. Restored delivery is unknown. */
export function restoreDraft(entry: ConsoleLedgerEntry, generate: () => string = generateRequestID): ConsoleRequestDraft {
  const draft = newRequestDraft(entry.panel_id, entry.action_id, generate);
  draft.current = {
    id: entry.request_id,
    mode: entry.mode,
    payload: entry.payload || {},
    signature: entry.signature,
    submittedAt: entry.submitted_at,
    scope: entry.scope,
    // Storage preserves evidence, never authority: every resumable reload checks
    // the host again before a restored request can be replayed.
    state: entry.state === 'expired' ? 'expired' : 'uncertain',
    retryUntil: entry.retry_until,
    partial: !entry.payload || !entry.signature,
  };
  return draft;
}

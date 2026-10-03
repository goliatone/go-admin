// Application preview wire contract. Mirrors data/preview.go (frozen in the
// application preview DESIGN). Every response is untrusted JSON: the parsers
// keep only the declared shape, clamp lists to the service caps and reject a
// session for any other selection or surface than the one that was asked for.
// Session IDs and launch URLs locate a preview; they never grant access.

import {
  isRecord,
  list,
  oneOf,
  parseSelection,
  selectionKey,
  selectionWire,
  str,
  type ExploreSelection,
} from '../data-explorer/contract.js';

export type PreviewSurfaceKind = 'screen' | 'report';

export type PreviewSurface = { id: string; label: string; kind: PreviewSurfaceKind };

export type PreviewGuarantees = { durable: boolean; isolation: boolean; read_only: boolean; retention: boolean; cleanup: boolean };

/** Why no view can be opened; '' when previews are supported. */
export type PreviewReason = '' | 'not_supported' | 'runtime_unavailable' | 'no_readable_surfaces' | 'unknown';

export type PreviewCapability = {
  supported: boolean;
  reason: PreviewReason;
  surfaces: PreviewSurface[];
  guarantees: PreviewGuarantees;
};

export type PreviewState = 'ready' | 'unavailable' | 'expired' | 'closed';

export type PreviewSession = {
  session_id: string;
  selection: ExploreSelection;
  surface_id: string;
  state: PreviewState;
  /** RFC 3339 instant, as the server wrote it. */
  expires_at: string;
  /** Server-resolved same-origin path; only a ready session has one. */
  launch_url: string;
  /** Server-resolved same-origin path back to the Data details. */
  return_url: string;
  read_only: true;
};

/** Open input: the exact prepared selection, a registered surface and a generated request ID. */
export type PreviewOpenInput = { selection: ExploreSelection; surface_id: string; request_id: string };

/** Service caps (data/preview.go); responses beyond them are malformed. */
export const PREVIEW_LIMITS = {
  surfaces: 16,
  sessions: 4,
  labelBytes: 128,
  idBytes: 128,
  urlBytes: 4096,
  defaultLifetimeMinutes: 15,
  maxLifetimeMinutes: 30,
} as const;

export const PREVIEW_STATES: readonly PreviewState[] = ['ready', 'unavailable', 'expired', 'closed'];
const SURFACE_KINDS: readonly PreviewSurfaceKind[] = ['screen', 'report'];
const REASONS: readonly PreviewReason[] = ['not_supported', 'runtime_unavailable', 'no_readable_surfaces'];
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Identifier shape the service accepts (exploreID): bounded, trimmed, no control characters. */
export function previewID(value: unknown): string {
  if (typeof value !== 'string' || !value || value !== value.trim() || value.length > PREVIEW_LIMITS.idBytes) return '';
  return CONTROL.test(value) ? '' : value;
}

/** A server-resolved, same-origin path (never a scheme, host or protocol-relative URL), else ''. */
export function previewPath(value: unknown): string {
  const path = str(value);
  if (!path || path.length > PREVIEW_LIMITS.urlBytes || !path.startsWith('/') || path.startsWith('//')) return '';
  return /[\\\s]/.test(path) ? '' : path;
}

function parseSurface(value: unknown): PreviewSurface | null {
  if (!isRecord(value)) return null;
  const id = previewID(value.id);
  const label = str(value.label);
  const kind = oneOf(value.kind, SURFACE_KINDS);
  if (!id || !label || label.length > PREVIEW_LIMITS.labelBytes || !kind) return null;
  return { id, label, kind };
}

function flag(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parseGuarantees(value: unknown): PreviewGuarantees | null {
  if (value === undefined || value === null) {
    return { durable: false, isolation: false, read_only: false, retention: false, cleanup: false };
  }
  if (!isRecord(value)) return null;
  const out = {
    durable: flag(value.durable), isolation: flag(value.isolation), read_only: flag(value.read_only),
    retention: flag(value.retention), cleanup: flag(value.cleanup),
  };
  return Object.values(out).every((item) => item !== null) ? out as PreviewGuarantees : null;
}

/** Every adapter guarantee the service requires before a preview may launch. */
export function safeGuarantees(guarantees: PreviewGuarantees): boolean {
  return guarantees.durable && guarantees.isolation && guarantees.read_only && guarantees.retention && guarantees.cleanup;
}

/**
 * Capability for a prepared selection, or null when malformed. A supported
 * answer must name readable surfaces (unique IDs) and every guarantee; an
 * unsupported one never carries surfaces, so nothing can be launched from it.
 */
export function parseCapability(value: unknown): PreviewCapability | null {
  if (!isRecord(value)) return null;
  const supported = flag(value.supported);
  const surfaces = list(value.surfaces, PREVIEW_LIMITS.surfaces, parseSurface);
  const guarantees = parseGuarantees(value.guarantees);
  if (supported === null || !surfaces || !guarantees) return null;
  if (new Set(surfaces.map((surface) => surface.id)).size !== surfaces.length) return null;
  if (supported) {
    if (surfaces.length === 0 || !safeGuarantees(guarantees)) return null;
    return { supported, reason: '', surfaces, guarantees };
  }
  const reason = str(value.reason) ? oneOf(value.reason, REASONS) || 'unknown' : 'not_supported';
  return { supported, reason, surfaces: [], guarantees };
}

/**
 * Session for exactly `selection` and `surfaceId`, or null when malformed or
 * foreign. Only a ready session keeps its launch URL.
 */
export function parseSession(value: unknown, selection: ExploreSelection, surfaceId: string, sessionId = ''): PreviewSession | null {
  if (!isRecord(value)) return null;
  const parsed = parseSelection(value.selection);
  const id = previewID(value.session_id);
  const surface = previewID(value.surface_id);
  const state = oneOf(value.state, PREVIEW_STATES);
  const expires = str(value.expires_at);
  // A session for any other selection, surface or locator is a late or foreign answer.
  if (!parsed || selectionKey(parsed) !== selectionKey(selection) || !id || (sessionId && id !== sessionId)) return null;
  if (surface !== surfaceId || !state || value.read_only !== true || !expires || Number.isNaN(Date.parse(expires))) return null;
  const launch = state === 'ready' ? previewPath(value.launch_url) : '';
  if (state === 'ready' && !launch) return null;
  return {
    session_id: id,
    selection: parsed,
    surface_id: surface,
    state,
    expires_at: expires,
    launch_url: launch,
    return_url: previewPath(value.return_url),
    read_only: true,
  };
}

/** Wire form of an open request: exactly the frozen fields. */
export function openWire(input: PreviewOpenInput): Record<string, unknown> {
  return { selection: selectionWire(input.selection), surface_id: input.surface_id, request_id: input.request_id };
}

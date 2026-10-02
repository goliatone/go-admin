// Client capability handshake (ADR-0004). The client advertises the workflow
// behavior it implements; a declaration that needs anything else stays
// disabled with reload guidance. Availability is display metadata only: the
// server re-checks every dispatch, so nothing here grants execution.

import type { ServerPanelUIAction } from './types.js';

/** Workflow capabilities implemented by this client, sorted. */
export const CONSOLE_CLIENT_CAPABILITIES: readonly string[] = Object.freeze([
  'action_availability.v1',
  'action_drawer.v1',
  'request_id.v1',
  'rich_views.v1',
  'secondary_submit.v1',
]);

/** HTTP header carrying the advertised capabilities. */
export const CONSOLE_CAPABILITIES_HEADER = 'X-Console-Capabilities';
/** Live socket query parameter carrying the advertised capabilities. */
export const CONSOLE_CAPABILITIES_QUERY = 'capabilities';

export const CONSOLE_OUTDATED_REASON = 'This console was updated. Reload the page to use this action.';

const SUPPORTED = new Set(CONSOLE_CLIENT_CAPABILITIES);

export function consoleCapabilitiesValue(): string {
  return CONSOLE_CLIENT_CAPABILITIES.join(',');
}

export type ConsoleActionState = {
  /** The declaration may be offered as an executable control. */
  executable: boolean;
  /** Normalized availability (`available`, `unsupported`, `not_permitted`, `unavailable`). */
  availability: string;
  /** Safe explanation for a disabled control. */
  reason: string;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Executable only when the server declared it available and this client
 * implements every capability it requires. Unknown availability fails closed.
 */
export function consoleActionState(action: ServerPanelUIAction | undefined): ConsoleActionState {
  if (!action) {
    return { executable: false, availability: 'unavailable', reason: 'This action is no longer available.' };
  }
  const raw = text(action.availability).toLowerCase();
  const availability = raw === '' || raw === 'available'
    ? 'available'
    : raw === 'unsupported' || raw === 'not_permitted' ? raw : 'unavailable';
  if (availability !== 'available') {
    return { executable: false, availability, reason: text(action.reason) || defaultReason(availability) };
  }
  const requires = Array.isArray(action.requires) ? action.requires : [];
  if (requires.some((capability) => !SUPPORTED.has(text(capability).toLowerCase()))) {
    return { executable: false, availability: 'unavailable', reason: CONSOLE_OUTDATED_REASON };
  }
  return { executable: true, availability, reason: '' };
}

function defaultReason(availability: string): string {
  if (availability === 'unsupported') return 'Not supported here.';
  if (availability === 'not_permitted') return 'You do not have permission to run this action.';
  return 'Not available right now.';
}

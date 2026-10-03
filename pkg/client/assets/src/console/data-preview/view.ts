// Application preview markup for the explorer's App preview section. Pure
// string renderers over the controller's view model: every value is escaped,
// launch links are server-resolved same-origin paths checked again against
// the page, session locators are never shown and nothing reads as verified or
// active because a preview is open. Reuses the shared console button, badge,
// key/value and callout vocabulary; `console-preview*` classes add layout only.

import { escapeAttribute, escapeHTML } from '../format.js';
import { renderToneBadge } from '../schema/rich.js';
import { consoleStyleConfig } from '../style-config.js';
import type { ExploreSelection } from '../data-explorer/contract.js';
import { safeGuarantees, type PreviewCapability, type PreviewSession, type PreviewState, type PreviewSurface } from './contract.js';
import type { PreviewFailure, PreviewFailureKind } from './transport.js';

export type CapabilityEntry =
  | { status: 'loading' }
  | { status: 'ready'; value: PreviewCapability }
  | { status: 'failed'; failure: PreviewFailure };

export type LaunchBusy = '' | 'opening' | 'closing' | 'checking';

export type LaunchAction = 'open' | 'close' | 'check';

/** One surface launch of the shown selection, as the view needs it. */
export type LaunchView = {
  session: PreviewSession | null;
  /** This page's clock corrected by the server's, for this session's expiry. */
  now: number;
  busy: LaunchBusy;
  /** The last open was sent without a definitive answer: a retry reattaches. */
  uncertain: boolean;
  /** A session opened earlier in this tab whose state is not known yet. */
  remembered?: boolean;
  failure: { action: LaunchAction; failure: PreviewFailure } | null;
};

export type PreviewModel = {
  scope: string;
  selection: ExploreSelection;
  /** Scenario title of the selection (declared when known). */
  title: string;
  /** Lifecycle status of the scenario row, when the snapshot names one. */
  status?: { label: string; tone: string };
  /** The prepared receipt is also the target's active receipt. */
  activeReceipt: boolean;
  capability: CapabilityEntry | undefined;
  launch(surfaceId: string): LaunchView | undefined;
  /** Surfaces of the shown selection with a session from this page, in launch order. */
  opened: PreviewSurface[];
  /** The browser can generate request IDs for new launches. */
  identifiable: boolean;
  /** Page URL that launch links must share an origin with. */
  base: string;
  now: number;
};

const styles = consoleStyleConfig;

const KIND_LABELS: Record<PreviewSurface['kind'], string> = { screen: 'Screen', report: 'Report' };

const STATE_BADGES: Record<PreviewState, { label: string; tone: string }> = {
  ready: { label: 'Open', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'warning' },
  unavailable: { label: 'Ended', tone: 'warning' },
};

/** Launch attempts whose outcome is unknown: a retry with the same request ID reattaches. */
export const UNCERTAIN_FAILURES: ReadonlySet<PreviewFailureKind> = new Set(['network', 'timeout', 'canceled', 'failed', 'malformed']);

/** Capability failures worth reading again. */
const RETRYABLE: ReadonlySet<PreviewFailureKind> = new Set(['unavailable', 'timeout', 'network', 'malformed', 'failed', 'canceled']);

/**
 * Status or close answers that mean the server already ended the session:
 * it is gone, the actor's access changed or its prepared data changed.
 */
export const ENDING_FAILURES: ReadonlySet<PreviewFailureKind> = new Set(['gone', 'denied', 'stale']);

/** Open failures that the same launch cannot get past: only a refresh, reload or other access helps. */
const BLOCKING_OPEN: ReadonlySet<PreviewFailureKind> = new Set(['stale', 'gone', 'denied', 'expired', 'invalid', 'unconfigured']);

const CAPABILITY_FAILURES: Record<PreviewFailureKind, string> = {
  unconfigured: 'Application preview is not available on this installation.',
  invalid: 'This receipt could not be checked for application preview. Refresh and choose it again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'You do not have access to preview this receipt.',
  gone: 'This prepared receipt is no longer available. Refresh to see the current data.',
  stale: 'The prepared data changed since this page loaded. Refresh to preview the current receipt.',
  unavailable: 'Application preview is temporarily unavailable.',
  timeout: 'Checking application preview took too long.',
  network: 'Application preview could not reach the server.',
  malformed: 'The server returned preview details this page cannot read.',
  failed: 'Checking application preview failed.',
  canceled: 'Checking application preview was canceled.',
  busy: 'Application preview is busy. Try again shortly.',
  conflict: 'Application preview could not be checked. Try again.',
};

const OPEN_FAILURES: Record<PreviewFailureKind, string> = {
  unconfigured: 'Application preview is not available on this installation.',
  invalid: 'This preview request was not accepted. Refresh and try again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'You do not have access to preview this view of the receipt.',
  gone: 'This prepared receipt or view is no longer available. Refresh to see the current data.',
  stale: 'The prepared data changed since this page loaded. Refresh to preview the current receipt.',
  unavailable: 'The application cannot open a preview of this receipt right now. Try again later.',
  timeout: 'Starting the preview took too long. It may have started: try again to reattach to it.',
  network: 'The request could not reach the server. The preview may have started: try again to reattach to it.',
  malformed: 'The server answered in a way this page cannot read. The preview may have started: try again to reattach to it.',
  failed: 'Starting the preview failed. It may have started: try again to reattach to it.',
  canceled: 'Starting the preview was interrupted. It may have started: try again to reattach to it.',
  busy: 'You already have the most previews open at once. Close one, or wait until one expires, then try again.',
  conflict: 'This launch request was already used with other input. Start a new preview.',
};

const CLOSE_FAILURES: Record<PreviewFailureKind, string> = {
  unconfigured: 'Application preview is not available on this installation.',
  invalid: 'This preview could not be closed. Reload the page and try again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'Your access changed, so this preview has ended.',
  gone: 'This preview has already ended.',
  stale: 'The prepared data changed, so this preview has ended.',
  unavailable: 'Closing the preview is temporarily unavailable. Try again.',
  timeout: 'Closing the preview took too long. Try again.',
  network: 'The request could not reach the server. Try again.',
  malformed: 'The server answered in a way this page cannot read. Try again.',
  failed: 'Closing the preview failed. Try again.',
  canceled: 'Closing the preview was interrupted. Try again.',
  busy: 'The preview is busy. Try again.',
  conflict: 'This preview could not be closed. Try again.',
};

const CHECK_FAILURES: Record<PreviewFailureKind, string> = {
  ...CLOSE_FAILURES,
  invalid: 'This preview could not be checked. Reload the page.',
  timeout: 'Checking the preview took too long.',
  failed: 'Checking the preview failed.',
  canceled: 'Checking the preview was interrupted.',
  unavailable: 'Checking the preview is temporarily unavailable.',
};

const REASONS: Record<Exclude<PreviewCapability['reason'], ''>, string> = {
  not_supported: 'This application does not offer previews of prepared data.',
  runtime_unavailable: 'The application cannot open a preview of this receipt right now.',
  no_readable_surfaces: 'No application view you can open is registered for this data.',
  unknown: 'Application preview is not available for this receipt.',
};

function badge(label: string, tone = ''): string {
  return renderToneBadge(label, tone, styles);
}

function muted(text: string): string {
  return `<span class="console-muted">${escapeHTML(text)}</span>`;
}

function focusKey(action: string, surfaceId = ''): string {
  return surfaceId ? `preview:${action}:${surfaceId}` : `preview:${action}`;
}

function button(label: string, action: string, surfaceId: string, options: { primary?: boolean; busy?: boolean; disabled?: string; extra?: string } = {}): string {
  const classes = `console-btn console-btn--sm${options.primary ? ' console-btn--primary' : ''}`;
  const unavailable = options.busy || options.disabled ? ' aria-disabled="true"' : '';
  const busy = options.busy ? ' aria-busy="true"' : '';
  const reason = options.disabled ? ` title="${escapeAttribute(options.disabled)}"` : '';
  const surface = surfaceId ? ` data-surface-id="${escapeAttribute(surfaceId)}"` : '';
  return `<button type="button" class="${classes}" data-preview-action="${action}"${surface} data-explorer-focus="${escapeAttribute(focusKey(action, surfaceId))}"${unavailable}${busy}${reason}${options.extra || ''}>${escapeHTML(label)}</button>`;
}

/** The absolute same-origin URL of a server-resolved path, else ''. */
export function launchHref(path: string, base: string): string {
  if (!path) return '';
  try {
    const page = new URL(base);
    const url = new URL(path, page);
    return url.origin === page.origin && (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : '';
  } catch {
    return '';
  }
}

/** True when the session's expiry has passed on this clock. */
export function sessionExpired(session: PreviewSession, now: number): boolean {
  const expires = Date.parse(session.expires_at);
  return !Number.isFinite(expires) || expires <= now;
}

/** Ready and not past its expiry here: its launch link may be offered. */
export function sessionLive(session: PreviewSession | null | undefined, now: number): boolean {
  return Boolean(session) && session!.state === 'ready' && !sessionExpired(session!, now);
}

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Minutes left, rounded: dated answers carry whole seconds, so a ceiling would over-count. */
function remaining(iso: string, now: number): string {
  const ms = Date.parse(iso) - now;
  if (!Number.isFinite(ms) || ms <= 0) return 'now';
  if (ms < 60000) return 'in less than a minute';
  const minutes = Math.round(ms / 60000);
  return minutes === 1 ? 'in 1 minute' : `in ${minutes} minutes`;
}

function expiry(session: PreviewSession, now: number): string {
  const at = new Date(session.expires_at);
  const datetime = Number.isNaN(at.getTime()) ? '' : ` datetime="${escapeAttribute(at.toISOString())}"`;
  return `<time${datetime} title="${escapeAttribute(at.toLocaleString())}">${escapeHTML(clock(session.expires_at))}</time> (${escapeHTML(remaining(session.expires_at, now))})`;
}

function endedMessage(session: PreviewSession, now: number): string {
  if (session.state === 'closed') return 'This preview was closed. Nothing it showed is kept.';
  if (session.state === 'expired' || (session.state === 'ready' && sessionExpired(session, now))) {
    return `This preview expired at ${clock(session.expires_at)}. Start a new preview to look again.`;
  }
  return 'This preview ended because the receipt, your access or the application runtime changed.';
}

function failureMessage(failure: LaunchView['failure']): string {
  if (!failure) return '';
  const table = failure.action === 'open' ? OPEN_FAILURES : failure.action === 'close' ? CLOSE_FAILURES : CHECK_FAILURES;
  return table[failure.failure.kind] || table.failed;
}

/**
 * Callout actions that the surface's own controls do not already offer: a
 * Refresh when the pinned receipt is stale or gone, and Check again after an
 * explicit status check could not answer.
 */
function failureActions(launch: LaunchView): string {
  const failure = launch.failure;
  if (!failure) return '';
  const kind = failure.failure.kind;
  if (failure.action === 'open') return kind === 'stale' || kind === 'gone' || kind === 'invalid' ? explorerRefresh() : '';
  if (failure.action === 'check' && RETRYABLE.has(kind) && launch.session) return button('Check again', 'check', launch.session.surface_id);
  return '';
}

function explorerRefresh(): string {
  return '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>';
}

function renderFailure(launch: LaunchView): string {
  const message = failureMessage(launch.failure);
  if (!message) return '';
  const kind = launch.failure!.failure.kind;
  const tone = kind === 'denied' || kind === 'expired' ? 'error' : 'warning';
  const actions = failureActions(launch);
  return `<div class="console-callout console-preview__failure" data-tone="${tone}" role="alert" data-preview-failure="${escapeAttribute(`${launch.failure!.action}:${kind}`)}"><p>${escapeHTML(message)}</p>${actions ? `<div class="console-explorer__state-actions">${actions}</div>` : ''}</div>`;
}

/** A live session: its launch link (withdrawn while closing), expiry and Close. */
function renderLiveControls(model: PreviewModel, surface: PreviewSurface, session: PreviewSession, busy: LaunchBusy, now: number): string {
  const closing = busy === 'closing';
  // A preview being closed is no longer offered for navigation.
  const href = closing ? '' : launchHref(session.launch_url, model.base);
  let link = '';
  if (href) {
    link = `<a class="console-btn console-btn--sm console-btn--primary" href="${escapeAttribute(href)}" data-preview-launch data-surface-id="${escapeAttribute(surface.id)}" data-explorer-focus="${escapeAttribute(focusKey('launch', surface.id))}">Open preview<span class="console-sr-only"> of ${escapeHTML(surface.label)}</span></a>`;
  } else if (!closing) {
    link = muted('No launch link is available for this preview.');
  }
  const checking = busy === 'checking' ? '<span class="console-muted" role="status" aria-busy="true">Checking…</span>' : '';
  return `
    <p class="console-preview__status" data-preview-state="ready">Read-only preview of receipt <code class="console-kv__mono">${escapeHTML(session.selection.receipt_id || '')}</code>. Expires at ${expiry(session, now)}.</p>
    <div class="console-preview__actions">${link}${button(closing ? 'Closing…' : 'Close preview', 'close', surface.id, { busy: closing })}${checking}</div>
  `;
}

/** An ended session: why, and a new launch when the view is still offered. */
function renderEndedControls(model: PreviewModel, surface: PreviewSurface, session: PreviewSession, now: number, offered: boolean): string {
  const state = session.state === 'ready' ? 'expired' : session.state;
  const again = offered ? `<div class="console-preview__actions">${button('Start a new preview', 'new', surface.id, { disabled: model.identifiable ? '' : REQUEST_ID_REASON })}</div>` : '';
  return `
    <p class="console-preview__status" data-preview-state="${escapeAttribute(state)}">${escapeHTML(endedMessage(session, now))}</p>
    ${again}
  `;
}

/**
 * A session opened earlier whose state could not be read: it may still be
 * open (holding the receipt and a quota slot), so checking it again comes
 * first; starting a new preview stays an explicit choice.
 */
function renderRememberedControls(model: PreviewModel, surface: PreviewSurface, offered: boolean): string {
  const again = offered ? button('Start a new preview', 'new', surface.id, { disabled: model.identifiable ? '' : REQUEST_ID_REASON }) : '';
  return `
    <p class="console-preview__status" data-preview-state="unknown">A preview you opened earlier may still be open, but its state could not be read.</p>
    <div class="console-preview__actions">${button('Check again', 'check', surface.id, { primary: true })}${again}</div>
  `;
}

/** No session yet: Start preview, or the retry a failed launch allows. */
function renderStartControls(model: PreviewModel, surface: PreviewSurface, launch: LaunchView | undefined): string {
  const failure = launch?.failure;
  const uncertain = Boolean(launch?.uncertain);
  // A failure the same launch cannot get past offers only the callout's next step.
  if (failure?.action === 'open' && BLOCKING_OPEN.has(failure.failure.kind) && !uncertain) return '';
  const disabled = model.identifiable ? '' : REQUEST_ID_REASON;
  const reason = disabled ? `<p class="console-preview__status">${muted(disabled)}</p>` : '';
  let label = 'Start preview';
  if (uncertain) label = 'Try again';
  else if (failure?.action === 'open') label = failure.failure.kind === 'conflict' ? 'Start a new preview' : 'Try again';
  return `${reason}<div class="console-preview__actions">${button(label, 'open', surface.id, { primary: true, disabled })}</div>`;
}

/**
 * Controls of one surface. `offered` is false for a surface the latest
 * capability no longer lists: its session can still be opened or closed, but
 * no new launch is offered.
 */
function renderLaunchControls(model: PreviewModel, surface: PreviewSurface, launch: LaunchView | undefined, offered: boolean): string {
  const session = launch?.session || null;
  const busy = launch?.busy || '';
  const now = launch?.now ?? model.now;
  if (busy === 'opening') {
    return `<div class="console-preview__actions">${button('Starting preview…', 'open', surface.id, { primary: true, busy: true })}</div>`;
  }
  if (session && sessionLive(session, now)) return renderLiveControls(model, surface, session, busy, now);
  if (session) return renderEndedControls(model, surface, session, now, offered);
  // A session remembered from earlier in this tab is shown only once the server answers for it.
  if (busy === 'checking') return '<p class="console-preview__status" role="status" aria-busy="true">Checking the preview you opened earlier…</p>';
  if (launch?.remembered) return renderRememberedControls(model, surface, offered);
  return offered ? renderStartControls(model, surface, launch) : '';
}

/** Shown when this browser cannot create request IDs (no cryptographic source). */
export const REQUEST_ID_REASON = 'This browser cannot create a request ID. Use a current browser to start a preview.';

function stateBadge(launch: LaunchView | undefined): string {
  const session = launch?.session;
  if (!session || launch?.busy === 'opening') return '';
  const state: PreviewState = session.state === 'ready' && sessionExpired(session, launch!.now) ? 'expired' : session.state;
  const { label, tone } = STATE_BADGES[state];
  return badge(label, tone);
}

function renderSurface(model: PreviewModel, surface: PreviewSurface, offered = true): string {
  const launch = model.launch(surface.id);
  return `
    <li class="console-preview__surface" data-surface-id="${escapeAttribute(surface.id)}" aria-labelledby="${escapeAttribute(`${model.scope}-surface-${surface.id}`)}">
      <div class="console-explorer__usage-head"><span class="console-explorer__usage-label" id="${escapeAttribute(`${model.scope}-surface-${surface.id}`)}">${escapeHTML(surface.label)}</span>${badge(KIND_LABELS[surface.kind])}${stateBadge(launch)}</div>
      ${renderLaunchControls(model, surface, launch, offered)}
      ${launch ? renderFailure(launch) : ''}
    </li>
  `;
}

function renderIdentity(model: PreviewModel): string {
  const selection = model.selection;
  const status = model.status ? badge(model.status.label, model.status.tone) : '<span class="console-kv__empty">Unknown</span>';
  const rows: Array<[string, string]> = [
    ['Scenario', escapeHTML(model.title)],
    ['Prepared receipt', `<code class="console-kv__mono">${escapeHTML(selection.receipt_id || '')}</code>`],
    ['Content revision', escapeHTML(String(selection.content_revision ?? ''))],
    ['Target', escapeHTML(selection.target_id)],
    ['Lifecycle status', status],
  ];
  return `<dl class="console-kv console-preview__identity">${rows.map(([label, value]) => `<dt>${escapeHTML(label)}</dt><dd>${value}</dd>`).join('')}</dl>`;
}

function renderGuarantees(capability: PreviewCapability): string {
  if (!safeGuarantees(capability.guarantees)) return '';
  const items = ['Read-only', 'Isolated from the data the target serves', 'Expires automatically', 'Cleaned up when closed'];
  return `<ul class="console-preview__guarantees" aria-label="Preview guarantees">${items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
}

function renderCapabilityFailure(failure: PreviewFailure): string {
  const message = CAPABILITY_FAILURES[failure.kind] || CAPABILITY_FAILURES.failed;
  const retry = RETRYABLE.has(failure.kind) ? button('Try again', 'retry', '') : '';
  const refresh = failure.kind === 'gone' || failure.kind === 'stale' || failure.kind === 'invalid' ? explorerRefresh() : '';
  const tone = failure.kind === 'denied' || failure.kind === 'expired' ? 'error' : 'warning';
  return `<div class="console-callout console-explorer__state" data-tone="${tone}" role="alert" data-preview-failure="capability:${escapeAttribute(failure.kind)}"><p>${escapeHTML(message)}</p>${retry || refresh ? `<div class="console-explorer__state-actions">${retry}${refresh}</div>` : ''}</div>`;
}

/** Sessions opened here whose surface the capability does not list (now): still reachable and closable. */
function renderOpened(model: PreviewModel, offered: PreviewSurface[]): string {
  const others = model.opened.filter((surface) => !offered.some((candidate) => candidate.id === surface.id));
  if (others.length === 0) return '';
  return `<ul class="console-preview__surfaces" aria-label="Previews opened from this page">${others.map((surface) => renderSurface(model, surface, false)).join('')}</ul>`;
}

function renderCapability(model: PreviewModel): string {
  const entry = model.capability;
  if (!entry || entry.status === 'loading') {
    return `<div class="console-explorer__loading" role="status" aria-busy="true">Checking which application views can open this receipt…</div>${renderOpened(model, [])}`;
  }
  if (entry.status === 'failed') return `${renderCapabilityFailure(entry.failure)}${renderOpened(model, [])}`;
  const capability = entry.value;
  if (!capability.supported) {
    const reason = REASONS[capability.reason || 'unknown'] || REASONS.unknown;
    const retry = capability.reason === 'runtime_unavailable' ? `<div class="console-explorer__state-actions">${button('Try again', 'retry', '')}</div>` : '';
    return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="unsupported" data-preview-reason="${escapeAttribute(capability.reason || 'unknown')}"><p>${escapeHTML(reason)} The receipt’s details remain available in the other sections.</p>${retry}</div>${renderOpened(model, [])}`;
  }
  return `${renderGuarantees(capability)}<ul class="console-preview__surfaces" aria-label="Application views">${capability.surfaces.map((surface) => renderSurface(model, surface)).join('')}</ul>${renderOpened(model, capability.surfaces)}`;
}

export function renderPreview(model: PreviewModel): string {
  const active = model.activeReceipt
    ? ' This receipt is also the active one; a preview still reads its pinned prepared stage.'
    : '';
  return `
    <div class="console-preview" data-preview-root>
      <p class="console-explorer__para console-muted">Open a registered application view against this prepared receipt. Opening a preview does not verify or activate the receipt or change what ${escapeHTML(model.selection.target_id)} serves.${escapeHTML(active)}</p>
      ${renderIdentity(model)}
      ${renderCapability(model)}
    </div>
  `;
}

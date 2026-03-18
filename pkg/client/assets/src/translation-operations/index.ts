/**
 * Translation Operations Entrypoint Module
 *
 * Provides shared UI behavior for translation operations (queue/exchange)
 * based on backend capability metadata gating.
 *
 * Uses resolver-based links from backend capabilities instead of
 * ad-hoc template-only flags.
 */

import {
  EMPTY_TRANSLATION_CAPABILITIES,
  normalizeTranslationCapabilities,
  type TranslationCapabilities,
  type TranslationEntrypoint,
  type TranslationModuleState,
} from '../translation-contracts/index.js';
import {
  BG_MUTED,
  BG_SURFACE,
  BORDER_DEFAULT,
  ROUNDED_CARD,
  TEXT_DEFAULT,
  TEXT_MUTED,
} from '../translation-shared/index.js';
import { httpRequest } from '../shared/transport/http-client.js';
import { extractStructuredError } from '../toast/error-helpers.js';

/**
 * Configuration for TranslationOperationsManager
 */
export interface TranslationOperationsConfig {
  /** Base path for the admin UI */
  basePath: string;
  /** Translation capabilities from backend */
  capabilities?: TranslationCapabilities;
  /** Container element or selector for rendering entrypoints */
  container?: HTMLElement | string;
  /** Callback when an entrypoint is clicked */
  onEntrypointClick?: (entrypoint: TranslationEntrypoint) => void;
}

/**
 * Resolver route keys for translation operations
 */
const ROUTE_KEYS = {
  QUEUE: 'admin.translations.queue',
  EXCHANGE_UI: 'admin.translations.exchange',
  EXCHANGE_EXPORT: 'admin.api.translations.export',
  EXCHANGE_IMPORT_VALIDATE: 'admin.api.translations.import.validate',
  EXCHANGE_IMPORT_APPLY: 'admin.api.translations.import.apply',
} as const;

const SHELL_MUTED_PANEL = `${ROUNDED_CARD} border ${BORDER_DEFAULT} ${BG_MUTED} px-4 py-4`;
const SHELL_SURFACE_PANEL = `${ROUNDED_CARD} border ${BORDER_DEFAULT} ${BG_SURFACE} px-4 py-4`;

export type TranslationShellStatus = 'loading' | 'empty' | 'ready' | 'error' | 'conflict';

export interface TranslationShellLoadResult {
  status: TranslationShellStatus;
  payload?: unknown;
  message?: string;
  requestId?: string;
  traceId?: string;
  statusCode?: number;
  errorCode?: string | null;
}

/**
 * Extracts translation capabilities from page context
 * Looks for data embedded in a script tag or window object
 */
export function extractTranslationCapabilities(): TranslationCapabilities {
  // Try window object first (set by layout template)
  if (typeof window !== 'undefined' && (window as any).__TRANSLATION_CAPABILITIES__) {
    return normalizeTranslationCapabilities((window as any).__TRANSLATION_CAPABILITIES__);
  }

  // Try script tag with JSON data
  const scriptEl = document.querySelector('script[data-translation-capabilities]');
  if (scriptEl) {
    try {
      const rawData = scriptEl.textContent || '';
      const parsed = JSON.parse(rawData);
      return normalizeTranslationCapabilities(parsed);
    } catch {
      // Fall through to default
    }
  }

  // Try data attribute on body
  const body = document.body;
  if (body?.dataset?.translationCapabilities) {
    try {
      return normalizeTranslationCapabilities(JSON.parse(body.dataset.translationCapabilities));
    } catch {
      // Fall through to default
    }
  }

  return { ...EMPTY_TRANSLATION_CAPABILITIES };
}

function moduleGate(
  state: TranslationModuleState | undefined
): { visible: boolean; enabled: boolean; reason?: string; reasonCode?: string; permission?: string } {
  if (!state) {
    return { visible: false, enabled: false };
  }
  const visible = state.visible === true || (state.visible === undefined && state.enabled);
  const entry = state.entry ?? { enabled: state.enabled };
  const entryEnabled = entry.enabled === true;
  const reason = entry.reason || (!state.enabled ? 'module disabled by capability mode' : undefined);
  const reasonCode = entry.reason_code || (!state.enabled ? 'FEATURE_DISABLED' : undefined);
  const permission = entry.permission;
  if (!visible) {
    return {
      visible: false,
      enabled: false,
      reason,
      reasonCode,
      permission,
    };
  }
  if (!state.enabled || !entryEnabled) {
    return {
      visible: true,
      enabled: false,
      reason,
      reasonCode,
      permission,
    };
  }
  return { visible: true, enabled: true };
}

/**
 * Checks if translation exchange module is enabled
 */
export function isExchangeEnabled(caps?: TranslationCapabilities): boolean {
  const c = caps ?? extractTranslationCapabilities();
  return c.modules.exchange.enabled;
}

/**
 * Checks if translation queue module is enabled
 */
export function isQueueEnabled(caps?: TranslationCapabilities): boolean {
  const c = caps ?? extractTranslationCapabilities();
  return c.modules.queue.enabled;
}

/**
 * Checks if any translation operations module is enabled
 */
export function hasTranslationOperations(caps?: TranslationCapabilities): boolean {
  return isExchangeEnabled(caps) || isQueueEnabled(caps);
}

/**
 * Gets the resolved route for a translation operation
 */
export function getTranslationRoute(
  key: keyof typeof ROUTE_KEYS,
  caps?: TranslationCapabilities,
  basePath?: string
): string | null {
  const c = caps ?? extractTranslationCapabilities();
  const routeKey = ROUTE_KEYS[key];

  // Check resolver-based route first
  if (c.routes[routeKey]) {
    return c.routes[routeKey];
  }

  // Fallback to base path construction
  const base = (basePath ?? '').replace(/\/+$/, '');
  switch (key) {
    case 'QUEUE':
      return c.modules.queue.enabled ? `${base}/translations/queue` : null;
    case 'EXCHANGE_UI':
      return c.modules.exchange.enabled ? `${base}/translations/exchange` : null;
    default:
      return null;
  }
}

/**
 * Builds the list of available translation operation entrypoints
 * based on backend capability metadata
 */
export function buildTranslationEntrypoints(
  caps?: TranslationCapabilities,
  basePath?: string
): TranslationEntrypoint[] {
  const c = caps ?? extractTranslationCapabilities();
  const base = (basePath ?? '').replace(/\/+$/, '');
  const entrypoints: TranslationEntrypoint[] = [];

  // Queue entrypoint
  const queueGate = moduleGate(c.modules.queue);
  const queueRoute = getTranslationRoute('QUEUE', c, base);
  if (queueGate.visible && queueRoute) {
    entrypoints.push({
      id: 'translation-queue',
      label: 'Translation Queue',
      icon: 'iconoir-language',
      href: queueRoute,
      module: 'queue',
      enabled: queueGate.enabled,
      description: 'Manage translation assignments and review workflow',
      disabledReason: queueGate.reason,
      disabledReasonCode: queueGate.reasonCode,
      permission: queueGate.permission,
    });
  }

  // Exchange entrypoint
  const exchangeGate = moduleGate(c.modules.exchange);
  const exchangeRoute = getTranslationRoute('EXCHANGE_UI', c, base);
  if (exchangeGate.visible && exchangeRoute) {
    entrypoints.push({
      id: 'translation-exchange',
      label: 'Translation Exchange',
      icon: 'iconoir-translate',
      href: exchangeRoute,
      module: 'exchange',
      enabled: exchangeGate.enabled,
      description: 'Export and import translation files',
      disabledReason: exchangeGate.reason,
      disabledReasonCode: exchangeGate.reasonCode,
      permission: exchangeGate.permission,
    });
  }

  return entrypoints;
}

/**
 * Renders a single entrypoint as an HTML element
 * Includes accessibility attributes for screen readers
 */
export function renderEntrypointLink(
  entrypoint: TranslationEntrypoint,
  options?: { asListItem?: boolean; className?: string }
): HTMLElement {
  const { asListItem = false, className = '' } = options ?? {};

  const link = document.createElement('a');
  link.href = entrypoint.enabled ? entrypoint.href : '#';
  link.className = `nav-item translation-operation-link ${className}`.trim();
  link.setAttribute('data-entrypoint-id', entrypoint.id);
  link.setAttribute('data-module', entrypoint.module);
  link.setAttribute('data-enabled', entrypoint.enabled ? 'true' : 'false');
  if (!entrypoint.enabled) {
    link.setAttribute('aria-disabled', 'true');
    link.classList.add('opacity-60', 'cursor-not-allowed');
  }

  // Accessibility: descriptive label and tooltip
  const disabledReason = entrypoint.disabledReason?.trim();
  const description = disabledReason
    ? `${entrypoint.description || entrypoint.label} (${disabledReason})`
    : (entrypoint.description || entrypoint.label);
  link.setAttribute('aria-label', description);
  link.setAttribute('title', description);

  // Icon (decorative - hidden from screen readers)
  const icon = document.createElement('i');
  icon.className = `${entrypoint.icon} flex-shrink-0`;
  icon.style.fontSize = 'var(--sidebar-icon-size, 20px)';
  icon.setAttribute('aria-hidden', 'true');
  link.appendChild(icon);

  // Label
  const label = document.createElement('span');
  label.className = 'nav-text flex-1';
  label.textContent = entrypoint.label;
  link.appendChild(label);

  // Badge (if present)
  if (entrypoint.badge) {
    const badge = document.createElement('span');
    const variantClass = entrypoint.badgeVariant === 'warning'
      ? 'bg-yellow-500/20 text-yellow-400'
      : entrypoint.badgeVariant === 'danger'
      ? 'bg-red-500/20 text-red-400'
      : entrypoint.badgeVariant === 'success'
      ? 'bg-green-500/20 text-green-400'
      : 'bg-blue-500/20 text-blue-400';
    badge.className = `ml-auto px-2 py-0.5 ${variantClass} text-xs font-medium rounded`;
    badge.textContent = entrypoint.badge;
    badge.setAttribute('aria-label', `${entrypoint.badge} badge`);
    link.appendChild(badge);
  }

  if (!entrypoint.enabled) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  if (asListItem) {
    const li = document.createElement('li');
    li.appendChild(link);
    return li;
  }

  return link;
}

/**
 * Renders all enabled translation operation entrypoints
 */
export function renderTranslationEntrypoints(
  container: HTMLElement | string,
  caps?: TranslationCapabilities,
  basePath?: string,
  options?: { asListItems?: boolean; headerLabel?: string }
): void {
  const { asListItems = false, headerLabel } = options ?? {};
  const containerEl = typeof container === 'string'
    ? document.querySelector<HTMLElement>(container)
    : container;

  if (!containerEl) return;

  const entrypoints = buildTranslationEntrypoints(caps, basePath);
  if (entrypoints.length === 0) {
    containerEl.style.display = 'none';
    return;
  }

  containerEl.style.display = '';
  containerEl.innerHTML = '';

  // Accessibility: wrap in nav element with aria-label
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', headerLabel || 'Translation operations');
  nav.setAttribute('role', 'navigation');

  // Optional header
  if (headerLabel) {
    const headerId = `translation-ops-header-${Date.now()}`;
    const header = document.createElement('h3');
    header.id = headerId;
    header.className = 'text-xs font-medium text-sidebar-text-muted uppercase tracking-wider px-3 py-2';
    header.textContent = headerLabel;
    nav.appendChild(header);
    nav.setAttribute('aria-labelledby', headerId);
  }

  // Render entrypoints as list for better accessibility
  const wrapper = asListItems ? document.createElement('ul') : document.createElement('div');
  wrapper.className = asListItems ? 'space-y-0.5' : 'space-y-0.5';
  if (asListItems) {
    wrapper.setAttribute('role', 'list');
  }

  for (const entrypoint of entrypoints) {
    const el = renderEntrypointLink(entrypoint, { asListItem: asListItems });
    wrapper.appendChild(el);
  }

  nav.appendChild(wrapper);
  containerEl.appendChild(nav);
}

function readResponseToken(response: Response, name: string): string {
  const value = response.headers.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function extractTraceMetadata(response: Response, requestId?: string): { requestId?: string; traceId?: string } {
  const headerRequestId = readResponseToken(response, 'x-request-id');
  const correlationId = readResponseToken(response, 'x-correlation-id');
  const traceId = readResponseToken(response, 'x-trace-id') || correlationId || requestId;
  return {
    requestId: headerRequestId || requestId,
    traceId: traceId || undefined,
  };
}

function payloadCollectionSize(payload: unknown): number {
  if (Array.isArray(payload)) {
    return payload.length;
  }
  if (!payload || typeof payload !== 'object') {
    return 0;
  }
  const record = payload as Record<string, unknown>;
  for (const key of ['items', 'assignments', 'results', 'rows', 'families']) {
    if (Array.isArray(record[key])) {
      return record[key].length;
    }
  }
  if (record.data && typeof record.data === 'object') {
    return payloadCollectionSize(record.data);
  }
  return Object.keys(record).length;
}

export async function fetchTranslationShellData(endpoint: string): Promise<TranslationShellLoadResult> {
  const url = endpoint.trim();
  if (!url) {
    return {
      status: 'empty',
      message: 'This shell route is ready, but the backing API contract has not been connected yet.',
    };
  }

  const response = await httpRequest(url, { method: 'GET' });
  const requestMeta = extractTraceMetadata(response);
  if (!response.ok) {
    const structured = await extractStructuredError(response);
    const status: TranslationShellStatus =
      response.status === 409 || structured.textCode === 'VERSION_CONFLICT'
        ? 'conflict'
        : 'error';
    return {
      status,
      message: structured.message,
      requestId: requestMeta.requestId,
      traceId: requestMeta.traceId,
      statusCode: response.status,
      errorCode: structured.textCode,
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (payloadCollectionSize(payload) === 0) {
    return {
      status: 'empty',
      payload,
      requestId: requestMeta.requestId,
      traceId: requestMeta.traceId,
      statusCode: response.status,
      message: 'No records match the current shell route yet.',
    };
  }

  return {
    status: 'ready',
    payload,
    requestId: requestMeta.requestId,
    traceId: requestMeta.traceId,
    statusCode: response.status,
  };
}

function renderTraceSummary(result: TranslationShellLoadResult): string {
  const chips: string[] = [];
  if (result.requestId) {
    chips.push(`<span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Request ${escapeHTML(result.requestId)}</span>`);
  }
  if (result.traceId) {
    chips.push(`<span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Trace ${escapeHTML(result.traceId)}</span>`);
  }
  if (!chips.length) {
    return '';
  }
  return `<div class="flex flex-wrap gap-2 mt-4">${chips.join('')}</div>`;
}

function renderReadyState(result: TranslationShellLoadResult, title: string, description: string): string {
  const count = payloadCollectionSize(result.payload);
  return `
    <div class="space-y-4">
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-sm font-medium text-emerald-800">${escapeHTML(title)}</p>
        <p class="mt-1 text-sm text-emerald-700">${count} contract item${count === 1 ? '' : 's'} available for this shell.</p>
      </div>
      <div class="${SHELL_MUTED_PANEL}">
        <p class="text-sm ${TEXT_DEFAULT}">${escapeHTML(description)}</p>
        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium ${TEXT_DEFAULT}">Inspect payload</summary>
          <pre class="mt-3 overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">${escapeHTML(JSON.stringify(result.payload, null, 2))}</pre>
        </details>
        ${renderTraceSummary(result)}
      </div>
    </div>
  `;
}

function renderConflictState(result: TranslationShellLoadResult): string {
  return `
    <div class="space-y-4">
      ${renderShellErrorState(
        'Version conflict',
        result.message || 'The shell route detected a canonical version conflict.'
      )}
      ${renderTraceSummary(result)}
    </div>
  `;
}

function renderShellEmptyState(title: string, message: string): string {
  return `
    <div class="${SHELL_MUTED_PANEL}">
      <p class="text-sm font-semibold ${TEXT_DEFAULT}">${escapeHTML(title)}</p>
      <p class="mt-1 text-sm ${TEXT_MUTED}">${escapeHTML(message)}</p>
    </div>
  `;
}

function renderShellErrorState(title: string, message: string): string {
  return `
    <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
      <p class="text-sm font-semibold text-rose-800">${escapeHTML(title)}</p>
      <p class="mt-1 text-sm text-rose-700">${escapeHTML(message)}</p>
    </div>
  `;
}

function renderShellLoadingState(): string {
  return `
    <div class="${SHELL_SURFACE_PANEL}">
      <p class="text-sm font-medium ${TEXT_DEFAULT}">Loading translation shell...</p>
      <p class="mt-1 text-sm ${TEXT_MUTED}">Waiting for the backing API response.</p>
    </div>
  `;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTranslationSurfaceShell(
  root: HTMLElement,
  result: TranslationShellLoadResult,
  options: { title?: string; description?: string } = {}
): void {
  const title = options.title || root.dataset.title || 'Translation Shell';
  const description = options.description || root.dataset.description || 'Translation shell route';
  switch (result.status) {
    case 'ready':
      root.innerHTML = renderReadyState(result, title, description);
      return;
    case 'conflict':
      root.innerHTML = renderConflictState(result);
      return;
    case 'error':
      root.innerHTML = `
        ${renderShellErrorState(
          'Translation shell request failed',
          result.message || 'The shell route could not load its backing payload.'
        )}
        ${renderTraceSummary(result)}
      `;
      return;
    case 'empty':
      root.innerHTML = `
        ${renderShellEmptyState(title, result.message || description)}
        ${renderTraceSummary(result)}
      `;
      return;
    default:
      root.innerHTML = renderShellLoadingState();
  }
}

export async function initTranslationSurfaceShell(
  rootOrSelector: HTMLElement | string
): Promise<TranslationShellLoadResult | null> {
  const root = typeof rootOrSelector === 'string'
    ? document.querySelector<HTMLElement>(rootOrSelector)
    : rootOrSelector;
  if (!root) {
    return null;
  }

  renderTranslationSurfaceShell(root, { status: 'loading' });
  const result = await fetchTranslationShellData(root.dataset.endpoint || '');
  renderTranslationSurfaceShell(root, result);
  return result;
}

/**
 * Manager class for translation operations UI
 */
export class TranslationOperationsManager {
  private config: Required<TranslationOperationsConfig>;
  private capabilities: TranslationCapabilities;
  private entrypoints: TranslationEntrypoint[] = [];

  constructor(config: TranslationOperationsConfig) {
    this.config = {
      basePath: config.basePath,
      capabilities: config.capabilities ?? extractTranslationCapabilities(),
      container: config.container ?? '[data-translation-operations]',
      onEntrypointClick: config.onEntrypointClick ?? (() => {}),
    };
    this.capabilities = this.config.capabilities;
    this.entrypoints = buildTranslationEntrypoints(this.capabilities, this.config.basePath);
  }

  /** Get capabilities */
  getCapabilities(): TranslationCapabilities {
    return this.capabilities;
  }

  /** Get available entrypoints */
  getEntrypoints(): TranslationEntrypoint[] {
    return this.entrypoints;
  }

  /** Check if any operations are available */
  hasOperations(): boolean {
    return this.entrypoints.length > 0;
  }

  /** Check if exchange is enabled */
  isExchangeEnabled(): boolean {
    return isExchangeEnabled(this.capabilities);
  }

  /** Check if queue is enabled */
  isQueueEnabled(): boolean {
    return isQueueEnabled(this.capabilities);
  }

  /** Get route for a specific operation */
  getRoute(key: keyof typeof ROUTE_KEYS): string | null {
    return getTranslationRoute(key, this.capabilities, this.config.basePath);
  }

  /** Initialize and render entrypoints */
  init(): void {
    if (!this.hasOperations()) return;

    const container = typeof this.config.container === 'string'
      ? document.querySelector<HTMLElement>(this.config.container)
      : this.config.container;

    if (!container) return;

    renderTranslationEntrypoints(
      container,
      this.capabilities,
      this.config.basePath,
      { headerLabel: 'Translations' }
    );

    // Bind click handlers
    container.querySelectorAll<HTMLAnchorElement>('.translation-operation-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const entrypointId = link.dataset.entrypointId;
        const entrypoint = this.entrypoints.find(ep => ep.id === entrypointId);
        if (!entrypoint || !entrypoint.enabled) {
          e.preventDefault();
          return;
        }
        if (this.config.onEntrypointClick) {
          this.config.onEntrypointClick(entrypoint);
        }
      });
    });
  }
}

/**
 * Auto-initializes translation operations if container exists
 */
export function initTranslationOperations(basePath?: string): TranslationOperationsManager | null {
  const container = document.querySelector<HTMLElement>('[data-translation-operations]');
  if (!container) return null;

  const manager = new TranslationOperationsManager({
    basePath: basePath ?? '',
  });
  manager.init();
  return manager;
}

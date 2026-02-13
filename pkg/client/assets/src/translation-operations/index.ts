/**
 * Translation Operations Entrypoint Module
 *
 * Provides shared UI behavior for translation operations (queue/exchange)
 * based on backend capability metadata gating.
 *
 * Task 19.5: Uses resolver-based links from backend capabilities,
 * not ad-hoc template-only flags.
 */

/**
 * Translation capability profile from backend
 */
export type TranslationProfile =
  | 'none'
  | 'core'
  | 'core+exchange'
  | 'core+queue'
  | 'full';

/**
 * Module enablement state
 */
export interface TranslationModuleState {
  enabled: boolean;
}

/**
 * Translation capabilities from backend
 */
export interface TranslationCapabilities {
  /** Active capability profile */
  profile: TranslationProfile;
  /** Schema version for compatibility */
  schema_version: number;
  /** Module enablement states */
  modules: {
    exchange: TranslationModuleState;
    queue: TranslationModuleState;
  };
  /** Feature enablement states */
  features: {
    cms: boolean;
    dashboard: boolean;
  };
  /** Resolver-based routes */
  routes: Record<string, string>;
  /** Registered panels */
  panels: string[];
  /** Available resolver keys */
  resolver_keys: string[];
  /** Configuration warnings */
  warnings: string[];
}

/**
 * Entrypoint link definition
 */
export interface TranslationEntrypoint {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon class (iconoir) */
  icon: string;
  /** Target URL (resolver-based) */
  href: string;
  /** Module that enables this entrypoint */
  module: 'exchange' | 'queue' | 'core';
  /** Whether this entrypoint is enabled */
  enabled: boolean;
  /** Optional description */
  description?: string;
  /** Badge text (e.g., "New") */
  badge?: string;
  /** Badge variant */
  badgeVariant?: 'info' | 'warning' | 'success' | 'danger';
}

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
 * Default empty capabilities
 */
const EMPTY_CAPABILITIES: TranslationCapabilities = {
  profile: 'none',
  schema_version: 1,
  modules: {
    exchange: { enabled: false },
    queue: { enabled: false },
  },
  features: {
    cms: false,
    dashboard: false,
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: [],
};

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

/**
 * Extracts translation capabilities from page context
 * Looks for data embedded in a script tag or window object
 */
export function extractTranslationCapabilities(): TranslationCapabilities {
  // Try window object first (set by layout template)
  if (typeof window !== 'undefined' && (window as any).__TRANSLATION_CAPABILITIES__) {
    return normalizeCapabilities((window as any).__TRANSLATION_CAPABILITIES__);
  }

  // Try script tag with JSON data
  const scriptEl = document.querySelector('script[data-translation-capabilities]');
  if (scriptEl) {
    try {
      const rawData = scriptEl.textContent || '';
      const parsed = JSON.parse(rawData);
      return normalizeCapabilities(parsed);
    } catch {
      // Fall through to default
    }
  }

  // Try data attribute on body
  const body = document.body;
  if (body?.dataset?.translationCapabilities) {
    try {
      return normalizeCapabilities(JSON.parse(body.dataset.translationCapabilities));
    } catch {
      // Fall through to default
    }
  }

  return { ...EMPTY_CAPABILITIES };
}

/**
 * Normalizes raw capability data to ensure type safety
 */
function normalizeCapabilities(raw: unknown): TranslationCapabilities {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_CAPABILITIES };
  }

  const data = raw as Record<string, unknown>;

  const modules = typeof data.modules === 'object' && data.modules
    ? data.modules as Record<string, unknown>
    : {};

  const features = typeof data.features === 'object' && data.features
    ? data.features as Record<string, unknown>
    : {};

  return {
    profile: normalizeProfile(data.profile),
    schema_version: typeof data.schema_version === 'number' ? data.schema_version : 1,
    modules: {
      exchange: { enabled: extractModuleEnabled(modules.exchange) },
      queue: { enabled: extractModuleEnabled(modules.queue) },
    },
    features: {
      cms: typeof features.cms === 'boolean' ? features.cms : false,
      dashboard: typeof features.dashboard === 'boolean' ? features.dashboard : false,
    },
    routes: typeof data.routes === 'object' && data.routes
      ? data.routes as Record<string, string>
      : {},
    panels: Array.isArray(data.panels) ? data.panels.filter(p => typeof p === 'string') : [],
    resolver_keys: Array.isArray(data.resolver_keys)
      ? data.resolver_keys.filter(k => typeof k === 'string')
      : [],
    warnings: Array.isArray(data.warnings) ? data.warnings.filter(w => typeof w === 'string') : [],
  };
}

function normalizeProfile(value: unknown): TranslationProfile {
  if (typeof value !== 'string') return 'none';
  const normalized = value.toLowerCase().trim();
  const valid: TranslationProfile[] = ['none', 'core', 'core+exchange', 'core+queue', 'full'];
  return valid.includes(normalized as TranslationProfile)
    ? (normalized as TranslationProfile)
    : 'none';
}

function extractModuleEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value) {
    const obj = value as Record<string, unknown>;
    return typeof obj.enabled === 'boolean' ? obj.enabled : false;
  }
  return false;
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
      return c.modules.queue.enabled ? `${base}/content/translations` : null;
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
  const queueRoute = getTranslationRoute('QUEUE', c, base);
  if (c.modules.queue.enabled && queueRoute) {
    entrypoints.push({
      id: 'translation-queue',
      label: 'Translation Queue',
      icon: 'iconoir-language',
      href: queueRoute,
      module: 'queue',
      enabled: true,
      description: 'Manage translation assignments and review workflow',
    });
  }

  // Exchange entrypoint
  const exchangeRoute = getTranslationRoute('EXCHANGE_UI', c, base);
  if (c.modules.exchange.enabled && exchangeRoute) {
    entrypoints.push({
      id: 'translation-exchange',
      label: 'Translation Exchange',
      icon: 'iconoir-translate',
      href: exchangeRoute,
      module: 'exchange',
      enabled: true,
      description: 'Export and import translation files',
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
  link.href = entrypoint.href;
  link.className = `nav-item translation-operation-link ${className}`.trim();
  link.setAttribute('data-entrypoint-id', entrypoint.id);
  link.setAttribute('data-module', entrypoint.module);

  // Accessibility: descriptive label and tooltip
  const description = entrypoint.description || entrypoint.label;
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
        if (entrypoint && this.config.onEntrypointClick) {
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

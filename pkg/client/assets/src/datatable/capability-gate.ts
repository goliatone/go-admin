/**
 * Capability Gate Utility (Phase 4 - TX-046)
 *
 * Provides capability-mode and permission gating for translation module
 * navigation and action controls. Follows the graceful degradation strategy:
 *
 * - Hidden: Module is off OR user lacks module-view permission
 * - Visible + Disabled: Module is on, user has view permission, but lacks action-specific permission
 * - Visible + Enabled: Module is on and user has all required permissions
 */

import { renderReasonCodeBadge } from './translation-status-vocabulary.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported capability modes matching backend `translation_capabilities.profile`
 */
export type CapabilityMode = 'none' | 'core' | 'core+exchange' | 'core+queue' | 'full';

/**
 * Action state from backend permission evaluation
 */
export interface ActionState {
  enabled: boolean;
  reason?: string;
  reason_code?: string;
  permission?: string;
}

/**
 * Module state with entry permission and per-action permissions
 */
export interface ModuleState {
  enabled: boolean;
  visible: boolean;
  entry: ActionState;
  actions: Record<string, ActionState>;
}

/**
 * Route configuration from capabilities
 */
export interface RouteConfig {
  [key: string]: string;
}

/**
 * Translation capabilities payload from backend
 */
export interface TranslationCapabilities {
  profile: CapabilityMode;
  capability_mode: CapabilityMode;
  supported_profiles: CapabilityMode[];
  schema_version: number;
  modules: {
    exchange?: ModuleState;
    queue?: ModuleState;
  };
  features: {
    cms?: boolean;
    dashboard?: boolean;
  };
  routes: RouteConfig;
  panels: string[];
  resolver_keys: string[];
  warnings: string[];
  contracts?: Record<string, unknown>;
}

/**
 * Gate result for UI rendering
 */
export interface GateResult {
  /** Whether the element should be rendered */
  visible: boolean;
  /** Whether the element should be interactive */
  enabled: boolean;
  /** Reason for disabled state (if applicable) */
  reason?: string;
  /** Machine-readable reason code */
  reasonCode?: string;
  /** Permission that was evaluated */
  permission?: string;
}

/**
 * Nav item gate configuration
 */
export interface NavItemGate {
  /** Module key (exchange, queue) */
  module: 'exchange' | 'queue';
  /** Action key (optional - for action-level gating) */
  action?: string;
}

// ============================================================================
// Capability Mode Helpers
// ============================================================================

/**
 * Parse capability mode from string, with fallback to 'none'
 */
export function parseCapabilityMode(value: unknown): CapabilityMode {
  const validModes: CapabilityMode[] = ['none', 'core', 'core+exchange', 'core+queue', 'full'];
  if (typeof value === 'string' && validModes.includes(value as CapabilityMode)) {
    return value as CapabilityMode;
  }
  return 'none';
}

/**
 * Check if exchange module is enabled by capability mode
 */
export function isExchangeEnabled(mode: CapabilityMode): boolean {
  return mode === 'core+exchange' || mode === 'full';
}

/**
 * Check if queue module is enabled by capability mode
 */
export function isQueueEnabled(mode: CapabilityMode): boolean {
  return mode === 'core+queue' || mode === 'full';
}

/**
 * Check if core translation features are enabled
 */
export function isCoreEnabled(mode: CapabilityMode): boolean {
  return mode !== 'none';
}

// ============================================================================
// Capability Extraction
// ============================================================================

/**
 * Extract translation capabilities from a raw payload
 */
export function extractCapabilities(payload: unknown): TranslationCapabilities | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  // Validate required fields
  const profile = parseCapabilityMode(raw.profile || raw.capability_mode);
  const schemaVersion = typeof raw.schema_version === 'number' ? raw.schema_version : 0;

  return {
    profile,
    capability_mode: profile,
    supported_profiles: Array.isArray(raw.supported_profiles)
      ? raw.supported_profiles.filter((p): p is CapabilityMode =>
          typeof p === 'string' && ['none', 'core', 'core+exchange', 'core+queue', 'full'].includes(p)
        )
      : ['none', 'core', 'core+exchange', 'core+queue', 'full'],
    schema_version: schemaVersion,
    modules: extractModules(raw.modules),
    features: extractFeatures(raw.features),
    routes: extractRoutes(raw.routes),
    panels: extractPanels(raw.panels),
    resolver_keys: extractResolverKeys(raw.resolver_keys),
    warnings: extractWarnings(raw.warnings),
    contracts: raw.contracts && typeof raw.contracts === 'object'
      ? raw.contracts as Record<string, unknown>
      : undefined,
  };
}

function extractModules(modules: unknown): TranslationCapabilities['modules'] {
  if (!modules || typeof modules !== 'object') {
    return {};
  }

  const raw = modules as Record<string, unknown>;
  const result: TranslationCapabilities['modules'] = {};

  if (raw.exchange && typeof raw.exchange === 'object') {
    result.exchange = extractModuleState(raw.exchange);
  }
  if (raw.queue && typeof raw.queue === 'object') {
    result.queue = extractModuleState(raw.queue);
  }

  return result;
}

function extractModuleState(state: unknown): ModuleState {
  if (!state || typeof state !== 'object') {
    return {
      enabled: false,
      visible: false,
      entry: { enabled: false, reason: 'Invalid module state', reason_code: 'INVALID_STATE' },
      actions: {},
    };
  }

  const raw = state as Record<string, unknown>;

  return {
    enabled: raw.enabled === true,
    visible: raw.visible === true,
    entry: extractActionState(raw.entry),
    actions: extractActionsMap(raw.actions),
  };
}

function extractActionState(action: unknown): ActionState {
  if (!action || typeof action !== 'object') {
    return { enabled: false };
  }

  const raw = action as Record<string, unknown>;

  return {
    enabled: raw.enabled === true,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    reason_code: typeof raw.reason_code === 'string' ? raw.reason_code : undefined,
    permission: typeof raw.permission === 'string' ? raw.permission : undefined,
  };
}

function extractActionsMap(actions: unknown): Record<string, ActionState> {
  if (!actions || typeof actions !== 'object') {
    return {};
  }

  const raw = actions as Record<string, unknown>;
  const result: Record<string, ActionState> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === 'object') {
      result[key] = extractActionState(value);
    }
  }

  return result;
}

function extractFeatures(features: unknown): TranslationCapabilities['features'] {
  if (!features || typeof features !== 'object') {
    return {};
  }

  const raw = features as Record<string, unknown>;
  return {
    cms: raw.cms === true,
    dashboard: raw.dashboard === true,
  };
}

function extractRoutes(routes: unknown): RouteConfig {
  if (!routes || typeof routes !== 'object') {
    return {};
  }

  const result: RouteConfig = {};
  const raw = routes as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }

  return result;
}

function extractPanels(panels: unknown): string[] {
  if (!Array.isArray(panels)) {
    return [];
  }
  return panels.filter((p): p is string => typeof p === 'string');
}

function extractResolverKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) {
    return [];
  }
  return keys.filter((k): k is string => typeof k === 'string');
}

function extractWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) {
    return [];
  }
  return warnings.filter((w): w is string => typeof w === 'string');
}

// ============================================================================
// Gate Evaluation
// ============================================================================

/**
 * Create a CapabilityGate instance for evaluating visibility and permissions
 */
export class CapabilityGate {
  private capabilities: TranslationCapabilities;

  constructor(capabilities: TranslationCapabilities) {
    this.capabilities = capabilities;
  }

  /**
   * Get the current capability mode
   */
  getMode(): CapabilityMode {
    return this.capabilities.profile;
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): TranslationCapabilities {
    return this.capabilities;
  }

  /**
   * Check if a module is enabled by capability mode
   */
  isModuleEnabledByMode(module: 'exchange' | 'queue'): boolean {
    const mode = this.capabilities.profile;
    if (module === 'exchange') {
      return isExchangeEnabled(mode);
    }
    return isQueueEnabled(mode);
  }

  /**
   * Get module state from capabilities
   */
  getModuleState(module: 'exchange' | 'queue'): ModuleState | null {
    return this.capabilities.modules[module] || null;
  }

  /**
   * Get action state from a module
   */
  getActionState(module: 'exchange' | 'queue', action: string): ActionState | null {
    const moduleState = this.getModuleState(module);
    if (!moduleState) {
      return null;
    }
    return moduleState.actions[action] || null;
  }

  /**
   * Gate a navigation item.
   * Returns visibility/enabled state for rendering.
   *
   * Rule: Hidden when module is off or no module-view permission;
   *       visible-disabled for partial action permissions.
   */
  gateNavItem(gate: NavItemGate): GateResult {
    const moduleState = this.getModuleState(gate.module);

    // No module state = hidden
    if (!moduleState) {
      return {
        visible: false,
        enabled: false,
        reason: `${gate.module} module not configured`,
        reasonCode: 'MODULE_NOT_CONFIGURED',
      };
    }

    // Module disabled by capability mode = hidden
    if (!moduleState.enabled) {
      return {
        visible: false,
        enabled: false,
        reason: moduleState.entry.reason || 'Module disabled by capability mode',
        reasonCode: moduleState.entry.reason_code || 'FEATURE_DISABLED',
      };
    }

    // Module enabled but no entry permission = hidden
    if (!moduleState.visible || !moduleState.entry.enabled) {
      return {
        visible: false,
        enabled: false,
        reason: moduleState.entry.reason || 'Missing module view permission',
        reasonCode: moduleState.entry.reason_code || 'PERMISSION_DENIED',
        permission: moduleState.entry.permission,
      };
    }

    // If action specified, check action permission
    if (gate.action) {
      const actionState = moduleState.actions[gate.action];
      if (!actionState) {
        // Action not defined = visible but disabled
        return {
          visible: true,
          enabled: false,
          reason: `Action ${gate.action} not configured`,
          reasonCode: 'ACTION_NOT_CONFIGURED',
        };
      }

      if (!actionState.enabled) {
        // Action permission denied = visible but disabled
        return {
          visible: true,
          enabled: false,
          reason: actionState.reason || `Missing ${gate.action} permission`,
          reasonCode: actionState.reason_code || 'PERMISSION_DENIED',
          permission: actionState.permission,
        };
      }
    }

    // All checks passed = visible and enabled
    return {
      visible: true,
      enabled: true,
    };
  }

  /**
   * Gate an action control.
   * Returns visibility/enabled state for rendering action buttons.
   */
  gateAction(module: 'exchange' | 'queue', action: string): GateResult {
    return this.gateNavItem({ module, action });
  }

  /**
   * Check if exchange module is accessible (visible and entry enabled)
   */
  canAccessExchange(): boolean {
    const gate = this.gateNavItem({ module: 'exchange' });
    return gate.visible && gate.enabled;
  }

  /**
   * Check if queue module is accessible (visible and entry enabled)
   */
  canAccessQueue(): boolean {
    const gate = this.gateNavItem({ module: 'queue' });
    return gate.visible && gate.enabled;
  }

  /**
   * Get route URL for a given key
   */
  getRoute(key: string): string | null {
    return this.capabilities.routes[key] || null;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: 'cms' | 'dashboard'): boolean {
    return this.capabilities.features[feature] === true;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a CapabilityGate from raw payload
 */
export function createCapabilityGate(payload: unknown): CapabilityGate | null {
  const capabilities = extractCapabilities(payload);
  if (!capabilities) {
    return null;
  }
  return new CapabilityGate(capabilities);
}

/**
 * Create a default (empty) CapabilityGate for fallback
 */
export function createEmptyCapabilityGate(): CapabilityGate {
  return new CapabilityGate({
    profile: 'none',
    capability_mode: 'none',
    supported_profiles: ['none', 'core', 'core+exchange', 'core+queue', 'full'],
    schema_version: 0,
    modules: {},
    features: {},
    routes: {},
    panels: [],
    resolver_keys: [],
    warnings: [],
  });
}

// ============================================================================
// Render Helpers
// ============================================================================

/**
 * Render ARIA attributes for a gated element
 */
export function renderGateAriaAttributes(gate: GateResult): string {
  if (!gate.visible) {
    return 'aria-hidden="true" style="display: none;"';
  }

  if (!gate.enabled) {
    const reasonAttr = gate.reason ? ` title="${escapeAttr(gate.reason)}"` : '';
    return `aria-disabled="true"${reasonAttr}`;
  }

  return '';
}

/**
 * Render a disabled reason badge
 */
export function renderDisabledReasonBadge(gate: GateResult): string {
  if (gate.enabled || !gate.reason) {
    return '';
  }

  const reasonCode = (gate.reasonCode || '').trim();
  if (reasonCode) {
    return renderReasonCodeBadge(reasonCode, { size: 'sm', showFullMessage: true });
  }

  return `
    <span class="capability-gate-reason text-gray-500 bg-gray-100"
          role="status"
          aria-label="${escapeAttr(gate.reason)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${escapeHtml(gate.reason)}
    </span>
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for capability gate components
 */
export function getCapabilityGateStyles(): string {
  return `
    /* Capability Gate Styles */
    .capability-gate-reason {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
      white-space: nowrap;
    }

    .capability-gate-disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    .capability-gate-disabled:focus-visible {
      pointer-events: auto;
    }

    [aria-disabled="true"].capability-gate-action {
      opacity: 0.6;
      cursor: not-allowed;
    }

    [aria-disabled="true"].capability-gate-action:hover {
      background-color: inherit;
    }

    .capability-gate-hidden {
      display: none !important;
    }
  `;
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Apply gate result to a DOM element
 */
export function applyGateToElement(element: HTMLElement, gate: GateResult): void {
  if (!gate.visible) {
    element.style.display = 'none';
    element.setAttribute('aria-hidden', 'true');
    return;
  }

  element.style.display = '';
  element.removeAttribute('aria-hidden');

  if (!gate.enabled) {
    element.setAttribute('aria-disabled', 'true');
    element.classList.add('capability-gate-disabled');
    if (gate.reason) {
      element.setAttribute('title', gate.reason);
      element.dataset.reasonCode = gate.reasonCode || '';
    }

    // Prevent clicks but keep focusable for screen readers
    element.addEventListener('click', preventDisabledClick, true);
  } else {
    element.removeAttribute('aria-disabled');
    element.classList.remove('capability-gate-disabled');
    element.removeAttribute('title');
    delete element.dataset.reasonCode;
    element.removeEventListener('click', preventDisabledClick, true);
  }
}

function preventDisabledClick(event: Event): void {
  const target = event.currentTarget as HTMLElement;
  if (target.getAttribute('aria-disabled') === 'true') {
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * Initialize capability gating for all elements with data-capability-gate attribute
 */
export function initCapabilityGating(
  container: HTMLElement,
  gate: CapabilityGate
): void {
  const elements = container.querySelectorAll<HTMLElement>('[data-capability-gate]');

  elements.forEach((element) => {
    const gateConfig = element.dataset.capabilityGate;
    if (!gateConfig) return;

    try {
      const config = JSON.parse(gateConfig) as NavItemGate;
      const result = gate.gateNavItem(config);
      applyGateToElement(element, result);
    } catch {
      console.warn('Invalid capability gate config:', gateConfig);
    }
  });
}

/**
 * Inline Missing Locale Chips Component
 *
 * Renders actionable locale chips inline with content rows for creating
 * missing translations directly from list/grid views.
 *
 * Design decisions (per TRANSLATION_UX_IMPL.md Section 8.2):
 * - Chips appear inline with rows that have missing required locales
 * - Create action is gated by _action_state for the create_translation action
 * - Uses shared LocaleActionChip component for consistent UX
 */

import { escapeHtml } from '../shared/modal.js';
import {
  LocaleActionChip,
  getLocaleLabel,
  renderLocaleActionChip,
  type LocaleActionConfig,
  type CreateActionResult,
} from './locale-action.js';
import {
  extractTranslationReadiness,
  type TranslationReadiness,
} from './translation-context.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for inline locale chips
 */
export interface InlineLocaleChipsConfig {
  /** Record ID */
  recordId: string;
  /** API endpoint for panel actions (e.g., /admin/api/pages) */
  apiEndpoint: string;
  /** Base path for navigation (e.g., /admin/content/pages) */
  navigationBasePath: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Current environment context */
  environment?: string;
  /** Maximum number of chips to display (default: 3) */
  maxChips?: number;
  /** Size variant for chips */
  size?: 'sm' | 'md';
  /** Callback after successful create action */
  onCreateSuccess?: (locale: string, result: CreateActionResult) => void;
  /** Callback after action error */
  onError?: (locale: string, message: string) => void;
}

/**
 * Action state from record _action_state field
 */
export interface ActionStateEntry {
  enabled?: boolean;
  reason?: string;
  reason_code?: string;
}

// ============================================================================
// Inline Locale Chips Component
// ============================================================================

/**
 * InlineLocaleChips renders actionable chips for missing locales.
 * Respects _action_state for gating the create_translation action.
 */
export class InlineLocaleChips {
  private config: InlineLocaleChipsConfig;
  private readiness: TranslationReadiness;
  private actionState: ActionStateEntry | null;
  private chips: Map<string, LocaleActionChip> = new Map();
  private element: HTMLElement | null = null;

  constructor(
    record: Record<string, unknown>,
    config: InlineLocaleChipsConfig
  ) {
    this.config = {
      maxChips: 3,
      size: 'sm',
      ...config,
    };
    this.readiness = extractTranslationReadiness(record);
    this.actionState = this.extractActionState(record, 'create_translation');
  }

  /**
   * Extract action state for a specific action from the record.
   */
  private extractActionState(
    record: Record<string, unknown>,
    actionName: string
  ): ActionStateEntry | null {
    const rawState = record._action_state;
    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
      return null;
    }
    const perAction = (rawState as Record<string, unknown>)[actionName];
    if (!perAction || typeof perAction !== 'object' || Array.isArray(perAction)) {
      return null;
    }
    return perAction as ActionStateEntry;
  }

  /**
   * Check if the create_translation action is enabled.
   */
  isCreateActionEnabled(): boolean {
    // If no action state, assume enabled (backward compat)
    if (!this.actionState) {
      return true;
    }
    // Explicit enabled: false means disabled
    return this.actionState.enabled !== false;
  }

  /**
   * Get the disabled reason if create action is disabled.
   */
  getDisabledReason(): string | null {
    if (this.isCreateActionEnabled()) {
      return null;
    }
    if (this.actionState?.reason) {
      return this.actionState.reason;
    }
    // Map reason codes to human-readable messages
    const code = this.actionState?.reason_code;
    if (code === 'workflow_transition_not_available') {
      return 'Translation creation is not available in the current workflow state.';
    }
    if (code === 'permission_denied') {
      return 'You do not have permission to create translations.';
    }
    return 'Translation creation is currently unavailable.';
  }

  /**
   * Get missing locales to display as chips.
   */
  getMissingLocales(): string[] {
    if (!this.readiness.hasReadinessMetadata) {
      return [];
    }
    return this.readiness.missingRequiredLocales.slice(0, this.config.maxChips);
  }

  /**
   * Get count of overflow locales (not displayed).
   */
  getOverflowCount(): number {
    if (!this.readiness.hasReadinessMetadata) {
      return 0;
    }
    const total = this.readiness.missingRequiredLocales.length;
    return Math.max(0, total - (this.config.maxChips || 3));
  }

  /**
   * Render the inline locale chips as HTML string.
   */
  render(): string {
    const missingLocales = this.getMissingLocales();

    if (missingLocales.length === 0) {
      return '';
    }

    const isEnabled = this.isCreateActionEnabled();
    const disabledReason = this.getDisabledReason();
    const overflowCount = this.getOverflowCount();

    const chipsHtml = missingLocales.map((locale) =>
      this.renderChip(locale, isEnabled, disabledReason)
    ).join('');

    const overflowHtml = overflowCount > 0
      ? this.renderOverflow(overflowCount)
      : '';

    const containerClass = isEnabled
      ? 'inline-flex items-center gap-1.5 flex-wrap'
      : 'inline-flex items-center gap-1.5 flex-wrap opacity-60';

    return `
      <div class="${containerClass}"
           data-inline-locale-chips="true"
           data-record-id="${escapeHtml(this.config.recordId)}"
           data-action-enabled="${isEnabled}"
           role="list"
           aria-label="Missing translations">
        ${chipsHtml}${overflowHtml}
      </div>
    `;
  }

  /**
   * Render a single locale chip.
   */
  private renderChip(
    locale: string,
    isEnabled: boolean,
    disabledReason: string | null
  ): string {
    const { recordId, apiEndpoint, navigationBasePath, panelName, environment, size } = this.config;

    if (!isEnabled) {
      // Render disabled chip without action buttons
      return this.renderDisabledChip(locale, disabledReason, size);
    }

    // Render actionable chip
    return renderLocaleActionChip({
      locale,
      recordId,
      apiEndpoint,
      navigationBasePath,
      panelName,
      environment,
      localeExists: false,
      size,
      mode: 'chip',
      onCreateSuccess: this.config.onCreateSuccess,
      onError: this.config.onError,
    });
  }

  /**
   * Render a disabled locale chip (no action buttons).
   */
  private renderDisabledChip(
    locale: string,
    disabledReason: string | null,
    size: 'sm' | 'md' | undefined
  ): string {
    const sizeClasses = size === 'md'
      ? 'text-sm px-3 py-1.5'
      : 'text-xs px-2 py-1';

    const tooltip = disabledReason || 'Translation creation unavailable';
    const localeLabel = getLocaleLabel(locale);

    return `
      <div class="inline-flex items-center gap-1 ${sizeClasses} rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
           data-locale="${escapeHtml(locale)}"
           data-disabled="true"
           title="${escapeHtml(tooltip)}"
           role="listitem"
           aria-label="${localeLabel} translation (unavailable)">
        <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium uppercase tracking-wide">${escapeHtml(locale)}</span>
      </div>
    `;
  }

  /**
   * Render overflow indicator.
   */
  private renderOverflow(count: number): string {
    const { size } = this.config;
    const sizeClasses = size === 'md'
      ? 'text-sm px-2 py-1'
      : 'text-xs px-1.5 py-0.5';

    const allMissing = this.readiness.missingRequiredLocales.join(', ').toUpperCase();

    return `
      <span class="${sizeClasses} rounded text-gray-500 font-medium"
            title="Also missing: ${escapeHtml(allMissing)}"
            aria-label="${count} more missing translations">
        +${count}
      </span>
    `;
  }

  /**
   * Mount the component and bind events.
   */
  mount(container: HTMLElement): void {
    container.innerHTML = this.render();
    this.element = container.querySelector('[data-inline-locale-chips]');
    this.bindEvents();
  }

  /**
   * Bind event handlers for actionable chips.
   */
  private bindEvents(): void {
    if (!this.element || !this.isCreateActionEnabled()) return;

    const chipElements = this.element.querySelectorAll<HTMLElement>('[data-locale-action]');
    chipElements.forEach((chipEl) => {
      const locale = chipEl.getAttribute('data-locale-action');
      if (!locale) return;

      // Create chip instance for event handling
      const chip = new LocaleActionChip({
        locale,
        recordId: this.config.recordId,
        apiEndpoint: this.config.apiEndpoint,
        navigationBasePath: this.config.navigationBasePath,
        panelName: this.config.panelName,
        environment: this.config.environment,
        localeExists: false,
        size: this.config.size,
        onCreateSuccess: this.config.onCreateSuccess,
        onError: this.config.onError,
      });

      this.chips.set(locale, chip);

      // Bind create button
      const createBtn = chipEl.querySelector<HTMLButtonElement>('[data-action="create"]');
      createBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await chip.handleCreate();
      });

      // Bind open button
      const openBtn = chipEl.querySelector<HTMLButtonElement>('[data-action="open"]');
      openBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chip.handleOpen();
      });
    });
  }

  /**
   * Get chip instance by locale (for testing/inspection).
   */
  getChip(locale: string): LocaleActionChip | undefined {
    return this.chips.get(locale);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Render inline locale chips from a record payload.
 */
export function renderInlineLocaleChips(
  record: Record<string, unknown>,
  config: Omit<InlineLocaleChipsConfig, 'recordId'>
): string {
  const recordId = String(record.id || '');
  if (!recordId) return '';

  const component = new InlineLocaleChips(record, { ...config, recordId });
  return component.render();
}

/**
 * Check if a record has missing locales that should show chips.
 */
export function shouldShowInlineLocaleChips(record: Record<string, unknown>): boolean {
  const readiness = extractTranslationReadiness(record);
  return readiness.hasReadinessMetadata && readiness.missingRequiredLocales.length > 0;
}

/**
 * Initialize inline locale chips in a container.
 */
export function initInlineLocaleChips(
  container: HTMLElement,
  record: Record<string, unknown>,
  config: Omit<InlineLocaleChipsConfig, 'recordId'>
): InlineLocaleChips {
  const recordId = String(record.id || '');
  const component = new InlineLocaleChips(record, { ...config, recordId });
  component.mount(container);
  return component;
}

/**
 * Create a cell renderer for inline locale chips.
 * Can be used with DataGrid column configuration.
 */
export function createInlineLocaleChipsRenderer(
  config: Omit<InlineLocaleChipsConfig, 'recordId'>
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (_value: unknown, record: Record<string, unknown>, _column: string): string => {
    return renderInlineLocaleChips(record, config);
  };
}

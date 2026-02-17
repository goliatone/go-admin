/**
 * Shared Locale Action Component
 *
 * Reusable UI component for locale-level actions (Create/Open translation).
 * Used across fallback banner, blocker modal, and inline missing-locale affordances.
 *
 * Design decisions (per TRANSLATION_UX_IMPL.md):
 * - Single component for create/open actions ensures consistent UX
 * - Loading/success/error states handled uniformly
 * - Accessible with keyboard navigation and screen-reader labels
 */

import { executeActionRequest } from '../toast/error-helpers.js';
import { escapeHtml } from '../shared/modal.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a locale action chip
 */
export interface LocaleActionConfig {
  /** The locale code (e.g., 'es', 'fr') */
  locale: string;
  /** The record ID for actions */
  recordId: string;
  /** API endpoint for panel actions (e.g., /admin/api/panels/pages) */
  apiEndpoint: string;
  /** Base path for navigation (e.g., /admin/content/pages) */
  navigationBasePath: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Current environment context */
  environment?: string;
  /** Whether the locale exists (for existing locales, only show open action) */
  localeExists?: boolean;
  /** Display size variant */
  size?: 'sm' | 'md';
  /** Display mode: 'chip' for inline, 'button' for prominent */
  mode?: 'chip' | 'button';
  /** Callback after successful create action */
  onCreateSuccess?: (locale: string, result: CreateActionResult) => void;
  /** Callback after action error */
  onError?: (locale: string, message: string) => void;
  /** Callback after open action triggered */
  onOpen?: (locale: string, url: string) => void;
}

/**
 * Result from create_translation action
 */
export interface CreateActionResult {
  id: string;
  locale: string;
  status: string;
  translationGroupId?: string;
}

/**
 * State for a locale action component
 */
export interface LocaleActionState {
  loading: boolean;
  created: boolean;
  error: string | null;
  newRecordId?: string;
}

// ============================================================================
// Locale Label Mapping
// ============================================================================

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
};

/**
 * Get human-readable label for a locale code.
 */
export function getLocaleLabel(locale: string): string {
  const normalized = locale.toLowerCase();
  return LOCALE_LABELS[normalized] || locale.toUpperCase();
}

// ============================================================================
// Locale Action Component
// ============================================================================

/**
 * LocaleActionChip renders a locale chip with create/open actions.
 * Manages its own state and can be used standalone or in a list.
 */
export class LocaleActionChip {
  private config: LocaleActionConfig;
  private state: LocaleActionState;
  private element: HTMLElement | null = null;

  constructor(config: LocaleActionConfig) {
    this.config = {
      size: 'sm',
      mode: 'chip',
      localeExists: false,
      ...config,
    };
    this.state = {
      loading: false,
      created: false,
      error: null,
    };
  }

  /**
   * Render the locale action chip as HTML string.
   * Use when generating static HTML.
   */
  render(): string {
    const { locale, size, mode, localeExists } = this.config;
    const { loading, created, error } = this.state;

    const localeLabel = getLocaleLabel(locale);
    const sizeClasses = size === 'sm'
      ? 'text-xs px-2 py-1'
      : 'text-sm px-3 py-1.5';

    // Determine base styling based on mode
    const modeClasses = mode === 'button'
      ? 'rounded-lg'
      : 'rounded-full';

    // Determine state-based styling
    let stateClasses: string;
    let statusIcon = '';

    if (loading) {
      stateClasses = 'bg-gray-100 text-gray-600 border-gray-300';
      statusIcon = this.renderSpinner();
    } else if (created) {
      stateClasses = 'bg-green-100 text-green-700 border-green-300';
      statusIcon = this.renderCheckIcon();
    } else if (error) {
      stateClasses = 'bg-red-100 text-red-700 border-red-300';
      statusIcon = this.renderErrorIcon();
    } else if (localeExists) {
      stateClasses = 'bg-blue-100 text-blue-700 border-blue-300';
    } else {
      stateClasses = 'bg-amber-100 text-amber-700 border-amber-300';
    }

    const actionsHtml = this.renderActions();

    return `
      <div class="inline-flex items-center gap-1.5 ${sizeClasses} ${modeClasses} border ${stateClasses}"
           data-locale-action="${escapeHtml(locale)}"
           data-locale-exists="${localeExists}"
           data-loading="${loading}"
           data-created="${created}"
           role="group"
           aria-label="${localeLabel} translation">
        ${statusIcon}
        <span class="font-medium uppercase tracking-wide" aria-hidden="true">${escapeHtml(locale)}</span>
        <span class="sr-only">${localeLabel}</span>
        ${actionsHtml}
      </div>
    `;
  }

  /**
   * Render action buttons (create/open).
   */
  private renderActions(): string {
    const { locale, localeExists, size } = this.config;
    const { loading, created } = this.state;

    const buttonSize = size === 'sm' ? 'p-0.5' : 'p-1';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    const actions: string[] = [];

    // Create button (only for missing locales that haven't been created)
    if (!localeExists && !created && !loading) {
      actions.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${buttonSize} rounded hover:bg-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                data-action="create"
                data-locale="${escapeHtml(locale)}"
                aria-label="Create ${getLocaleLabel(locale)} translation"
                title="Create ${getLocaleLabel(locale)} translation">
          <svg class="${iconSize}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      `);
    }

    // Open button (for existing locales or newly created ones)
    if (localeExists || created) {
      const openBgClass = created ? 'hover:bg-green-200' : 'hover:bg-blue-200';
      const openRingClass = created ? 'focus:ring-green-500' : 'focus:ring-blue-500';
      actions.push(`
        <button type="button"
                class="inline-flex items-center justify-center ${buttonSize} rounded ${openBgClass} focus:outline-none focus:ring-1 ${openRingClass} transition-colors"
                data-action="open"
                data-locale="${escapeHtml(locale)}"
                aria-label="Open ${getLocaleLabel(locale)} translation"
                title="Open ${getLocaleLabel(locale)} translation">
          <svg class="${iconSize}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      `);
    }

    return actions.join('');
  }

  /**
   * Mount the component to a container element and bind events.
   */
  mount(container: HTMLElement): void {
    container.innerHTML = this.render();
    this.element = container.querySelector(`[data-locale-action="${this.config.locale}"]`);
    this.bindEvents();
  }

  /**
   * Bind event handlers to action buttons.
   */
  private bindEvents(): void {
    if (!this.element) return;

    const createBtn = this.element.querySelector<HTMLButtonElement>('[data-action="create"]');
    const openBtn = this.element.querySelector<HTMLButtonElement>('[data-action="open"]');

    createBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCreate();
    });

    openBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleOpen();
    });
  }

  /**
   * Handle create translation action.
   */
  async handleCreate(): Promise<void> {
    if (this.state.loading || this.state.created) return;

    this.setState({ loading: true, error: null });

    try {
      const payload: Record<string, unknown> = {
        id: this.config.recordId,
        locale: this.config.locale,
      };

      if (this.config.environment) {
        payload.environment = this.config.environment;
      }
      if (this.config.panelName) {
        payload.policy_entity = this.config.panelName;
      }

      const endpoint = `${this.config.apiEndpoint}/actions/create_translation`;
      const result = await executeActionRequest(endpoint, payload);

      if (result.success) {
        const newId = result.data?.id ? String(result.data.id) : undefined;
        this.setState({
          loading: false,
          created: true,
          newRecordId: newId,
        });

        const createResult: CreateActionResult = {
          id: newId || this.config.recordId,
          locale: this.config.locale,
          status: String(result.data?.status || 'draft'),
          translationGroupId: result.data?.translation_group_id
            ? String(result.data.translation_group_id)
            : undefined,
        };

        this.config.onCreateSuccess?.(this.config.locale, createResult);
      } else {
        const errorMessage = result.error?.message || 'Failed to create translation';
        this.setState({ loading: false, error: errorMessage });
        this.config.onError?.(this.config.locale, errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create translation';
      this.setState({ loading: false, error: errorMessage });
      this.config.onError?.(this.config.locale, errorMessage);
    }
  }

  /**
   * Handle open translation action.
   */
  handleOpen(): void {
    const { locale, navigationBasePath, recordId, environment } = this.config;
    const { newRecordId } = this.state;

    const targetId = newRecordId || recordId;
    const params = new URLSearchParams();
    params.set('locale', locale);
    if (environment) {
      params.set('env', environment);
    }

    const url = `${navigationBasePath}/${targetId}/edit?${params.toString()}`;
    this.config.onOpen?.(locale, url);

    // Default behavior: navigate to the URL
    window.location.href = url;
  }

  /**
   * Update component state and re-render.
   */
  private setState(updates: Partial<LocaleActionState>): void {
    this.state = { ...this.state, ...updates };
    if (this.element) {
      const parent = this.element.parentElement;
      if (parent) {
        this.mount(parent);
      }
    }
  }

  /**
   * Render spinner icon for loading state.
   */
  private renderSpinner(): string {
    const size = this.config.size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    return `
      <svg class="${size} animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    `;
  }

  /**
   * Render check icon for success state.
   */
  private renderCheckIcon(): string {
    const size = this.config.size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    return `
      <svg class="${size}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    `;
  }

  /**
   * Render error icon for error state.
   */
  private renderErrorIcon(): string {
    const size = this.config.size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    return `
      <svg class="${size}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
    `;
  }

  /**
   * Get current state (for testing/inspection).
   */
  getState(): LocaleActionState {
    return { ...this.state };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Render a static locale action chip as HTML.
 * Use for server-side or initial render scenarios.
 */
export function renderLocaleActionChip(config: LocaleActionConfig): string {
  const chip = new LocaleActionChip(config);
  return chip.render();
}

/**
 * Render a list of locale action chips.
 * Useful for rendering multiple missing locales at once.
 */
export function renderLocaleActionList(
  locales: string[],
  baseConfig: Omit<LocaleActionConfig, 'locale'>
): string {
  if (locales.length === 0) return '';

  const chips = locales.map((locale) => {
    const config: LocaleActionConfig = { ...baseConfig, locale };
    return renderLocaleActionChip(config);
  });

  return `
    <div class="flex flex-wrap items-center gap-2" role="list" aria-label="Missing translations">
      ${chips.join('')}
    </div>
  `;
}

/**
 * Initialize locale action chips within a container.
 * Binds event handlers to all chips matching the selector.
 */
export function initLocaleActionChips(
  container: HTMLElement,
  baseConfig: Omit<LocaleActionConfig, 'locale'>
): Map<string, LocaleActionChip> {
  const chips = new Map<string, LocaleActionChip>();
  const elements = container.querySelectorAll<HTMLElement>('[data-locale-action]');

  elements.forEach((element) => {
    const locale = element.getAttribute('data-locale-action');
    if (!locale) return;

    const localeExists = element.getAttribute('data-locale-exists') === 'true';
    const config: LocaleActionConfig = { ...baseConfig, locale, localeExists };
    const chip = new LocaleActionChip(config);

    // Re-mount to bind events
    const parent = element.parentElement;
    if (parent) {
      chip.mount(parent);
      chips.set(locale, chip);
    }
  });

  return chips;
}

/**
 * Build URL for editing a specific locale of a record.
 */
export function buildLocaleEditUrl(
  basePath: string,
  recordId: string,
  locale: string,
  environment?: string
): string {
  const params = new URLSearchParams();
  params.set('locale', locale);
  if (environment) {
    params.set('env', environment);
  }
  return `${basePath}/${recordId}/edit?${params.toString()}`;
}

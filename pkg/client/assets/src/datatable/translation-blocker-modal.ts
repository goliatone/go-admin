/**
 * Translation Blocker Modal
 *
 * Modal-first UI for TRANSLATION_MISSING errors that provides actionable
 * remediation for editors. Shows missing locales, per-locale field hints,
 * and quick actions (Create/Open translation).
 *
 * Design decisions (per CONTENT_TRANSLATION_TDD.md):
 * - Modal is primary UX, toast is fallback only for render failure
 * - Quick actions operate from typed contract data (no heuristics/string matching)
 * - Accessible with keyboard navigation and screen-reader labels
 */

import { Modal, escapeHtml } from '../shared/modal.js';
import { executeActionRequest } from '../toast/error-helpers.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the translation blocker modal
 */
export interface TranslationBlockerModalConfig {
  /** The workflow transition that was blocked (e.g., 'publish') */
  transition: string | null;
  /** Entity type (e.g., 'pages', 'posts') */
  entityType: string | null;
  /** The record ID that triggered the blocker */
  recordId: string;
  /** Locales that are missing translations */
  missingLocales: string[];
  /** Required fields missing per locale (optional) */
  missingFieldsByLocale: Record<string, string[]> | null;
  /** The locale that was requested */
  requestedLocale: string | null;
  /** The environment context (e.g., 'production', 'staging') */
  environment: string | null;
  /** API endpoint for panel actions (e.g., /admin/api/pages) */
  apiEndpoint: string;
  /** Base path for navigation (e.g., /admin/content/pages) */
  navigationBasePath: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Callback after successful create translation action */
  onCreateSuccess?: (locale: string, result: CreateTranslationResult) => void;
  /** Callback after action error */
  onError?: (message: string) => void;
  /** Callback when modal is dismissed without action */
  onDismiss?: () => void;
}

/**
 * Result from create_translation action
 */
export interface CreateTranslationResult {
  id: string;
  locale: string;
  status: string;
  translation_group_id?: string;
}

/**
 * Internal state for locale action status
 */
interface LocaleActionState {
  loading: boolean;
  created: boolean;
  newRecordId?: string;
}

// ============================================================================
// Translation Blocker Modal
// ============================================================================

export class TranslationBlockerModal extends Modal {
  private config: TranslationBlockerModalConfig;
  private localeStates: Map<string, LocaleActionState> = new Map();
  private resolved = false;

  constructor(config: TranslationBlockerModalConfig) {
    super({
      size: 'lg',
      initialFocus: '[data-blocker-action]',
      lockBodyScroll: true,
      dismissOnBackdropClick: true,
      dismissOnEscape: true,
    });
    this.config = config;

    // Initialize state for each missing locale
    for (const locale of config.missingLocales) {
      this.localeStates.set(locale, { loading: false, created: false });
    }
  }

  /**
   * Show the translation blocker modal.
   * Returns a promise that resolves when the modal is closed.
   */
  static showBlocker(config: TranslationBlockerModalConfig): Promise<void> {
    return new Promise<void>((resolve) => {
      const originalOnDismiss = config.onDismiss;
      const modal = new TranslationBlockerModal({
        ...config,
        onDismiss: () => {
          originalOnDismiss?.();
          resolve();
        },
      });
      modal.show();
    });
  }

  protected renderContent(): string {
    const transition = this.config.transition || 'complete action';
    const entityType = this.config.entityType || 'content';
    const hasFieldHints = this.config.missingFieldsByLocale !== null &&
      Object.keys(this.config.missingFieldsByLocale).length > 0;

    return `
      <div class="flex flex-col" role="dialog" aria-labelledby="blocker-title" aria-describedby="blocker-description">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 id="blocker-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Cannot ${escapeHtml(transition)} ${escapeHtml(entityType)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(hasFieldHints)}
              </p>
            </div>
          </div>
        </div>

        <!-- Missing Locales List -->
        <div class="px-6 py-4 max-h-[50vh] overflow-y-auto">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="locales-heading">
            Missing translations (${this.config.missingLocales.length}):
          </p>
          <ul class="space-y-3" role="list" aria-labelledby="locales-heading">
            ${this.config.missingLocales.map(locale => this.renderLocaleItem(locale)).join('')}
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button type="button"
                  data-blocker-dismiss
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors">
            Close
          </button>
          <button type="button"
                  data-blocker-retry
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby="retry-hint">
            Retry ${escapeHtml(transition)}
          </button>
        </div>
        <p id="retry-hint" class="sr-only">Retry the blocked action after creating missing translations</p>
      </div>
    `;
  }

  private renderDescription(hasFieldHints: boolean): string {
    if (hasFieldHints) {
      return 'Required translations are missing or incomplete. Create or complete the translations listed below.';
    }
    return 'Required translations are missing. Create the translations listed below to continue.';
  }

  private renderLocaleItem(locale: string): string {
    const state = this.localeStates.get(locale) || { loading: false, created: false };
    const missingFields = this.config.missingFieldsByLocale?.[locale];
    const hasFields = Array.isArray(missingFields) && missingFields.length > 0;
    const localeLabel = this.getLocaleLabel(locale);

    // Determine action button state
    const actionDisabled = state.loading ? 'disabled' : '';
    const loadingClass = state.loading ? 'opacity-50' : '';

    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${loadingClass}"
          data-locale-item="${escapeHtml(locale)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${escapeHtml(locale)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${escapeHtml(localeLabel)}
              </span>
              ${state.created ? `
                <span class="inline-flex items-center text-xs text-green-600 dark:text-green-400" role="status">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Created
                </span>
              ` : ''}
            </div>
            ${hasFields ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${missingFields.map(field => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${escapeHtml(field)}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${state.created ? this.renderOpenButton(locale, state.newRecordId) : this.renderCreateButton(locale, actionDisabled)}
            ${this.renderOpenButton(locale, undefined, state.created)}
          </div>
        </div>
        ${state.loading ? `
          <div class="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Creating translation...
          </div>
        ` : ''}
      </li>
    `;
  }

  private renderCreateButton(locale: string, disabled: string): string {
    return `
      <button type="button"
              data-blocker-action="create"
              data-locale="${escapeHtml(locale)}"
              ${disabled}
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Create ${this.getLocaleLabel(locale)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Create
      </button>
    `;
  }

  private renderOpenButton(locale: string, recordId?: string, hideIfNotCreated = false): string {
    if (hideIfNotCreated) return '';

    // Build URL with locale context preserved
    const baseUrl = this.config.navigationBasePath;
    const targetId = recordId || this.config.recordId;
    const params = new URLSearchParams();
    params.set('locale', locale);
    if (this.config.environment) {
      params.set('env', this.config.environment);
    }
    const url = `${baseUrl}/${targetId}/edit?${params.toString()}`;

    return `
      <a href="${escapeHtml(url)}"
         data-blocker-action="open"
         data-locale="${escapeHtml(locale)}"
         class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
         aria-label="Open ${this.getLocaleLabel(locale)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    `;
  }

  private getLocaleLabel(locale: string): string {
    // Common locale labels - can be extended
    const labels: Record<string, string> = {
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
    return labels[locale.toLowerCase()] || locale.toUpperCase();
  }

  protected bindContentEvents(): void {
    // Dismiss button
    const dismissBtn = this.container?.querySelector<HTMLButtonElement>('[data-blocker-dismiss]');
    dismissBtn?.addEventListener('click', () => {
      this.dismiss();
    });

    // Retry button
    const retryBtn = this.container?.querySelector<HTMLButtonElement>('[data-blocker-retry]');
    retryBtn?.addEventListener('click', () => {
      this.handleRetry();
    });

    // Create translation buttons
    const createBtns = this.container?.querySelectorAll<HTMLButtonElement>('[data-blocker-action="create"]');
    createBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        const locale = btn.getAttribute('data-locale');
        if (locale) {
          this.handleCreateTranslation(locale);
        }
      });
    });

    // Keyboard navigation within locale list
    const localeItems = this.container?.querySelectorAll<HTMLElement>('[data-locale-item]');
    localeItems?.forEach((item, index) => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && index < localeItems.length - 1) {
          e.preventDefault();
          const nextItem = localeItems[index + 1];
          const focusable = nextItem.querySelector<HTMLElement>('[data-blocker-action]');
          focusable?.focus();
        } else if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          const prevItem = localeItems[index - 1];
          const focusable = prevItem.querySelector<HTMLElement>('[data-blocker-action]');
          focusable?.focus();
        }
      });
    });
  }

  private async handleCreateTranslation(locale: string): Promise<void> {
    const state = this.localeStates.get(locale);
    if (!state || state.loading || state.created) return;

    // Update state to loading
    state.loading = true;
    this.updateLocaleItemUI(locale);

    try {
      // Build payload for create_translation action
      const payload: Record<string, unknown> = {
        id: this.config.recordId,
        locale: locale,
      };

      if (this.config.environment) {
        payload.environment = this.config.environment;
      }
      if (this.config.panelName) {
        payload.policy_entity = this.config.panelName;
      }

      // Execute create_translation action
      const endpoint = `${this.config.apiEndpoint}/actions/create_translation`;
      const result = await executeActionRequest(endpoint, payload);

      if (result.success) {
        // Update state to created
        state.loading = false;
        state.created = true;

        // Extract new record ID from response data if present
        if (result.data?.id) {
          state.newRecordId = String(result.data.id);
        }

        this.updateLocaleItemUI(locale);

        // Call success callback
        const createResult: CreateTranslationResult = {
          id: state.newRecordId || this.config.recordId,
          locale: locale,
          status: String(result.data?.status || 'draft'),
          translation_group_id: result.data?.translation_group_id
            ? String(result.data.translation_group_id)
            : undefined,
        };
        this.config.onCreateSuccess?.(locale, createResult);
      } else {
        state.loading = false;
        this.updateLocaleItemUI(locale);

        const errorMessage = result.error?.message || 'Failed to create translation';
        this.config.onError?.(errorMessage);
      }
    } catch (err) {
      state.loading = false;
      this.updateLocaleItemUI(locale);

      const errorMessage = err instanceof Error ? err.message : 'Failed to create translation';
      this.config.onError?.(errorMessage);
    }
  }

  private updateLocaleItemUI(locale: string): void {
    const item = this.container?.querySelector(`[data-locale-item="${locale}"]`);
    if (!item) return;

    // Re-render the locale item
    const state = this.localeStates.get(locale);
    if (!state) return;

    // Find the parent list and replace this item
    const parent = item.parentElement;
    if (!parent) return;

    const temp = document.createElement('div');
    temp.innerHTML = this.renderLocaleItem(locale);
    const newItem = temp.firstElementChild;
    if (newItem) {
      parent.replaceChild(newItem, item);

      // Re-bind events for the new item
      const createBtn = newItem.querySelector<HTMLButtonElement>('[data-blocker-action="create"]');
      createBtn?.addEventListener('click', () => {
        this.handleCreateTranslation(locale);
      });
    }
  }

  private handleRetry(): void {
    // Close modal and let the parent handle retry
    // The parent should refresh and re-attempt the blocked action
    this.resolved = true;
    this.hide();
  }

  private dismiss(): void {
    this.resolved = true;
    this.config.onDismiss?.();
    this.hide();
  }

  protected onBeforeHide(): boolean {
    if (!this.resolved) {
      this.resolved = true;
      this.config.onDismiss?.();
    }
    return true;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Show translation blocker modal with simplified configuration.
 * Use this as the primary entry point for displaying blockers.
 */
export async function showTranslationBlocker(config: TranslationBlockerModalConfig): Promise<void> {
  try {
    await TranslationBlockerModal.showBlocker(config);
  } catch (err) {
    // Fallback to toast/alert if modal render fails
    console.error('[TranslationBlockerModal] Render failed, using fallback:', err);
    const transition = config.transition || 'complete action';
    const locales = config.missingLocales.join(', ');
    const message = `Cannot ${transition}: Missing translations for ${locales}`;

    if (typeof window !== 'undefined' && 'toastManager' in window) {
      (window as unknown as { toastManager: { error: (msg: string) => void } }).toastManager.error(message);
    } else {
      alert(message);
    }
  }
}

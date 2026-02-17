/**
 * Fallback Banner Component
 *
 * Renders a warning banner when content is displayed in fallback mode
 * (requested locale doesn't exist, showing fallback/source locale instead).
 * Includes form lock behavior to prevent editing fallback content.
 *
 * Design decisions (per TRANSLATION_UX_IMPL.md Section 8.1):
 * - Banner is explicit and non-dismissible in fallback mode
 * - Form is locked (non-editable) until user creates missing translation
 * - Primary CTA: Create requested locale
 * - Secondary CTA: Open resolved/source locale
 */

import { escapeHtml } from '../shared/modal.js';
import {
  LocaleActionChip,
  getLocaleLabel,
  buildLocaleEditUrl,
  type CreateActionResult,
} from './locale-action.js';
import { extractTranslationContext, type TranslationContext } from './translation-context.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the fallback banner
 */
export interface FallbackBannerConfig {
  /** Translation context extracted from the record */
  context: TranslationContext;
  /** API endpoint for panel actions (e.g., /admin/api/panels/pages) */
  apiEndpoint: string;
  /** Base path for navigation (e.g., /admin/content/pages) */
  navigationBasePath: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Current environment context */
  environment?: string;
  /** Callback after successful create action */
  onCreateSuccess?: (locale: string, result: CreateActionResult) => void;
  /** Callback after action error */
  onError?: (message: string) => void;
  /** Callback when open source action is triggered */
  onOpenSource?: (locale: string, url: string) => void;
  /** Whether to show the form lock message */
  showFormLockMessage?: boolean;
  /** Custom form lock message */
  formLockMessage?: string;
}

/**
 * Form lock state
 */
export interface FormLockState {
  /** Whether the form is locked */
  locked: boolean;
  /** The reason the form is locked */
  reason: string | null;
  /** The locale that was requested but missing */
  missingLocale: string | null;
  /** The locale being shown as fallback */
  fallbackLocale: string | null;
}

// ============================================================================
// Fallback Banner Component
// ============================================================================

/**
 * FallbackBanner renders a warning banner with actions for fallback mode.
 * Manages form lock state and provides CTA buttons.
 */
export class FallbackBanner {
  private config: FallbackBannerConfig;
  private element: HTMLElement | null = null;
  private localeChip: LocaleActionChip | null = null;

  constructor(config: FallbackBannerConfig) {
    this.config = {
      showFormLockMessage: true,
      ...config,
    };
  }

  /**
   * Check if fallback mode is active.
   */
  isInFallbackMode(): boolean {
    const { context } = this.config;
    return context.fallbackUsed || context.missingRequestedLocale;
  }

  /**
   * Get form lock state.
   */
  getFormLockState(): FormLockState {
    const { context } = this.config;

    if (!this.isInFallbackMode()) {
      return {
        locked: false,
        reason: null,
        missingLocale: null,
        fallbackLocale: null,
      };
    }

    return {
      locked: true,
      reason: this.config.formLockMessage ||
        `The ${context.requestedLocale?.toUpperCase() || 'requested'} translation doesn't exist. Create it to enable editing.`,
      missingLocale: context.requestedLocale,
      fallbackLocale: context.resolvedLocale,
    };
  }

  /**
   * Render the fallback banner as HTML string.
   */
  render(): string {
    if (!this.isInFallbackMode()) {
      return '';
    }

    const { context, showFormLockMessage } = this.config;
    const requestedLocale = context.requestedLocale || 'requested';
    const resolvedLocale = context.resolvedLocale || 'default';
    const requestedLabel = getLocaleLabel(requestedLocale);
    const resolvedLabel = getLocaleLabel(resolvedLocale);

    // Build locale action chip for primary CTA
    const primaryCtaHtml = this.renderPrimaryCta();
    const secondaryCtaHtml = this.renderSecondaryCta();
    const formLockHtml = showFormLockMessage ? this.renderFormLockMessage() : '';

    return `
      <div class="fallback-banner bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
           role="alert"
           aria-live="polite"
           data-fallback-banner="true"
           data-requested-locale="${escapeHtml(requestedLocale)}"
           data-resolved-locale="${escapeHtml(resolvedLocale)}">
        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Warning Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-amber-800">
                Viewing fallback content
              </h3>
              <p class="mt-1 text-sm text-amber-700">
                The <strong class="font-medium">${escapeHtml(requestedLabel)}</strong> (${escapeHtml(requestedLocale.toUpperCase())})
                translation doesn't exist yet. You're viewing content from
                <strong class="font-medium">${escapeHtml(resolvedLabel)}</strong> (${escapeHtml(resolvedLocale.toUpperCase())}).
              </p>

              ${formLockHtml}

              <!-- Actions -->
              <div class="mt-4 flex flex-wrap items-center gap-3">
                ${primaryCtaHtml}
                ${secondaryCtaHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the primary CTA (Create missing locale).
   */
  private renderPrimaryCta(): string {
    const { context, apiEndpoint, navigationBasePath, panelName, environment } = this.config;
    const requestedLocale = context.requestedLocale;

    if (!requestedLocale || !context.recordId) {
      return '';
    }

    return `
      <button type="button"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              data-action="create-translation"
              data-locale="${escapeHtml(requestedLocale)}"
              data-record-id="${escapeHtml(context.recordId)}"
              data-api-endpoint="${escapeHtml(apiEndpoint)}"
              data-panel="${escapeHtml(panelName || '')}"
              data-environment="${escapeHtml(environment || '')}"
              aria-label="Create ${getLocaleLabel(requestedLocale)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create ${escapeHtml(requestedLocale.toUpperCase())} translation
      </button>
    `;
  }

  /**
   * Render the secondary CTA (Open source locale).
   */
  private renderSecondaryCta(): string {
    const { context, navigationBasePath, environment } = this.config;
    const resolvedLocale = context.resolvedLocale;

    if (!resolvedLocale || !context.recordId) {
      return '';
    }

    const url = buildLocaleEditUrl(navigationBasePath, context.recordId, resolvedLocale, environment);

    return `
      <a href="${escapeHtml(url)}"
         class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
         data-action="open-source"
         data-locale="${escapeHtml(resolvedLocale)}"
         aria-label="Open ${getLocaleLabel(resolvedLocale)} translation">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open ${escapeHtml(resolvedLocale.toUpperCase())} (source)
      </a>
    `;
  }

  /**
   * Render the form lock message.
   */
  private renderFormLockMessage(): string {
    return `
      <p class="mt-2 text-sm text-amber-600 flex items-center gap-1.5">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        <span>Editing is disabled until you create the missing translation.</span>
      </p>
    `;
  }

  /**
   * Mount the banner to a container and bind events.
   */
  mount(container: HTMLElement): void {
    container.innerHTML = this.render();
    this.element = container.querySelector('[data-fallback-banner]');
    this.bindEvents();
  }

  /**
   * Bind event handlers.
   */
  private bindEvents(): void {
    if (!this.element) return;

    const createBtn = this.element.querySelector<HTMLButtonElement>('[data-action="create-translation"]');
    const openBtn = this.element.querySelector<HTMLAnchorElement>('[data-action="open-source"]');

    createBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleCreate();
    });

    openBtn?.addEventListener('click', (e) => {
      const locale = openBtn.getAttribute('data-locale');
      const url = openBtn.getAttribute('href');
      if (locale && url) {
        this.config.onOpenSource?.(locale, url);
      }
      // Let the default navigation happen unless prevented
    });
  }

  /**
   * Handle create translation action.
   */
  private async handleCreate(): Promise<void> {
    const { context, apiEndpoint, panelName, environment, navigationBasePath } = this.config;
    const locale = context.requestedLocale;
    const recordId = context.recordId;

    if (!locale || !recordId) return;

    // Create locale action chip for handling the create action
    const chip = new LocaleActionChip({
      locale,
      recordId,
      apiEndpoint,
      navigationBasePath,
      panelName,
      environment,
      localeExists: false,
      onCreateSuccess: (loc, result) => {
        this.config.onCreateSuccess?.(loc, result);
        // Redirect to edit the new translation
        const url = buildLocaleEditUrl(navigationBasePath, result.id, loc, environment);
        window.location.href = url;
      },
      onError: (_loc, message) => {
        this.config.onError?.(message);
      },
    });

    await chip.handleCreate();
  }
}

// ============================================================================
// Form Lock Helpers
// ============================================================================

/**
 * Apply form lock to a form element based on fallback state.
 * Disables all form inputs and adds visual indicators.
 */
export function applyFormLock(form: HTMLFormElement, lockState: FormLockState): void {
  if (!lockState.locked) {
    removeFormLock(form);
    return;
  }

  // Add locked class for styling
  form.classList.add('form-locked', 'pointer-events-none', 'opacity-75');
  form.setAttribute('data-form-locked', 'true');
  form.setAttribute('data-lock-reason', lockState.reason || '');

  // Disable all form elements
  const inputs = form.querySelectorAll<HTMLElement>('input, textarea, select, button[type="submit"]');
  inputs.forEach((input) => {
    input.setAttribute('disabled', 'true');
    input.setAttribute('data-was-enabled', 'true');
    input.setAttribute('aria-disabled', 'true');
  });

  // Add lock overlay if not present
  if (!form.querySelector('[data-form-lock-overlay]')) {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-form-lock-overlay', 'true');
    overlay.className = 'absolute inset-0 bg-amber-50/30 cursor-not-allowed z-10';
    overlay.setAttribute('title', lockState.reason || 'Form is locked');

    // Ensure form has relative positioning
    const computedStyle = window.getComputedStyle(form);
    if (computedStyle.position === 'static') {
      form.style.position = 'relative';
    }

    form.appendChild(overlay);
  }
}

/**
 * Remove form lock from a form element.
 */
export function removeFormLock(form: HTMLFormElement): void {
  form.classList.remove('form-locked', 'pointer-events-none', 'opacity-75');
  form.removeAttribute('data-form-locked');
  form.removeAttribute('data-lock-reason');

  // Re-enable previously enabled form elements
  const inputs = form.querySelectorAll<HTMLElement>('[data-was-enabled="true"]');
  inputs.forEach((input) => {
    input.removeAttribute('disabled');
    input.removeAttribute('data-was-enabled');
    input.removeAttribute('aria-disabled');
  });

  // Remove lock overlay
  const overlay = form.querySelector('[data-form-lock-overlay]');
  overlay?.remove();
}

/**
 * Check if a form is locked.
 */
export function isFormLocked(form: HTMLFormElement): boolean {
  return form.getAttribute('data-form-locked') === 'true';
}

/**
 * Get form lock reason.
 */
export function getFormLockReason(form: HTMLFormElement): string | null {
  return form.getAttribute('data-lock-reason');
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Render fallback banner from a record payload.
 */
export function renderFallbackBannerFromRecord(
  record: Record<string, unknown>,
  config: Omit<FallbackBannerConfig, 'context'>
): string {
  const context = extractTranslationContext(record);
  const banner = new FallbackBanner({ ...config, context });
  return banner.render();
}

/**
 * Check if a record is in fallback mode and should show banner.
 */
export function shouldShowFallbackBanner(record: Record<string, unknown>): boolean {
  const context = extractTranslationContext(record);
  return context.fallbackUsed || context.missingRequestedLocale;
}

/**
 * Initialize fallback banner in a container with event handling.
 */
export function initFallbackBanner(
  container: HTMLElement,
  config: FallbackBannerConfig
): FallbackBanner {
  const banner = new FallbackBanner(config);
  banner.mount(container);
  return banner;
}

/**
 * Initialize form lock based on translation context.
 * Returns the form lock state.
 */
export function initFormLock(
  form: HTMLFormElement,
  record: Record<string, unknown>
): FormLockState {
  const context = extractTranslationContext(record);
  const banner = new FallbackBanner({
    context,
    apiEndpoint: '',
    navigationBasePath: '',
  });

  const lockState = banner.getFormLockState();
  applyFormLock(form, lockState);

  return lockState;
}

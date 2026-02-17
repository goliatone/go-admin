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
import { type CreateActionResult } from './locale-action.js';
import { type TranslationContext } from './translation-context.js';
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
/**
 * FallbackBanner renders a warning banner with actions for fallback mode.
 * Manages form lock state and provides CTA buttons.
 */
export declare class FallbackBanner {
    private config;
    private element;
    private localeChip;
    constructor(config: FallbackBannerConfig);
    /**
     * Check if fallback mode is active.
     */
    isInFallbackMode(): boolean;
    /**
     * Get form lock state.
     */
    getFormLockState(): FormLockState;
    /**
     * Render the fallback banner as HTML string.
     */
    render(): string;
    /**
     * Render the primary CTA (Create missing locale).
     */
    private renderPrimaryCta;
    /**
     * Render the secondary CTA (Open source locale).
     */
    private renderSecondaryCta;
    /**
     * Render the form lock message.
     */
    private renderFormLockMessage;
    /**
     * Mount the banner to a container and bind events.
     */
    mount(container: HTMLElement): void;
    /**
     * Bind event handlers.
     */
    private bindEvents;
    /**
     * Handle create translation action.
     */
    private handleCreate;
}
/**
 * Apply form lock to a form element based on fallback state.
 * Disables all form inputs and adds visual indicators.
 */
export declare function applyFormLock(form: HTMLFormElement, lockState: FormLockState): void;
/**
 * Remove form lock from a form element.
 */
export declare function removeFormLock(form: HTMLFormElement): void;
/**
 * Check if a form is locked.
 */
export declare function isFormLocked(form: HTMLFormElement): boolean;
/**
 * Get form lock reason.
 */
export declare function getFormLockReason(form: HTMLFormElement): string | null;
/**
 * Render fallback banner from a record payload.
 */
export declare function renderFallbackBannerFromRecord(record: Record<string, unknown>, config: Omit<FallbackBannerConfig, 'context'>): string;
/**
 * Check if a record is in fallback mode and should show banner.
 */
export declare function shouldShowFallbackBanner(record: Record<string, unknown>): boolean;
/**
 * Initialize fallback banner in a container with event handling.
 */
export declare function initFallbackBanner(container: HTMLElement, config: FallbackBannerConfig): FallbackBanner;
/**
 * Initialize form lock based on translation context.
 * Returns the form lock state.
 */
export declare function initFormLock(form: HTMLFormElement, record: Record<string, unknown>): FormLockState;
//# sourceMappingURL=fallback-banner.d.ts.map
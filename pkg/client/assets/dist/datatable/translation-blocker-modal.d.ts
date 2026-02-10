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
import { Modal } from '../shared/modal.js';
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
export declare class TranslationBlockerModal extends Modal {
    private config;
    private localeStates;
    private resolved;
    constructor(config: TranslationBlockerModalConfig);
    /**
     * Show the translation blocker modal.
     * Returns a promise that resolves when the modal is closed.
     */
    static showBlocker(config: TranslationBlockerModalConfig): Promise<void>;
    protected renderContent(): string;
    private renderDescription;
    private renderLocaleItem;
    private renderCreateButton;
    private renderOpenButton;
    private getLocaleLabel;
    protected bindContentEvents(): void;
    private handleCreateTranslation;
    private updateLocaleItemUI;
    private handleRetry;
    private dismiss;
    protected onBeforeHide(): boolean;
}
/**
 * Show translation blocker modal with simplified configuration.
 * Use this as the primary entry point for displaying blockers.
 */
export declare function showTranslationBlocker(config: TranslationBlockerModalConfig): Promise<void>;
//# sourceMappingURL=translation-blocker-modal.d.ts.map
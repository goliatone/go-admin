/**
 * Status Vocabulary - Canonical status registry
 *
 * Single source of truth for status presentation across translation surfaces
 * and other admin UIs. Every status maps to exactly one tone, label, and icon;
 * all renderers (TS modules, the SSR partial `partials/status-badge.html`, and
 * the dashboard widget template) must agree with this registry.
 *
 * SSR parity is enforced by `tests/status_vocabulary_drift.test.mjs`, which
 * parses the SSR templates and compares them against these entries. If you
 * change a tone/label/icon here, update `partials/status-badge.html` too.
 *
 * Usage:
 *   import { getStatusEntry, getStatusTone } from './status-vocabulary';
 *   const entry = getStatusEntry('in_review'); // { tone: 'warning', label: 'In Review', icon: 'clock' }
 */
/**
 * Available tones for status display
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
/**
 * Canonical presentation for a status value.
 */
export interface StatusEntry {
    tone: StatusTone;
    /** Human label, Title Case (Queue style). */
    label: string;
    /** Iconoir icon name (without the `iconoir-` prefix). */
    icon: string;
}
/**
 * Canonical status registry.
 *
 * Conflict resolutions (2026-06-11, see .ctx/specs/ux-dashboard-review/DESIGN.md):
 * - `in_review` / `review` are warning (was info/purple on Matrix and datatable).
 * - `changes_requested` is error (was warning in STATUS_SEVERITY_MAP).
 * - `missing_locale` / `missing_locales` are warning (was error in STATUS_SEVERITY_MAP).
 * - `in_progress` is info (was warning on Matrix).
 */
export declare const TRANSLATION_STATUS_REGISTRY: Record<string, StatusEntry>;
/**
 * Translation module status→tone mapping, derived from the registry.
 * Kept for backwards compatibility with existing imports.
 */
export declare const TRANSLATION_STATUS_TONES: Record<string, StatusTone>;
/**
 * Alert state mappings (for dashboard cards)
 */
export declare const ALERT_STATE_TONES: Record<string, StatusTone>;
/**
 * Get the canonical registry entry for a status value, or null when unknown.
 */
export declare function getStatusEntry(status: string): StatusEntry | null;
/**
 * Get the visual tone for a status value
 *
 * @param status - The status value to look up
 * @param vocabulary - Optional vocabulary to use (defaults to translation)
 * @returns The tone for the status, or 'neutral' if not found
 */
export declare function getStatusTone(status: string, vocabulary?: 'translation' | 'alert'): StatusTone;
/**
 * Get the canonical human label for a status value.
 * Unknown statuses are humanized (underscores → spaces, Title Case).
 */
export declare function getStatusLabel(status: string): string;
/**
 * Humanize a raw status string ("changes_requested" → "Changes Requested").
 */
export declare function humanizeStatus(status: string): string;
/**
 * Get CSS classes for a tone.
 *
 * The `badge` variant returns the shared `.status-chip` component classes
 * defined in input.css (rounded-full pill with dark-mode variants) — the same
 * anatomy emitted by the SSR partial `partials/status-badge.html`.
 *
 * @param tone - The tone value
 * @param variant - Style variant ('bg' for background, 'text' for text color, 'badge' for the chip component)
 */
export declare function getToneClasses(tone: StatusTone, variant?: 'bg' | 'text' | 'badge'): string;
/**
 * Get icon name for a status
 *
 * @param status - The status value
 * @returns Iconoir icon name (without prefix)
 */
export declare function getStatusIcon(status: string): string;
/**
 * Create a status display object for templates
 *
 * @param status - The status value
 * @param label - Optional custom label (defaults to registry/humanized label)
 * @returns Object with tone, icon, and label for template rendering
 */
export declare function createStatusDisplay(status: string, label?: string): {
    status: string;
    tone: StatusTone;
    icon: string;
    label: string;
};
/**
 * Render the shared status chip markup for client-rendered surfaces.
 * Emits the same `.status-chip` anatomy as the SSR partial.
 */
export declare function renderStatusChip(status: string, options?: {
    label?: string;
    showIcon?: boolean;
    extraClass?: string;
    count?: number | string;
}): string;
//# sourceMappingURL=status-vocabulary.d.ts.map
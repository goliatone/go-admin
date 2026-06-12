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
export const TRANSLATION_STATUS_REGISTRY: Record<string, StatusEntry> = {
  // Assignment workflow statuses
  draft: { tone: 'neutral', label: 'Draft', icon: 'edit-pencil' },
  open: { tone: 'info', label: 'Open', icon: 'mail-in' },
  pending: { tone: 'warning', label: 'Pending', icon: 'clock' },
  assigned: { tone: 'info', label: 'Assigned', icon: 'user' },
  in_progress: { tone: 'info', label: 'In Progress', icon: 'arrow-right' },
  in_review: { tone: 'warning', label: 'In Review', icon: 'clock' },
  review: { tone: 'warning', label: 'In Review', icon: 'clock' },
  changes_requested: { tone: 'error', label: 'Changes Requested', icon: 'edit' },
  approved: { tone: 'success', label: 'Approved', icon: 'check-circle' },
  rejected: { tone: 'error', label: 'Rejected', icon: 'xmark-circle' },
  archived: { tone: 'neutral', label: 'Archived', icon: 'archive' },

  // Family readiness states
  ready: { tone: 'success', label: 'Ready', icon: 'check' },
  blocked: { tone: 'error', label: 'Blocked', icon: 'prohibition' },
  missing_locales: { tone: 'warning', label: 'Missing Locales', icon: 'warning-circle' },
  missing_fields: { tone: 'warning', label: 'Missing Fields', icon: 'warning-circle' },
  missing_locales_and_fields: { tone: 'error', label: 'Not Ready', icon: 'warning-triangle' },
  not_started: { tone: 'neutral', label: 'Not Started', icon: 'circle' },

  // Matrix cell states
  missing: { tone: 'error', label: 'Missing', icon: 'warning-circle' },
  fallback: { tone: 'warning', label: 'Fallback', icon: 'arrow-down' },
  not_required: { tone: 'neutral', label: 'Not Required', icon: 'minus' },

  // Priority levels
  low: { tone: 'neutral', label: 'Low', icon: 'minus' },
  normal: { tone: 'info', label: 'Normal', icon: 'circle' },
  high: { tone: 'warning', label: 'High', icon: 'arrow-up' },
  urgent: { tone: 'error', label: 'Urgent', icon: 'warning-triangle' },
  critical: { tone: 'error', label: 'Critical', icon: 'flash' },

  // Due/overdue states
  on_track: { tone: 'success', label: 'On Track', icon: 'check-circle' },
  due_soon: { tone: 'warning', label: 'Due Soon', icon: 'clock' },
  overdue: { tone: 'error', label: 'Overdue', icon: 'warning-triangle' },
  none: { tone: 'neutral', label: 'No Due Date', icon: 'clock' },

  // Review states
  pending_review: { tone: 'warning', label: 'Pending Review', icon: 'clock' },
  review_approved: { tone: 'success', label: 'Review Approved', icon: 'check-circle' },
  review_rejected: { tone: 'error', label: 'Review Rejected', icon: 'xmark-circle' },

  // Publish states
  published: { tone: 'success', label: 'Published', icon: 'check-circle' },
  unpublished: { tone: 'neutral', label: 'Unpublished', icon: 'minus' },
  pending_publish: { tone: 'warning', label: 'Pending Publish', icon: 'clock' },

  // Generic states
  active: { tone: 'success', label: 'Active', icon: 'check-circle' },
  inactive: { tone: 'neutral', label: 'Inactive', icon: 'pause' },
  enabled: { tone: 'success', label: 'Enabled', icon: 'check-circle' },
  disabled: { tone: 'neutral', label: 'Disabled', icon: 'pause' },
  completed: { tone: 'success', label: 'Completed', icon: 'check' },
  failed: { tone: 'error', label: 'Failed', icon: 'xmark' },
  cancelled: { tone: 'neutral', label: 'Cancelled', icon: 'xmark-circle' },
  running: { tone: 'info', label: 'Running', icon: 'arrow-right' },

  // Exchange row/job statuses
  success: { tone: 'success', label: 'Success', icon: 'check' },
  error: { tone: 'error', label: 'Error', icon: 'xmark' },
  conflict: { tone: 'warning', label: 'Conflict', icon: 'warning-triangle' },
  skipped: { tone: 'neutral', label: 'Skipped', icon: 'minus' },

  // Blocker codes
  missing_locale: { tone: 'warning', label: 'Missing Locale', icon: 'warning-circle' },
  missing_field: { tone: 'warning', label: 'Missing Field', icon: 'warning-circle' },
  outdated_source: { tone: 'error', label: 'Outdated Source', icon: 'warning-triangle' },
  qa_blocked: { tone: 'error', label: 'QA Blocked', icon: 'prohibition' },
  policy_denied: { tone: 'error', label: 'Policy Denied', icon: 'prohibition' },
  validation_error: { tone: 'error', label: 'Validation Error', icon: 'warning-triangle' },
  permission_denied: { tone: 'error', label: 'Permission Denied', icon: 'prohibition' },

  // Editor field states
  complete: { tone: 'success', label: 'Complete', icon: 'check' },
  drift: { tone: 'warning', label: 'Source Changed', icon: 'warning-triangle' },
};

/**
 * Translation module status→tone mapping, derived from the registry.
 * Kept for backwards compatibility with existing imports.
 */
export const TRANSLATION_STATUS_TONES: Record<string, StatusTone> = Object.fromEntries(
  Object.entries(TRANSLATION_STATUS_REGISTRY).map(([status, entry]) => [status, entry.tone])
) as Record<string, StatusTone>;

/**
 * Alert state mappings (for dashboard cards)
 */
export const ALERT_STATE_TONES: Record<string, StatusTone> = {
  healthy: 'success',
  ok: 'success',
  warning: 'warning',
  critical: 'error',
  error: 'error',
  info: 'info',
  neutral: 'neutral',
};

const FALLBACK_ICON = 'help-circle';

function normalizeStatus(status: string): string {
  return status?.toLowerCase().trim().replace(/-/g, '_') || '';
}

/**
 * Get the canonical registry entry for a status value, or null when unknown.
 */
export function getStatusEntry(status: string): StatusEntry | null {
  return TRANSLATION_STATUS_REGISTRY[normalizeStatus(status)] ?? null;
}

/**
 * Get the visual tone for a status value
 *
 * @param status - The status value to look up
 * @param vocabulary - Optional vocabulary to use (defaults to translation)
 * @returns The tone for the status, or 'neutral' if not found
 */
export function getStatusTone(
  status: string,
  vocabulary: 'translation' | 'alert' = 'translation'
): StatusTone {
  const normalizedStatus = normalizeStatus(status);

  if (vocabulary === 'alert') {
    return ALERT_STATE_TONES[normalizedStatus] || 'neutral';
  }

  return TRANSLATION_STATUS_REGISTRY[normalizedStatus]?.tone || 'neutral';
}

/**
 * Get the canonical human label for a status value.
 * Unknown statuses are humanized (underscores → spaces, Title Case).
 */
export function getStatusLabel(status: string): string {
  const entry = getStatusEntry(status);
  if (entry) {
    return entry.label;
  }
  return humanizeStatus(status);
}

/**
 * Humanize a raw status string ("changes_requested" → "Changes Requested").
 */
export function humanizeStatus(status: string): string {
  return normalizeStatus(status)
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
export function getToneClasses(
  tone: StatusTone,
  variant: 'bg' | 'text' | 'badge' = 'badge'
): string {
  if (variant === 'badge') {
    return `status-chip status-chip--${tone}`;
  }

  const classes: Record<StatusTone, Record<'bg' | 'text', string>> = {
    neutral: { bg: 'bg-gray-100', text: 'text-gray-700' },
    info: { bg: 'bg-sky-50', text: 'text-sky-700' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700' },
    error: { bg: 'bg-rose-50', text: 'text-rose-700' },
  };

  return classes[tone]?.[variant] || classes.neutral[variant];
}

/**
 * Get icon name for a status
 *
 * @param status - The status value
 * @returns Iconoir icon name (without prefix)
 */
export function getStatusIcon(status: string): string {
  return getStatusEntry(status)?.icon || FALLBACK_ICON;
}

/**
 * Create a status display object for templates
 *
 * @param status - The status value
 * @param label - Optional custom label (defaults to registry/humanized label)
 * @returns Object with tone, icon, and label for template rendering
 */
export function createStatusDisplay(
  status: string,
  label?: string
): {
  status: string;
  tone: StatusTone;
  icon: string;
  label: string;
} {
  return {
    status,
    tone: getStatusTone(status),
    icon: getStatusIcon(status),
    label: label || getStatusLabel(status),
  };
}

/**
 * Render the shared status chip markup for client-rendered surfaces.
 * Emits the same `.status-chip` anatomy as the SSR partial.
 */
export function renderStatusChip(
  status: string,
  options: { label?: string; showIcon?: boolean; extraClass?: string; count?: number | string } = {}
): string {
  const display = createStatusDisplay(status, options.label);
  const showIcon = options.showIcon !== false;
  const classes = `${getToneClasses(display.tone, 'badge')}${options.extraClass ? ` ${options.extraClass}` : ''}`;
  const icon = showIcon
    ? `<i class="iconoir-${display.icon} text-[10px]" aria-hidden="true"></i>`
    : '';
  const count =
    options.count === undefined || options.count === null || options.count === ''
      ? ''
      : `<span class="status-chip__count">${escapeChipText(String(options.count))}</span>`;
  return `<span class="${classes}" data-status="${escapeChipText(status)}">${icon}${escapeChipText(display.label)}${count}</span>`;
}

function escapeChipText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

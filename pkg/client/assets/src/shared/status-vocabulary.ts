/**
 * Status Vocabulary - Centralized status-to-tone mapping
 *
 * This module provides consistent visual tone mappings for status values
 * across the translation module and other admin surfaces.
 *
 * Usage:
 *   import { getStatusTone, TRANSLATION_STATUS_TONES } from './status-vocabulary';
 *   const tone = getStatusTone('in_review'); // 'warning'
 */

/**
 * Available tones for status display
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

/**
 * Translation module status mappings
 */
export const TRANSLATION_STATUS_TONES: Record<string, StatusTone> = {
  // Assignment workflow statuses
  draft: 'neutral',
  open: 'info',
  assigned: 'info',
  in_progress: 'info',
  in_review: 'warning',
  changes_requested: 'error',
  approved: 'success',
  archived: 'neutral',

  // Family readiness states
  blocked: 'error',
  ready: 'success',
  missing_locales: 'warning',
  missing_locales_and_fields: 'error',
  not_started: 'neutral',

  // Priority levels
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
  critical: 'error',

  // Due/overdue states
  on_track: 'success',
  due_soon: 'warning',
  overdue: 'error',

  // Review states
  pending_review: 'warning',
  review_approved: 'success',
  review_rejected: 'error',

  // Publish states
  published: 'success',
  unpublished: 'neutral',
  pending_publish: 'warning',

  // Generic states
  active: 'success',
  inactive: 'neutral',
  enabled: 'success',
  disabled: 'neutral',
  pending: 'warning',
  completed: 'success',
  failed: 'error',
  cancelled: 'neutral',

  // Blocker types
  missing_locale: 'warning',
  missing_field: 'warning',
  validation_error: 'error',
  permission_denied: 'error',
};

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
  const normalizedStatus = status?.toLowerCase().trim() || '';

  if (vocabulary === 'alert') {
    return ALERT_STATE_TONES[normalizedStatus] || 'neutral';
  }

  return TRANSLATION_STATUS_TONES[normalizedStatus] || 'neutral';
}

/**
 * Get CSS class for a tone
 *
 * @param tone - The tone value
 * @param variant - Style variant ('bg' for background, 'text' for text color, 'badge' for both)
 * @returns Tailwind CSS classes for the tone
 */
export function getToneClasses(
  tone: StatusTone,
  variant: 'bg' | 'text' | 'badge' = 'badge'
): string {
  const classes: Record<StatusTone, Record<'bg' | 'text' | 'badge', string>> = {
    neutral: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-700',
    },
    info: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      badge: 'bg-sky-50 text-sky-700',
    },
    success: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-700',
    },
    error: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      badge: 'bg-rose-50 text-rose-700',
    },
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
  const icons: Record<string, string> = {
    // Workflow statuses
    draft: 'edit-pencil',
    open: 'inbox',
    assigned: 'user',
    in_progress: 'arrow-right',
    in_review: 'clock',
    changes_requested: 'edit',
    approved: 'check-circle',
    archived: 'archive',

    // Readiness states
    blocked: 'prohibition',
    ready: 'check',
    missing_locales: 'warning-circle',
    missing_locales_and_fields: 'warning-triangle',

    // Priority
    low: 'minus',
    normal: 'circle',
    high: 'arrow-up',
    urgent: 'warning-triangle',
    critical: 'flash',

    // Due states
    on_track: 'check-circle',
    due_soon: 'clock',
    overdue: 'warning-triangle',

    // Generic
    active: 'check-circle',
    inactive: 'pause',
    pending: 'clock',
    completed: 'check',
    failed: 'xmark',
    cancelled: 'xmark-circle',
  };

  return icons[status?.toLowerCase().trim()] || 'help-circle';
}

/**
 * Create a status display object for templates
 *
 * @param status - The status value
 * @param label - Optional custom label (defaults to humanized status)
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
  const tone = getStatusTone(status);
  const icon = getStatusIcon(status);
  const displayLabel =
    label ||
    status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return {
    status,
    tone,
    icon,
    label: displayLabel,
  };
}

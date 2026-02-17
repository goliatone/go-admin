/**
 * Translation Status Vocabulary (Phase 5 - TX-052)
 *
 * Provides a unified translation status vocabulary map and disabled-reason presenter
 * used by all translation surfaces. Implements the shared contracts from backend
 * translation_contracts.go and action_state_reason_codes.go.
 *
 * Status Domains:
 * - Core: readiness_state (ready, missing_locales, missing_fields, missing_locales_and_fields)
 * - Queue: queue_state (pending, assigned, in_progress, review, rejected, approved, published, archived)
 *          content_state (draft, review, ready, archived)
 *          due_state (overdue, due_soon, on_track, none)
 * - Exchange: row_status (success, error, conflict, skipped)
 *             job_status (running, completed, failed)
 *
 * Disabled Reason Codes:
 * - TRANSLATION_MISSING, INVALID_STATUS, PERMISSION_DENIED, MISSING_CONTEXT, FEATURE_DISABLED
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Status domain categories matching backend structure
 */
export type StatusDomain = 'core' | 'queue' | 'exchange';

/**
 * Core readiness states
 */
export type CoreReadinessState = 'ready' | 'missing_locales' | 'missing_fields' | 'missing_locales_and_fields';

/**
 * Queue assignment states
 */
export type QueueState = 'pending' | 'assigned' | 'in_progress' | 'review' | 'rejected' | 'approved' | 'published' | 'archived';

/**
 * Queue content states
 */
export type QueueContentState = 'draft' | 'review' | 'ready' | 'archived';

/**
 * Queue due states
 */
export type QueueDueState = 'overdue' | 'due_soon' | 'on_track' | 'none';

/**
 * Exchange row statuses
 */
export type ExchangeRowStatus = 'success' | 'error' | 'conflict' | 'skipped';

/**
 * Exchange job statuses
 */
export type ExchangeJobStatus = 'running' | 'completed' | 'failed';

/**
 * All possible translation status values
 */
export type TranslationStatus =
  | CoreReadinessState
  | QueueState
  | QueueContentState
  | QueueDueState
  | ExchangeRowStatus
  | ExchangeJobStatus;

/**
 * Canonical disabled reason codes from backend
 */
export type DisabledReasonCode =
  | 'TRANSLATION_MISSING'
  | 'INVALID_STATUS'
  | 'PERMISSION_DENIED'
  | 'MISSING_CONTEXT'
  | 'FEATURE_DISABLED';

/**
 * Status display configuration
 */
export interface StatusDisplayConfig {
  /** Human-readable label */
  label: string;
  /** Short label for compact displays */
  shortLabel?: string;
  /** CSS color class (bg + text) */
  colorClass: string;
  /** Background color class */
  bgClass: string;
  /** Text color class */
  textClass: string;
  /** Border color class */
  borderClass?: string;
  /** Icon character or SVG path */
  icon: string;
  /** Icon type: 'char' for character, 'svg' for SVG path */
  iconType: 'char' | 'svg';
  /** Severity level for sorting/priority */
  severity: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  /** Tooltip/description text */
  description?: string;
}

/**
 * Disabled reason display configuration
 */
export interface DisabledReasonDisplayConfig {
  /** Human-readable message */
  message: string;
  /** Short message for compact displays */
  shortMessage: string;
  /** CSS color class */
  colorClass: string;
  /** Background color class */
  bgClass: string;
  /** Text color class */
  textClass: string;
  /** Icon SVG path */
  icon: string;
  /** Severity level */
  severity: 'warning' | 'error' | 'info';
  /** Whether the reason can be resolved by user action */
  actionable: boolean;
  /** Suggested action label if actionable */
  actionLabel?: string;
}

/**
 * Status vocabulary payload from backend contracts
 */
export interface StatusVocabularyPayload {
  schema_version: number;
  status_enums: {
    core: {
      readiness_state: string[];
    };
    queue: {
      queue_state: string[];
      content_state: string[];
      due_state: string[];
    };
    exchange: {
      row_status: string[];
      job_status: string[];
    };
    all: string[];
  };
  disabled_reason_codes: string[];
}

// ============================================================================
// Status Display Configurations
// ============================================================================

/**
 * SVG icon paths for status icons
 */
const ICONS = {
  check: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
  warning: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
  error: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
  info: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z',
  clock: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z',
  document: 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z',
  archive: 'M4 3a2 2 0 100 4h12a2 2 0 100-4H4zm0 6a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1H4zm4 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z',
  user: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z',
  play: 'M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z',
  lock: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
  ban: 'M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z',
};

/**
 * Core readiness state display configurations
 */
export const CORE_READINESS_DISPLAY: Record<CoreReadinessState, StatusDisplayConfig> = {
  ready: {
    label: 'Ready',
    shortLabel: 'Ready',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    borderClass: 'border-green-300',
    icon: '●',
    iconType: 'char',
    severity: 'success',
    description: 'All required translations are complete',
  },
  missing_locales: {
    label: 'Missing Locales',
    shortLabel: 'Missing',
    colorClass: 'bg-amber-100 text-amber-700',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-300',
    icon: '○',
    iconType: 'char',
    severity: 'warning',
    description: 'Required locale translations are missing',
  },
  missing_fields: {
    label: 'Incomplete Fields',
    shortLabel: 'Incomplete',
    colorClass: 'bg-yellow-100 text-yellow-700',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-300',
    icon: '◐',
    iconType: 'char',
    severity: 'warning',
    description: 'Some translations have missing required fields',
  },
  missing_locales_and_fields: {
    label: 'Not Ready',
    shortLabel: 'Not Ready',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    borderClass: 'border-red-300',
    icon: '○',
    iconType: 'char',
    severity: 'error',
    description: 'Missing translations and incomplete fields',
  },
};

/**
 * Queue state display configurations
 */
export const QUEUE_STATE_DISPLAY: Record<QueueState, StatusDisplayConfig> = {
  pending: {
    label: 'Pending',
    colorClass: 'bg-gray-100 text-gray-700',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    icon: ICONS.clock,
    iconType: 'svg',
    severity: 'neutral',
    description: 'Waiting to be assigned',
  },
  assigned: {
    label: 'Assigned',
    colorClass: 'bg-blue-100 text-blue-700',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: ICONS.user,
    iconType: 'svg',
    severity: 'info',
    description: 'Assigned to a translator',
  },
  in_progress: {
    label: 'In Progress',
    colorClass: 'bg-blue-100 text-blue-700',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: ICONS.play,
    iconType: 'svg',
    severity: 'info',
    description: 'Translation in progress',
  },
  review: {
    label: 'In Review',
    colorClass: 'bg-purple-100 text-purple-700',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    icon: ICONS.document,
    iconType: 'svg',
    severity: 'info',
    description: 'Pending review',
  },
  rejected: {
    label: 'Rejected',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    icon: ICONS.error,
    iconType: 'svg',
    severity: 'error',
    description: 'Translation rejected',
  },
  approved: {
    label: 'Approved',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'Translation approved',
  },
  published: {
    label: 'Published',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'Translation published',
  },
  archived: {
    label: 'Archived',
    colorClass: 'bg-gray-100 text-gray-500',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: ICONS.archive,
    iconType: 'svg',
    severity: 'neutral',
    description: 'Translation archived',
  },
};

/**
 * Queue content state display configurations
 */
export const QUEUE_CONTENT_STATE_DISPLAY: Record<QueueContentState, StatusDisplayConfig> = {
  draft: {
    label: 'Draft',
    colorClass: 'bg-gray-100 text-gray-700',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    icon: ICONS.document,
    iconType: 'svg',
    severity: 'neutral',
    description: 'Draft content',
  },
  review: {
    label: 'Review',
    colorClass: 'bg-purple-100 text-purple-700',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    icon: ICONS.document,
    iconType: 'svg',
    severity: 'info',
    description: 'Content under review',
  },
  ready: {
    label: 'Ready',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'Content ready',
  },
  archived: {
    label: 'Archived',
    colorClass: 'bg-gray-100 text-gray-500',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: ICONS.archive,
    iconType: 'svg',
    severity: 'neutral',
    description: 'Content archived',
  },
};

/**
 * Queue due state display configurations
 */
export const QUEUE_DUE_STATE_DISPLAY: Record<QueueDueState, StatusDisplayConfig> = {
  overdue: {
    label: 'Overdue',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    icon: ICONS.warning,
    iconType: 'svg',
    severity: 'error',
    description: 'Past due date',
  },
  due_soon: {
    label: 'Due Soon',
    colorClass: 'bg-amber-100 text-amber-700',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    icon: ICONS.clock,
    iconType: 'svg',
    severity: 'warning',
    description: 'Due within 24 hours',
  },
  on_track: {
    label: 'On Track',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'On schedule',
  },
  none: {
    label: 'No Due Date',
    colorClass: 'bg-gray-100 text-gray-500',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: ICONS.clock,
    iconType: 'svg',
    severity: 'neutral',
    description: 'No due date set',
  },
};

/**
 * Exchange row status display configurations
 */
export const EXCHANGE_ROW_STATUS_DISPLAY: Record<ExchangeRowStatus, StatusDisplayConfig> = {
  success: {
    label: 'Success',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'Import/export succeeded',
  },
  error: {
    label: 'Error',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    icon: ICONS.error,
    iconType: 'svg',
    severity: 'error',
    description: 'Import/export failed',
  },
  conflict: {
    label: 'Conflict',
    colorClass: 'bg-amber-100 text-amber-700',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    icon: ICONS.warning,
    iconType: 'svg',
    severity: 'warning',
    description: 'Conflicting changes detected',
  },
  skipped: {
    label: 'Skipped',
    colorClass: 'bg-gray-100 text-gray-500',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    icon: ICONS.ban,
    iconType: 'svg',
    severity: 'neutral',
    description: 'Row skipped',
  },
};

/**
 * Exchange job status display configurations
 */
export const EXCHANGE_JOB_STATUS_DISPLAY: Record<ExchangeJobStatus, StatusDisplayConfig> = {
  running: {
    label: 'Running',
    colorClass: 'bg-blue-100 text-blue-700',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    icon: ICONS.play,
    iconType: 'svg',
    severity: 'info',
    description: 'Job in progress',
  },
  completed: {
    label: 'Completed',
    colorClass: 'bg-green-100 text-green-700',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    icon: ICONS.check,
    iconType: 'svg',
    severity: 'success',
    description: 'Job completed successfully',
  },
  failed: {
    label: 'Failed',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    icon: ICONS.error,
    iconType: 'svg',
    severity: 'error',
    description: 'Job failed',
  },
};

/**
 * Disabled reason code display configurations
 */
export const DISABLED_REASON_DISPLAY: Record<DisabledReasonCode, DisabledReasonDisplayConfig> = {
  TRANSLATION_MISSING: {
    message: 'Required translation is missing',
    shortMessage: 'Translation missing',
    colorClass: 'bg-amber-100 text-amber-700',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    icon: ICONS.warning,
    severity: 'warning',
    actionable: true,
    actionLabel: 'Create translation',
  },
  INVALID_STATUS: {
    message: 'Action not available in current status',
    shortMessage: 'Invalid status',
    colorClass: 'bg-gray-100 text-gray-600',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    icon: ICONS.ban,
    severity: 'info',
    actionable: false,
  },
  PERMISSION_DENIED: {
    message: 'You do not have permission for this action',
    shortMessage: 'No permission',
    colorClass: 'bg-red-100 text-red-700',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    icon: ICONS.lock,
    severity: 'error',
    actionable: false,
  },
  MISSING_CONTEXT: {
    message: 'Required context is missing',
    shortMessage: 'Missing context',
    colorClass: 'bg-gray-100 text-gray-600',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    icon: ICONS.info,
    severity: 'info',
    actionable: false,
  },
  FEATURE_DISABLED: {
    message: 'This feature is currently disabled',
    shortMessage: 'Feature disabled',
    colorClass: 'bg-gray-100 text-gray-500',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
    icon: ICONS.ban,
    severity: 'info',
    actionable: false,
  },
};

// ============================================================================
// Status Vocabulary Functions
// ============================================================================

/**
 * Get display configuration for a status value
 */
export function getStatusDisplay(status: string, domain?: StatusDomain): StatusDisplayConfig | null {
  const normalized = status.toLowerCase();

  // Try core readiness states
  if (!domain || domain === 'core') {
    if (normalized in CORE_READINESS_DISPLAY) {
      return CORE_READINESS_DISPLAY[normalized as CoreReadinessState];
    }
  }

  // Try queue states
  if (!domain || domain === 'queue') {
    if (normalized in QUEUE_STATE_DISPLAY) {
      return QUEUE_STATE_DISPLAY[normalized as QueueState];
    }
    if (normalized in QUEUE_CONTENT_STATE_DISPLAY) {
      return QUEUE_CONTENT_STATE_DISPLAY[normalized as QueueContentState];
    }
    if (normalized in QUEUE_DUE_STATE_DISPLAY) {
      return QUEUE_DUE_STATE_DISPLAY[normalized as QueueDueState];
    }
  }

  // Try exchange states
  if (!domain || domain === 'exchange') {
    if (normalized in EXCHANGE_ROW_STATUS_DISPLAY) {
      return EXCHANGE_ROW_STATUS_DISPLAY[normalized as ExchangeRowStatus];
    }
    if (normalized in EXCHANGE_JOB_STATUS_DISPLAY) {
      return EXCHANGE_JOB_STATUS_DISPLAY[normalized as ExchangeJobStatus];
    }
  }

  return null;
}

/**
 * Get display configuration for a disabled reason code
 */
export function getDisabledReasonDisplay(code: string): DisabledReasonDisplayConfig | null {
  const normalized = code.toUpperCase();
  if (normalized in DISABLED_REASON_DISPLAY) {
    return DISABLED_REASON_DISPLAY[normalized as DisabledReasonCode];
  }
  return null;
}

/**
 * Check if a status value is valid
 */
export function isValidStatus(status: string, domain?: StatusDomain): boolean {
  return getStatusDisplay(status, domain) !== null;
}

/**
 * Check if a reason code is valid
 */
export function isValidReasonCode(code: string): boolean {
  return getDisabledReasonDisplay(code) !== null;
}

/**
 * Get all status values for a domain
 */
export function getStatusesForDomain(domain: StatusDomain): string[] {
  switch (domain) {
    case 'core':
      return Object.keys(CORE_READINESS_DISPLAY);
    case 'queue':
      return [
        ...Object.keys(QUEUE_STATE_DISPLAY),
        ...Object.keys(QUEUE_CONTENT_STATE_DISPLAY),
        ...Object.keys(QUEUE_DUE_STATE_DISPLAY),
      ];
    case 'exchange':
      return [
        ...Object.keys(EXCHANGE_ROW_STATUS_DISPLAY),
        ...Object.keys(EXCHANGE_JOB_STATUS_DISPLAY),
      ];
    default:
      return [];
  }
}

/**
 * Get all disabled reason codes
 */
export function getAllReasonCodes(): string[] {
  return Object.keys(DISABLED_REASON_DISPLAY);
}

/**
 * Get a CSS class name for a status value.
 * Returns 'status-{status}' for valid statuses, empty string otherwise.
 * This replaces local getStatusClass() functions in consuming surfaces.
 */
export function getStatusCssClass(status: string, domain?: StatusDomain): string {
  const display = getStatusDisplay(status, domain);
  if (!display) {
    return '';
  }
  return `status-${status.toLowerCase()}`;
}

/**
 * Get a CSS class name based on severity level.
 * Maps status to its severity CSS class for consistent theming.
 */
export function getSeverityCssClass(status: string, domain?: StatusDomain): string {
  const display = getStatusDisplay(status, domain);
  if (!display) {
    return '';
  }
  return `severity-${display.severity}`;
}

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render a status badge HTML string
 */
export function renderVocabularyStatusBadge(
  status: string,
  options: {
    domain?: StatusDomain;
    size?: 'xs' | 'sm' | 'default';
    showIcon?: boolean;
    showLabel?: boolean;
    extraClass?: string;
  } = {}
): string {
  const display = getStatusDisplay(status, options.domain);
  if (!display) {
    return `<span class="inline-flex items-center px-2 py-1 text-xs rounded bg-gray-100 text-gray-500">${escapeHtml(status)}</span>`;
  }

  const { size = 'default', showIcon = true, showLabel = true, extraClass = '' } = options;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-xs',
  };

  const iconHtml = showIcon ? renderVocabularyStatusIcon(display, size) : '';
  const labelHtml = showLabel ? `<span>${escapeHtml(display.label)}</span>` : '';
  const gap = showIcon && showLabel ? 'gap-1' : '';

  return `<span class="inline-flex items-center ${gap} rounded font-medium ${sizeClasses[size]} ${display.colorClass} ${extraClass}"
                title="${escapeHtml(display.description || display.label)}"
                aria-label="${escapeHtml(display.label)}"
                data-status="${escapeHtml(status)}">
    ${iconHtml}${labelHtml}
  </span>`;
}

/**
 * Render a status icon
 */
export function renderVocabularyStatusIcon(display: StatusDisplayConfig, size: 'xs' | 'sm' | 'default' = 'default'): string {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    default: 'w-4 h-4',
  };

  if (display.iconType === 'char') {
    return `<span class="${sizeClasses[size]} inline-flex items-center justify-center" aria-hidden="true">${display.icon}</span>`;
  }

  return `<svg class="${sizeClasses[size]}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="${display.icon}" clip-rule="evenodd"/>
  </svg>`;
}

/**
 * Render a disabled reason badge HTML string
 */
export function renderReasonCodeBadge(
  code: string,
  options: {
    size?: 'sm' | 'default';
    showIcon?: boolean;
    showFullMessage?: boolean;
    extraClass?: string;
  } = {}
): string {
  const display = getDisabledReasonDisplay(code);
  if (!display) {
    return `<span class="text-gray-500 text-xs">${escapeHtml(code)}</span>`;
  }

  const { size = 'default', showIcon = true, showFullMessage = false, extraClass = '' } = options;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-sm',
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const iconHtml = showIcon
    ? `<svg class="${iconSize}" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="${display.icon}" clip-rule="evenodd"/>
      </svg>`
    : '';

  const message = showFullMessage ? display.message : display.shortMessage;

  return `<span class="inline-flex items-center gap-1.5 rounded ${sizeClasses[size]} ${display.colorClass} ${extraClass}"
                role="status"
                aria-label="${escapeHtml(display.message)}"
                data-reason-code="${escapeHtml(code)}">
    ${iconHtml}
    <span>${escapeHtml(message)}</span>
  </span>`;
}

/**
 * Render an inline disabled reason indicator (compact, icon-only)
 */
export function renderReasonCodeIndicator(code: string, tooltip?: string): string {
  const display = getDisabledReasonDisplay(code);
  if (!display) {
    return '';
  }

  const title = tooltip || display.message;

  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${display.bgClass} ${display.textClass}"
                title="${escapeHtml(title)}"
                aria-label="${escapeHtml(display.shortMessage)}"
                data-reason-code="${escapeHtml(code)}">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="${display.icon}" clip-rule="evenodd"/>
    </svg>
  </span>`;
}

// ============================================================================
// Cell Renderer Factories
// ============================================================================

/**
 * Create a status cell renderer for DataGrid
 */
export function createStatusCellRenderer(
  options: {
    domain?: StatusDomain;
    size?: 'xs' | 'sm' | 'default';
    showIcon?: boolean;
  } = {}
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (value: unknown): string => {
    if (typeof value !== 'string' || !value) {
      return '<span class="text-gray-400">-</span>';
    }
    return renderVocabularyStatusBadge(value, options);
  };
}

/**
 * Create a disabled reason cell renderer for DataGrid
 */
export function createReasonCodeCellRenderer(
  options: {
    size?: 'sm' | 'default';
    showIcon?: boolean;
  } = {}
): (value: unknown, record: Record<string, unknown>, column: string) => string {
  return (value: unknown): string => {
    if (typeof value !== 'string' || !value) {
      return '';
    }
    return renderReasonCodeBadge(value, options);
  };
}

// ============================================================================
// Vocabulary Initialization
// ============================================================================

/**
 * Initialize vocabulary from backend payload (for dynamic vocabulary updates)
 */
export function initializeVocabularyFromPayload(_payload: StatusVocabularyPayload): void {
  // Currently vocabulary is static; this hook allows future dynamic updates
  // Validate payload matches expected structure
  if (_payload.schema_version !== 1) {
    console.warn('[TranslationStatusVocabulary] Unknown schema version:', _payload.schema_version);
  }
}

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for status vocabulary components
 */
export function getStatusVocabularyStyles(): string {
  return `
    /* Status Vocabulary Styles */
    [data-status],
    [data-reason-code] {
      transition: opacity 0.15s ease;
    }

    [data-status]:hover,
    [data-reason-code]:hover {
      opacity: 0.9;
    }

    /* Severity-based animations */
    [data-status="overdue"],
    [data-status="rejected"],
    [data-status="error"],
    [data-status="failed"] {
      animation: pulse-subtle 2s ease-in-out infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `;
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

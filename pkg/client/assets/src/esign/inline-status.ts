/**
 * Inline Status Module
 *
 * Provides utilities for rendering and managing inline status indicators
 * on the agreement detail page. Handles status state transitions, DOM
 * updates, and cleanup after fragment refreshes.
 *
 * @module esign/inline-status
 */

import type {
  InlineStatusState,
  InlineStatusEntry,
  InlineStatusChangeEvent,
} from '../services/command-runtime.js';
import type { AgreementLiveSection } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for inline status rendering
 */
export interface InlineStatusConfig {
  /** Auto-clear completed statuses after this delay (ms). 0 = never auto-clear */
  completedClearDelay: number;
  /** Auto-clear failed statuses after this delay (ms). 0 = never auto-clear */
  failedClearDelay: number;
  /** Show status on page-level fallback target when section-specific target not found */
  usePageFallback: boolean;
}

/**
 * Status display configuration for each state
 */
export interface StatusDisplayConfig {
  text: string;
  icon: 'spinner' | 'check' | 'error' | 'clock' | 'refresh';
  colorClass: string;
  ariaLive: 'polite' | 'assertive' | 'off';
}

/**
 * Target resolution result
 */
export interface StatusTargetResult {
  target: HTMLElement | null;
  section: AgreementLiveSection | null;
  participantId: string | null;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_INLINE_STATUS_CONFIG: InlineStatusConfig = {
  completedClearDelay: 3000,
  failedClearDelay: 8000,
  usePageFallback: true,
};

/**
 * Section to target selector mapping
 */
export const SECTION_TARGET_SELECTORS: Record<AgreementLiveSection, string> = {
  review_status: '#agreement-review-status-panel [data-live-status-target]',
  review_config: '#agreement-review-configuration-panel [data-live-status-target]',
  participants: '#review-participants-panel [data-live-status-target]',
  comments: '#review-comment-threads-panel [data-live-status-target]',
  delivery: '#agreement-delivery-panel [data-live-status-target]',
  artifacts: '#agreement-artifacts-panel [data-live-status-target]',
  timeline: '#agreement-timeline [data-live-status-target]',
};

/**
 * Fallback target selectors when section-specific target not found
 */
export const SECTION_FALLBACK_SELECTORS: Record<AgreementLiveSection, string> = {
  review_status: '#agreement-review-status-panel',
  review_config: '#agreement-review-configuration-panel',
  participants: '#review-participants-panel',
  comments: '#review-comment-threads-panel',
  delivery: '#agreement-delivery-panel',
  artifacts: '#agreement-artifacts-panel',
  timeline: '#agreement-timeline',
};

/**
 * Page-level fallback target
 */
export const PAGE_STATUS_TARGET = '#agreement-page-status-target';

/**
 * Status display configurations by state
 */
export const STATUS_DISPLAY: Record<InlineStatusState, StatusDisplayConfig> = {
  submitting: {
    text: 'Sending...',
    icon: 'spinner',
    colorClass: 'text-blue-600',
    ariaLive: 'polite',
  },
  accepted: {
    text: 'Queued...',
    icon: 'clock',
    colorClass: 'text-blue-600',
    ariaLive: 'polite',
  },
  completed: {
    text: 'Done',
    icon: 'check',
    colorClass: 'text-green-600',
    ariaLive: 'polite',
  },
  failed: {
    text: 'Failed',
    icon: 'error',
    colorClass: 'text-red-600',
    ariaLive: 'assertive',
  },
  stale: {
    text: 'Refreshing...',
    icon: 'refresh',
    colorClass: 'text-gray-500',
    ariaLive: 'polite',
  },
};

// =============================================================================
// Icon Templates
// =============================================================================

const ICON_TEMPLATES: Record<StatusDisplayConfig['icon'], string> = {
  spinner: `<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`,
  check: `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
  error: `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
  clock: `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>`,
  refresh: `<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
};

// =============================================================================
// Target Resolution
// =============================================================================

/**
 * Find the best target element for a status update based on section and participant ID.
 */
export function resolveStatusTarget(
  section?: AgreementLiveSection | string | null,
  participantId?: string | null,
  config: InlineStatusConfig = DEFAULT_INLINE_STATUS_CONFIG
): StatusTargetResult {
  const result: StatusTargetResult = {
    target: null,
    section: null,
    participantId: participantId || null,
  };

  // Try participant-specific target first
  if (participantId) {
    const participantCard = document.querySelector<HTMLElement>(
      `[data-participant-id="${participantId}"][data-review-participant-card]`
    );
    if (participantCard) {
      const target = participantCard.querySelector<HTMLElement>('[data-live-status-target]');
      if (target) {
        result.target = target;
        result.section = 'participants';
        return result;
      }
      // Use the card itself as fallback
      result.target = participantCard;
      result.section = 'participants';
      return result;
    }
  }

  // Try section-specific target
  const normalizedSection = section as AgreementLiveSection;
  if (normalizedSection && SECTION_TARGET_SELECTORS[normalizedSection]) {
    const sectionTarget = document.querySelector<HTMLElement>(
      SECTION_TARGET_SELECTORS[normalizedSection]
    );
    if (sectionTarget) {
      result.target = sectionTarget;
      result.section = normalizedSection;
      return result;
    }

    // Try section fallback container
    const fallbackContainer = document.querySelector<HTMLElement>(
      SECTION_FALLBACK_SELECTORS[normalizedSection]
    );
    if (fallbackContainer) {
      // Look for existing status target or the container's header
      const headerTarget = fallbackContainer.querySelector<HTMLElement>(
        '[data-live-status-target], .flex.items-center.justify-between'
      );
      if (headerTarget) {
        result.target = headerTarget;
        result.section = normalizedSection;
        return result;
      }
    }
  }

  // Page-level fallback
  if (config.usePageFallback) {
    const pageTarget = document.querySelector<HTMLElement>(PAGE_STATUS_TARGET);
    if (pageTarget) {
      result.target = pageTarget;
      return result;
    }
  }

  return result;
}

/**
 * Map command name to relevant section(s)
 */
export function commandToSection(commandName: string): AgreementLiveSection | null {
  const name = String(commandName || '').toLowerCase();

  // Review-related commands
  if (
    name.includes('review') ||
    name.includes('approve') ||
    name.includes('request_changes') ||
    name.includes('force_approve')
  ) {
    return 'review_status';
  }

  // Participant-related commands
  if (
    name.includes('participant') ||
    name.includes('notify_reviewer') ||
    name.includes('reminder') ||
    name.includes('on_behalf')
  ) {
    return 'participants';
  }

  // Comment-related commands
  if (name.includes('comment') || name.includes('thread') || name.includes('reply')) {
    return 'comments';
  }

  // Delivery-related commands
  if (
    name.includes('resend') ||
    name.includes('delivery') ||
    name.includes('email') ||
    name.includes('send')
  ) {
    return 'delivery';
  }

  // Artifact-related commands
  if (
    name.includes('artifact') ||
    name.includes('job') ||
    name.includes('retry_job') ||
    name.includes('retry_artifact')
  ) {
    return 'artifacts';
  }

  return null;
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Create inline status element
 */
export function createStatusElement(
  entry: InlineStatusEntry,
  correlationId: string
): HTMLElement {
  const config = STATUS_DISPLAY[entry.state];
  const text = entry.message || config.text;

  const container = document.createElement('span');
  container.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${config.colorClass}`;
  container.setAttribute('data-inline-status', correlationId);
  container.setAttribute('data-status-state', entry.state);
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', config.ariaLive);

  const iconHtml = ICON_TEMPLATES[config.icon] || '';
  container.innerHTML = `${iconHtml}<span class="inline-status-text">${escapeHtml(text)}</span>`;

  return container;
}

/**
 * Update existing status element with new state
 */
export function updateStatusElement(
  element: HTMLElement,
  entry: InlineStatusEntry
): void {
  const config = STATUS_DISPLAY[entry.state];
  const text = entry.message || config.text;

  element.setAttribute('data-status-state', entry.state);
  element.setAttribute('aria-live', config.ariaLive);

  // Update classes
  element.className = `inline-status inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${config.colorClass}`;

  // Update content
  const iconHtml = ICON_TEMPLATES[config.icon] || '';
  element.innerHTML = `${iconHtml}<span class="inline-status-text">${escapeHtml(text)}</span>`;
}

/**
 * Remove status element from DOM
 */
export function removeStatusElement(correlationId: string): void {
  const element = document.querySelector<HTMLElement>(`[data-inline-status="${correlationId}"]`);
  if (element) {
    element.remove();
  }
}

/**
 * Clear all inline status elements
 */
export function clearAllStatusElements(): void {
  document.querySelectorAll<HTMLElement>('[data-inline-status]').forEach((el) => el.remove());
}

/**
 * Clear stale status elements (completed/failed that are old)
 */
export function clearStaleStatusElements(maxAgeMs: number = 5000): void {
  const now = Date.now();
  document.querySelectorAll<HTMLElement>('[data-inline-status]').forEach((el) => {
    const state = el.getAttribute('data-status-state');
    const timestamp = parseInt(el.getAttribute('data-status-timestamp') || '0', 10);
    if (
      (state === 'completed' || state === 'failed') &&
      timestamp > 0 &&
      now - timestamp > maxAgeMs
    ) {
      el.remove();
    }
  });
}

// =============================================================================
// Status Manager Class
// =============================================================================

/**
 * Manages inline status display for a page.
 * Handles status rendering, target resolution, and cleanup.
 */
export class InlineStatusManager {
  private readonly config: InlineStatusConfig;
  private readonly clearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(config: Partial<InlineStatusConfig> = {}) {
    this.config = { ...DEFAULT_INLINE_STATUS_CONFIG, ...config };
  }

  /**
   * Handle a status change event from the command runtime
   */
  handleStatusChange(event: InlineStatusChangeEvent): void {
    const { entry } = event;

    // Clear any existing timer for this correlation ID
    this.clearTimer(entry.correlationId);

    // Resolve target
    const section = entry.section || commandToSection(entry.commandName);
    const { target } = resolveStatusTarget(section, entry.participantId, this.config);

    if (!target) {
      return;
    }

    // Find or create status element
    const existingElement = document.querySelector<HTMLElement>(
      `[data-inline-status="${entry.correlationId}"]`
    );

    if (existingElement) {
      updateStatusElement(existingElement, entry);
    } else {
      const newElement = createStatusElement(entry, entry.correlationId);
      newElement.setAttribute('data-status-timestamp', String(entry.timestamp));
      this.insertStatusElement(target, newElement);
    }

    // Schedule auto-clear for terminal states
    if (entry.state === 'completed' && this.config.completedClearDelay > 0) {
      this.scheduleRemoval(entry.correlationId, this.config.completedClearDelay);
    } else if (entry.state === 'failed' && this.config.failedClearDelay > 0) {
      this.scheduleRemoval(entry.correlationId, this.config.failedClearDelay);
    }
  }

  /**
   * Clear all statuses and timers
   */
  clear(): void {
    this.clearTimers.forEach((timer) => clearTimeout(timer));
    this.clearTimers.clear();
    clearAllStatusElements();
  }

  /**
   * Clear completed/failed statuses that may have lingered
   */
  clearTerminalStatuses(): void {
    document.querySelectorAll<HTMLElement>('[data-inline-status]').forEach((el) => {
      const state = el.getAttribute('data-status-state');
      if (state === 'completed' || state === 'failed') {
        el.remove();
      }
    });
  }

  /**
   * Called after a fragment refresh to clean up stale statuses
   */
  reconcileAfterRefresh(): void {
    // Remove any statuses that are in completed/failed state
    // as the refreshed content should reflect the final state
    this.clearTerminalStatuses();

    // Clear stale indicators
    clearStaleStatusElements(1000);
  }

  private insertStatusElement(target: HTMLElement, element: HTMLElement): void {
    // Check if target has a specific insertion point
    const insertionPoint = target.querySelector<HTMLElement>('[data-live-status-insert]');
    if (insertionPoint) {
      insertionPoint.appendChild(element);
      return;
    }

    // Check if target is a flex container with existing badges - insert before them
    const existingBadges = target.querySelectorAll<HTMLElement>('.inline-flex.items-center.rounded-full');
    if (existingBadges.length > 0) {
      const firstBadge = existingBadges[0];
      firstBadge.parentElement?.insertBefore(element, firstBadge);
      return;
    }

    // Default: append to target
    target.appendChild(element);
  }

  private scheduleRemoval(correlationId: string, delayMs: number): void {
    this.clearTimer(correlationId);
    const timer = setTimeout(() => {
      removeStatusElement(correlationId);
      this.clearTimers.delete(correlationId);
    }, delayMs);
    this.clearTimers.set(correlationId, timer);
  }

  private clearTimer(correlationId: string): void {
    const existing = this.clearTimers.get(correlationId);
    if (existing) {
      clearTimeout(existing);
      this.clearTimers.delete(correlationId);
    }
  }
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create and initialize an inline status manager
 */
export function createInlineStatusManager(
  config?: Partial<InlineStatusConfig>
): InlineStatusManager {
  return new InlineStatusManager(config);
}

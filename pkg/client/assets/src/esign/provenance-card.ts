/**
 * Provenance Card Interactivity
 *
 * Handles interactive behaviors for provenance/lineage cards:
 * - Evidence list collapsible toggle
 * - Accessibility announcements
 * - Fingerprint status polling (optional)
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 9 Task 9.5-9.8
 */

import { qsa, on, announce } from './utils/dom-helpers.js';

// ============================================================================
// Constants
// ============================================================================

/** Selector for provenance card containers */
export const PROVENANCE_CARD_SELECTOR = '[data-lineage-card]';

/** Selector for evidence toggle buttons */
export const EVIDENCE_TOGGLE_SELECTOR = '[data-evidence-toggle]';

/** Selector for collapsed evidence items */
export const EVIDENCE_COLLAPSED_SELECTOR = '[data-evidence-item="collapsed"]';

/** Selector for evidence containers */
export const EVIDENCE_CONTAINER_SELECTOR = '[data-evidence-container]';

// ============================================================================
// Evidence Toggle Functionality
// ============================================================================

/**
 * Initialize evidence toggle for a single container.
 * Handles show/hide of collapsed evidence items with accessibility.
 */
export function initEvidenceToggle(container: HTMLElement): void {
  const toggleBtn = container.querySelector<HTMLButtonElement>(EVIDENCE_TOGGLE_SELECTOR);
  if (!toggleBtn) return;

  const collapsedItems = container.querySelectorAll<HTMLElement>(EVIDENCE_COLLAPSED_SELECTOR);
  if (collapsedItems.length === 0) return;

  // Store original button text
  const originalText = toggleBtn.textContent?.trim() || '';
  const itemCount = collapsedItems.length;

  const cleanup = on(toggleBtn, 'click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      // Collapse items
      collapsedItems.forEach((item) => {
        item.classList.add('hidden');
      });
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = originalText;
      announce(`Collapsed ${itemCount} evidence items`);
    } else {
      // Expand items
      collapsedItems.forEach((item) => {
        item.classList.remove('hidden');
      });
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = `Show fewer items`;
      announce(`Showing all ${itemCount} additional evidence items`);
    }
  });

  // Store cleanup function on the element for potential teardown
  (toggleBtn as unknown as { _evidenceToggleCleanup?: () => void })._evidenceToggleCleanup = cleanup;
}

/**
 * Initialize all evidence toggles on the page.
 */
export function initAllEvidenceToggles(): void {
  const containers = qsa(EVIDENCE_CONTAINER_SELECTOR);
  containers.forEach((container) => {
    if (container instanceof HTMLElement) {
      initEvidenceToggle(container);
    }
  });
}

// ============================================================================
// Provenance Card Initialization
// ============================================================================

/**
 * Configuration for provenance card initialization.
 */
export interface ProvenanceCardConfig {
  /** Enable evidence toggle functionality */
  enableEvidenceToggle?: boolean;
  /** Enable fingerprint status polling */
  enableFingerprintPolling?: boolean;
  /** Fingerprint polling interval in ms */
  fingerprintPollInterval?: number;
  /** Root element to search within (defaults to document) */
  root?: Element | Document;
}

/**
 * Default configuration for provenance cards.
 * Note: `root` defaults to `document` at runtime via lazy evaluation to support Node.js testing.
 */
export const DEFAULT_PROVENANCE_CARD_CONFIG: Omit<Required<ProvenanceCardConfig>, 'root'> & { root: Element | Document | null } = {
  enableEvidenceToggle: true,
  enableFingerprintPolling: false,
  fingerprintPollInterval: 5000,
  root: null, // Lazily defaults to document in initProvenanceCards
};

/**
 * Initialize provenance card interactivity.
 *
 * @param config - Configuration options
 */
export function initProvenanceCards(config: ProvenanceCardConfig = {}): void {
  const opts = { ...DEFAULT_PROVENANCE_CARD_CONFIG, ...config };

  if (opts.enableEvidenceToggle) {
    // Lazily default to document for browser environment
    const root = opts.root ?? (typeof document !== 'undefined' ? document : null);
    if (!root) return;
    const containers = root.querySelectorAll(EVIDENCE_CONTAINER_SELECTOR);
    containers.forEach((container) => {
      if (container instanceof HTMLElement) {
        initEvidenceToggle(container);
      }
    });
  }
}

// ============================================================================
// Auto-initialization
// ============================================================================

/**
 * Bootstrap provenance cards on DOM ready.
 * Call this from your page script to enable all provenance interactivity.
 */
export function bootstrapProvenanceCards(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initProvenanceCards();
    });
  } else {
    initProvenanceCards();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all provenance cards on the page.
 */
export function getProvenanceCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(PROVENANCE_CARD_SELECTOR));
}

/**
 * Get the provenance card containing a specific element.
 */
export function getProvenanceCardFor(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>(PROVENANCE_CARD_SELECTOR);
}

/**
 * Check if a provenance card has warnings.
 */
export function hasWarnings(card: HTMLElement): boolean {
  return card.querySelector('[data-lineage-warnings]') !== null;
}

/**
 * Check if a provenance card shows an empty state.
 */
export function hasEmptyState(card: HTMLElement): boolean {
  return card.querySelector('[data-lineage-empty-state]') !== null;
}

/**
 * Get the lineage status from a provenance card.
 */
export function getLineageStatus(card: HTMLElement): string | null {
  return card.getAttribute('data-lineage-status');
}

/**
 * Get the resource kind from a provenance card.
 */
export function getResourceKind(card: HTMLElement): string | null {
  return card.getAttribute('data-lineage-kind');
}

/**
 * Accessibility Utilities Module
 * Provides keyboard navigation, focus management, and screen-reader support
 * for the services module UI components.
 *
 * Usage:
 *   import { setupKeyboardNavigation, announceToScreenReader } from './accessibility.js';
 *
 *   // Enable keyboard navigation on a list
 *   setupKeyboardNavigation({
 *     container: tableElement,
 *     selector: 'tr[data-row-id]',
 *     onSelect: (element) => handleRowSelect(element),
 *   });
 *
 *   // Announce state changes to screen readers
 *   announceToScreenReader('Connection refreshed successfully');
 */

// =============================================================================
// Types
// =============================================================================

/** Configuration for keyboard navigation on lists/tables */
export interface KeyboardNavigationConfig {
  /** Container element for the navigable items */
  container: HTMLElement;
  /** Selector for navigable items within the container */
  selector: string;
  /** Called when an item is selected via Enter/Space */
  onSelect?: (element: HTMLElement, index: number) => void;
  /** Called when an item receives focus */
  onFocus?: (element: HTMLElement, index: number) => void;
  /** Called when Escape is pressed */
  onEscape?: () => void;
  /** Whether navigation wraps from last to first item (default: true) */
  wrap?: boolean;
  /** Whether to auto-focus first item on init (default: false) */
  autoFocus?: boolean;
  /** Custom key handlers */
  keyHandlers?: Record<string, (event: KeyboardEvent, element: HTMLElement, index: number) => void>;
}

/** Configuration for focus trap (e.g., in modals) */
export interface FocusTrapConfig {
  /** Container element to trap focus within */
  container: HTMLElement;
  /** Initial element to focus (default: first focusable) */
  initialFocus?: HTMLElement | string;
  /** Element to return focus to on close */
  returnFocus?: HTMLElement;
  /** Called when Escape is pressed */
  onEscape?: () => void;
}

/** Options for screen reader announcements */
export interface AnnounceOptions {
  /** Announcement priority: 'polite' or 'assertive' (default: 'polite') */
  priority?: 'polite' | 'assertive';
  /** Clear previous announcement before new one (default: true) */
  clear?: boolean;
}

// =============================================================================
// Keyboard Navigation
// =============================================================================

/**
 * Set up keyboard navigation for a list/table of items.
 * Supports Arrow keys for navigation, Enter/Space for selection, Home/End for jump.
 */
export function setupKeyboardNavigation(config: KeyboardNavigationConfig): () => void {
  const {
    container,
    selector,
    onSelect,
    onFocus,
    onEscape,
    wrap = true,
    autoFocus = false,
    keyHandlers = {},
  } = config;

  let currentIndex = -1;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(selector));
  }

  function focusItem(index: number): void {
    const items = getItems();
    if (items.length === 0) return;

    // Clamp or wrap index
    let targetIndex = index;
    if (wrap) {
      targetIndex = ((index % items.length) + items.length) % items.length;
    } else {
      targetIndex = Math.max(0, Math.min(index, items.length - 1));
    }

    // Update tabindex on all items
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === targetIndex ? '0' : '-1');
    });

    // Focus the target item
    const targetItem = items[targetIndex];
    targetItem.focus();
    currentIndex = targetIndex;

    onFocus?.(targetItem, targetIndex);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const items = getItems();
    if (items.length === 0) return;

    const target = event.target as HTMLElement;
    const itemIndex = items.indexOf(target);

    // Only handle if focus is on a navigable item
    if (itemIndex === -1) return;

    // Custom key handlers first
    if (keyHandlers[event.key]) {
      keyHandlers[event.key](event, target, itemIndex);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        focusItem(itemIndex + 1);
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        focusItem(itemIndex - 1);
        break;

      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;

      case 'End':
        event.preventDefault();
        focusItem(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(target, itemIndex);
        break;

      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
    }
  }

  // Initialize tabindex on items
  const items = getItems();
  items.forEach((item, i) => {
    item.setAttribute('tabindex', i === 0 ? '0' : '-1');
    // Ensure items have appropriate role
    if (!item.hasAttribute('role')) {
      item.setAttribute('role', 'option');
    }
  });

  // Set container role if not already set
  if (!container.hasAttribute('role')) {
    container.setAttribute('role', 'listbox');
  }

  // Add event listener
  container.addEventListener('keydown', handleKeyDown);

  // Auto-focus first item if requested
  if (autoFocus && items.length > 0) {
    focusItem(0);
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Set up roving tabindex for a toolbar or button group.
 */
export function setupRovingTabindex(
  container: HTMLElement,
  selector: string
): () => void {
  return setupKeyboardNavigation({
    container,
    selector,
    wrap: true,
    onSelect: (element) => {
      element.click();
    },
  });
}

// =============================================================================
// Focus Trap
// =============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Create a focus trap that keeps focus within a container (e.g., modal).
 * Returns a cleanup function to release the trap.
 */
export function createFocusTrap(config: FocusTrapConfig): () => void {
  const { container, initialFocus, returnFocus, onEscape } = config;

  const previouslyFocused = document.activeElement as HTMLElement;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: going backward
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: going forward
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  // Focus initial element
  requestAnimationFrame(() => {
    if (initialFocus) {
      const target = typeof initialFocus === 'string'
        ? container.querySelector<HTMLElement>(initialFocus)
        : initialFocus;
      target?.focus();
    } else {
      const focusables = getFocusableElements();
      focusables[0]?.focus();
    }
  });

  // Add trap handler
  container.addEventListener('keydown', handleKeyDown);

  // Mark container as a dialog for accessibility
  if (!container.hasAttribute('role')) {
    container.setAttribute('role', 'dialog');
  }
  container.setAttribute('aria-modal', 'true');

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    container.removeAttribute('aria-modal');

    // Return focus to previous element
    const focusTarget = returnFocus || previouslyFocused;
    focusTarget?.focus?.();
  };
}

// =============================================================================
// Screen Reader Announcements
// =============================================================================

let liveRegion: HTMLElement | null = null;

/**
 * Get or create the live region for screen reader announcements.
 */
function getLiveRegion(priority: 'polite' | 'assertive'): HTMLElement {
  const id = `services-live-region-${priority}`;
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    region.className = 'sr-only';
    // Visually hidden but accessible
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(region);
  }

  return region;
}

/**
 * Announce a message to screen readers via ARIA live region.
 */
export function announceToScreenReader(
  message: string,
  options: AnnounceOptions = {}
): void {
  const { priority = 'polite', clear = true } = options;

  const region = getLiveRegion(priority);

  if (clear) {
    region.textContent = '';
  }

  // Use setTimeout to ensure the browser picks up the change
  setTimeout(() => {
    region.textContent = message;
  }, 100);
}

/**
 * Announce loading state to screen readers.
 */
export function announceLoading(resource: string): void {
  announceToScreenReader(`Loading ${resource}...`, { priority: 'polite' });
}

/**
 * Announce successful action to screen readers.
 */
export function announceSuccess(message: string): void {
  announceToScreenReader(message, { priority: 'polite' });
}

/**
 * Announce error to screen readers.
 */
export function announceError(message: string): void {
  announceToScreenReader(`Error: ${message}`, { priority: 'assertive' });
}

/**
 * Announce navigation/page change to screen readers.
 */
export function announceNavigation(destination: string): void {
  announceToScreenReader(`Navigating to ${destination}`, { priority: 'polite' });
}

// =============================================================================
// ARIA Attribute Helpers
// =============================================================================

/**
 * Add ARIA attributes for a button that controls expanded/collapsed content.
 */
export function setExpandedState(
  trigger: HTMLElement,
  target: HTMLElement | string,
  expanded: boolean
): void {
  trigger.setAttribute('aria-expanded', String(expanded));

  const targetId = typeof target === 'string' ? target : target.id;
  if (targetId) {
    trigger.setAttribute('aria-controls', targetId);
  }
}

/**
 * Add ARIA attributes for a loading state.
 */
export function setLoadingState(element: HTMLElement, loading: boolean): void {
  element.setAttribute('aria-busy', String(loading));
  if (loading) {
    element.setAttribute('aria-describedby', 'loading-indicator');
  } else {
    element.removeAttribute('aria-describedby');
  }
}

/**
 * Add ARIA label for status badges/indicators.
 */
export function setStatusLabel(
  element: HTMLElement,
  status: string,
  statusLabel: string
): void {
  element.setAttribute('role', 'status');
  element.setAttribute('aria-label', `Status: ${statusLabel}`);
}

/**
 * Add ARIA attributes for sortable table headers.
 */
export function setSortableHeader(
  header: HTMLElement,
  sorted: 'ascending' | 'descending' | 'none'
): void {
  header.setAttribute('aria-sort', sorted);
  header.setAttribute('role', 'columnheader');
}

/**
 * Add ARIA attributes for a progress indicator.
 */
export function setProgress(
  element: HTMLElement,
  value: number,
  max: number = 100,
  label?: string
): void {
  element.setAttribute('role', 'progressbar');
  element.setAttribute('aria-valuenow', String(value));
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', String(max));
  if (label) {
    element.setAttribute('aria-label', label);
  }
}

// =============================================================================
// Skip Links
// =============================================================================

/**
 * Create a skip link for keyboard users to bypass navigation.
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg';
  link.textContent = label;
  return link;
}

// =============================================================================
// Focus Management for Dialogs
// =============================================================================

/**
 * Set up focus management for a modal dialog.
 * Returns a cleanup function.
 */
export function setupDialogFocus(
  dialog: HTMLElement,
  options: {
    title?: string;
    describedBy?: string;
    onClose?: () => void;
  } = {}
): () => void {
  const { title, describedBy, onClose } = options;

  // Set dialog attributes
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  if (title) {
    const titleId = `dialog-title-${Date.now()}`;
    const titleEl = dialog.querySelector('h1, h2, h3, [role="heading"]');
    if (titleEl) {
      titleEl.id = titleId;
      dialog.setAttribute('aria-labelledby', titleId);
    }
  }

  if (describedBy) {
    dialog.setAttribute('aria-describedby', describedBy);
  }

  // Create focus trap
  const releaseTrap = createFocusTrap({
    container: dialog,
    onEscape: onClose,
  });

  return () => {
    releaseTrap();
    dialog.removeAttribute('aria-modal');
    dialog.removeAttribute('aria-labelledby');
    dialog.removeAttribute('aria-describedby');
  };
}

// =============================================================================
// Reduced Motion Support
// =============================================================================

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate animation duration based on user preference.
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// =============================================================================
// Exports
// =============================================================================

export {
  setupKeyboardNavigation,
  setupRovingTabindex,
  createFocusTrap,
  announceToScreenReader,
  announceLoading,
  announceSuccess,
  announceError,
  announceNavigation,
  setExpandedState,
  setLoadingState,
  setStatusLabel,
  setSortableHeader,
  setProgress,
  createSkipLink,
  setupDialogFocus,
  prefersReducedMotion,
  getAnimationDuration,
  FOCUSABLE_SELECTOR,
};

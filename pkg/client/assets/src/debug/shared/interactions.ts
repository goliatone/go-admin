// Shared interaction helpers for debug panels
// Provides copy-to-clipboard, expand/collapse, and visual feedback utilities
// Used by both the full debug console and the debug toolbar

/**
 * Copy text to clipboard and provide visual feedback on the button.
 *
 * @param text - The text to copy to clipboard
 * @param button - The button element to update with feedback
 * @param options - Optional configuration for feedback behavior
 */
export type CopyFeedbackOptions = {
  /** Duration in ms to show the "Copied" feedback. Defaults to 1500. */
  feedbackDuration?: number;
  /** Use icon-based feedback (for console) vs SVG-based (for toolbar). Defaults to false. */
  useIconFeedback?: boolean;
  /** CSS class to add on success. Defaults to 'copied' for toolbar, 'debug-copy--success' for console. */
  successClass?: string;
  /** CSS class to add on error. Defaults to 'debug-copy--error'. */
  errorClass?: string;
};

/**
 * Copy text to clipboard with visual feedback on the button element.
 * Supports both console (icon-based) and toolbar (SVG-based) feedback styles.
 */
export async function copyToClipboard(
  text: string,
  button: HTMLElement,
  options: CopyFeedbackOptions = {}
): Promise<boolean> {
  const {
    feedbackDuration = 1500,
    useIconFeedback = false,
    successClass = useIconFeedback ? 'debug-copy--success' : 'copied',
    errorClass = 'debug-copy--error',
  } = options;

  try {
    await navigator.clipboard.writeText(text);

    const originalHTML = button.innerHTML;
    button.classList.add(successClass);

    if (useIconFeedback) {
      // Console-style feedback with iconoir icons
      button.innerHTML = '<i class="iconoir-check"></i> Copied';
    } else {
      // Toolbar-style feedback with inline SVG
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `;
    }

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove(successClass);
    }, feedbackDuration);

    return true;
  } catch {
    button.classList.add(errorClass);
    setTimeout(() => {
      button.classList.remove(errorClass);
    }, feedbackDuration);
    return false;
  }
}

/**
 * Attach copy-to-clipboard listeners to all buttons with [data-copy-trigger] attribute.
 * Buttons must be inside a container with [data-copy-content] attribute.
 *
 * @param root - The root element to search for copy triggers (e.g., panel container or shadow root)
 * @param options - Optional configuration for feedback behavior
 */
export function attachCopyListeners(
  root: ParentNode,
  options: CopyFeedbackOptions = {}
): void {
  root.querySelectorAll<HTMLButtonElement>('[data-copy-trigger]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const container = btn.closest('[data-copy-content]');
      if (!container) return;

      const content = container.getAttribute('data-copy-content') || '';
      await copyToClipboard(content, btn, options);
    });
  });
}

/**
 * Attach expand/collapse listeners to all rows with .expandable-row class.
 * Clicking a row toggles the 'expanded' class.
 *
 * @param root - The root element to search for expandable rows
 */
export function attachExpandableRowListeners(root: ParentNode): void {
  root.querySelectorAll('.expandable-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking on a link or button
      if (target.closest('a, button')) return;

      const rowEl = e.currentTarget as HTMLElement;
      rowEl.classList.toggle('expanded');
    });
  });
}

/**
 * Attach sort toggle listeners to checkboxes with [data-sort-toggle] attribute.
 * When the checkbox changes, calls the provided callback with panel ID and new state.
 *
 * @param root - The root element to search for sort toggles
 * @param onToggle - Callback function called when sort order changes
 */
export function attachSortToggleListeners(
  root: ParentNode,
  onToggle: (panelId: string, newestFirst: boolean) => void
): void {
  root.querySelectorAll<HTMLInputElement>('[data-sort-toggle]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const panelId = target.dataset.sortToggle;
      if (!panelId) return;

      onToggle(panelId, target.checked);
    });
  });
}

/**
 * Data attribute constants for copy/expand behaviors.
 * Using constants ensures consistency across console and toolbar.
 */
export const DATA_ATTRS = {
  /** Attribute for the copy button trigger */
  COPY_TRIGGER: 'data-copy-trigger',
  /** Attribute for the container holding the content to copy */
  COPY_CONTENT: 'data-copy-content',
  /** Attribute for row ID (used in SQL expandable rows) */
  ROW_ID: 'data-row-id',
  /** Attribute linking expansion row to its parent row */
  EXPANSION_FOR: 'data-expansion-for',
  /** Attribute for sort toggle checkbox */
  SORT_TOGGLE: 'data-sort-toggle',
} as const;

/**
 * CSS class constants for interactive states.
 */
export const INTERACTION_CLASSES = {
  /** Class for rows that can be expanded */
  EXPANDABLE_ROW: 'expandable-row',
  /** Class added when a row is expanded */
  EXPANDED: 'expanded',
  /** Class for the hidden expansion row */
  EXPANSION_ROW: 'expansion-row',
  /** Class for slow query rows */
  SLOW_QUERY: 'slow-query',
  /** Class for error query rows */
  ERROR_QUERY: 'error-query',
  /** Class for expand/collapse icon */
  EXPAND_ICON: 'expand-icon',
} as const;

/**
 * Generate HTML attributes for a copy button container.
 * Use this when rendering panel content to ensure proper data attributes.
 *
 * @param content - The content that will be copied
 * @returns The data-copy-content attribute string
 */
export function copyContentAttr(content: string): string {
  return `${DATA_ATTRS.COPY_CONTENT}="${escapeAttr(content)}"`;
}

/**
 * Generate HTML attributes for a copy trigger button.
 *
 * @param id - Optional ID for the trigger (useful for accessibility)
 * @returns The data-copy-trigger attribute string
 */
export function copyTriggerAttr(id?: string): string {
  return id ? `${DATA_ATTRS.COPY_TRIGGER}="${escapeAttr(id)}"` : DATA_ATTRS.COPY_TRIGGER;
}

/**
 * Generate HTML attributes for an expandable row.
 *
 * @param rowId - Unique ID for the row
 * @returns The data-row-id attribute string
 */
export function rowIdAttr(rowId: string): string {
  return `${DATA_ATTRS.ROW_ID}="${escapeAttr(rowId)}"`;
}

/**
 * Generate HTML attributes for an expansion row.
 *
 * @param forRowId - The row ID this expansion belongs to
 * @returns The data-expansion-for attribute string
 */
export function expansionForAttr(forRowId: string): string {
  return `${DATA_ATTRS.EXPANSION_FOR}="${escapeAttr(forRowId)}"`;
}

/**
 * Generate HTML attributes for a sort toggle checkbox.
 *
 * @param panelId - The panel ID this toggle controls
 * @returns The data-sort-toggle attribute string
 */
export function sortToggleAttr(panelId: string): string {
  return `${DATA_ATTRS.SORT_TOGGLE}="${escapeAttr(panelId)}"`;
}

/**
 * Escape a string for use in an HTML attribute value.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Initialize all interaction listeners on a root element.
 * This is a convenience function that attaches all listeners at once.
 *
 * @param root - The root element (panel container or shadow root)
 * @param options - Configuration options
 */
export function initInteractions(
  root: ParentNode,
  options: {
    copyOptions?: CopyFeedbackOptions;
    onSortToggle?: (panelId: string, newestFirst: boolean) => void;
  } = {}
): void {
  attachCopyListeners(root, options.copyOptions);
  attachExpandableRowListeners(root);
  if (options.onSortToggle) {
    attachSortToggleListeners(root, options.onSortToggle);
  }
}

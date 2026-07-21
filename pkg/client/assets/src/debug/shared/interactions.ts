// Shared interaction helpers for debug panels
// Provides copy-to-clipboard, expand/collapse, selection, and visual feedback utilities
// Used by both the full debug console and the debug toolbar

import type { SQLEntry } from './types.js';
import { formatDuration } from './utils.js';
import { escapeAttribute as escapeAttr } from '../../shared/html.js';
import { sqlRowKey } from './panels/sql.js';

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

const copyListenerRoots = new WeakSet<object>();

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
  if (copyListenerRoots.has(root)) return;
  copyListenerRoots.add(root);
  (root as ParentNode & EventTarget).addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('[data-copy-trigger]');
    if (!btn || !root.contains(btn)) return;
    // SQL copy buttons are owned by SqlLiveView (delegated, so newly streamed
    // rows work too). Skip them here to avoid double-binding/double-copy.
    if (btn.closest('[data-sql-table]')) return;
    // Request-detail copy buttons are owned by attachRequestDetailListeners
    // (delegated on [data-request-table]) so lazily-mounted detail buttons work.
    // Skip them here to avoid double-binding/double-copy.
    if (btn.closest('[data-request-table]')) return;
    e.preventDefault();
    e.stopPropagation();

    const container = btn.closest('[data-copy-content]');
    if (!container) return;

    const content = container.getAttribute('data-copy-content') || '';
    void copyToClipboard(content, btn, options);
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
    // Live-list panels (SQL, jserrors, ...) own their expansion via delegated,
    // id-keyed handlers (attachRowExpansion / SqlLiveView). Skip those rows here
    // to avoid double-toggling.
    if ((row as HTMLElement).closest('[data-sql-table], [data-live-list]')) return;
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking on a link, button, or input (e.g. checkbox)
      if (target.closest('a, button, input')) return;

      const rowEl = e.currentTarget as HTMLElement;
      rowEl.classList.toggle('expanded');
    });
  });
}

/**
 * Options for delegated, persistent row expansion.
 */
export type RowExpansionOptions = {
  /** Selector for the delegation root(s) within `root` (e.g. the live-list tbody). */
  tableSelector: string;
  /** Selector matching an expandable primary row (e.g. `tr.expandable-row`). */
  rowSelector: string;
  /** Attribute holding the row's stable key. */
  keyAttr: string;
  /** Persisted set of expanded keys (host-owned; mutated in place). */
  expanded: Set<string>;
};

/**
 * Attach delegated expand/collapse for keyed rows. Clicking an expandable row
 * toggles its `.expanded` class and records the stable key in `expanded`, so the
 * state survives incremental appends and full re-renders (pair with
 * `restoreRowExpansion` on adopt). This is the live-list counterpart to
 * `attachExpandableRowListeners`, which is per-row and not persisted.
 */
export function attachRowExpansion(root: ParentNode, options: RowExpansionOptions): void {
  const { tableSelector, rowSelector, keyAttr, expanded } = options;
  root.querySelectorAll<HTMLElement>(tableSelector).forEach((table) => {
    const toggle = (e: Event): void => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, input')) return;
      const row = target.closest<HTMLElement>(rowSelector);
      if (!row || !table.contains(row)) return;
      const key = row.getAttribute(keyAttr);
      if (!key) return;
      if (expanded.has(key)) {
        expanded.delete(key);
      } else {
        expanded.add(key);
      }
      restoreExpandedRow(row, expanded.has(key));
    };
    table.addEventListener('click', toggle);
    table.addEventListener('keydown', (e) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
      const target = keyboardEvent.target as HTMLElement;
      if (!target.matches(rowSelector)) return;
      keyboardEvent.preventDefault();
      toggle(e);
    });
  });
}

function restoreExpandedRow(row: HTMLElement, isExpanded: boolean): void {
  row.classList.toggle('expanded', isExpanded);
  if (row.hasAttribute('aria-expanded')) {
    row.setAttribute('aria-expanded', String(isExpanded));
  }
  const detail = row.nextElementSibling;
  if (detail?.classList.contains('expansion-row')) {
    detail.setAttribute('aria-hidden', String(!isExpanded));
  }
}

/**
 * Restore `.expanded` on keyed rows from the persisted `expanded` set. Call on
 * every adopt so a full re-render reflects prior expansion state.
 */
export function restoreRowExpansion(
  root: ParentNode,
  options: Pick<RowExpansionOptions, 'rowSelector' | 'keyAttr' | 'expanded'>
): void {
  const { rowSelector, keyAttr, expanded } = options;
  root.querySelectorAll<HTMLElement>(rowSelector).forEach((row) => {
    const key = row.getAttribute(keyAttr);
    restoreExpandedRow(row, !!key && expanded.has(key));
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

/**
 * Build export text from selected SQL entries, resolved by stable id so the
 * export matches the operator's visible selection even after the ring buffer
 * trims or reorders. Output stays in chronological (queries array) order.
 * Each query is preceded by a comment with metadata (duration, row count, error).
 */
export function buildSQLExportText(queries: SQLEntry[], selectedIds: Set<string>): string {
  const order = new Map<string, number>();
  const byKey = new Map<string, SQLEntry>();
  queries.forEach((q, i) => {
    const key = sqlRowKey(q);
    order.set(key, i);
    byKey.set(key, q);
  });

  return [...selectedIds]
    .filter((id) => byKey.has(id))
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .map((id) => byKey.get(id)!)
    .map((q) => {
      const dur = formatDuration(q.duration);
      let header = `-- Duration: ${dur.text} | Rows: ${q.row_count ?? 0}`;
      if (q.error) header += ` | Error: ${q.error}`;
      if (q.timestamp) header += ` | Time: ${q.timestamp}`;
      return `${header}\n${q.query || ''};`;
    })
    .join('\n\n');
}

/**
 * Trigger a browser file download with the given content.
 */
export function downloadAsFile(content: string, filename: string, mimeType = 'text/sql'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// SQL row selection, expansion, copy, and incremental updates are owned by
// `SqlLiveView` (./panels/sql-live-view.ts), which uses delegated listeners
// keyed by stable id so state survives live updates and full re-renders. The
// former per-row `attachSQLSelectionListeners` helper was removed in favor of
// that controller; `buildSQLExportText` and `downloadAsFile` remain here as the
// shared export primitives the controller calls.

/**
 * Attach expand/collapse listeners for request detail rows.
 * Uses delegated click handling on the table element.
 * Tracks expanded state in the provided Set so re-renders preserve state.
 *
 * @param root - The root element to search for request tables
 * @param expandedIds - Set of expanded request IDs (mutated in place)
 * @param copyOptions - Clipboard feedback style for detail copy buttons
 */
export function attachRequestDetailListeners(
  root: ParentNode,
  expandedIds: Set<string>,
  copyOptions: CopyFeedbackOptions = {}
): void {
  root.querySelectorAll<HTMLTableElement>('[data-request-table]').forEach((table) => {
    table.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Request/response body copy button (lives inside the lazily-mounted detail
      // pane). Handled here via delegation so copy works even though the detail
      // content is mounted from a <template> after this listener was attached.
      const copyBtn = target.closest<HTMLElement>('[data-copy-trigger]');
      if (copyBtn && table.contains(copyBtn)) {
        e.preventDefault();
        e.stopPropagation();
        const container = copyBtn.closest('[data-copy-content]');
        const content = container?.getAttribute('data-copy-content') || '';
        void copyToClipboard(content, copyBtn, copyOptions);
        return;
      }

      // Ignore clicks on interactive elements or inside the detail pane
      if (target.closest('button, a, input, [data-detail-for]')) return;

      // Find the closest summary row with data-request-id
      const row = target.closest<HTMLElement>('[data-request-id]');
      if (!row) return;

      const requestId = row.dataset.requestId;
      if (!requestId) return;

      // The detail row is always the next sibling
      const detailRow = row.nextElementSibling as HTMLElement | null;
      if (
        !detailRow ||
        !detailRow.hasAttribute('data-detail-for') ||
        detailRow.dataset.detailFor !== requestId
      ) {
        return;
      }

      // Lazy-mount detail content from template to avoid table parser side effects
      const detailTemplate = detailRow.querySelector<HTMLTemplateElement>('[data-request-detail-template]');
      if (detailTemplate) {
        const cell = detailRow.querySelector('td');
        if (cell) {
          cell.appendChild(detailTemplate.content.cloneNode(true));
          detailTemplate.remove();
        }
      }

      // Find the expand icon in this row
      const icon = row.querySelector<HTMLElement>('[data-expand-icon]');

      // Toggle expanded state
      if (expandedIds.has(requestId)) {
        expandedIds.delete(requestId);
        detailRow.style.display = 'none';
        if (icon) icon.textContent = '\u25B6'; // ▶
      } else {
        expandedIds.add(requestId);
        detailRow.style.display = 'table-row';
        if (icon) icon.textContent = '\u25BC'; // ▼
      }
    });
  });
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
  // SQL selection/expansion is initialized via SqlLiveView, not here.
}

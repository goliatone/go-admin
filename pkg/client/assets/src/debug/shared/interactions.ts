// Shared interaction helpers for debug panels
// Provides copy-to-clipboard, expand/collapse, selection, and visual feedback utilities
// Used by both the full debug console and the debug toolbar

import type { SQLEntry } from './types.js';
import { formatDuration } from './utils.js';

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
      // Don't toggle if clicking on a link, button, or input (e.g. checkbox)
      if (target.closest('a, button, input')) return;

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
 * Build export text from selected SQL entries.
 * Each query is preceded by a comment with metadata (duration, row count, error).
 */
export function buildSQLExportText(queries: SQLEntry[], selected: Set<number>): string {
  return [...selected]
    .sort((a, b) => a - b)
    .map((i) => queries[i])
    .filter(Boolean)
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

/**
 * Attach selection listeners for the SQL panel.
 * Manages checkbox selection, toolbar visibility, copy-to-clipboard, and download.
 *
 * @param root - The root element to search for SQL selection controls
 * @param queries - The SQL entries array (in the same order as rendered)
 * @param copyOptions - Feedback options for the clipboard copy button
 */
export function attachSQLSelectionListeners(
  root: ParentNode,
  queries: SQLEntry[],
  copyOptions: CopyFeedbackOptions = {}
): void {
  const selected = new Set<number>();
  const toolbar = root.querySelector<HTMLElement>('[data-sql-toolbar]');
  const countEl = root.querySelector('[data-sql-selected-count]');
  const selectAll = root.querySelector<HTMLInputElement>('.sql-select-all');
  const rowCheckboxes = root.querySelectorAll<HTMLInputElement>('.sql-select-row');

  if (!toolbar || rowCheckboxes.length === 0) return;

  function updateToolbar(): void {
    if (!toolbar) return;
    const count = selected.size;
    toolbar.dataset.visible = count > 0 ? 'true' : 'false';
    if (countEl) {
      countEl.textContent = `${count} selected`;
    }
    // Sync select-all checkbox state
    if (selectAll) {
      selectAll.checked = count > 0 && count === rowCheckboxes.length;
      selectAll.indeterminate = count > 0 && count < rowCheckboxes.length;
    }
  }

  // Individual row checkboxes
  rowCheckboxes.forEach((cb) => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent row expand/collapse
    });
    cb.addEventListener('change', () => {
      const idx = parseInt(cb.dataset.sqlIndex || '', 10);
      if (Number.isNaN(idx)) return;
      if (cb.checked) {
        selected.add(idx);
      } else {
        selected.delete(idx);
      }
      updateToolbar();
    });
  });

  // Select all checkbox
  if (selectAll) {
    selectAll.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    selectAll.addEventListener('change', () => {
      rowCheckboxes.forEach((cb) => {
        cb.checked = selectAll.checked;
        const idx = parseInt(cb.dataset.sqlIndex || '', 10);
        if (Number.isNaN(idx)) return;
        if (selectAll.checked) {
          selected.add(idx);
        } else {
          selected.delete(idx);
        }
      });
      updateToolbar();
    });
  }

  // Copy to clipboard
  root.querySelector('[data-sql-export="clipboard"]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (selected.size === 0) return;
    const text = buildSQLExportText(queries, selected);
    const btn = e.currentTarget as HTMLElement;
    await copyToClipboard(text, btn, copyOptions);
  });

  // Download as .sql file
  root.querySelector('[data-sql-export="download"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (selected.size === 0) return;
    const text = buildSQLExportText(queries, selected);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadAsFile(text, `sql-queries-${ts}.sql`);
  });

  // Clear selection
  root.querySelector('[data-sql-clear-selection]')?.addEventListener('click', (e) => {
    e.preventDefault();
    selected.clear();
    rowCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
    updateToolbar();
  });
}

/**
 * Attach expand/collapse listeners for request detail rows.
 * Uses delegated click handling on the table element.
 * Tracks expanded state in the provided Set so re-renders preserve state.
 *
 * @param root - The root element to search for request tables
 * @param expandedIds - Set of expanded request IDs (mutated in place)
 */
export function attachRequestDetailListeners(
  root: ParentNode,
  expandedIds: Set<string>
): void {
  root.querySelectorAll<HTMLTableElement>('[data-request-table]').forEach((table) => {
    table.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

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
    sqlQueries?: SQLEntry[];
  } = {}
): void {
  attachCopyListeners(root, options.copyOptions);
  attachExpandableRowListeners(root);
  if (options.onSortToggle) {
    attachSortToggleListeners(root, options.onSortToggle);
  }
  if (options.sqlQueries) {
    attachSQLSelectionListeners(root, options.sqlQueries, options.copyOptions);
  }
}

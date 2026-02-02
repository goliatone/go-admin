/**
 * Shared Entity Header
 *
 * Renders a consistent header bar for both the Block Editor Panel
 * and Content Type Editor. Supports save state indicators, status
 * badges, version labels, and action button slots.
 *
 * Layout variants:
 *   compact (Block Editor):  name + subtitle left, save indicator + status right
 *   standard (Content Type): title + status + version left, actions right
 */

import { badge } from '../../shared/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface EntityHeaderConfig {
  /** Primary name/title displayed in the header */
  name: string;
  /** Secondary line (slug, description, editing target) */
  subtitle?: string;
  /** Render subtitle in monospace font (true for slugs/types) */
  subtitleMono?: boolean;
  /** Status badge value (draft, published, etc.) */
  status?: string;
  /** Version label (displayed as "vX.Y") */
  version?: string;
  /** Current save state */
  saveState?: SaveState;
  /** Error message for save failures (shown as tooltip) */
  saveMessage?: string;
  /** Pre-rendered HTML for action buttons/dropdowns */
  actions?: string;
  /** Compact mode: smaller padding, h2 title (block editor vs content type) */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Escape Helper
// ---------------------------------------------------------------------------

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Save Indicator (standalone — used by updateSaveState for in-place updates)
// ---------------------------------------------------------------------------

/**
 * Render a save state indicator pill.
 *
 * Returns empty string for 'idle' state. Exported standalone so
 * callers can update the indicator in-place without a full re-render.
 */
export function renderSaveIndicator(state: SaveState, message?: string): string {
  switch (state) {
    case 'saving':
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
        <span class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
        Saving\u2026
      </span>`;
    case 'saved':
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-md">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Saved
      </span>`;
    case 'error':
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md"${message ? ` title="${esc(message)}"` : ''}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Save failed
      </span>`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Entity Header
// ---------------------------------------------------------------------------

/**
 * Render a shared entity header bar.
 *
 * In **compact** mode (Block Editor):
 *   Left:  h2 name + mono subtitle
 *   Right: save indicator → status badge
 *
 * In **standard** mode (Content Type Editor):
 *   Left:  h1 name + status badge + version (row), subtitle below
 *   Right: save indicator + actions slot
 */
export function renderEntityHeader(config: EntityHeaderConfig): string {
  const {
    name,
    subtitle,
    subtitleMono = false,
    status,
    version,
    saveState = 'idle',
    saveMessage,
    actions,
    compact = false,
  } = config;

  const px = compact ? 'px-5' : 'px-6';
  const tag = compact ? 'h2' : 'h1';
  const titleSize = compact ? 'text-lg' : 'text-xl';
  const gap = compact ? 'gap-2.5' : 'gap-3';

  const saveHtml = renderSaveIndicator(saveState, saveMessage);

  // Status badge HTML
  const statusBadgeHtml = status
    ? badge(
        compact ? status : status.charAt(0).toUpperCase() + status.slice(1),
        'status',
        status,
        compact ? { uppercase: true, attrs: { 'data-entity-status-badge': '' } } : { attrs: { 'data-entity-status-badge': '' } },
      )
    : '';

  // Version label
  const versionHtml = version
    ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${esc(version)}</span>`
    : '';

  // Subtitle line
  const subtitleHtml = subtitle
    ? `<p class="${subtitleMono ? 'text-[11px] font-mono text-gray-400 dark:text-gray-500' : 'text-sm text-gray-500 dark:text-gray-400'} mt-0.5 truncate">${esc(subtitle)}</p>`
    : '';

  if (compact) {
    // Block Editor layout: name left, indicators right
    return `
      <div class="${px} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <${tag} class="${titleSize} font-semibold text-gray-900 dark:text-white truncate leading-snug" data-entity-name>${esc(name)}</${tag}>
          ${subtitleHtml}
        </div>
        <div class="flex items-center ${gap} shrink-0">
          <span data-entity-save-indicator>${saveHtml}</span>
          ${statusBadgeHtml}
          ${actions || ''}
        </div>
      </div>`;
  }

  // Standard layout: title row with badge + version, actions on right
  return `
    <div class="${px} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <${tag} class="${titleSize} font-semibold text-gray-900 dark:text-white" data-entity-name>${esc(name)}</${tag}>
          ${statusBadgeHtml}
          ${versionHtml}
        </div>
        ${subtitleHtml}
      </div>
      <div class="flex items-center ${gap}">
        <span data-entity-save-indicator>${saveHtml}</span>
        ${actions || ''}
      </div>
    </div>`;
}

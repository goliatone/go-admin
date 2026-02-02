/**
 * Shared Block Picker
 *
 * Extracted from field-config-form.ts BlockPickerModal.
 * Provides reusable block loading, normalization, and inline rendering
 * for both the expanded field card (block-editor-panel) and the
 * FieldConfigForm modal.
 */

import type { BlockDefinitionSummary } from '../types';
import type { ContentTypeAPIClient } from '../api-client';
import { checkboxClasses } from './field-input-classes';
import { resolveIcon } from './icon-picker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InlineBlockPickerConfig {
  /** Available blocks (call loadAvailableBlocks first) */
  availableBlocks: BlockDefinitionSummary[];
  /** Currently selected block keys */
  selectedBlocks: Set<string>;
  /** Optional search filter */
  searchQuery?: string;
  /** Callback when selection changes */
  onSelectionChange: (selected: Set<string>) => void;
  /** Label shown above the list (default: "Allowed Blocks") */
  label?: string;
  /** Color accent: 'blue' for allowed, 'red' for denied */
  accent?: 'blue' | 'red';
  /** Optional label when selection is empty (e.g., "All blocks allowed") */
  emptySelectionText?: string;
}

// ---------------------------------------------------------------------------
// Block Loading
// ---------------------------------------------------------------------------

/**
 * Load available block definitions from the API.
 * Returns empty array on failure (graceful degradation).
 */
export async function loadAvailableBlocks(api: ContentTypeAPIClient): Promise<BlockDefinitionSummary[]> {
  try {
    return await api.listBlockDefinitionsSummary();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Block Key + Normalization
// ---------------------------------------------------------------------------

/** Canonical key for a block: prefers slug, falls back to type */
export function blockKey(block: BlockDefinitionSummary): string {
  return (block.slug || block.type || '').trim();
}

/**
 * Normalize a set of selected block keys against the available blocks.
 * Handles legacy type-based keys by mapping them to slugs.
 */
export function normalizeBlockSelection(
  selected: Set<string>,
  available: BlockDefinitionSummary[],
): Set<string> {
  if (selected.size === 0 || available.length === 0) return new Set(selected);

  const normalized = new Set<string>();
  const mappedLegacy = new Set<string>();

  for (const block of available) {
    const key = blockKey(block);
    if (!key) continue;
    const hasKey = selected.has(key);
    const hasType = selected.has(block.type);
    if (hasKey || hasType) {
      normalized.add(key);
      if (hasType && block.slug && block.slug !== block.type) {
        mappedLegacy.add(block.type);
      }
    }
  }

  // Keep any keys that weren't mapped (may reference blocks not yet loaded)
  for (const value of selected) {
    if (mappedLegacy.has(value)) continue;
    if (!normalized.has(value)) {
      normalized.add(value);
    }
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Inline Renderer
// ---------------------------------------------------------------------------

/**
 * Render an inline block picker (checkbox list with search).
 * Designed for use inside an expanded field card.
 */
export function renderInlineBlockPicker(config: InlineBlockPickerConfig): string {
  const { availableBlocks, selectedBlocks, searchQuery } = config;
  const accent = config.accent ?? 'blue';
  const label = config.label ?? 'Allowed Blocks';
  const emptySelectionText = config.emptySelectionText;

  if (availableBlocks.length === 0) {
    return `
      <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
        No block definitions available.
      </div>`;
  }

  const filtered = searchQuery
    ? availableBlocks.filter((b) => {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q)
          || blockKey(b).toLowerCase().includes(q)
          || (b.category ?? '').toLowerCase().includes(q);
      })
    : availableBlocks;

  // Group by category
  const grouped = new Map<string, BlockDefinitionSummary[]>();
  for (const block of filtered) {
    const cat = block.category || 'uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(block);
  }

  const count = selectedBlocks.size;
  const countText = count === 0 && emptySelectionText ? emptySelectionText : `${count} selected`;
  const focusRing = accent === 'red' ? 'focus:ring-red-500' : 'focus:ring-blue-500';
  const selectedClass = accent === 'red'
    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700';
  let html = `
    <div class="space-y-2" data-block-picker-inline>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${escapeHtml(label)}</span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500">${escapeHtml(countText)}</span>
      </div>
      <div class="relative">
        <input type="text" data-block-picker-search
               placeholder="Search blocks..."
               value="${escapeHtml(searchQuery ?? '')}"
               class="w-full px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 ${focusRing}" />
      </div>
      <div class="max-h-[200px] overflow-y-auto space-y-1" data-block-picker-list>`;

  if (filtered.length === 0) {
    html += `
        <div class="text-center py-3 text-xs text-gray-400 dark:text-gray-500">No matching blocks</div>`;
  } else {
    for (const [cat, blocks] of grouped) {
      if (grouped.size > 1) {
        html += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">${escapeHtml(titleCase(cat))}</div>`;
      }
      for (const block of blocks) {
        const key = blockKey(block);
        const isSelected = selectedBlocks.has(key) || selectedBlocks.has(block.type);
        html += `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? selectedClass
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
        }">
          <input type="checkbox" value="${escapeHtml(key)}" data-block-type="${escapeHtml(block.type)}"
                 ${isSelected ? 'checked' : ''}
                 class="${checkboxClasses()}" />
          <div class="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
            ${block.icon ? resolveIcon(block.icon) : key.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[12px] font-medium text-gray-800 dark:text-gray-200">${escapeHtml(block.name)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono ml-1">${escapeHtml(key)}</span>
          </div>
        </label>`;
      }
    }
  }

  html += `
      </div>
    </div>`;
  return html;
}

// ---------------------------------------------------------------------------
// Event Binding
// ---------------------------------------------------------------------------

/**
 * Bind events for an inline block picker.
 * Call after inserting renderInlineBlockPicker HTML into the DOM.
 */
export function bindInlineBlockPickerEvents(
  container: HTMLElement,
  config: InlineBlockPickerConfig,
): void {
  const pickerRoot = container.querySelector<HTMLElement>('[data-block-picker-inline]');
  if (!pickerRoot) return;

  // Search
  const searchInput = pickerRoot.querySelector<HTMLInputElement>('[data-block-picker-search]');
  searchInput?.addEventListener('input', () => {
    config.searchQuery = searchInput.value;
    refreshInlineBlockPickerList(pickerRoot, config);
  });

  // Checkboxes
  const listEl = pickerRoot.querySelector<HTMLElement>('[data-block-picker-list]');
  if (listEl) bindCheckboxEvents(listEl, config);
}

function bindCheckboxEvents(
  listEl: HTMLElement,
  config: InlineBlockPickerConfig,
): void {
  listEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.value;
      const legacyType = checkbox.dataset.blockType;
      if (checkbox.checked) {
        config.selectedBlocks.add(key);
        if (legacyType && legacyType !== key) {
          config.selectedBlocks.delete(legacyType);
        }
      } else {
        config.selectedBlocks.delete(key);
        if (legacyType) {
          config.selectedBlocks.delete(legacyType);
        }
      }
      config.onSelectionChange(config.selectedBlocks);
      const pickerRoot = listEl.closest<HTMLElement>('[data-block-picker-inline]');
      if (pickerRoot) {
        refreshInlineBlockPickerList(pickerRoot, config);
      }
    });
  });
}

function refreshInlineBlockPickerList(
  pickerRoot: HTMLElement,
  config: InlineBlockPickerConfig,
): void {
  const listEl = pickerRoot.querySelector<HTMLElement>('[data-block-picker-list]');
  if (!listEl) return;
  const scrollTop = listEl.scrollTop;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderInlineBlockPicker(config);
  const newList = tempDiv.querySelector('[data-block-picker-list]');
  const newCount = tempDiv.querySelector('[data-block-picker-inline] > div > span:last-child');
  if (newList) {
    listEl.innerHTML = newList.innerHTML;
    listEl.scrollTop = scrollTop;
    bindCheckboxEvents(listEl, config);
  }
  const countEl = pickerRoot.querySelector(':scope > div > span:last-child');
  if (countEl && newCount) countEl.textContent = newCount.textContent;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

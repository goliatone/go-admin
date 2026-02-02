/**
 * Shared Icon Picker
 *
 * A popover-based icon/emoji picker component with:
 *   - Built-in Emoji and SVG Icons tabs
 *   - Global registry for custom tabs (per-project extensibility)
 *   - Trigger element that replaces plain text inputs
 *   - Search filtering, category grouping, dark mode
 *
 * Usage:
 *   import { renderIconTrigger, bindIconTriggerEvents } from './shared/icon-picker';
 *
 * Extension:
 *   import { registerIconTab } from './shared/icon-picker';
 *   registerIconTab({ id: 'custom', label: 'My Icons', entries: [...] });
 */

import { iconForKey } from '../field-type-picker';
import { inputClasses } from './field-input-classes';
import { getBuiltinEmojiTab, getBuiltinIconsTab } from './icon-picker-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconEntry {
  /** Stored value (emoji char or key string) */
  value: string;
  /** Display name for search */
  label: string;
  /** Extra search terms */
  keywords?: string;
  /** Rendered HTML (emoji text or SVG markup) */
  display: string;
}

export interface IconTab {
  /** Unique tab ID */
  id: string;
  /** Tab button text */
  label: string;
  /** Tab button icon (emoji char or small HTML) */
  icon?: string;
  /** All selectable items */
  entries: IconEntry[];
  /** Optional category grouping within the tab */
  categories?: { id: string; label: string; startIndex: number }[];
}

export interface IconPickerConfig {
  /** Current value */
  value: string;
  /** Called when user picks an icon */
  onSelect: (value: string) => void;
  /** Called when user clears the icon */
  onClear?: () => void;
  /** Compact mode (xs sizing) for block editor */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Global Registry (singleton)
// ---------------------------------------------------------------------------

const _tabs: IconTab[] = [];
let _initialized = false;

function ensureBuiltins(): void {
  if (_initialized) return;
  _initialized = true;
  _tabs.push(getBuiltinEmojiTab());
  _tabs.push(getBuiltinIconsTab());
}

/** Register a custom icon tab. Appears in all picker instances. */
export function registerIconTab(tab: IconTab): void {
  ensureBuiltins();
  const idx = _tabs.findIndex((t) => t.id === tab.id);
  if (idx >= 0) {
    _tabs[idx] = tab;
  } else {
    _tabs.push(tab);
  }
}

/** Remove a tab by ID (including built-in tabs). */
export function unregisterIconTab(id: string): void {
  ensureBuiltins();
  const idx = _tabs.findIndex((t) => t.id === id);
  if (idx >= 0) _tabs.splice(idx, 1);
}

/** Get all registered tabs. */
export function getIconTabs(): IconTab[] {
  ensureBuiltins();
  return _tabs;
}

// ---------------------------------------------------------------------------
// Icon Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a stored icon value to displayable HTML.
 *
 * Resolution order:
 *   1. Empty → empty string
 *   2. iconForKey() match (built-in SVG icons) → SVG HTML
 *   3. Custom tab entry match → entry.display
 *   4. Passthrough (assumed emoji text)
 */
export function resolveIcon(value: string): string {
  if (!value) return '';
  const svg = iconForKey(value);
  if (svg) return svg;

  ensureBuiltins();
  for (const tab of _tabs) {
    const entry = tab.entries.find((e) => e.value === value);
    if (entry) return entry.display;
  }

  return escapeHtml(value);
}

/**
 * Resolve a stored icon value to a label (for the trigger display).
 */
function resolveLabel(value: string): string {
  if (!value) return '';

  ensureBuiltins();
  for (const tab of _tabs) {
    const entry = tab.entries.find((e) => e.value === value);
    if (entry) return entry.label;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Trigger Renderer
// ---------------------------------------------------------------------------

/**
 * Render an icon picker trigger element.
 *
 * Replaces a plain `<input type="text">` with a preview + open/clear buttons.
 * Contains a hidden input with the original field attribute(s) so that
 * existing event delegation (data-meta-field, data-ct-icon, name=...) still works.
 *
 * @param value   Current icon value (emoji or key)
 * @param fieldAttr  Attribute string for the hidden input, e.g. 'data-meta-field="icon"' or 'name="icon"'
 * @param compact  Use xs sizing
 */
export function renderIconTrigger(
  value: string,
  fieldAttr: string,
  compact?: boolean,
): string {
  const resolved = resolveIcon(value);
  const label = resolveLabel(value);
  const hasValue = value.length > 0;

  const height = compact ? 'h-[30px]' : 'h-[38px]';
  const textSize = compact ? 'text-[12px]' : 'text-sm';
  const iconSize = compact ? 'w-5 h-5 text-[14px]' : 'w-6 h-6 text-base';
  const btnSize = compact ? 'w-5 h-5' : 'w-6 h-6';

  return `
    <div data-icon-trigger
         class="flex items-center gap-1.5 ${height} px-2 border rounded-lg bg-white text-gray-900
                dark:border-gray-600 dark:bg-slate-800 dark:text-white
                hover:border-gray-400 dark:hover:border-gray-500
                cursor-pointer transition-colors select-none">
      <span data-icon-preview
            class="flex-shrink-0 ${iconSize} flex items-center justify-center rounded
                   ${hasValue ? '' : 'text-gray-300 dark:text-gray-600'}">
        ${hasValue ? resolved : '?'}
      </span>
      <span data-icon-label
            class="flex-1 min-w-0 truncate ${textSize} ${hasValue ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}">
        ${hasValue ? escapeHtml(label) : 'Choose icon\u2026'}
      </span>
      <button type="button" data-icon-clear
              class="flex-shrink-0 ${btnSize} flex items-center justify-center rounded
                     text-gray-300 dark:text-gray-600
                     hover:text-gray-500 dark:hover:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                     ${hasValue ? '' : 'hidden'}"
              title="Clear icon" aria-hidden="${hasValue ? 'false' : 'true'}">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <span class="flex-shrink-0 ${btnSize} flex items-center justify-center rounded
                   text-gray-400 dark:text-gray-500">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </span>
      <input type="hidden" ${fieldAttr} value="${escapeHtml(value)}" />
    </div>`;
}

// ---------------------------------------------------------------------------
// Popover State
// ---------------------------------------------------------------------------

let _popoverEl: HTMLElement | null = null;
let _activeConfig: IconPickerConfig | null = null;
let _activeTrigger: HTMLElement | null = null;
let _activeTabId = 'emoji';
let _searchQuery = '';
let _clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
let _escapeHandler: ((e: KeyboardEvent) => void) | null = null;

// ---------------------------------------------------------------------------
// Popover Open / Close
// ---------------------------------------------------------------------------

/** Open the icon picker popover anchored to a trigger element. */
export function openIconPicker(
  anchor: HTMLElement,
  config: IconPickerConfig,
): void {
  // Close any existing popover first
  closeIconPicker();

  _activeConfig = config;
  _activeTrigger = anchor;
  _searchQuery = '';
  _activeTabId = getIconTabs()[0]?.id ?? 'emoji';

  // Create popover element
  _popoverEl = document.createElement('div');
  _popoverEl.setAttribute('data-icon-picker-popover', '');
  _popoverEl.className = 'fixed z-50';
  _popoverEl.innerHTML = renderPopoverContent();

  document.body.appendChild(_popoverEl);
  positionPopover(anchor);
  bindPopoverEvents();

  // Focus search
  const searchInput = _popoverEl.querySelector<HTMLInputElement>('[data-icon-search]');
  searchInput?.focus();

  // Click-outside handler
  _clickOutsideHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-icon-picker-popover]') && !target.closest('[data-icon-trigger]')) {
      closeIconPicker();
    }
  };
  // Defer so the opening click doesn't immediately close
  setTimeout(() => {
    if (_clickOutsideHandler) document.addEventListener('mousedown', _clickOutsideHandler);
  }, 0);

  // Escape handler
  _escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeIconPicker();
  };
  document.addEventListener('keydown', _escapeHandler);
}

/** Close the icon picker popover. */
export function closeIconPicker(): void {
  if (_popoverEl) {
    _popoverEl.remove();
    _popoverEl = null;
  }
  if (_clickOutsideHandler) {
    document.removeEventListener('mousedown', _clickOutsideHandler);
    _clickOutsideHandler = null;
  }
  if (_escapeHandler) {
    document.removeEventListener('keydown', _escapeHandler);
    _escapeHandler = null;
  }
  _activeConfig = null;
  _activeTrigger = null;
}

// ---------------------------------------------------------------------------
// Popover Positioning
// ---------------------------------------------------------------------------

function positionPopover(anchor: HTMLElement): void {
  if (!_popoverEl) return;

  const rect = anchor.getBoundingClientRect();
  const popoverWidth = 320;
  const popoverHeight = 380;

  let top = rect.bottom + 4;
  let left = rect.left;

  // Flip up if near bottom of viewport
  if (top + popoverHeight > window.innerHeight - 8) {
    top = rect.top - popoverHeight - 4;
  }

  // Keep within horizontal bounds
  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8;
  }
  if (left < 8) left = 8;

  _popoverEl.style.top = `${top}px`;
  _popoverEl.style.left = `${left}px`;
  _popoverEl.style.width = `${popoverWidth}px`;
}

// ---------------------------------------------------------------------------
// Popover Content Renderer
// ---------------------------------------------------------------------------

function renderPopoverContent(): string {
  const tabs = getIconTabs();
  const activeTab = tabs.find((t) => t.id === _activeTabId) ?? tabs[0];

  // Filter entries by search query
  let filteredEntries: { entry: IconEntry; tabId: string }[] = [];
  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    for (const tab of tabs) {
      for (const entry of tab.entries) {
        if (
          entry.label.toLowerCase().includes(q) ||
          entry.value.toLowerCase().includes(q) ||
          (entry.keywords ?? '').toLowerCase().includes(q)
        ) {
          filteredEntries.push({ entry, tabId: tab.id });
        }
      }
    }
  } else if (activeTab) {
    filteredEntries = activeTab.entries.map((entry) => ({ entry, tabId: activeTab.id }));
  }

  // Tab bar
  const tabBarHtml = tabs.map((tab) => {
    const isActive = tab.id === _activeTabId;
    return `
      <button type="button" data-icon-tab="${escapeHtml(tab.id)}"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap
                     ${isActive
                       ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                       : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                     }">
        ${tab.icon ? `<span class="mr-0.5">${tab.icon}</span>` : ''}${escapeHtml(tab.label)}
      </button>`;
  }).join('');

  // Grid content
  let gridHtml: string;
  if (filteredEntries.length === 0) {
    gridHtml = `<div class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">No matching icons</div>`;
  } else if (_searchQuery) {
    // When searching: flat grid, no categories
    gridHtml = renderGrid(filteredEntries.map((f) => f.entry));
  } else if (activeTab?.categories && activeTab.categories.length > 0) {
    // Render with category headers
    gridHtml = '';
    for (let i = 0; i < activeTab.categories.length; i++) {
      const cat = activeTab.categories[i];
      const nextStart = activeTab.categories[i + 1]?.startIndex ?? activeTab.entries.length;
      const catEntries = activeTab.entries.slice(cat.startIndex, nextStart);
      if (catEntries.length === 0) continue;
      gridHtml += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">${escapeHtml(cat.label)}</div>`;
      gridHtml += renderGrid(catEntries);
    }
  } else {
    gridHtml = renderGrid(filteredEntries.map((f) => f.entry));
  }

  return `
    <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
                flex flex-col overflow-hidden" style="max-height: 380px;">
      <div class="px-3 pt-3 pb-2 space-y-2 flex-shrink-0">
        <div class="relative">
          <input type="text" data-icon-search
                 placeholder="Search icons\u2026"
                 value="${escapeHtml(_searchQuery)}"
                 class="${inputClasses('xs')}" />
        </div>
        <div class="flex items-center gap-1 overflow-x-auto" data-icon-tab-bar>
          ${tabBarHtml}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-3 pb-2" data-icon-grid-area>
        ${gridHtml}
      </div>
      <div class="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 px-3 py-2">
        <button type="button" data-icon-clear-btn
                class="w-full text-center text-[11px] text-gray-400 dark:text-gray-500
                       hover:text-red-500 dark:hover:text-red-400 transition-colors py-1">
          Clear selection
        </button>
      </div>
    </div>`;
}

function renderGrid(entries: IconEntry[]): string {
  let html = '<div class="grid grid-cols-8 gap-0.5">';
  for (const entry of entries) {
    const isEmoji = !entry.display.startsWith('<');
    html += `
      <button type="button" data-icon-pick="${escapeHtml(entry.value)}"
              title="${escapeHtml(entry.label)}"
              class="w-8 h-8 flex items-center justify-center rounded-md
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors cursor-pointer
                     ${isEmoji ? 'text-lg' : 'text-gray-600 dark:text-gray-300'}">
        ${isEmoji ? entry.display : `<span class="w-5 h-5 flex items-center justify-center">${entry.display}</span>`}
      </button>`;
  }
  html += '</div>';
  return html;
}

// ---------------------------------------------------------------------------
// Popover Event Binding
// ---------------------------------------------------------------------------

function bindPopoverEvents(): void {
  if (!_popoverEl) return;

  // Search
  const searchInput = _popoverEl.querySelector<HTMLInputElement>('[data-icon-search]');
  searchInput?.addEventListener('input', () => {
    _searchQuery = searchInput.value;
    refreshPopoverContent();
  });

  // Tab clicks
  _popoverEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Tab button
    const tabBtn = target.closest<HTMLElement>('[data-icon-tab]');
    if (tabBtn) {
      _activeTabId = tabBtn.dataset.iconTab!;
      _searchQuery = '';
      refreshPopoverContent();
      return;
    }

    // Icon pick
    const pickBtn = target.closest<HTMLElement>('[data-icon-pick]');
    if (pickBtn && _activeConfig) {
      const value = pickBtn.dataset.iconPick!;
      _activeConfig.onSelect(value);
      if (_activeTrigger) {
        updateTriggerDisplay(_activeTrigger, value);
      }
      closeIconPicker();
      return;
    }

    // Clear
    const clearBtn = target.closest<HTMLElement>('[data-icon-clear-btn]');
    if (clearBtn && _activeConfig) {
      if (_activeConfig.onClear) {
        _activeConfig.onClear();
      } else {
        _activeConfig.onSelect('');
      }
      if (_activeTrigger) {
        updateTriggerDisplay(_activeTrigger, '');
      }
      closeIconPicker();
    }
  });
}

function refreshPopoverContent(): void {
  if (!_popoverEl) return;
  const container = _popoverEl.querySelector<HTMLElement>('.bg-white, .dark\\:bg-slate-800');
  if (!container) {
    _popoverEl.innerHTML = renderPopoverContent();
    bindPopoverEvents();
    return;
  }

  // Re-render full content and swap
  const scrollTop = _popoverEl.querySelector('[data-icon-grid-area]')?.scrollTop ?? 0;
  _popoverEl.innerHTML = renderPopoverContent();
  bindPopoverEvents();

  // Restore scroll
  const gridArea = _popoverEl.querySelector('[data-icon-grid-area]');
  if (gridArea) gridArea.scrollTop = scrollTop;

  // Restore search focus & cursor
  const searchInput = _popoverEl.querySelector<HTMLInputElement>('[data-icon-search]');
  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}

// ---------------------------------------------------------------------------
// Trigger Event Binding
// ---------------------------------------------------------------------------

function updateTriggerDisplay(trigger: HTMLElement, value: string): void {
  const hasValue = value.length > 0;
  const preview = trigger.querySelector<HTMLElement>('[data-icon-preview]');
  const label = trigger.querySelector<HTMLElement>('[data-icon-label]');
  const clearBtn = trigger.querySelector<HTMLElement>('[data-icon-clear]');

  if (preview) {
    preview.innerHTML = hasValue ? resolveIcon(value) : '?';
    preview.classList.toggle('text-gray-300', !hasValue);
    preview.classList.toggle('dark:text-gray-600', !hasValue);
  }

  if (label) {
    label.textContent = hasValue ? resolveLabel(value) : 'Choose icon\u2026';
    label.classList.toggle('text-gray-400', !hasValue);
    label.classList.toggle('dark:text-gray-500', !hasValue);
    label.classList.toggle('text-gray-700', hasValue);
    label.classList.toggle('dark:text-gray-300', hasValue);
  }

  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !hasValue);
    clearBtn.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
  }
}

/**
 * Bind click events on icon trigger elements within a container.
 *
 * @param container  Parent element containing icon triggers
 * @param selector   CSS selector for trigger elements (e.g. '[data-icon-trigger]')
 * @param getConfig  Factory function that returns IconPickerConfig for a given trigger
 */
export function bindIconTriggerEvents(
  container: HTMLElement,
  selector: string,
  getConfig: (trigger: HTMLElement) => IconPickerConfig,
): void {
  container.querySelectorAll<HTMLElement>(selector).forEach((trigger) => {
    // Open on click (anywhere on trigger except clear button)
    trigger.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Clear button
      if (target.closest('[data-icon-clear]')) {
        e.stopPropagation();
        const config = getConfig(trigger);
        if (config.onClear) {
          config.onClear();
        } else {
          config.onSelect('');
        }
        updateTriggerDisplay(trigger, '');
        return;
      }

      // Open picker (toggle if already open for this trigger)
      if (_activeTrigger === trigger && _popoverEl) {
        closeIconPicker();
      } else {
        openIconPicker(trigger, getConfig(trigger));
      }
    });
  });
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

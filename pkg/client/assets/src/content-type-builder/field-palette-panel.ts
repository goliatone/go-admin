/**
 * Field Palette Panel
 *
 * Phase 9 implements the right-column field palette for the Block Library IDE:
 *   Task 9.1 - Data-driven palette: fetches from GET /admin/api/block_definitions/field_types,
 *              falls back to the local FIELD_TYPES registry when the endpoint is unavailable.
 *   Task 9.2 - Search and grouped categories with "Advanced" collapsed by default.
 *   Task 9.3 - Drag handle on each palette item; drop target integration with the block editor.
 *
 * The panel renders inside [data-block-ide-palette] in the three-column IDE layout.
 */

import type { FieldTypeMetadata, FieldTypeCategory } from './types';
import { ContentTypeAPIClient } from './api-client';
import { BLOCK_FIELD_TYPE_REGISTRY_FALLBACK, buildRegistryFromGroups } from './block-field-type-registry';

// =============================================================================
// Types
// =============================================================================

export interface FieldPalettePanelConfig {
  container: HTMLElement;
  api: ContentTypeAPIClient;
  /** Called when user clicks (non-drag) a palette item to add a field */
  onAddField: (meta: FieldTypeMetadata) => void;
}

interface CategoryGroupState {
  collapsed: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Categories that should be collapsed by default */
const COLLAPSED_BY_DEFAULT: Set<FieldTypeCategory> = new Set(['advanced']);

/** MIME type used for drag-and-drop data transfer */
export const PALETTE_DRAG_MIME = 'application/x-field-palette-type';
export const PALETTE_DRAG_META_MIME = 'application/x-field-palette-meta';

// =============================================================================
// Field Palette Panel
// =============================================================================

export class FieldPalettePanel {
  private config: FieldPalettePanelConfig;
  private fieldTypes: FieldTypeMetadata[] = [];
  private fieldTypeByKey: Map<string, FieldTypeMetadata> = new Map();
  private fieldTypeKeyByRef: Map<FieldTypeMetadata, string> = new Map();
  private categoryOrder: { id: FieldTypeCategory; label: string; icon: string; collapsed?: boolean }[] = [];
  private searchQuery: string = '';
  private categoryStates: Map<FieldTypeCategory, CategoryGroupState> = new Map();
  private isLoading: boolean = true;
  private enabled: boolean = false;

  constructor(config: FieldPalettePanelConfig) {
    this.config = config;
    // Initialize category order from the fallback registry
    this.categoryOrder = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.categories];
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /** Initialize: fetch field types and render */
  async init(): Promise<void> {
    this.isLoading = true;
    this.render();
    await this.loadFieldTypes();
    this.isLoading = false;
    this.render();
  }

  /** Enable the palette (a block is selected) */
  enable(): void {
    this.enabled = true;
    this.render();
  }

  /** Disable the palette (no block selected) */
  disable(): void {
    this.enabled = false;
    this.render();
  }

  /** Refresh field types from the API */
  async refresh(): Promise<void> {
    await this.loadFieldTypes();
    this.render();
  }

  // ===========================================================================
  // Data Loading (Task 9.1)
  // ===========================================================================

  private async loadFieldTypes(): Promise<void> {
    try {
      const groups = await this.config.api.getBlockFieldTypeGroups();
      if (groups && groups.length > 0) {
        const registry = buildRegistryFromGroups(groups);
        this.fieldTypes = registry.fieldTypes;
        this.categoryOrder = registry.categories;
      } else {
        const apiTypes = await this.config.api.getFieldTypes();
        if (apiTypes && apiTypes.length > 0) {
          this.fieldTypes = apiTypes;
          this.categoryOrder = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.categories];
        } else {
          // Fall back to the local registry
          this.fieldTypes = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.fieldTypes];
          this.categoryOrder = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.categories];
        }
      }
    } catch {
      // Fall back to local registry on any error
      this.fieldTypes = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.fieldTypes];
      this.categoryOrder = [...BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.categories];
    }

    // Initialize collapse states for any new categories
    this.initCategoryStates();
    this.buildFieldTypeKeyMap();
  }

  private initCategoryStates(): void {
    const seenCategories = new Set<FieldTypeCategory>();
    for (const cat of this.categoryOrder) {
      seenCategories.add(cat.id);
    }
    for (const cat of seenCategories) {
      if (!this.categoryStates.has(cat)) {
        this.categoryStates.set(cat, {
          collapsed: COLLAPSED_BY_DEFAULT.has(cat),
        });
      }
    }
    for (const cat of this.categoryOrder) {
      const state = this.categoryStates.get(cat.id) ?? { collapsed: false };
      if (cat.collapsed !== undefined) {
        state.collapsed = cat.collapsed;
      }
      this.categoryStates.set(cat.id, state);
    }
  }

  private buildFieldTypeKeyMap(): void {
    this.fieldTypeByKey.clear();
    this.fieldTypeKeyByRef.clear();
    this.fieldTypes.forEach((fieldType, index) => {
      const key = `${fieldType.type}:${index}`;
      this.fieldTypeByKey.set(key, fieldType);
      this.fieldTypeKeyByRef.set(fieldType, key);
    });
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private render(): void {
    const container = this.config.container;

    if (this.isLoading) {
      container.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }

    if (!this.enabled) {
      container.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-xs text-gray-400">Select a block to see available field types</p>
        </div>`;
      return;
    }

    container.innerHTML = '';

    // Search bar
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'px-3 py-2 border-b border-gray-100';
    searchWrapper.innerHTML = `
      <div class="relative">
        <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text"
               data-palette-search
               placeholder="Search fields..."
               value="${esc(this.searchQuery)}"
               class="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>`;
    container.appendChild(searchWrapper);

    // Field types grouped by category
    const listWrapper = document.createElement('div');
    listWrapper.className = 'overflow-y-auto flex-1';
    listWrapper.setAttribute('data-palette-list', '');

    if (this.searchQuery) {
      listWrapper.innerHTML = this.renderSearchResults();
    } else {
      listWrapper.innerHTML = this.renderCategoryGroups();
    }

    container.appendChild(listWrapper);

    this.bindEvents(container);
  }

  // ===========================================================================
  // Rendering – Category Groups (Task 9.2)
  // ===========================================================================

  private renderCategoryGroups(): string {
    let html = '';

    for (const cat of this.categoryOrder) {
      const types = this.fieldTypes.filter((ft) => ft.category === cat.id);
      if (types.length === 0) continue;

      const state = this.categoryStates.get(cat.id);
      const isCollapsed = state?.collapsed ?? false;

      html += `
        <div data-palette-category="${esc(cat.id)}" class="border-b border-gray-50">
          <button type="button" data-palette-toggle="${esc(cat.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors group">
            <svg class="w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}"
                 data-palette-chevron="${esc(cat.id)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400">${cat.icon}</span>
            <span class="text-[11px] font-semibold text-gray-600 uppercase tracking-wider flex-1">${esc(cat.label)}</span>
            <span class="text-[10px] text-gray-400">${types.length}</span>
          </button>
          <div class="${isCollapsed ? 'hidden' : ''}" data-palette-category-body="${esc(cat.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${types.map((ft) => this.renderPaletteItem(ft)).join('')}
            </div>
          </div>
        </div>`;
    }

    if (!html) {
      html = `
        <div class="px-4 py-8 text-center">
          <p class="text-xs text-gray-400">No field types available.</p>
        </div>`;
    }

    return html;
  }

  // ===========================================================================
  // Rendering – Search Results (Task 9.2)
  // ===========================================================================

  private renderSearchResults(): string {
    const query = this.searchQuery.toLowerCase();
    const matched = this.fieldTypes.filter(
      (ft) =>
        ft.label.toLowerCase().includes(query) ||
        (ft.description ?? '').toLowerCase().includes(query) ||
        ft.type.toLowerCase().includes(query)
    );

    if (matched.length === 0) {
      return `
        <div class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400">No fields match "${esc(this.searchQuery)}"</p>
        </div>`;
    }

    return `
      <div class="px-2 py-2 space-y-0.5">
        ${matched.map((ft) => this.renderPaletteItem(ft)).join('')}
      </div>`;
  }

  // ===========================================================================
  // Rendering – Single Palette Item (Tasks 9.1 + 9.3)
  // ===========================================================================

  private renderPaletteItem(fieldType: FieldTypeMetadata): string {
    const key = this.fieldTypeKeyByRef.get(fieldType) ?? fieldType.type;
    return `
      <div data-palette-item="${esc(key)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 active:cursor-grabbing transition-colors group select-none"
           title="${esc(fieldType.description)}">
        <span class="flex-shrink-0 text-gray-300 group-hover:text-gray-400 cursor-grab" data-palette-grip>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
          </svg>
        </span>
        <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
          ${fieldType.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[12px] font-medium text-gray-700 group-hover:text-blue-700 truncate">${esc(fieldType.label)}</span>
        </span>
      </div>`;
  }

  // ===========================================================================
  // Event Binding
  // ===========================================================================

  private bindEvents(root: HTMLElement): void {
    // Search input
    const searchInput = root.querySelector<HTMLInputElement>('[data-palette-search]');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      const list = root.querySelector<HTMLElement>('[data-palette-list]');
      if (list) {
        list.innerHTML = this.searchQuery ? this.renderSearchResults() : this.renderCategoryGroups();
        this.bindListEvents(list);
      }
    });

    // Category and item events on the list
    const list = root.querySelector<HTMLElement>('[data-palette-list]');
    if (list) {
      this.bindListEvents(list);
    }
  }

  private bindListEvents(list: HTMLElement): void {
    // Category toggle
    list.querySelectorAll<HTMLElement>('[data-palette-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.paletteToggle as FieldTypeCategory;
        const state = this.categoryStates.get(catId) ?? { collapsed: false };
        state.collapsed = !state.collapsed;
        this.categoryStates.set(catId, state);

        const body = list.querySelector<HTMLElement>(`[data-palette-category-body="${catId}"]`);
        const chevron = list.querySelector<HTMLElement>(`[data-palette-chevron="${catId}"]`);
        if (body) body.classList.toggle('hidden', state.collapsed);
        if (chevron) chevron.classList.toggle('-rotate-90', state.collapsed);
      });
    });

    // Palette item: click-to-add
    list.querySelectorAll<HTMLElement>('[data-palette-item]').forEach((item) => {
      item.addEventListener('click', (e) => {
        // Don't fire click when drag is happening
        if ((e as MouseEvent).detail === 0) return;
        const fieldTypeKey = item.dataset.paletteItem as string;
        const meta = this.fieldTypeByKey.get(fieldTypeKey) ?? this.fieldTypes.find((ft) => ft.type === fieldTypeKey);
        if (meta) {
          this.config.onAddField(meta);
        }
      });
    });

    // Palette item: drag start (Task 9.3)
    list.querySelectorAll<HTMLElement>('[data-palette-item]').forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        const fieldTypeKey = item.dataset.paletteItem!;
        e.dataTransfer!.effectAllowed = 'copy';
        const meta = this.fieldTypeByKey.get(fieldTypeKey) ?? this.fieldTypes.find((ft) => ft.type === fieldTypeKey);
        if (meta) {
          e.dataTransfer!.setData(PALETTE_DRAG_MIME, meta.type);
          e.dataTransfer!.setData(PALETTE_DRAG_META_MIME, JSON.stringify(meta));
        } else {
          e.dataTransfer!.setData(PALETTE_DRAG_MIME, fieldTypeKey);
        }
        e.dataTransfer!.setData('text/plain', meta?.type ?? fieldTypeKey);
        item.classList.add('opacity-50');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('opacity-50');
      });
    });
  }
}

// =============================================================================
// Utilities
// =============================================================================

function esc(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Block Library IDE
 *
 * Full-page Block Library IDE controller for the three-column layout.
 * Phase 7: Block List Panel (left column)
 * Phase 8: Block Editor Panel (center column) — metadata, field cards, sections
 */

import type { BlockDefinition, BlockDefinitionStatus, FieldType, FieldDefinition } from './types';
import { ContentTypeAPIClient, ContentTypeAPIError, fieldsToSchema, generateFieldId } from './api-client';
import { BlockEditorPanel } from './block-editor-panel';
import { FieldPalettePanel } from './field-palette-panel';
import { getFieldTypeMetadata } from './field-type-picker';

// =============================================================================
// Types
// =============================================================================

interface BlockLibraryIDEState {
  blocks: BlockDefinition[];
  selectedBlockId: string | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  categoryFilter: string | null;
  categories: string[];
  isCreating: boolean;
  renamingBlockId: string | null;
  dirtyBlocks: Set<string>;
  savingBlocks: Set<string>;
  saveErrors: Map<string, string>;
}

// =============================================================================
// Block Library IDE
// =============================================================================

export class BlockLibraryIDE {
  private root: HTMLElement;
  private api: ContentTypeAPIClient;
  private state: BlockLibraryIDEState;

  // DOM references
  private listEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private categorySelect: HTMLSelectElement | null = null;
  private countEl: HTMLElement | null = null;
  private createBtn: HTMLElement | null = null;
  private editorEl: HTMLElement | null = null;
  private paletteEl: HTMLElement | null = null;

  // Active context menu cleanup
  private activeMenu: (() => void) | null = null;

  // Editor panel (Phase 8)
  private editorPanel: BlockEditorPanel | null = null;

  // Field palette panel (Phase 9)
  private palettePanel: FieldPalettePanel | null = null;

  constructor(root: HTMLElement) {
    const apiBasePath = root.dataset.apiBasePath ?? '/admin';
    this.root = root;
    this.api = new ContentTypeAPIClient({ basePath: apiBasePath });
    this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: false,
      error: null,
      search: '',
      categoryFilter: null,
      categories: [],
      isCreating: false,
      renamingBlockId: null,
      dirtyBlocks: new Set(),
      savingBlocks: new Set(),
      saveErrors: new Map(),
    };
  }

  async init(): Promise<void> {
    this.bindDOM();
    this.bindEvents();
    this.initPalette();
    await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }

  /** Initialize the field palette panel (Phase 9) */
  private initPalette(): void {
    if (!this.paletteEl) return;
    this.palettePanel = new FieldPalettePanel({
      container: this.paletteEl,
      api: this.api,
      onAddField: (fieldType, defaultConfig) => this.handlePaletteAddField(fieldType, defaultConfig),
    });
    this.palettePanel.init();
  }

  // ===========================================================================
  // Public API (for cross-panel communication in later phases)
  // ===========================================================================

  getSelectedBlock(): BlockDefinition | null {
    if (!this.state.selectedBlockId) return null;
    return this.state.blocks.find((b) => b.id === this.state.selectedBlockId) ?? null;
  }

  selectBlock(blockId: string | null): void {
    this.state.selectedBlockId = blockId;
    this.renderBlockList();
    this.renderEditor();
  }

  markDirty(blockId: string): void {
    this.state.dirtyBlocks.add(blockId);
    this.updateBlockIndicator(blockId);
  }

  markClean(blockId: string): void {
    this.state.dirtyBlocks.delete(blockId);
    this.state.saveErrors.delete(blockId);
    this.state.savingBlocks.delete(blockId);
    this.updateBlockIndicator(blockId);
  }

  markSaving(blockId: string): void {
    this.state.savingBlocks.add(blockId);
    this.updateBlockIndicator(blockId);
  }

  markSaveError(blockId: string, error: string): void {
    this.state.savingBlocks.delete(blockId);
    this.state.saveErrors.set(blockId, error);
    this.updateBlockIndicator(blockId);
  }

  async refreshBlocks(): Promise<void> {
    await this.loadBlocks();
  }

  // ===========================================================================
  // DOM Binding
  // ===========================================================================

  private bindDOM(): void {
    this.listEl = this.root.querySelector('[data-block-ide-list]');
    this.searchInput = this.root.querySelector('[data-block-ide-search]');
    this.categorySelect = this.root.querySelector('[data-block-ide-category-filter]');
    this.countEl = this.root.querySelector('[data-block-ide-count]');
    this.createBtn = this.root.querySelector('[data-block-ide-create]');
    this.editorEl = this.root.querySelector('[data-block-ide-editor]');
    this.paletteEl = this.root.querySelector('[data-block-ide-palette]');
  }

  private bindEvents(): void {
    // Search input
    this.searchInput?.addEventListener('input', () => {
      this.state.search = this.searchInput!.value;
      this.renderBlockList();
    });

    // Category filter
    this.categorySelect?.addEventListener('change', () => {
      this.state.categoryFilter = this.categorySelect!.value || null;
      this.renderBlockList();
    });

    // Create button
    this.createBtn?.addEventListener('click', () => {
      this.showCreateForm();
    });

    // Delegate clicks on block list
    this.listEl?.addEventListener('click', (e) => {
      this.handleListClick(e);
    });

    // Close context menu on outside click
    document.addEventListener('click', (e) => {
      if (this.activeMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-block-context-menu]') && !target.closest('[data-block-actions]')) {
          this.closeContextMenu();
        }
      }
    });

    // Keyboard: Escape cancels create/rename
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state.isCreating) {
          this.cancelCreate();
        }
        if (this.state.renamingBlockId) {
          this.cancelRename();
        }
        this.closeContextMenu();
      }
    });
  }

  // ===========================================================================
  // Data Loading
  // ===========================================================================

  private async loadBlocks(): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;
    this.renderBlockList();

    try {
      const response = await this.api.listBlockDefinitions();
      this.state.blocks = response.items;
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Failed to load blocks';
    } finally {
      this.state.isLoading = false;
      this.renderBlockList();
      this.updateCount();
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      this.state.categories = await this.api.getBlockCategories();
    } catch {
      this.state.categories = ['content', 'media', 'layout', 'interactive', 'custom'];
    }
    this.renderCategoryOptions();
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private renderBlockList(): void {
    if (!this.listEl) return;

    if (this.state.isLoading) {
      this.listEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }

    if (this.state.error) {
      this.listEl.innerHTML = `
        <div class="px-4 py-6 text-center">
          <p class="text-sm text-red-500">${esc(this.state.error)}</p>
          <button type="button" data-block-ide-retry
                  class="mt-2 text-xs text-blue-600 hover:text-blue-700">
            Retry
          </button>
        </div>`;
      return;
    }

    const filtered = this.getFilteredBlocks();

    if (filtered.length === 0) {
      const hasFilters = this.state.search || this.state.categoryFilter;
      this.listEl.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500">${hasFilters ? 'No blocks match your filters.' : 'No blocks yet.'}</p>
          ${!hasFilters ? '<p class="text-xs text-gray-400 mt-1">Click "New Block" to create your first block definition.</p>' : ''}
        </div>`;
      return;
    }

    // Render create form at top if active
    let html = '';
    if (this.state.isCreating) {
      html += this.renderCreateForm();
    }

    html += '<ul class="p-2 space-y-0.5">';
    for (const block of filtered) {
      html += this.renderBlockItem(block);
    }
    html += '</ul>';

    this.listEl.innerHTML = html;

    // Focus create form name input if just opened
    if (this.state.isCreating) {
      const nameInput = this.listEl.querySelector<HTMLInputElement>('[data-create-name]');
      nameInput?.focus();
    }

    // Focus rename input if renaming
    if (this.state.renamingBlockId) {
      const renameInput = this.listEl.querySelector<HTMLInputElement>('[data-rename-input]');
      renameInput?.focus();
      renameInput?.select();
    }
  }

  private renderBlockItem(block: BlockDefinition): string {
    const isSelected = block.id === this.state.selectedBlockId;
    const isRenaming = block.id === this.state.renamingBlockId;
    const isDirty = this.state.dirtyBlocks.has(block.id);
    const isSaving = this.state.savingBlocks.has(block.id);
    const saveError = this.state.saveErrors.get(block.id);

    const selectedClass = isSelected
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'hover:bg-gray-50 border-transparent';

    const nameHtml = isRenaming
      ? `<input type="text" data-rename-input data-rename-block-id="${esc(block.id)}"
               value="${esc(block.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />`
      : `<span class="block font-medium text-gray-800 truncate text-[13px]">${esc(block.name || 'Untitled')}</span>`;

    // Unsaved indicator (Task 7.4)
    let indicatorHtml = '';
    if (saveError) {
      indicatorHtml = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${esc(saveError)}"></span>`;
    } else if (isSaving) {
      indicatorHtml = `<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>`;
    } else if (isDirty) {
      indicatorHtml = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>`;
    } else {
      indicatorHtml = statusDot(block.status);
    }

    return `
      <li>
        <div data-block-id="${esc(block.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${selectedClass} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            ${block.icon ? `<span class="text-xs font-medium">${esc(block.icon)}</span>` : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>`}
          </span>
          <span class="flex-1 min-w-0">
            ${nameHtml}
            <span class="block text-[11px] text-gray-400 font-mono truncate">${esc(block.type)}</span>
          </span>
          ${indicatorHtml}
          <button type="button" data-block-actions="${esc(block.id)}"
                  class="flex-shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Actions">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      </li>`;
  }

  private renderCreateForm(): string {
    return `
      <div class="p-2 mb-1" data-block-create-form>
        <div class="p-3 border border-blue-200 rounded-lg bg-blue-50/50 space-y-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Name</label>
            <input type="text" data-create-name placeholder="e.g. Hero Section"
                   class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Type</label>
            <input type="text" data-create-type placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_-]*$"
                   class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p class="mt-0.5 text-[10px] text-gray-400">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Category</label>
            <select data-create-category
                    class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              ${this.state.categories.map((c) => `<option value="${esc(c)}">${esc(titleCase(c))}</option>`).join('')}
            </select>
          </div>
          <div data-create-error class="hidden text-xs text-red-600"></div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" data-create-save
                    class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create
            </button>
            <button type="button" data-create-cancel
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>`;
  }

  private renderContextMenu(blockId: string, anchorEl: HTMLElement): void {
    this.closeContextMenu();

    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const menu = document.createElement('div');
    menu.setAttribute('data-block-context-menu', blockId);
    menu.className =
      'absolute z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm text-gray-700';

    const items: { label: string; action: string; icon: string; danger?: boolean }[] = [
      { label: 'Rename', action: 'rename', icon: ICONS.rename },
      { label: 'Duplicate', action: 'duplicate', icon: ICONS.duplicate },
    ];

    if (block.status === 'draft') {
      items.push({ label: 'Publish', action: 'publish', icon: ICONS.publish });
    } else if (block.status === 'active') {
      items.push({ label: 'Deprecate', action: 'deprecate', icon: ICONS.deprecate });
    }

    items.push({ label: 'Delete', action: 'delete', icon: ICONS.delete, danger: true });

    menu.innerHTML = items
      .map(
        (item) => `
        <button type="button" data-menu-action="${item.action}" data-menu-block-id="${esc(blockId)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 ${item.danger ? 'text-red-600 hover:bg-red-50' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </button>`
      )
      .join('');

    // Position relative to anchor
    const rect = anchorEl.getBoundingClientRect();
    const parentRect = this.root.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.right - 176}px`; // 176 = w-44

    // Prevent off-screen
    document.body.appendChild(menu);
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${rect.top - menuRect.height - 4}px`;
    }
    if (menuRect.left < 0) {
      menu.style.left = '4px';
    }

    // Menu click handler
    menu.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-menu-action]');
      if (!btn) return;
      const action = btn.dataset.menuAction!;
      const id = btn.dataset.menuBlockId!;
      this.closeContextMenu();
      this.handleAction(action, id);
    });

    this.activeMenu = () => {
      menu.remove();
      this.activeMenu = null;
    };
  }

  private closeContextMenu(): void {
    if (this.activeMenu) {
      this.activeMenu();
    }
  }

  private renderCategoryOptions(): void {
    if (!this.categorySelect) return;
    this.categorySelect.innerHTML = '<option value="">All Categories</option>';
    for (const cat of this.state.categories) {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = titleCase(cat);
      if (cat === this.state.categoryFilter) option.selected = true;
      this.categorySelect.appendChild(option);
    }
  }

  private updateCount(): void {
    if (this.countEl) {
      this.countEl.textContent = String(this.state.blocks.length);
    }
  }

  private updateBlockIndicator(blockId: string): void {
    const itemEl = this.listEl?.querySelector(`[data-block-id="${blockId}"]`);
    if (!itemEl) return;
    // Full re-render for simplicity; the list is small
    this.renderBlockList();
  }

  private renderEditor(): void {
    if (!this.editorEl) return;
    const block = this.getSelectedBlock();

    if (!block) {
      this.editorPanel = null;
      this.editorEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm text-gray-400">Select a block from the list to edit</p>
          <p class="text-xs text-gray-300 mt-1">or create a new block to get started</p>
        </div>`;
      // Disable palette when no block is selected (Phase 9)
      this.palettePanel?.disable();
      return;
    }

    // Create or update editor panel
    if (this.editorPanel) {
      this.editorPanel.update(block);
    } else {
      this.editorPanel = new BlockEditorPanel({
        container: this.editorEl,
        block,
        categories: this.state.categories,
        api: this.api,
        onMetadataChange: (blockId, patch) => this.handleEditorMetadataChange(blockId, patch),
        onSchemaChange: (blockId, fields) => this.handleEditorSchemaChange(blockId, fields),
        onFieldDrop: (fieldType) => this.handlePaletteAddField(fieldType),
      });
      this.editorPanel.render();
    }

    // Enable palette when a block is selected (Phase 9)
    this.palettePanel?.enable();
  }

  private handleEditorMetadataChange(blockId: string, patch: Partial<BlockDefinition>): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    this.state.blocks[idx] = { ...this.state.blocks[idx], ...patch };
    this.markDirty(blockId);
    // Update the block name in the list if it changed
    if (patch.name !== undefined || patch.status !== undefined) {
      this.renderBlockList();
    }
  }

  private handleEditorSchemaChange(blockId: string, fields: import('./types').FieldDefinition[]): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    this.state.blocks[idx] = {
      ...this.state.blocks[idx],
      schema: fieldsToSchema(fields, this.state.blocks[idx].type),
    };
    this.markDirty(blockId);
  }

  /** Handle adding a field from the palette (Phase 9 — click or drop) */
  private handlePaletteAddField(fieldType: FieldType, defaultConfig?: Partial<Record<string, unknown>>): void {
    if (!this.editorPanel || !this.state.selectedBlockId) return;

    const meta = getFieldTypeMetadata(fieldType);
    const label = meta?.label ?? titleCase(fieldType);
    const baseName = fieldType.replace(/-/g, '_');

    // Ensure unique field name
    const existingNames = new Set(this.editorPanel.getFields().map((f) => f.name));
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
      name = `${baseName}_${counter++}`;
    }

    const newField: FieldDefinition = {
      id: generateFieldId(),
      name,
      type: fieldType,
      label,
      required: false,
      ...(defaultConfig ?? {}),
    };

    this.editorPanel.addField(newField);
    this.handleEditorSchemaChange(this.state.selectedBlockId, this.editorPanel.getFields());
  }

  // ===========================================================================
  // Filtering
  // ===========================================================================

  private getFilteredBlocks(): BlockDefinition[] {
    let blocks = [...this.state.blocks];

    if (this.state.search) {
      const q = this.state.search.toLowerCase();
      blocks = blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.type.toLowerCase().includes(q) ||
          (b.description?.toLowerCase().includes(q) ?? false)
      );
    }

    if (this.state.categoryFilter) {
      blocks = blocks.filter((b) => (b.category ?? 'custom') === this.state.categoryFilter);
    }

    return blocks;
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  private handleListClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Retry button
    if (target.closest('[data-block-ide-retry]')) {
      this.loadBlocks();
      return;
    }

    // Create form: save
    if (target.closest('[data-create-save]')) {
      this.handleCreateSave();
      return;
    }

    // Create form: cancel
    if (target.closest('[data-create-cancel]')) {
      this.cancelCreate();
      return;
    }

    // Context menu button
    const actionsBtn = target.closest<HTMLElement>('[data-block-actions]');
    if (actionsBtn) {
      e.stopPropagation();
      const blockId = actionsBtn.dataset.blockActions!;
      this.renderContextMenu(blockId, actionsBtn);
      return;
    }

    // Rename input: handle Enter/Escape
    const renameInput = target.closest<HTMLInputElement>('[data-rename-input]');
    if (renameInput) {
      // Don't propagate click to block selection
      e.stopPropagation();
      return;
    }

    // Block item click (select)
    const blockItem = target.closest<HTMLElement>('[data-block-id]');
    if (blockItem) {
      const blockId = blockItem.dataset.blockId!;
      this.selectBlock(blockId);
      return;
    }
  }

  private handleAction(action: string, blockId: string): void {
    switch (action) {
      case 'rename':
        this.startRename(blockId);
        break;
      case 'duplicate':
        this.duplicateBlock(blockId);
        break;
      case 'publish':
        this.publishBlock(blockId);
        break;
      case 'deprecate':
        this.deprecateBlock(blockId);
        break;
      case 'delete':
        this.deleteBlock(blockId);
        break;
    }
  }

  // ===========================================================================
  // Create Block (Task 7.2)
  // ===========================================================================

  private showCreateForm(): void {
    this.state.isCreating = true;
    this.renderBlockList();
  }

  private cancelCreate(): void {
    this.state.isCreating = false;
    this.renderBlockList();
  }

  private async handleCreateSave(): Promise<void> {
    const nameInput = this.listEl?.querySelector<HTMLInputElement>('[data-create-name]');
    const typeInput = this.listEl?.querySelector<HTMLInputElement>('[data-create-type]');
    const categorySelect = this.listEl?.querySelector<HTMLSelectElement>('[data-create-category]');
    const errorEl = this.listEl?.querySelector<HTMLElement>('[data-create-error]');

    const name = nameInput?.value.trim() ?? '';
    const type = typeInput?.value.trim() ?? '';
    const category = categorySelect?.value ?? 'custom';

    if (!name) {
      this.showCreateError(errorEl, 'Name is required.');
      nameInput?.focus();
      return;
    }
    if (!type) {
      this.showCreateError(errorEl, 'Type is required.');
      typeInput?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_-]*$/.test(type)) {
      this.showCreateError(errorEl, 'Type must start with a letter and contain only lowercase, numbers, hyphens, underscores.');
      typeInput?.focus();
      return;
    }

    // Disable form while saving
    const saveBtn = this.listEl?.querySelector<HTMLButtonElement>('[data-create-save]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Creating...';
    }

    try {
      const newBlock = await this.api.createBlockDefinition({
        name,
        type,
        category,
        status: 'draft',
        schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: {} },
      });

      this.state.isCreating = false;
      this.state.blocks.unshift(newBlock);
      this.state.selectedBlockId = newBlock.id;
      this.updateCount();
      this.renderBlockList();
      this.renderEditor();
    } catch (err) {
      const msg = err instanceof ContentTypeAPIError ? err.message : 'Failed to create block.';
      this.showCreateError(errorEl, msg);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create';
      }
    }
  }

  private showCreateError(errorEl: HTMLElement | null | undefined, message: string): void {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  // ===========================================================================
  // Rename Block (Task 7.3)
  // ===========================================================================

  private startRename(blockId: string): void {
    this.state.renamingBlockId = blockId;
    this.renderBlockList();

    // Bind rename input events after render
    const input = this.listEl?.querySelector<HTMLInputElement>('[data-rename-input]');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.commitRename(blockId, input.value.trim());
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelRename();
        }
      });
      input.addEventListener('blur', () => {
        // Commit on blur if value changed
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block && input.value.trim() && input.value.trim() !== block.name) {
          this.commitRename(blockId, input.value.trim());
        } else {
          this.cancelRename();
        }
      });
    }
  }

  private async commitRename(blockId: string, newName: string): Promise<void> {
    if (!newName) {
      this.cancelRename();
      return;
    }

    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block || block.name === newName) {
      this.cancelRename();
      return;
    }

    try {
      const updated = await this.api.updateBlockDefinition(blockId, { name: newName });
      const idx = this.state.blocks.findIndex((b) => b.id === blockId);
      if (idx >= 0) {
        this.state.blocks[idx] = { ...this.state.blocks[idx], ...updated };
      }
    } catch (err) {
      // Silently revert on error
      console.error('Rename failed:', err);
    } finally {
      this.state.renamingBlockId = null;
      this.renderBlockList();
    }
  }

  private cancelRename(): void {
    this.state.renamingBlockId = null;
    this.renderBlockList();
  }

  // ===========================================================================
  // Duplicate Block (Task 7.3)
  // ===========================================================================

  private async duplicateBlock(blockId: string): Promise<void> {
    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const newType = `${block.type}_copy`;

    try {
      const cloned = await this.api.cloneBlockDefinition(blockId, newType);
      this.state.blocks.unshift(cloned);
      this.state.selectedBlockId = cloned.id;
      this.updateCount();
      this.renderBlockList();
      this.renderEditor();
    } catch (err) {
      console.error('Duplicate failed:', err);
      this.showToast(err instanceof Error ? err.message : 'Failed to duplicate block.', 'error');
    }
  }

  // ===========================================================================
  // Publish / Deprecate (Task 7.3)
  // ===========================================================================

  private async publishBlock(blockId: string): Promise<void> {
    try {
      const updated = await this.api.publishBlockDefinition(blockId);
      this.updateBlockInState(blockId, updated);
      this.renderBlockList();
    } catch (err) {
      console.error('Publish failed:', err);
      this.showToast(err instanceof Error ? err.message : 'Failed to publish block.', 'error');
    }
  }

  private async deprecateBlock(blockId: string): Promise<void> {
    try {
      const updated = await this.api.deprecateBlockDefinition(blockId);
      this.updateBlockInState(blockId, updated);
      this.renderBlockList();
    } catch (err) {
      console.error('Deprecate failed:', err);
      this.showToast(err instanceof Error ? err.message : 'Failed to deprecate block.', 'error');
    }
  }

  // ===========================================================================
  // Delete Block (Task 7.3)
  // ===========================================================================

  private async deleteBlock(blockId: string): Promise<void> {
    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const confirmed = confirm(`Delete "${block.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await this.api.deleteBlockDefinition(blockId);
      this.state.blocks = this.state.blocks.filter((b) => b.id !== blockId);
      this.state.dirtyBlocks.delete(blockId);
      this.state.savingBlocks.delete(blockId);
      this.state.saveErrors.delete(blockId);

      if (this.state.selectedBlockId === blockId) {
        this.state.selectedBlockId = null;
        this.renderEditor();
      }

      this.updateCount();
      this.renderBlockList();
    } catch (err) {
      console.error('Delete failed:', err);
      this.showToast(err instanceof Error ? err.message : 'Failed to delete block.', 'error');
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private updateBlockInState(blockId: string, updated: BlockDefinition): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx >= 0) {
      this.state.blocks[idx] = { ...this.state.blocks[idx], ...updated };
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Use the global toast manager if available
    const toastManager = (window as unknown as Record<string, unknown>).__toastManager as
      | { show?: (msg: string, opts?: Record<string, unknown>) => void }
      | undefined;
    if (toastManager?.show) {
      toastManager.show(message, { type });
    }
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

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function statusDot(status?: string): string {
  switch (status) {
    case 'draft':
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400" title="Draft"></span>';
    case 'deprecated':
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" title="Deprecated"></span>';
    case 'active':
    default:
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" title="Active"></span>';
  }
}

// Context menu icons (compact SVGs)
const ICONS = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate:
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish:
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate:
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete:
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>',
};

// =============================================================================
// Auto-initialization
// =============================================================================

export function initBlockLibraryIDE(scope: ParentNode = document): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-block-library-ide]'));

  roots.forEach((root) => {
    if (root.dataset.ideInitialized === 'true') return;

    try {
      const ide = new BlockLibraryIDE(root);
      ide.init();
      root.dataset.ideInitialized = 'true';
    } catch (err) {
      console.error('Block Library IDE failed to initialize:', err);
    }
  });
}

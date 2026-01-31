/**
 * Block Library Manager
 *
 * UI component for managing block definitions (CRUD operations).
 * Supports both management mode (full CRUD) and picker mode (selection only).
 */

import type {
  BlockDefinition,
  BlockDefinitionSummary,
  BlockLibraryManagerConfig,
  BlockLibraryManagerState,
  BlockSchemaVersion,
  JSONSchema,
} from './types';
import { ContentTypeAPIClient } from './api-client';
import { FieldTypePicker, FIELD_TYPES } from './field-type-picker';
import { FieldConfigForm } from './field-config-form';
import { fieldsToSchema, schemaToFields, generateFieldId } from './api-client';

// =============================================================================
// Block Library Manager Component
// =============================================================================

export class BlockLibraryManager {
  private config: BlockLibraryManagerConfig;
  private api: ContentTypeAPIClient;
  private state: BlockLibraryManagerState;
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private categories: string[] = [];

  constructor(config: BlockLibraryManagerConfig) {
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
    this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: false,
      isSaving: false,
      error: null,
      filter: '',
      categoryFilter: null,
    };
  }

  /**
   * Show the block library manager
   */
  async show(): Promise<void> {
    this.render();
    this.bindEvents();
    await this.loadBlocks();
    await this.loadCategories();
  }

  /**
   * Hide the block library manager
   */
  hide(): void {
    if (this.backdrop) {
      this.backdrop.classList.add('opacity-0');
      setTimeout(() => {
        this.backdrop?.remove();
        this.backdrop = null;
        this.container = null;
      }, 150);
    }
  }

  private render(): void {
    const isManageMode = this.config.mode !== 'picker';
    const title = isManageMode ? 'Block Library' : 'Select Block Type';

    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0';
    this.backdrop.setAttribute('data-block-library-backdrop', 'true');

    this.container = document.createElement('div');
    this.container.className =
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden';
    this.container.setAttribute('data-block-library-manager', 'true');

    this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              ${isManageMode ? 'Create, edit, and manage reusable block definitions' : 'Choose a block type to add'}
            </p>
          </div>
        </div>
        <button type="button" data-block-library-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="flex-1 relative">
          <input
            type="text"
            data-block-filter
            placeholder="Search blocks..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <select
          data-block-category-filter
          class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
        </select>
        ${
          isManageMode
            ? `
          <button
            type="button"
            data-block-create
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            New Block
          </button>
        `
            : ''
        }
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-block-list class="p-4">
          <div data-block-loading class="flex items-center justify-center py-12">
            <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>

      <div data-block-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      ${
        this.config.mode === 'picker'
          ? `
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            data-block-library-cancel
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      `
          : ''
      }
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });
  }

  private bindEvents(): void {
    if (!this.container || !this.backdrop) return;

    // Close on backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.config.onClose?.();
        this.hide();
      }
    });

    // Close button
    this.container.querySelector('[data-block-library-close]')?.addEventListener('click', () => {
      this.config.onClose?.();
      this.hide();
    });

    // Cancel button (picker mode)
    this.container.querySelector('[data-block-library-cancel]')?.addEventListener('click', () => {
      this.config.onClose?.();
      this.hide();
    });

    // Filter input
    const filterInput = this.container.querySelector<HTMLInputElement>('[data-block-filter]');
    filterInput?.addEventListener('input', () => {
      this.state.filter = filterInput.value;
      this.renderBlockList();
    });

    // Category filter
    const categoryFilter = this.container.querySelector<HTMLSelectElement>('[data-block-category-filter]');
    categoryFilter?.addEventListener('change', () => {
      this.state.categoryFilter = categoryFilter.value || null;
      this.renderBlockList();
    });

    // Create new block
    this.container.querySelector('[data-block-create]')?.addEventListener('click', () => {
      this.showBlockEditor(null);
    });

    // Keyboard shortcuts
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.config.onClose?.();
        this.hide();
      }
    });

    // Delegate click events on block list
    const blockList = this.container.querySelector('[data-block-list]');
    blockList?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Block card click (picker mode)
      const blockCard = target.closest('[data-block-id]');
      if (blockCard && this.config.mode === 'picker') {
        const blockId = blockCard.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block && this.isBlockAllowed(block)) {
          const blockKey = this.blockKey(block);
          this.config.onSelect?.({
            id: block.id,
            name: block.name,
            slug: block.slug,
            type: blockKey || block.type,
            description: block.description,
            icon: block.icon,
            category: block.category,
            schema_version: block.schema_version,
            status: block.status,
          });
          this.hide();
        }
        return;
      }

      // Edit button
      if (target.closest('[data-block-edit]')) {
        const card = target.closest('[data-block-id]');
        const blockId = card?.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block) {
          this.showBlockEditor(block);
        }
        return;
      }

      // Delete button
      if (target.closest('[data-block-delete]')) {
        const card = target.closest('[data-block-id]');
        const blockId = card?.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block) {
          this.confirmDeleteBlock(block);
        }
        return;
      }

      // Clone button
      if (target.closest('[data-block-clone]')) {
        const card = target.closest('[data-block-id]');
        const blockId = card?.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block) {
          this.cloneBlock(block);
        }
        return;
      }

      // Publish button
      if (target.closest('[data-block-publish]')) {
        const card = target.closest('[data-block-id]');
        const blockId = card?.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block) {
          this.publishBlock(block);
        }
        return;
      }

      // Version history button
      if (target.closest('[data-block-versions]')) {
        const card = target.closest('[data-block-id]');
        const blockId = card?.getAttribute('data-block-id');
        const block = this.state.blocks.find((b) => b.id === blockId);
        if (block) {
          this.showVersionHistory(block);
        }
        return;
      }
    });
  }

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
      this.refreshCategoriesFromBlocks();
      this.renderBlockList();
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const apiCategories = await this.api.getBlockCategories();
      if (apiCategories.length > 0) {
        this.categories = apiCategories;
      }
    } catch {
      // Categories will be derived from loaded blocks in refreshCategoriesFromBlocks
    }
    this.renderCategoryOptions();
  }

  private refreshCategoriesFromBlocks(): void {
    const seen = new Set<string>(this.categories);
    for (const block of this.state.blocks) {
      const cat = (block.category || '').trim().toLowerCase();
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        this.categories.push(cat);
      }
    }
    this.renderCategoryOptions();
  }

  private renderCategoryOptions(): void {
    const select = this.container?.querySelector<HTMLSelectElement>('[data-block-category-filter]');
    if (!select) return;

    select.innerHTML = '<option value="">All Categories</option>';
    for (const category of this.categories) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = titleCase(category);
      select.appendChild(option);
    }
  }

  private renderBlockList(): void {
    const listEl = this.container?.querySelector('[data-block-list]');
    if (!listEl) return;

    if (this.state.isLoading) {
      listEl.innerHTML = `
        <div data-block-loading class="flex items-center justify-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      `;
      return;
    }

    const filteredBlocks = this.getFilteredBlocks();

    if (filteredBlocks.length === 0) {
      listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <svg class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">
            ${this.state.filter || this.state.categoryFilter ? 'No blocks match your filters' : 'No blocks defined yet'}
          </p>
          ${
            this.config.mode !== 'picker' && !this.state.filter && !this.state.categoryFilter
              ? `
            <button
              type="button"
              data-block-create-empty
              class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first block
            </button>
          `
              : ''
          }
        </div>
      `;

      listEl.querySelector('[data-block-create-empty]')?.addEventListener('click', () => {
        this.showBlockEditor(null);
      });
      return;
    }

    // Group blocks by category
    const groupedBlocks = new Map<string, BlockDefinition[]>();
    for (const block of filteredBlocks) {
      const category = block.category || 'custom';
      if (!groupedBlocks.has(category)) {
        groupedBlocks.set(category, []);
      }
      groupedBlocks.get(category)!.push(block);
    }

    let html = '';
    for (const [category, blocks] of groupedBlocks) {
      html += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${titleCase(category)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${blocks.map((block) => this.renderBlockCard(block)).join('')}
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;
  }

  private renderBlockCard(block: BlockDefinition): string {
    const isManageMode = this.config.mode !== 'picker';
    const isAllowed = this.isBlockAllowed(block);
    const statusBadge = this.getStatusBadge(block.status);
    const blockKey = this.blockKey(block);

    return `
      <div
        data-block-id="${block.id}"
        class="relative p-4 border rounded-lg ${
          isAllowed
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
        } transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${block.icon || blockKey.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${escapeHtml(block.name)}</h4>
              ${statusBadge}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${escapeHtml(blockKey)}</p>
            ${
              block.description
                ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${escapeHtml(block.description)}</p>`
                : ''
            }
            ${
              block.schema_version
                ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${escapeHtml(block.schema_version)}</p>`
                : ''
            }
          </div>
        </div>

        ${
          isManageMode
            ? `
          <div class="absolute top-2 right-2 flex items-center gap-1">
            <button
              type="button"
              data-block-versions
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Version history"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
            ${
              block.status === 'draft'
                ? `
              <button
                type="button"
                data-block-publish
                class="p-1.5 text-green-500 hover:text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                title="Publish"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            `
                : ''
            }
            <button
              type="button"
              data-block-clone
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clone"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-edit
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-delete
              class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        `
            : ''
        }

        ${!isAllowed ? `<div class="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 rounded-lg"><span class="text-xs text-gray-500 dark:text-gray-400">Not allowed</span></div>` : ''}
      </div>
    `;
  }

  private getStatusBadge(status?: string): string {
    switch (status) {
      case 'draft':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>';
      case 'deprecated':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Deprecated</span>';
      case 'active':
      default:
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>';
    }
  }

  private getFilteredBlocks(): BlockDefinition[] {
    let blocks = [...this.state.blocks];

    // Apply search filter
    if (this.state.filter) {
      const searchLower = this.state.filter.toLowerCase();
      blocks = blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          b.type.toLowerCase().includes(searchLower) ||
          (b.slug?.toLowerCase().includes(searchLower) ?? false) ||
          (b.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Apply category filter
    if (this.state.categoryFilter) {
      blocks = blocks.filter((b) => b.category === this.state.categoryFilter);
    }

    return blocks;
  }

  private blockKey(block: BlockDefinition): string {
    return (block.slug || block.type || '').trim();
  }

  private blockInList(list: string[] | undefined, block: BlockDefinition): boolean {
    if (!list || list.length === 0) return false;
    const key = this.blockKey(block);
    if (key && list.includes(key)) return true;
    if (block.slug && list.includes(block.type)) return true;
    return false;
  }

  private isBlockAllowed(block: BlockDefinition): boolean {
    const { allowedBlocks, deniedBlocks } = this.config;

    if (this.blockInList(deniedBlocks, block)) {
      return false;
    }

    if (allowedBlocks && allowedBlocks.length > 0) {
      return this.blockInList(allowedBlocks, block);
    }

    return true;
  }

  private showBlockEditor(block: BlockDefinition | null): void {
    const editor = new BlockDefinitionEditor({
      apiBasePath: this.config.apiBasePath,
      block,
      categories: this.categories,
      onSave: async (savedBlock) => {
        await this.loadBlocks();
      },
      onCancel: () => {},
    });
    editor.show();
  }

  private async confirmDeleteBlock(block: BlockDefinition): Promise<void> {
    const confirmed = confirm(`Are you sure you want to delete the block "${block.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await this.api.deleteBlockDefinition(block.id);
      await this.loadBlocks();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Failed to delete block');
    }
  }

  private async cloneBlock(block: BlockDefinition): Promise<void> {
    const base = (block.slug || block.type || 'block').trim();
    const newSlug = prompt('Enter a unique slug for the cloned block:', `${base}_copy`);
    if (!newSlug) return;

    try {
      await this.api.cloneBlockDefinition(block.id, newSlug, newSlug);
      await this.loadBlocks();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Failed to clone block');
    }
  }

  private async publishBlock(block: BlockDefinition): Promise<void> {
    try {
      await this.api.publishBlockDefinition(block.id);
      await this.loadBlocks();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Failed to publish block');
    }
  }

  private async showVersionHistory(block: BlockDefinition): Promise<void> {
    const viewer = new BlockVersionHistoryViewer({
      apiBasePath: this.config.apiBasePath,
      block,
    });
    viewer.show();
  }

  private showError(message: string): void {
    const errorEl = this.container?.querySelector('[data-block-error]');
    if (!errorEl) return;

    errorEl.classList.remove('hidden');
    const textEl = errorEl.querySelector('p');
    if (textEl) textEl.textContent = message;

    setTimeout(() => {
      errorEl.classList.add('hidden');
    }, 5000);
  }
}

// =============================================================================
// Block Definition Editor
// =============================================================================

interface BlockDefinitionEditorConfig {
  apiBasePath: string;
  block: BlockDefinition | null;
  categories: string[];
  onSave: (block: BlockDefinition) => void;
  onCancel: () => void;
}

class BlockDefinitionEditor {
  private config: BlockDefinitionEditorConfig;
  private api: ContentTypeAPIClient;
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private fields: import('./types').FieldDefinition[] = [];
  private isNew: boolean;

  constructor(config: BlockDefinitionEditorConfig) {
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
    this.isNew = !config.block;

    if (config.block?.schema) {
      this.fields = schemaToFields(config.block.schema);
    }
  }

  show(): void {
    this.render();
    this.bindEvents();
  }

  hide(): void {
    if (this.backdrop) {
      this.backdrop.classList.add('opacity-0');
      setTimeout(() => {
        this.backdrop?.remove();
        this.backdrop = null;
        this.container = null;
      }, 150);
    }
  }

  private render(): void {
    const block = this.config.block;

    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0';

    this.container = document.createElement('div');
    this.container.className =
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden';

    this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${this.isNew ? 'Create Block Definition' : 'Edit Block Definition'}
        </h2>
        <button type="button" data-editor-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <form data-block-form class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${escapeHtml(block?.name ?? '')}"
                placeholder="Hero Section"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${escapeHtml(block?.type ?? '')}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${block ? 'readonly' : ''}
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${block ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            >${escapeHtml(block?.description ?? '')}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                name="category"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ${this.config.categories.map((cat) => `<option value="${cat}" ${block?.category === cat ? 'selected' : ''}>${titleCase(cat)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <input
                type="text"
                name="icon"
                value="${escapeHtml(block?.icon ?? '')}"
                placeholder="emoji or text"
                maxlength="2"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Block Fields</h3>
              <button
                type="button"
                data-add-field
                class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Field
              </button>
            </div>
            <div data-fields-list class="space-y-2">
              ${this.renderFieldsList()}
            </div>
          </div>
        </form>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-editor-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-editor-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ${this.isNew ? 'Create Block' : 'Save Changes'}
        </button>
      </div>
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });
  }

  private renderFieldsList(): string {
    if (this.fields.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No fields defined. Click "Add Field" to start.</p>
        </div>
      `;
    }

    return this.fields
      .map(
        (field, index) => `
        <div class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-field-index="${index}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(field.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${escapeHtml(field.name)}</span>
              <span class="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${field.type}</span>
              ${field.required ? '<span class="text-xs text-red-500">required</span>' : ''}
            </div>
          </div>
          <button type="button" data-edit-field="${index}" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button type="button" data-remove-field="${index}" class="p-1 text-gray-400 hover:text-red-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `
      )
      .join('');
  }

  private bindEvents(): void {
    if (!this.container || !this.backdrop) return;

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.config.onCancel();
        this.hide();
      }
    });

    this.container.querySelector('[data-editor-close]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    this.container.querySelector('[data-editor-cancel]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    this.container.querySelector('[data-editor-save]')?.addEventListener('click', () => {
      this.handleSave();
    });

    this.container.querySelector('[data-add-field]')?.addEventListener('click', () => {
      this.showFieldTypePicker();
    });

    // Delegate field events
    this.container.querySelector('[data-fields-list]')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const editBtn = target.closest('[data-edit-field]');
      if (editBtn) {
        const index = parseInt(editBtn.getAttribute('data-edit-field') ?? '-1', 10);
        if (index >= 0 && this.fields[index]) {
          this.showFieldConfigForm(this.fields[index], index);
        }
        return;
      }

      const removeBtn = target.closest('[data-remove-field]');
      if (removeBtn) {
        const index = parseInt(removeBtn.getAttribute('data-remove-field') ?? '-1', 10);
        if (index >= 0) {
          this.fields.splice(index, 1);
          this.updateFieldsList();
        }
        return;
      }
    });
  }

  private showFieldTypePicker(): void {
    const picker = new FieldTypePicker({
      onSelect: (fieldType) => {
        const newField: import('./types').FieldDefinition = {
          id: generateFieldId(),
          name: '',
          type: fieldType,
          label: '',
          required: false,
        };
        this.showFieldConfigForm(newField, -1);
      },
      onCancel: () => {},
      excludeTypes: ['blocks', 'repeater'], // Blocks can't nest blocks
    });
    picker.show();
  }

  private showFieldConfigForm(field: import('./types').FieldDefinition, index: number): void {
    const form = new FieldConfigForm({
      field,
      existingFieldNames: this.fields.filter((_, i) => i !== index).map((f) => f.name),
      onSave: (updatedField) => {
        if (index >= 0) {
          this.fields[index] = updatedField;
        } else {
          this.fields.push(updatedField);
        }
        this.updateFieldsList();
      },
      onCancel: () => {},
    });
    form.show();
  }

  private updateFieldsList(): void {
    const listEl = this.container?.querySelector('[data-fields-list]');
    if (listEl) {
      listEl.innerHTML = this.renderFieldsList();
    }
  }

  private async handleSave(): Promise<void> {
    const form = this.container?.querySelector<HTMLFormElement>('[data-block-form]');
    if (!form) return;

    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim();
    const type = (formData.get('type') as string)?.trim();

    if (!name || !type) {
      alert('Name and Type are required');
      return;
    }

    if (!/^[a-z][a-z0-9_\-]*$/.test(type)) {
      alert('Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.');
      return;
    }

    const schema = fieldsToSchema(this.fields, type);

    const blockData: Partial<BlockDefinition> = {
      name,
      type,
      description: (formData.get('description') as string)?.trim() || undefined,
      category: (formData.get('category') as string) || 'custom',
      icon: (formData.get('icon') as string)?.trim() || undefined,
      schema,
      status: this.config.block?.status ?? 'draft',
    };

    try {
      let savedBlock: BlockDefinition;
      if (this.isNew) {
        savedBlock = await this.api.createBlockDefinition(blockData);
      } else {
        savedBlock = await this.api.updateBlockDefinition(this.config.block!.id, blockData);
      }
      this.config.onSave(savedBlock);
      this.hide();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save block');
    }
  }
}

// =============================================================================
// Block Version History Viewer
// =============================================================================

interface BlockVersionHistoryViewerConfig {
  apiBasePath: string;
  block: BlockDefinition;
}

class BlockVersionHistoryViewer {
  private config: BlockVersionHistoryViewerConfig;
  private api: ContentTypeAPIClient;
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private versions: BlockSchemaVersion[] = [];

  constructor(config: BlockVersionHistoryViewerConfig) {
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
  }

  async show(): Promise<void> {
    this.render();
    this.bindEvents();
    await this.loadVersions();
  }

  hide(): void {
    if (this.backdrop) {
      this.backdrop.classList.add('opacity-0');
      setTimeout(() => {
        this.backdrop?.remove();
        this.backdrop = null;
        this.container = null;
      }, 150);
    }
  }

  private render(): void {
    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0';

    this.container = document.createElement('div');
    this.container.className =
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden';

    this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(this.config.block.name)} (${escapeHtml(this.config.block.slug || this.config.block.type)})</p>
        </div>
        <button type="button" data-viewer-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-versions-list class="p-4">
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });
  }

  private bindEvents(): void {
    this.backdrop?.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.hide();
    });

    this.container?.querySelector('[data-viewer-close]')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private async loadVersions(): Promise<void> {
    try {
      const result = await this.api.getBlockDefinitionVersions(this.config.block.id);
      this.versions = result.versions;
      this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }

  private renderVersionsList(): void {
    const listEl = this.container?.querySelector('[data-versions-list]');
    if (!listEl) return;

    if (this.versions.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${escapeHtml(this.config.block.schema_version ?? '1.0.0')}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="space-y-3">
        ${this.versions
          .map(
            (version) => `
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${escapeHtml(version.version)}</span>
                ${version.is_breaking ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ''}
                ${this.getMigrationBadge(version.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(version.created_at)}</span>
            </div>
            ${
              version.migration_status && version.total_count
                ? `
              <div class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Migration Progress</span>
                  <span>${version.migrated_count ?? 0}/${version.total_count}</span>
                </div>
                <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${((version.migrated_count ?? 0) / version.total_count) * 100}%"></div>
                </div>
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private getMigrationBadge(status?: string): string {
    switch (status) {
      case 'pending':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>';
      case 'in_progress':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Migrating</span>';
      case 'completed':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Migrated</span>';
      case 'failed':
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Failed</span>';
      default:
        return '';
    }
  }
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Auto-initialization
// =============================================================================

export function initBlockLibraryManagers(scope: ParentNode = document): void {
  const triggers = Array.from(scope.querySelectorAll<HTMLElement>('[data-block-library-trigger]'));

  triggers.forEach((trigger) => {
    if (trigger.dataset.initialized === 'true') return;

    const apiBasePath = trigger.dataset.apiBasePath ?? '/admin';
    const mode = (trigger.dataset.mode as 'manage' | 'picker') ?? 'manage';

    if (mode === 'manage') {
      // Manage mode navigates to the Block Library IDE page
      trigger.addEventListener('click', () => {
        window.location.href = `${apiBasePath}/block_definitions`;
      });
    } else {
      // Picker mode opens the modal for block selection
      const config: BlockLibraryManagerConfig = {
        apiBasePath,
        mode,
      };

      trigger.addEventListener('click', () => {
        const manager = new BlockLibraryManager(config);
        manager.show();
      });
    }

    trigger.dataset.initialized = 'true';
  });
}

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => initBlockLibraryManagers());

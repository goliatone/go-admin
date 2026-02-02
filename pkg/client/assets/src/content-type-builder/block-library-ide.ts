/**
 * Block Library IDE
 *
 * Full-page Block Library IDE controller for the three-column layout.
 * Phase 7: Block List Panel (left column)
 * Phase 8: Block Editor Panel (center column) — metadata, field cards, sections
 */

import type { BlockDefinition, BlockDefinitionStatus, FieldDefinition, FieldTypeMetadata } from './types';
import { ContentTypeAPIClient, ContentTypeAPIError, fieldsToBlockSchema, generateFieldId } from './api-client';
import { BlockEditorPanel } from './block-editor-panel';
import { FieldPalettePanel } from './field-palette-panel';
import { Modal } from '../shared/modal';
import { inputClasses, selectClasses } from './shared/field-input-classes';

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
// Constants
// =============================================================================

const DEFAULT_BLOCK_CATEGORIES = ['content', 'media', 'layout', 'interactive', 'custom'];

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

  // Autosave system (Phase 11)
  private autosaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static readonly AUTOSAVE_DELAY = 1500;
  private boundVisibilityChange: (() => void) | null = null;
  private boundBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;

  // Responsive layout (Phase 12 — Task 12.1)
  private sidebarEl: HTMLElement | null = null;
  private paletteAsideEl: HTMLElement | null = null;
  private sidebarToggleBtn: HTMLElement | null = null;
  private gridEl: HTMLElement | null = null;
  private addFieldBar: HTMLElement | null = null;
  private paletteTriggerBtn: HTMLElement | null = null;
  private sidebarCollapsed: boolean = false;
  private mediaQueryLg: MediaQueryList | null = null;
  private popoverPalettePanel: FieldPalettePanel | null = null;

  // Environment (Phase 12 — Tasks 12.2 + 12.3)
  private envSelectEl: HTMLSelectElement | null = null;
  private currentEnvironment: string = '';

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
    this.bindAutosaveListeners();
    this.bindResponsive();
    this.initEnvironment();
    await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }

  /** Initialize the field palette panel (Phase 9) */
  private initPalette(): void {
    if (!this.paletteEl) return;
    this.palettePanel = new FieldPalettePanel({
      container: this.paletteEl,
      api: this.api,
      onAddField: (meta) => this.handlePaletteAddField(meta),
    });
    this.palettePanel.init();
  }

  // ===========================================================================
  // Autosave system (Phase 11 — Task 11.1)
  // ===========================================================================

  /** Set up global listeners for autosave: Ctrl+S, visibility change, beforeunload */
  private bindAutosaveListeners(): void {
    // Ctrl+S / Cmd+S manual save
    this.root.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentBlock();
      }
    });

    // Save on page visibility change (tab switch, minimize)
    this.boundVisibilityChange = () => {
      if (document.hidden) {
        this.saveAllDirty();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

    // Warn before leaving with unsaved changes
    this.boundBeforeUnload = (e: BeforeUnloadEvent) => {
      if (this.state.dirtyBlocks.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', this.boundBeforeUnload);
  }

  /** Persist a dirty block to the backend */
  async saveBlock(blockId: string): Promise<boolean> {
    if (!this.state.dirtyBlocks.has(blockId)) return true;

    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block) return false;

    this.cancelScheduledSave(blockId);
    this.markSaving(blockId);
    this.notifySaveState(blockId, 'saving');

    try {
      const updated = await this.api.updateBlockDefinition(blockId, {
        name: block.name,
        slug: block.slug,
        type: block.type,
        description: block.description,
        category: block.category,
        icon: block.icon,
        schema: block.schema,
        ui_schema: block.ui_schema,
      });
      this.updateBlockInState(blockId, updated);
      this.markClean(blockId);
      this.notifySaveState(blockId, 'saved');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      this.markSaveError(blockId, msg);
      this.notifySaveState(blockId, 'error', msg);
      return false;
    }
  }

  /** Schedule an autosave after the debounce delay */
  private scheduleSave(blockId: string): void {
    this.cancelScheduledSave(blockId);
    const timer = setTimeout(() => {
      this.autosaveTimers.delete(blockId);
      this.saveBlock(blockId);
    }, BlockLibraryIDE.AUTOSAVE_DELAY);
    this.autosaveTimers.set(blockId, timer);
  }

  /** Cancel a pending autosave for a block */
  private cancelScheduledSave(blockId: string): void {
    const timer = this.autosaveTimers.get(blockId);
    if (timer) {
      clearTimeout(timer);
      this.autosaveTimers.delete(blockId);
    }
  }

  /** Save the currently selected block immediately */
  private async saveCurrentBlock(): Promise<void> {
    if (!this.state.selectedBlockId) return;
    await this.saveBlock(this.state.selectedBlockId);
  }

  /** Save all dirty blocks (used on visibility change) */
  private async saveAllDirty(): Promise<void> {
    const dirtyIds = [...this.state.dirtyBlocks];
    await Promise.all(dirtyIds.map((id) => this.saveBlock(id)));
  }

  /** Notify the editor panel of a save state change */
  private notifySaveState(blockId: string, state: 'saving' | 'saved' | 'error', message?: string): void {
    if (this.editorPanel && this.state.selectedBlockId === blockId) {
      this.editorPanel.updateSaveState(state, message);
    }
  }

  // ===========================================================================
  // Status lifecycle (Phase 11 — Task 11.3)
  // ===========================================================================

  /** Handle status changes from the editor dropdown (publish/deprecate flow) */
  private async handleEditorStatusChange(blockId: string, newStatus: BlockDefinitionStatus): Promise<void> {
    const block = this.state.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const oldStatus = block.status;
    if (oldStatus === newStatus) return;

    // Save any pending changes first
    if (this.state.dirtyBlocks.has(blockId)) {
      const saved = await this.saveBlock(blockId);
      if (!saved) {
        this.showToast('Please fix save errors before changing status.', 'error');
        this.editorPanel?.revertStatus(oldStatus);
        return;
      }
    }

    // Call the appropriate lifecycle API
    try {
      let updated: BlockDefinition;
      if (newStatus === 'active') {
        updated = await this.api.publishBlockDefinition(blockId);
        this.showToast('Block published.', 'success');
      } else if (newStatus === 'deprecated') {
        updated = await this.api.deprecateBlockDefinition(blockId);
        this.showToast('Block deprecated.', 'info');
      } else {
        // Revert to draft via regular update
        updated = await this.api.updateBlockDefinition(blockId, { status: 'draft' });
        this.showToast('Block reverted to draft.', 'info');
      }
      this.updateBlockInState(blockId, updated);
      this.renderBlockList();
      // Refresh editor to reflect new status
      if (this.editorPanel && this.state.selectedBlockId === blockId) {
        const refreshed = this.state.blocks.find((b) => b.id === blockId);
        if (refreshed) this.editorPanel.update(refreshed);
      }
    } catch (err) {
      const fallbackMessage =
        newStatus === 'active' ? 'Block published.' : newStatus === 'deprecated' ? 'Block deprecated.' : 'Block reverted to draft.';
      if (err instanceof ContentTypeAPIError && [404, 405, 501].includes(err.status)) {
        try {
          const updated = await this.api.updateBlockDefinition(blockId, { status: newStatus });
          this.updateBlockInState(blockId, updated);
          this.renderBlockList();
          if (this.editorPanel && this.state.selectedBlockId === blockId) {
            const refreshed = this.state.blocks.find((b) => b.id === blockId);
            if (refreshed) this.editorPanel.update(refreshed);
          }
          this.showToast(fallbackMessage, newStatus === 'active' ? 'success' : 'info');
          return;
        } catch (fallbackErr) {
          console.error('Status change fallback failed:', fallbackErr);
        }
      }
      const msg = err instanceof Error ? err.message : 'Status change failed';
      console.error('Status change failed:', err);
      this.showToast(msg, 'error');
      this.editorPanel?.revertStatus(oldStatus);
    }
  }

  // ===========================================================================
  // Responsive layout (Phase 12 — Task 12.1)
  // ===========================================================================

  /** Set up media query listeners and responsive behaviors */
  private bindResponsive(): void {
    // Sidebar toggle
    this.sidebarToggleBtn?.addEventListener('click', () => this.toggleSidebar());

    // Palette popover trigger (visible on < lg screens)
    this.paletteTriggerBtn?.addEventListener('click', () => {
      if (this.paletteTriggerBtn) {
        this.openPalettePopover(this.paletteTriggerBtn);
      }
    });

    // Media query for lg breakpoint — auto-close popover when returning to desktop
    this.mediaQueryLg = window.matchMedia('(min-width: 1024px)');
    this.mediaQueryLg.addEventListener('change', () => this.handleBreakpointChange());
  }

  /** React to viewport breakpoint changes */
  private handleBreakpointChange(): void {
    const isLg = this.mediaQueryLg?.matches ?? true;
    if (isLg) {
      this.closePalettePopover();
    }
  }

  /** Toggle the left sidebar collapsed state */
  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;

    if (this.sidebarEl) {
      this.sidebarEl.classList.toggle('hidden', this.sidebarCollapsed);
    }

    if (this.gridEl) {
      if (this.sidebarCollapsed) {
        this.gridEl.classList.remove('md:grid-cols-[240px,1fr]', 'lg:grid-cols-[240px,1fr,260px]');
        this.gridEl.classList.add('md:grid-cols-[1fr]', 'lg:grid-cols-[1fr,260px]');
      } else {
        this.gridEl.classList.remove('md:grid-cols-[1fr]', 'lg:grid-cols-[1fr,260px]');
        this.gridEl.classList.add('md:grid-cols-[240px,1fr]', 'lg:grid-cols-[240px,1fr,260px]');
      }
    }

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.setAttribute('title', this.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar');
    }
  }

  /** Open the field palette as a popover overlay (< lg screens) */
  private openPalettePopover(anchor: HTMLElement): void {
    this.closePalettePopover();

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-40';
    backdrop.dataset.paletteBackdrop = '';
    backdrop.addEventListener('click', () => this.closePalettePopover());

    // Popover container
    const popover = document.createElement('div');
    popover.className = 'fixed z-50 w-72 max-h-[60vh] bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden';
    popover.dataset.palettePopover = '';

    popover.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add Field</h3>
        <button type="button" data-palette-popover-close
                class="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto" data-palette-popover-content></div>
    `;

    popover.querySelector('[data-palette-popover-close]')?.addEventListener('click', () => this.closePalettePopover());

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    const popoverWidth = 288;
    let left = rect.left;
    let top = rect.top - 8; // Above the button

    // Ensure stays on screen
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    // Prefer showing above the button; if not enough space, show below
    const estimatedHeight = Math.min(window.innerHeight * 0.6, 480);
    if (top - estimatedHeight < 16) {
      top = rect.bottom + 8;
    } else {
      top = top - estimatedHeight;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    document.body.appendChild(backdrop);
    document.body.appendChild(popover);

    // Initialize a palette panel inside the popover
    const content = popover.querySelector<HTMLElement>('[data-palette-popover-content]');
    if (content) {
      this.popoverPalettePanel = new FieldPalettePanel({
        container: content,
        api: this.api,
        onAddField: (meta) => {
          this.handlePaletteAddField(meta);
          this.closePalettePopover();
        },
      });
      this.popoverPalettePanel.init();
      if (this.state.selectedBlockId) {
        this.popoverPalettePanel.enable();
      }
    }
  }

  /** Close the palette popover if open */
  private closePalettePopover(): void {
    document.querySelector('[data-palette-backdrop]')?.remove();
    document.querySelector('[data-palette-popover]')?.remove();
    this.popoverPalettePanel = null;
  }

  /** Show or hide the "Add Field" bar based on whether a block is selected */
  private updateAddFieldBar(): void {
    if (this.addFieldBar) {
      this.addFieldBar.classList.toggle('hidden', !this.state.selectedBlockId);
    }
  }

  // ===========================================================================
  // Environment management (Phase 12 — Tasks 12.2 + 12.3)
  // ===========================================================================

  /** Initialize environment from URL param and session, bind selector */
  private initEnvironment(): void {
    // Read from URL
    const urlParams = new URLSearchParams(window.location.search);
    const envFromUrl = urlParams.get('env') ?? '';

    // Fall back to session storage
    const envFromSession = sessionStorage.getItem('block-library-env') ?? '';

    this.currentEnvironment = envFromUrl || envFromSession;

    // Set on API client
    this.api.setEnvironment(this.currentEnvironment);

    // Update selector
    if (this.envSelectEl) {
      this.ensureEnvironmentOption(this.currentEnvironment);
      this.ensureEnvironmentOption('__add__', 'Add environment...');
      this.envSelectEl.value = this.currentEnvironment;
      this.envSelectEl.addEventListener('change', () => {
        const value = this.envSelectEl!.value;
        if (value === '__add__') {
          this.promptForEnvironment();
          return;
        }
        this.setEnvironment(value);
      });
    }

    // Sync URL if env came from session but not URL
    if (this.currentEnvironment && !envFromUrl) {
      this.updateUrlEnvironment(this.currentEnvironment);
    }

    if (this.currentEnvironment) {
      this.api.setEnvironmentSession(this.currentEnvironment).catch(() => {
        // Ignore session persistence errors
      });
    }
  }

  /** Change the active environment and reload data */
  private async setEnvironment(env: string): Promise<void> {
    this.currentEnvironment = env;
    this.api.setEnvironment(env);

    if (this.envSelectEl) {
      this.ensureEnvironmentOption(env);
      this.envSelectEl.value = env;
    }

    // Persist to session
    if (env) {
      sessionStorage.setItem('block-library-env', env);
    } else {
      sessionStorage.removeItem('block-library-env');
    }

    // Persist to server session (best-effort)
    try {
      await this.api.setEnvironmentSession(env);
    } catch {
      // Ignore session persistence errors
    }

    // Update URL
    this.updateUrlEnvironment(env);

    // Reset state and reload
    this.state.selectedBlockId = null;
    this.state.dirtyBlocks.clear();
    this.state.savingBlocks.clear();
    this.state.saveErrors.clear();
    this.editorPanel = null;
    this.renderEditor();

    await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }

  /** Update the ?env= query parameter in the URL without a page reload */
  private updateUrlEnvironment(env: string): void {
    const url = new URL(window.location.href);
    if (env) {
      url.searchParams.set('env', env);
    } else {
      url.searchParams.delete('env');
    }
    window.history.replaceState({}, '', url.toString());
  }

  /** Ensure the environment select contains a specific option */
  private ensureEnvironmentOption(value: string, label?: string): void {
    if (!this.envSelectEl) return;
    const val = value ?? '';
    if (val === '' || Array.from(this.envSelectEl.options).some((opt) => opt.value === val)) {
      return;
    }
    const option = document.createElement('option');
    option.value = val;
    option.textContent = label ?? val;
    this.envSelectEl.appendChild(option);
  }

  private promptForEnvironment(): void {
    if (!this.envSelectEl) return;
    const previous = this.currentEnvironment;
    const modal = new TextPromptModal({
      title: 'Add Environment',
      label: 'Environment name',
      placeholder: 'e.g. staging',
      confirmLabel: 'Add',
      onConfirm: (value) => {
        const env = value.trim();
        if (!env) return;
        this.ensureEnvironmentOption(env);
        this.envSelectEl!.value = env;
        this.setEnvironment(env);
      },
      onCancel: () => {
        this.envSelectEl!.value = previous;
      },
    });
    modal.show();
  }

  // ===========================================================================
  // Public API (for cross-panel communication in later phases)
  // ===========================================================================

  getSelectedBlock(): BlockDefinition | null {
    if (!this.state.selectedBlockId) return null;
    return this.state.blocks.find((b) => b.id === this.state.selectedBlockId) ?? null;
  }

  selectBlock(blockId: string | null): void {
    // Save-on-blur: flush any pending autosave for the previous block (Phase 11)
    const prevId = this.state.selectedBlockId;
    if (prevId && prevId !== blockId && this.state.dirtyBlocks.has(prevId)) {
      this.cancelScheduledSave(prevId);
      this.saveBlock(prevId);
    }

    this.state.selectedBlockId = blockId;

    // Reset save indicator when switching blocks
    if (this.editorPanel && prevId !== blockId) {
      this.editorPanel.updateSaveState('idle');
    }

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
    // Phase 12: responsive + environment elements
    this.sidebarEl = this.root.querySelector('[data-block-ide-sidebar]');
    this.paletteAsideEl = this.root.querySelector('[data-block-ide-palette-aside]');
    this.gridEl = this.root.querySelector('[data-block-ide-grid]');
    this.addFieldBar = this.root.querySelector('[data-block-ide-add-field-bar]');
    this.paletteTriggerBtn = this.root.querySelector('[data-block-ide-palette-trigger]');
    // Sidebar toggle and env selector may be outside root (in the header)
    this.sidebarToggleBtn = document.querySelector('[data-block-ide-sidebar-toggle]');
    this.envSelectEl = document.querySelector('[data-block-ide-env]');
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
      this.state.blocks = response.items.map((block) => this.normalizeBlockDefinition(block));
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Failed to load blocks';
    } finally {
      this.state.isLoading = false;
      this.refreshCategoriesFromBlocks();
      this.renderBlockList();
      this.updateCount();
    }
  }

  private async loadCategories(): Promise<void> {
    this.state.categories = [];
    this.mergeCategories(DEFAULT_BLOCK_CATEGORIES);
    this.mergeCategories(this.loadUserCategories());
    try {
      const apiCategories = await this.api.getBlockCategories();
      this.mergeCategories(apiCategories);
    } catch {
      // Categories will be derived from loaded blocks in refreshCategoriesFromBlocks
    }
    this.renderCategoryOptions();
    this.updateCreateCategorySelect();
  }

  private refreshCategoriesFromBlocks(): void {
    if (this.state.categories.length === 0) {
      this.mergeCategories(DEFAULT_BLOCK_CATEGORIES);
      this.mergeCategories(this.loadUserCategories());
    }
    const seen = new Set<string>(this.state.categories.map((cat) => this.normalizeCategory(cat)));
    this.state.categories = Array.from(seen);
    for (const block of this.state.blocks) {
      const cat = this.normalizeCategory(block.category || '');
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        this.state.categories.push(cat);
      }
    }
    this.renderCategoryOptions();
    this.updateCreateCategorySelect();
  }

  private normalizeCategory(value: string): string {
    return value.trim().toLowerCase();
  }

  private mergeCategories(categories: string[]): void {
    for (const raw of categories) {
      const cat = this.normalizeCategory(raw);
      if (!cat) continue;
      if (!this.state.categories.includes(cat)) {
        this.state.categories.push(cat);
      }
    }
  }

  private loadUserCategories(): string[] {
    try {
      const raw = sessionStorage.getItem('block-library-user-categories');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((cat) => this.normalizeCategory(cat)).filter((cat) => cat.length > 0);
    } catch {
      return [];
    }
  }

  private persistUserCategories(): void {
    const userCats = this.state.categories.filter((cat) => !DEFAULT_BLOCK_CATEGORIES.includes(cat));
    try {
      sessionStorage.setItem('block-library-user-categories', JSON.stringify(userCats));
    } catch {
      // Ignore storage errors
    }
  }

  private addCategory(category: string): string | null {
    const normalized = this.normalizeCategory(category);
    if (!normalized) return null;
    if (!this.state.categories.includes(normalized)) {
      this.state.categories.push(normalized);
      this.persistUserCategories();
      this.renderCategoryOptions();
      this.updateCreateCategorySelect(normalized);
      this.renderEditor();
    }
    return normalized;
  }

  private updateCreateCategorySelect(selected?: string): void {
    const select = this.listEl?.querySelector<HTMLSelectElement>('[data-create-category]');
    if (!select) return;
    const current = selected ?? select.value;
    select.innerHTML = this.state.categories
      .map((c) => `<option value="${esc(c)}">${esc(titleCase(c))}</option>`)
      .join('');
    select.innerHTML += '<option value="__add__">Add category...</option>';
    if (current && this.state.categories.includes(current)) {
      select.value = current;
    }
  }

  private promptForCategory(select: HTMLSelectElement, previousValue: string): void {
    const modal = new TextPromptModal({
      title: 'Add Category',
      label: 'Category name',
      placeholder: 'e.g. marketing',
      confirmLabel: 'Add',
      onConfirm: (value) => {
        const added = this.addCategory(value);
        if (added) {
          this.updateCreateCategorySelect(added);
          select.value = added;
          select.dataset.prevValue = added;
          return;
        }
        select.value = previousValue;
      },
      onCancel: () => {
        select.value = previousValue;
      },
    });
    modal.show();
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
          <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${hasFilters ? 'No blocks match your filters.' : 'No blocks yet.'}</p>
          ${!hasFilters ? '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Block" to create your first block definition.</p>' : ''}
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

    // Focus create form name input if just opened + auto-slug generation
    if (this.state.isCreating) {
      const nameInput = this.listEl.querySelector<HTMLInputElement>('[data-create-name]');
      const slugInput = this.listEl.querySelector<HTMLInputElement>('[data-create-slug]');
      const categorySelect = this.listEl.querySelector<HTMLSelectElement>('[data-create-category]');
      nameInput?.focus();
      if (nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
          if (!slugInput.dataset.userModified) {
            slugInput.value = nameToSlug(nameInput.value);
          }
        });
        slugInput.addEventListener('input', () => {
          slugInput.dataset.userModified = 'true';
        });
      }
      if (categorySelect) {
        categorySelect.dataset.prevValue = categorySelect.value;
        categorySelect.addEventListener('change', () => {
          const value = categorySelect.value;
          if (value === '__add__') {
            const previous = categorySelect.dataset.prevValue ?? '';
            this.promptForCategory(categorySelect, previous);
            return;
          }
          categorySelect.dataset.prevValue = value;
        });
      }
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
    const slugOrType = block.slug || block.type || '';

    const selectedClass = isSelected
      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent';

    const nameHtml = isRenaming
      ? `<input type="text" data-rename-input data-rename-block-id="${esc(block.id)}"
               value="${esc(block.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />`
      : `<span class="block font-medium text-gray-800 dark:text-gray-100 truncate text-[13px]">${esc(block.name || 'Untitled')}</span>`;

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
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${block.icon ? `<span class="text-xs font-medium">${esc(block.icon)}</span>` : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>`}
          </span>
          <span class="flex-1 min-w-0">
            ${nameHtml}
            <span class="block text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">${esc(slugOrType)}</span>
          </span>
          ${indicatorHtml}
          <button type="button" data-block-actions="${esc(block.id)}"
                  class="flex-shrink-0 p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
        <div class="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 space-y-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Name</label>
            <input type="text" data-create-name placeholder="e.g. Hero Section"
                   class="${inputClasses()}" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="${inputClasses()} font-mono" />
            <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Category</label>
            <select data-create-category
                    class="${selectClasses()}">
              ${this.state.categories.map((c) => `<option value="${esc(c)}">${esc(titleCase(c))}</option>`).join('')}
              <option value="__add__">Add category...</option>
            </select>
          </div>
          <div data-create-error class="hidden text-xs text-red-600 dark:text-red-400"></div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" data-create-save
                    class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create
            </button>
            <button type="button" data-create-cancel
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
      'absolute z-50 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-gray-700 dark:text-gray-300';

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
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${item.danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </button>`
      )
      .join('');

    // Position relative to anchor
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 176; // w-44
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;

    // Prefer left-aligning with the button; shift left if it would overflow the viewport
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;
    menu.style.left = `${left}px`;

    // Prevent vertical off-screen
    document.body.appendChild(menu);
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 8) {
      menu.style.top = `${rect.top - menuRect.height - 4}px`;
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
          <svg class="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">Select a block from the list to edit</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">or create a new block to get started</p>
        </div>`;
      // Disable palette when no block is selected (Phase 9)
      this.palettePanel?.disable();
      this.updateAddFieldBar();
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
        onFieldDrop: (meta) => this.handlePaletteAddField(meta),
        onStatusChange: (blockId, newStatus) => this.handleEditorStatusChange(blockId, newStatus),
        onSave: (blockId) => this.saveBlock(blockId),
      });
      this.editorPanel.render();
    }

    // Enable palette when a block is selected (Phase 9)
    this.palettePanel?.enable();
    this.updateAddFieldBar();
  }

  private handleEditorMetadataChange(blockId: string, patch: Partial<BlockDefinition>): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const prev = this.state.blocks[idx];
    const next = { ...prev, ...patch };
    if (patch.slug !== undefined && patch.slug !== prev.slug) {
      const newSlug = (patch.slug ?? '').trim();
      if (newSlug) {
        if (!patch.type && (!prev.type || prev.type === prev.slug)) {
          next.type = newSlug;
          patch.type = newSlug;
        }
        if (next.schema && typeof next.schema === 'object') {
          next.schema = { ...next.schema, $id: newSlug };
        }
      }
    }
    this.state.blocks[idx] = next;
    this.markDirty(blockId);
    // Update the block name/slug in the sidebar without a full list re-render
    if (patch.name !== undefined || patch.status !== undefined || patch.slug !== undefined || patch.type !== undefined) {
      this.updateBlockItemDOM(blockId, next);
    }
    // Schedule autosave (Phase 11)
    this.scheduleSave(blockId);
  }

  private handleEditorSchemaChange(blockId: string, fields: import('./types').FieldDefinition[]): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const currentSchema = this.state.blocks[idx].schema;
    const slug = this.state.blocks[idx].slug || this.state.blocks[idx].type;
    let nextSchema = fieldsToBlockSchema(fields, slug);
    nextSchema = this.mergeSchemaExtras(currentSchema, nextSchema);
    this.state.blocks[idx] = {
      ...this.state.blocks[idx],
      schema: nextSchema,
    };
    this.markDirty(blockId);
    // Schedule autosave (Phase 11)
    this.scheduleSave(blockId);
  }

  /** Handle adding a field from the palette (Phase 9 — click or drop) */
  private handlePaletteAddField(meta: FieldTypeMetadata): void {
    if (!this.editorPanel || !this.state.selectedBlockId) return;

    // Auto-generate defaults for blocks fields (Phase 4 — Task 4.2)
    const isBlocks = meta.type === 'blocks';
    const label = isBlocks ? 'Content Blocks' : (meta?.label ?? titleCase(meta.type));
    const baseName = isBlocks ? 'content_blocks' : meta.type.replace(/-/g, '_');

    // Ensure unique field name
    const existingNames = new Set(this.editorPanel.getFields().map((f) => f.name));
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
      name = isBlocks ? `content_blocks_${counter++}` : `${baseName}_${counter++}`;
    }

    const newField: FieldDefinition = {
      id: generateFieldId(),
      name,
      type: meta.type,
      label: counter > 1 && isBlocks ? `Content Blocks ${counter - 1}` : label,
      required: false,
      ...(meta.defaultConfig ?? {}),
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
          (b.slug?.toLowerCase().includes(q) ?? false) ||
          (b.description?.toLowerCase().includes(q) ?? false)
      );
    }

    if (this.state.categoryFilter) {
      const filter = this.state.categoryFilter.toLowerCase().trim();
      blocks = blocks.filter((b) => (b.category || 'custom').toLowerCase().trim() === filter);
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
    const slugInput = this.listEl?.querySelector<HTMLInputElement>('[data-create-slug]');
    const categorySelect = this.listEl?.querySelector<HTMLSelectElement>('[data-create-category]');
    const errorEl = this.listEl?.querySelector<HTMLElement>('[data-create-error]');

    const name = nameInput?.value.trim() ?? '';
    const slug = slugInput?.value.trim() ?? '';
    let category = categorySelect?.value ?? 'custom';
    if (category === '__add__') {
      category = 'custom';
    }

    if (!name) {
      this.showCreateError(errorEl, 'Name is required.');
      nameInput?.focus();
      return;
    }
    if (!slug) {
      this.showCreateError(errorEl, 'Slug is required.');
      slugInput?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(slug)) {
      this.showCreateError(errorEl, 'Slug must start with a letter and contain only lowercase, numbers, hyphens, underscores.');
      slugInput?.focus();
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
        slug,
        type: slug,
        category,
        status: 'draft',
        schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: {} },
      });

      // Ensure slug is populated from the create form if the API didn't return it
      if (!newBlock.slug) {
        newBlock.slug = slug;
      }
      if (!newBlock.type) {
        newBlock.type = newBlock.slug || slug;
      }
      const normalized = this.normalizeBlockDefinition(newBlock);

      this.state.isCreating = false;
      this.state.blocks.unshift(normalized);
      this.state.selectedBlockId = normalized.id;
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
      this.updateBlockInState(blockId, updated);
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

    const base = (block.slug || block.type || 'block').trim();
    const newSlug = `${base}_copy`;
    const newType = newSlug;

    try {
      const cloned = await this.api.cloneBlockDefinition(blockId, newType, newSlug);
      const normalized = this.normalizeBlockDefinition(cloned);
      this.state.blocks.unshift(normalized);
      this.state.selectedBlockId = normalized.id;
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
    // Save pending changes before publishing (Phase 11)
    if (this.state.dirtyBlocks.has(blockId)) {
      const saved = await this.saveBlock(blockId);
      if (!saved) {
        this.showToast('Please fix save errors before publishing.', 'error');
        return;
      }
    }
    try {
      const updated = await this.api.publishBlockDefinition(blockId);
      this.updateBlockInState(blockId, updated);
      this.renderBlockList();
      this.showToast('Block published.', 'success');
      // Refresh editor if this block is selected
      if (this.state.selectedBlockId === blockId && this.editorPanel) {
        const refreshed = this.state.blocks.find((b) => b.id === blockId);
        if (refreshed) this.editorPanel.update(refreshed);
      }
    } catch (err) {
      console.error('Publish failed:', err);
      this.showToast(err instanceof Error ? err.message : 'Failed to publish block.', 'error');
    }
  }

  private async deprecateBlock(blockId: string): Promise<void> {
    // Save pending changes before deprecating (Phase 11)
    if (this.state.dirtyBlocks.has(blockId)) {
      const saved = await this.saveBlock(blockId);
      if (!saved) {
        this.showToast('Please fix save errors before deprecating.', 'error');
        return;
      }
    }
    try {
      const updated = await this.api.deprecateBlockDefinition(blockId);
      this.updateBlockInState(blockId, updated);
      this.renderBlockList();
      this.showToast('Block deprecated.', 'info');
      // Refresh editor if this block is selected
      if (this.state.selectedBlockId === blockId && this.editorPanel) {
        const refreshed = this.state.blocks.find((b) => b.id === blockId);
        if (refreshed) this.editorPanel.update(refreshed);
      }
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

  /** Update a single block item in the sidebar DOM without re-rendering the entire list */
  private updateBlockItemDOM(blockId: string, block: BlockDefinition): void {
    const itemEl = this.listEl?.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    if (!itemEl) return;

    // The text container is the <span class="flex-1 min-w-0"> with two child spans
    const textContainer = itemEl.querySelector<HTMLElement>('.flex-1.min-w-0');
    if (!textContainer) return;

    const spans = textContainer.querySelectorAll<HTMLElement>(':scope > span');
    // First span = name, second span = slug
    if (spans.length >= 1 && !this.state.renamingBlockId) {
      spans[0].textContent = block.name || 'Untitled';
    }
    if (spans.length >= 2) {
      spans[1].textContent = block.slug || block.type || '';
    }
  }

  private updateBlockInState(blockId: string, updated: BlockDefinition): void {
    const idx = this.state.blocks.findIndex((b) => b.id === blockId);
    if (idx >= 0) {
      const current = this.state.blocks[idx];
      const merged = this.mergeBlockDefinition(current, updated);
      this.state.blocks[idx] = merged;
    }
  }

  private normalizeBlockDefinition(block: BlockDefinition): BlockDefinition {
    const normalized = { ...block };
    const slug = (normalized.slug ?? '').trim();
    const typ = (normalized.type ?? '').trim();
    if (!slug && typ) normalized.slug = typ;
    if (!typ && slug) normalized.type = slug;
    return normalized;
  }

  private mergeBlockDefinition(current: BlockDefinition, updated: BlockDefinition): BlockDefinition {
    const merged = { ...current, ...updated };
    const updatedSlug = (updated.slug ?? '').trim();
    const updatedType = (updated.type ?? '').trim();
    if (!updatedSlug && current.slug) merged.slug = current.slug;
    if (!updatedType && current.type) merged.type = current.type;
    const mergedSlug = (merged.slug ?? '').trim();
    const mergedType = (merged.type ?? '').trim();
    if (!mergedSlug && mergedType) merged.slug = mergedType;
    if (!mergedType && mergedSlug) merged.type = mergedSlug;
    return merged;
  }

  private mergeSchemaExtras(current: BlockDefinition['schema'], next: BlockDefinition['schema']): BlockDefinition['schema'] {
    if (!current || typeof current !== 'object') {
      return next;
    }
    const merged = { ...next } as Record<string, unknown>;
    const skip = new Set(['properties', 'required', 'type', '$schema']);
    for (const [key, value] of Object.entries(current)) {
      if (skip.has(key)) continue;
      if (key === '$id') {
        if (!merged['$id'] && value) merged['$id'] = value;
        continue;
      }
      if (!(key in merged)) {
        merged[key] = value;
      }
    }
    return merged as BlockDefinition['schema'];
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Prefer global notify helper
    const notify = (window as any).notify as
      | { success?: (msg: string) => void; error?: (msg: string) => void; info?: (msg: string) => void }
      | undefined;
    const notifyFn = notify?.[type];
    if (typeof notifyFn === 'function') {
      notifyFn(message);
      return;
    }

    // Fallback: show an inline toast notification
    const existing = this.root.querySelector('[data-ide-toast]');
    if (existing) existing.remove();

      const colors = type === 'error'
      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
      : type === 'success'
        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';

    const toast = document.createElement('div');
    toast.setAttribute('data-ide-toast', '');
    toast.className = `fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg border text-sm font-medium shadow-lg ${colors} transition-opacity`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// =============================================================================
// Modals
// =============================================================================

interface TextPromptModalConfig {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

class TextPromptModal extends Modal {
  private config: TextPromptModalConfig;

  constructor(config: TextPromptModalConfig) {
    super({ size: 'sm', initialFocus: '[data-prompt-input]' });
    this.config = config;
  }

  protected renderContent(): string {
    return `
      <div class="p-5">
        <div class="text-base font-semibold text-gray-900 dark:text-white">${esc(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${esc(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${esc(this.config.initialValue ?? '')}"
               placeholder="${esc(this.config.placeholder ?? '')}"
               class="${inputClasses()}" />
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            ${esc(this.config.cancelLabel ?? 'Cancel')}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            ${esc(this.config.confirmLabel ?? 'Save')}
          </button>
        </div>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    const input = this.container?.querySelector<HTMLInputElement>('[data-prompt-input]');
    const errorEl = this.container?.querySelector<HTMLElement>('[data-prompt-error]');
    const confirmBtn = this.container?.querySelector<HTMLButtonElement>('[data-prompt-confirm]');
    const cancelBtn = this.container?.querySelector<HTMLButtonElement>('[data-prompt-cancel]');

    const showError = (message: string): void => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    };

    const handleConfirm = (): void => {
      const value = input?.value.trim() ?? '';
      if (!value) {
        showError('Value is required.');
        input?.focus();
        return;
      }
      this.config.onConfirm(value);
      this.hide();
    };

    confirmBtn?.addEventListener('click', handleConfirm);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    });
    cancelBtn?.addEventListener('click', () => {
      this.config.onCancel?.();
      this.hide();
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

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

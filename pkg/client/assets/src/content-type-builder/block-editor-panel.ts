/**
 * Block Editor Panel
 *
 * Phase 8 implements the inline block editor (center column):
 *   - Block metadata fields (name, slug, description, category, icon, status)
 *   - Inline field cards with expand/collapse accordion (one open at a time)
 *   - Section grouping with collapsible section headers
 *   - "Move to section" action per field card
 *
 * The panel is rendered inside [data-block-ide-editor] when a block is selected.
 */

import type { BlockDefinition, BlockDefinitionStatus, FieldDefinition, FieldTypeMetadata, BlockDefinitionSummary, BlocksFieldConfig } from './types';
import { schemaToFields, fieldsToSchema, ContentTypeAPIClient } from './api-client';
import { getFieldTypeMetadata, normalizeFieldType } from './field-type-picker';
import { PALETTE_DRAG_MIME, PALETTE_DRAG_META_MIME } from './field-palette-panel';
import { FieldConfigForm } from './field-config-form';
import { inputClasses, selectClasses } from './shared/field-input-classes';
import { ConfirmModal, TextPromptModal } from '../shared/modal';
import { renderIconTrigger, bindIconTriggerEvents, closeIconPicker } from './shared/icon-picker';
import { renderEntityHeader, renderSaveIndicator } from './shared/entity-header';
import type { SaveState } from './shared/entity-header';
import { renderFieldCard as renderFieldCardShared } from './shared/field-card';
import { loadAvailableBlocks, normalizeBlockSelection, renderInlineBlockPicker, bindInlineBlockPickerEvents } from './shared/block-picker';

// =============================================================================
// Types
// =============================================================================

export interface BlockEditorPanelConfig {
  container: HTMLElement;
  block: BlockDefinition;
  categories: string[];
  api: ContentTypeAPIClient;
  onMetadataChange: (blockId: string, patch: Partial<BlockDefinition>) => void;
  onSchemaChange: (blockId: string, fields: FieldDefinition[]) => void;
  /** Called when a field type is dropped from the palette (Phase 9) */
  onFieldDrop?: (meta: FieldTypeMetadata) => void;
  /** Called when status is changed via the editor dropdown (Phase 11 — Task 11.3) */
  onStatusChange?: (blockId: string, newStatus: BlockDefinitionStatus) => void;
  /** Called when the user triggers a manual save (Phase 11 — Task 11.1) */
  onSave?: (blockId: string) => void;
}

interface SectionState {
  collapsed: boolean;
}

const DEFAULT_SECTION = 'main';

/** MIME type for intra-section field reorder drag */
const FIELD_REORDER_MIME = 'application/x-field-reorder';

// =============================================================================
// Block Editor Panel
// =============================================================================

export class BlockEditorPanel {
  private config: BlockEditorPanelConfig;
  private block: BlockDefinition;
  private fields: FieldDefinition[];
  private expandedFieldId: string | null = null;
  private sectionStates: Map<string, SectionState> = new Map();
  private moveMenuFieldId: string | null = null;
  private dropHighlight: boolean = false;
  /** Active intra-section drag reorder (Phase 10 — Task 10.1) */
  private dragReorder: { fieldId: string; sectionName: string } | null = null;
  /** Field id currently showing a drop-before indicator */
  private dropTargetFieldId: string | null = null;
  /** Save state tracking (Phase 11 — Task 11.2) */
  private saveState: SaveState = 'idle';
  private saveMessage: string = '';
  private saveDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  /** Cached block definitions for inline block picker (Phase 4) */
  private cachedBlocks: BlockDefinitionSummary[] | null = null;
  private blocksLoading = false;
  private blockPickerModes: Map<string, 'allowed' | 'denied'> = new Map();

  constructor(config: BlockEditorPanelConfig) {
    this.config = config;
    this.block = { ...config.block };
    this.fields = config.block.schema ? schemaToFields(config.block.schema) : [];
  }

  render(): void {
    closeIconPicker();
    this.config.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col h-full overflow-hidden';
    wrapper.setAttribute('data-block-editor-panel', '');

    wrapper.innerHTML = `
      ${this.renderHeader()}
      <div class="flex-1 overflow-y-auto" data-editor-scroll>
        ${this.renderMetadataSection()}
        ${this.renderFieldsSection()}
      </div>
    `;

    this.config.container.appendChild(wrapper);
    this.bindEvents(wrapper);
    this.ensureInlineBlocksPicker();
  }

  /** Refresh the panel for a new block without a full re-mount */
  update(block: BlockDefinition): void {
    this.block = { ...block };
    this.fields = block.schema ? schemaToFields(block.schema) : [];
    this.expandedFieldId = null;
    this.moveMenuFieldId = null;
    this.render();
  }

  getFields(): FieldDefinition[] {
    return [...this.fields];
  }

  /** Add a field to the end of the fields list (Phase 9 — palette insert) */
  addField(field: FieldDefinition): void {
    this.fields.push(field);
    this.expandedFieldId = field.id;
    this.render();
  }

  // ===========================================================================
  // Rendering – Header
  // ===========================================================================

  private renderHeader(): string {
    return renderEntityHeader({
      name: this.block.name || 'Untitled',
      subtitle: this.block.slug || this.block.type || '',
      subtitleMono: true,
      status: this.block.status || 'draft',
      saveState: this.saveState,
      saveMessage: this.saveMessage,
      compact: true,
    });
  }

  // ===========================================================================
  // Save state indicator (Phase 11 — Task 11.2)
  // ===========================================================================

  /** Update the save state indicator without a full re-render */
  updateSaveState(state: SaveState, message?: string): void {
    if (this.saveDisplayTimer) {
      clearTimeout(this.saveDisplayTimer);
      this.saveDisplayTimer = null;
    }

    this.saveState = state;
    this.saveMessage = message ?? '';

    // Update the indicator in-place
    const container = this.config.container.querySelector('[data-entity-save-indicator]');
    if (container) {
      container.innerHTML = renderSaveIndicator(this.saveState, this.saveMessage);
    }

    // Auto-clear "saved" state after a delay
    if (state === 'saved') {
      this.saveDisplayTimer = setTimeout(() => {
        this.saveState = 'idle';
        this.saveMessage = '';
        const el = this.config.container.querySelector('[data-entity-save-indicator]');
        if (el) el.innerHTML = '';
      }, 2000);
    }
  }

  /** Revert the status dropdown to a previous value (used on status change failure) */
  revertStatus(status?: BlockDefinitionStatus | string): void {
    const select = this.config.container.querySelector<HTMLSelectElement>('[data-meta-field="status"]');
    if (select) {
      select.value = status ?? 'draft';
    }
    (this.block as unknown as Record<string, unknown>).status = status ?? 'draft';
  }

  // ===========================================================================
  // Rendering – Metadata (Task 8.1)
  // ===========================================================================

  private renderMetadataSection(): string {
    const b = this.block;
    const slugValue = b.slug || b.type || '';
    const typeHint =
      b.slug && b.type && b.slug !== b.type
        ? `<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Internal type: ${esc(b.type)}</p>`
        : '';
    return `
      <div class="border-b border-gray-200 dark:border-gray-700" data-editor-metadata>
        <button type="button" data-toggle-metadata
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
            <span>Block Metadata</span>
          </div>
          <span data-metadata-chevron class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </span>
        </button>
        <div class="px-5 pb-4 space-y-3" data-metadata-body>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input type="text" data-meta-field="name" value="${esc(b.name)}"
                     class="${inputClasses()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${esc(slugValue)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${inputClasses()} font-mono" />
              ${typeHint}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${inputClasses()} resize-none">${esc(b.description ?? '')}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select data-meta-field="category" class="${selectClasses()}">
                ${this.config.categories.map((c) => `<option value="${esc(c)}" ${c === (b.category ?? '') ? 'selected' : ''}>${esc(titleCase(c))}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              ${renderIconTrigger(b.icon ?? '', 'data-meta-field="icon"', true)}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select data-meta-field="status" class="${selectClasses()}">
                <option value="draft" ${b.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="active" ${b.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="deprecated" ${b.status === 'deprecated' ? 'selected' : ''}>Deprecated</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ===========================================================================
  // Rendering – Fields grouped by section (Tasks 8.2 + 8.3)
  // ===========================================================================

  private renderFieldsSection(): string {
    const sections = this.groupFieldsBySection();
    const sectionNames = Array.from(sections.keys());

    if (this.fields.length === 0) {
      return `
        <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fields</span>
          </div>
          <span class="text-[11px] text-gray-400 dark:text-gray-500">0 fields</span>
        </div>
        <div data-field-drop-zone
             class="flex flex-col items-center justify-center py-16 px-5 text-center border-2 border-dashed ${this.dropHighlight ? 'border-blue-400 bg-blue-50/50' : 'border-transparent'} rounded-lg mx-3 my-2 transition-colors">
          <svg class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">No fields defined.</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">Drag fields from the palette or click a field type to add.</p>
        </div>`;
    }

    let html = `
      <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
        </div>
        <span class="text-[11px] text-gray-400 dark:text-gray-500">${this.fields.length} field${this.fields.length !== 1 ? 's' : ''}</span>
      </div>`;

    for (const sectionName of sectionNames) {
      const fields = sections.get(sectionName)!;
      const state = this.getSectionState(sectionName);
      const isCollapsed = state.collapsed;

      html += `
        <div data-section="${esc(sectionName)}" class="border-b border-gray-100 dark:border-gray-800">
          <button type="button" data-toggle-section="${esc(sectionName)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-section-chevron="${esc(sectionName)}">
              ${isCollapsed
                ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
                : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
              }
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${esc(titleCase(sectionName))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${fields.length}</span>
          </button>

          <div class="${isCollapsed ? 'hidden' : ''}" data-section-body="${esc(sectionName)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${esc(sectionName)}">
              ${fields.map((f) => this.renderFieldCard(f, sectionNames, fields)).join('')}
            </div>
          </div>
        </div>`;
    }

    // Drop zone at the bottom (Phase 9 — Task 9.3)
    html += `
      <div data-field-drop-zone
           class="mx-3 my-2 py-3 border-2 border-dashed rounded-lg text-center transition-colors ${this.dropHighlight ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}">
        <p class="text-[11px] text-gray-400 dark:text-gray-500">Drop a field here or click a field type in the palette</p>
      </div>`;

    return html;
  }

  // ===========================================================================
  // Rendering – Single field card (Task 8.2)
  // ===========================================================================

  private renderFieldCard(field: FieldDefinition, allSections: string[], sectionFields: FieldDefinition[]): string {
    const sectionName = field.section || DEFAULT_SECTION;
    const indexInSection = sectionFields.indexOf(field);

    // Build actions HTML (3-dot menu + move-to-section dropdown)
    const actionsHtml = `
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${esc(field.id)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === field.id ? this.renderMoveToSectionMenu(field, allSections, sectionName) : ''}
          </div>`;

    return renderFieldCardShared({
      field,
      isExpanded: field.id === this.expandedFieldId,
      isDropTarget: this.dropTargetFieldId === field.id,
      showReorderButtons: true,
      isFirst: indexInSection === 0,
      isLast: indexInSection === sectionFields.length - 1,
      compact: true,
      sectionName,
      actionsHtml,
      renderExpandedContent: () => this.renderFieldProperties(field, allSections),
    });
  }

  // ===========================================================================
  // Rendering – Inline field property editor (Task 8.2)
  // ===========================================================================

  private renderFieldProperties(field: FieldDefinition, allSections: string[]): string {
    const normalizedType = normalizeFieldType(field.type);
    const isBlocks = normalizedType === 'blocks';

    // For blocks fields, show block picker as primary, field settings as secondary
    if (isBlocks) {
      return this.renderBlocksFieldProperties(field, allSections);
    }

    return this.renderStandardFieldProperties(field, allSections);
  }

  /** Standard field properties (non-blocks) */
  private renderStandardFieldProperties(field: FieldDefinition, allSections: string[]): string {
    const validation = field.validation ?? {};
    const normalizedType = normalizeFieldType(field.type);
    const showStringVal = ['text', 'textarea', 'rich-text', 'markdown', 'code', 'slug'].includes(normalizedType);
    const showNumberVal = ['number', 'integer', 'currency', 'percentage'].includes(normalizedType);
    const currentSection = field.section || DEFAULT_SECTION;

    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${esc(field.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="name"
                   value="${esc(field.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
            <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="label"
                   value="${esc(field.label)}"
                   class="${inputClasses('xs')}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="description"
                 value="${esc(field.description ?? '')}" placeholder="Help text for editors"
                 class="${inputClasses('xs')}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="placeholder"
                 value="${esc(field.placeholder ?? '')}"
                 class="${inputClasses('xs')}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="required"
                   ${field.required ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="readonly"
                   ${field.readonly ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="hidden"
                   ${field.hidden ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${showStringVal ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.minLength"
                   value="${validation.minLength ?? ''}" min="0"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.maxLength"
                   value="${validation.maxLength ?? ''}" min="0"
                   class="${inputClasses('xs')}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="validation.pattern"
                 value="${esc(validation.pattern ?? '')}" placeholder="^[a-z]+$"
                 class="${inputClasses('xs')} font-mono" />
        </div>` : ''}

        ${showNumberVal ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.min"
                   value="${validation.min ?? ''}" step="any"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.max"
                   value="${validation.max ?? ''}" step="any"
                   class="${inputClasses('xs')}" />
          </div>
        </div>` : ''}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
            <select data-field-section-select="${esc(field.id)}"
                    class="${selectClasses('xs')}">
              ${allSections.map((s) => `<option value="${esc(s)}" ${s === currentSection ? 'selected' : ''}>${esc(titleCase(s))}</option>`).join('')}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="gridSpan"
                   value="${field.gridSpan ?? ''}" min="1" max="12" placeholder="12"
                   class="${inputClasses('xs')}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${esc(field.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }

  /** Blocks field properties: block picker primary, field settings secondary */
  private renderBlocksFieldProperties(field: FieldDefinition, allSections: string[]): string {
    const config = (field.config ?? {}) as BlocksFieldConfig;
    const currentSection = field.section || DEFAULT_SECTION;
    const mode = this.getBlocksPickerMode(field.id);
    const isAllowed = mode === 'allowed';
    const selectedBlocks = new Set(
      isAllowed ? (config.allowedBlocks ?? []) : (config.deniedBlocks ?? []),
    );
    const toggleBase = 'px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded';
    const allowedClass = isAllowed
      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
    const deniedClass = !isAllowed
      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
    const pickerLabel = isAllowed ? 'Allowed Blocks' : 'Denied Blocks';
    const pickerAccent = isAllowed ? 'blue' : 'red';
    const emptySelectionText = isAllowed ? 'All blocks allowed (no restrictions)' : 'No blocks denied';

    // Block picker section (primary — always visible)
    let pickerHtml: string;
    if (this.cachedBlocks) {
      const normalized = normalizeBlockSelection(selectedBlocks, this.cachedBlocks);
      pickerHtml = renderInlineBlockPicker({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: normalized,
        onSelectionChange: () => {},
        label: pickerLabel,
        accent: pickerAccent,
        emptySelectionText,
      });
    } else {
      pickerHtml = `
        <div class="flex items-center justify-center py-6" data-blocks-loading="${esc(field.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    }

    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${esc(field.id)}">
        <!-- Block Selection (primary) -->
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-blocks-mode-toggle="${esc(field.id)}" data-blocks-mode="allowed"
                    class="${toggleBase} ${allowedClass}">
              Allowed
            </button>
            <button type="button" data-blocks-mode-toggle="${esc(field.id)}" data-blocks-mode="denied"
                    class="${toggleBase} ${deniedClass}">
              Denied
            </button>
          </div>
          <button type="button" data-blocks-open-library="${esc(field.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-blocks-picker-container="${esc(field.id)}">
          ${pickerHtml}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-blocks-advanced="${esc(field.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>

        <!-- Min/Max Blocks -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Blocks</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="config.minBlocks"
                   value="${config.minBlocks ?? ''}" min="0" placeholder="0"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Blocks</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="config.maxBlocks"
                   value="${config.maxBlocks ?? ''}" min="1" placeholder="No limit"
                   class="${inputClasses('xs')}" />
          </div>
        </div>

        <!-- Field Settings (secondary — collapsed by default) -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button type="button" data-blocks-settings-toggle="${esc(field.id)}"
                  class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            <span data-blocks-settings-chevron="${esc(field.id)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
            Field Settings
          </button>

          <div class="hidden mt-2 space-y-3" data-blocks-settings-body="${esc(field.id)}">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
                <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="name"
                       value="${esc(field.name)}" pattern="^[a-z][a-z0-9_]*$"
                       class="${inputClasses('xs')}" />
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="label"
                       value="${esc(field.label)}"
                       class="${inputClasses('xs')}" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
              <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="description"
                     value="${esc(field.description ?? '')}" placeholder="Help text for editors"
                     class="${inputClasses('xs')}" />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="required"
                       ${field.required ? 'checked' : ''}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="readonly"
                       ${field.readonly ? 'checked' : ''}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="hidden"
                       ${field.hidden ? 'checked' : ''}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
                <select data-field-section-select="${esc(field.id)}"
                        class="${selectClasses('xs')}">
                  ${allSections.map((s) => `<option value="${esc(s)}" ${s === currentSection ? 'selected' : ''}>${esc(titleCase(s))}</option>`).join('')}
                  <option value="__new__">+ New section...</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
                <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="gridSpan"
                       value="${field.gridSpan ?? ''}" min="1" max="12" placeholder="12"
                       class="${inputClasses('xs')}" />
              </div>
            </div>
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${esc(field.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }

  // ===========================================================================
  // Rendering – Move to Section menu (Task 8.4)
  // ===========================================================================

  private renderMoveToSectionMenu(field: FieldDefinition, allSections: string[], currentSection: string): string {
    const otherSections = allSections.filter((s) => s !== currentSection);
    if (otherSections.length === 0) {
      return `
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Only one section exists.</div>
          <button type="button" data-move-new-section="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>`;
    }

    return `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Move to section</div>
        ${otherSections.map((s) => `
          <button type="button" data-move-to="${esc(s)}" data-move-field="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${esc(titleCase(s))}
          </button>`).join('')}
        <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
          <button type="button" data-move-new-section="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>
      </div>`;
  }

  // ===========================================================================
  // Section helpers
  // ===========================================================================

  private groupFieldsBySection(): Map<string, FieldDefinition[]> {
    const map = new Map<string, FieldDefinition[]>();
    for (const field of this.fields) {
      const section = field.section || DEFAULT_SECTION;
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(field);
    }
    // Ensure "main" is always first if it exists
    if (map.has(DEFAULT_SECTION)) {
      const mainFields = map.get(DEFAULT_SECTION)!;
      map.delete(DEFAULT_SECTION);
      const ordered = new Map<string, FieldDefinition[]>();
      ordered.set(DEFAULT_SECTION, mainFields);
      for (const [k, v] of map) ordered.set(k, v);
      return ordered;
    }
    return map;
  }

  private getSectionState(name: string): SectionState {
    if (!this.sectionStates.has(name)) {
      this.sectionStates.set(name, { collapsed: false });
    }
    return this.sectionStates.get(name)!;
  }

  private getBlocksPickerMode(fieldId: string): 'allowed' | 'denied' {
    return this.blockPickerModes.get(fieldId) ?? 'allowed';
  }

  private ensureInlineBlocksPicker(): void {
    if (!this.expandedFieldId) return;
    const field = this.fields.find((f) => f.id === this.expandedFieldId);
    if (field && normalizeFieldType(field.type) === 'blocks') {
      void this.loadBlocksForField(field);
    }
  }

  // ===========================================================================
  // Event Binding
  // ===========================================================================

  private bindEvents(root: HTMLElement): void {
    // Metadata toggle
    root.querySelector('[data-toggle-metadata]')?.addEventListener('click', () => {
      const body = root.querySelector<HTMLElement>('[data-metadata-body]');
      const chevron = root.querySelector<HTMLElement>('[data-metadata-chevron]');
      if (body) {
        const hidden = body.classList.toggle('hidden');
        if (chevron) {
          chevron.innerHTML = hidden
            ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
            : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
        }
      }
    });

    // Metadata field changes (Task 8.1)
    root.querySelectorAll<HTMLElement>('[data-meta-field]').forEach((el) => {
      const key = el.dataset.metaField!;
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => this.handleMetadataChange(key, (el as HTMLSelectElement).value));
      } else if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.addEventListener('input', () => this.handleMetadataChange(key, (el as HTMLInputElement).value));
      }
    });

    // Icon picker trigger
    bindIconTriggerEvents(root, '[data-icon-trigger]', (trigger) => {
      const hiddenInput = trigger.querySelector<HTMLInputElement>('[data-meta-field="icon"]');
      return {
        value: hiddenInput?.value ?? '',
        onSelect: (v: string) => {
          if (hiddenInput) {
            hiddenInput.value = v;
            hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        onClear: () => {
          if (hiddenInput) {
            hiddenInput.value = '';
            hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        compact: true,
      };
    });

    // Delegate: section toggle, field toggle, field actions, move-to, field prop changes, field remove
    root.addEventListener('click', (e) => this.handleClick(e, root));

    // Delegate: field property inputs
    root.addEventListener('input', (e) => this.handleInput(e));

    // Delegate: field checkbox changes
    root.addEventListener('change', (e) => this.handleChange(e, root));

    // Close move menu on outside click
    document.addEventListener('click', (e) => {
      if (this.moveMenuFieldId) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-move-menu]') && !target.closest('[data-field-actions]')) {
          this.moveMenuFieldId = null;
          this.render();
        }
      }
    });

    // Drop zone events (Phase 9 — Task 9.3)
    this.bindDropZoneEvents(root);

    // Drag reorder events (Phase 10 — Task 10.1)
    this.bindFieldReorderEvents(root);

    // Section select change (Phase 10 — Task 10.3)
    this.bindSectionSelectEvents(root);
  }

  /** Bind drag-and-drop events on all [data-field-drop-zone] elements */
  private bindDropZoneEvents(root: HTMLElement): void {
    const dropZones = root.querySelectorAll<HTMLElement>('[data-field-drop-zone]');

    dropZones.forEach((zone) => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
        if (!this.dropHighlight) {
          this.dropHighlight = true;
          zone.classList.remove('border-gray-200', 'hover:border-gray-300', 'border-transparent');
          zone.classList.add('border-blue-400', 'bg-blue-50/50');
        }
      });

      zone.addEventListener('dragleave', (e) => {
        // Only reset when leaving the zone itself, not its children
        if (!zone.contains(e.relatedTarget as Node)) {
          this.dropHighlight = false;
          zone.classList.remove('border-blue-400', 'bg-blue-50/50');
          zone.classList.add('border-gray-200', 'hover:border-gray-300');
        }
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropHighlight = false;
        zone.classList.remove('border-blue-400', 'bg-blue-50/50');
        zone.classList.add('border-gray-200', 'hover:border-gray-300');

        if (this.config.onFieldDrop) {
          const metaRaw = e.dataTransfer?.getData(PALETTE_DRAG_META_MIME);
          if (metaRaw) {
            try {
              const parsed = JSON.parse(metaRaw) as FieldTypeMetadata;
              if (parsed && parsed.type) {
                this.config.onFieldDrop(parsed);
                return;
              }
            } catch {
              // fall through to type-only handling
            }
          }
          const fieldType = e.dataTransfer?.getData(PALETTE_DRAG_MIME);
          if (fieldType) {
            const normalized = normalizeFieldType(fieldType);
            const meta =
              getFieldTypeMetadata(normalized) ??
              ({
                type: normalized,
                label: titleCase(normalized),
                description: '',
                icon: '',
                category: 'advanced',
              } as FieldTypeMetadata);
            this.config.onFieldDrop(meta);
          }
        }
      });
    });
  }

  private handleClick(e: Event, root: HTMLElement): void {
    const target = e.target as HTMLElement;

    // Section toggle (Task 8.3)
    const sectionToggle = target.closest<HTMLElement>('[data-toggle-section]');
    if (sectionToggle) {
      const section = sectionToggle.dataset.toggleSection!;
      const state = this.getSectionState(section);
      state.collapsed = !state.collapsed;
      this.sectionStates.set(section, state);
      // Toggle visibility
      const body = root.querySelector<HTMLElement>(`[data-section-body="${section}"]`);
      const chevron = root.querySelector<HTMLElement>(`[data-section-chevron="${section}"]`);
      if (body) body.classList.toggle('hidden', state.collapsed);
      if (chevron) {
        chevron.innerHTML = state.collapsed
          ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
          : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
      }
      return;
    }

    // Field actions (three-dot menu — Task 8.4)
    const actionsBtn = target.closest<HTMLElement>('[data-field-actions]');
    if (actionsBtn) {
      e.stopPropagation();
      const fieldId = actionsBtn.dataset.fieldActions!;
      this.moveMenuFieldId = this.moveMenuFieldId === fieldId ? null : fieldId;
      this.render();
      return;
    }

    // Move to section
    const moveBtn = target.closest<HTMLElement>('[data-move-to]');
    if (moveBtn) {
      e.stopPropagation();
      const targetSection = moveBtn.dataset.moveTo!;
      const fieldId = moveBtn.dataset.moveField!;
      this.moveFieldToSection(fieldId, targetSection);
      return;
    }

    // Move to new section
    const moveNewBtn = target.closest<HTMLElement>('[data-move-new-section]');
    if (moveNewBtn) {
      e.stopPropagation();
      const fieldId = moveNewBtn.dataset.moveNewSection!;
      const modal = new TextPromptModal({
        title: 'Create New Section',
        label: 'Section name',
        placeholder: 'e.g. sidebar',
        confirmLabel: 'Create',
        inputClass: inputClasses(),
        onConfirm: (value) => {
          const section = value.trim().toLowerCase().replace(/\s+/g, '_');
          if (section) {
            this.moveFieldToSection(fieldId, section);
          }
        },
      });
      modal.show();
      return;
    }

    // Move field up within section (Phase 10 — Task 10.2)
    const moveUpBtn = target.closest<HTMLElement>('[data-field-move-up]');
    if (moveUpBtn) {
      e.stopPropagation();
      const fieldId = moveUpBtn.dataset.fieldMoveUp!;
      if (!moveUpBtn.hasAttribute('disabled')) {
        this.moveFieldInSection(fieldId, -1);
      }
      return;
    }

    // Move field down within section (Phase 10 — Task 10.2)
    const moveDownBtn = target.closest<HTMLElement>('[data-field-move-down]');
    if (moveDownBtn) {
      e.stopPropagation();
      const fieldId = moveDownBtn.dataset.fieldMoveDown!;
      if (!moveDownBtn.hasAttribute('disabled')) {
        this.moveFieldInSection(fieldId, 1);
      }
      return;
    }

    // Remove field
    const removeBtn = target.closest<HTMLElement>('[data-field-remove]');
    if (removeBtn) {
      const fieldId = removeBtn.dataset.fieldRemove!;
      const field = this.fields.find((f) => f.id === fieldId);
      if (field) {
        ConfirmModal.confirm(`Remove field "${field.label || field.name}"?`, {
          title: 'Remove Field',
          confirmText: 'Remove',
          confirmVariant: 'danger',
        }).then((confirmed) => {
          if (!confirmed) return;
          this.fields = this.fields.filter((f) => f.id !== fieldId);
          if (this.expandedFieldId === fieldId) this.expandedFieldId = null;
          this.notifySchemaChange();
          this.render();
        });
      }
      return;
    }

    // Blocks field settings toggle (Phase 4)
    const blocksToggle = target.closest<HTMLElement>('[data-blocks-settings-toggle]');
    if (blocksToggle) {
      const fieldId = blocksToggle.dataset.blocksSettingsToggle!;
      const body = root.querySelector<HTMLElement>(`[data-blocks-settings-body="${fieldId}"]`);
      const chevron = root.querySelector<HTMLElement>(`[data-blocks-settings-chevron="${fieldId}"]`);
      if (body) {
        const isHidden = body.classList.toggle('hidden');
        if (chevron) {
          chevron.innerHTML = isHidden
            ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
            : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
        }
      }
      return;
    }

    // Blocks picker mode toggle (allowed/denied)
    const blocksMode = target.closest<HTMLElement>('[data-blocks-mode-toggle]');
    if (blocksMode) {
      e.stopPropagation();
      const fieldId = blocksMode.dataset.blocksModeToggle!;
      const mode = (blocksMode.dataset.blocksMode as 'allowed' | 'denied') ?? 'allowed';
      this.blockPickerModes.set(fieldId, mode);
      this.render();
      return;
    }

    // Open Block Library
    const blocksOpenLibrary = target.closest<HTMLElement>('[data-blocks-open-library]');
    if (blocksOpenLibrary) {
      e.stopPropagation();
      const basePath = this.config.api.getBasePath();
      window.location.href = `${basePath}/content/block-library`;
      return;
    }

    // Advanced settings modal
    const blocksAdvanced = target.closest<HTMLElement>('[data-blocks-advanced]');
    if (blocksAdvanced) {
      e.stopPropagation();
      const fieldId = blocksAdvanced.dataset.blocksAdvanced!;
      const field = this.fields.find((f) => f.id === fieldId);
      if (field) this.openFieldConfigModal(field);
      return;
    }

    // Field toggle (expand/collapse — Task 8.2 accordion)
    const fieldToggle = target.closest<HTMLElement>('[data-field-toggle]');
    if (fieldToggle) {
      if (target.closest('[data-field-grip]')) return;
      const fieldId = fieldToggle.dataset.fieldToggle!;
      // Accordion: close current if same, otherwise switch
      this.expandedFieldId = this.expandedFieldId === fieldId ? null : fieldId;
      this.render();

      // Trigger block loading for blocks fields (Phase 4)
      if (this.expandedFieldId) {
        const field = this.fields.find((f) => f.id === this.expandedFieldId);
        if (field && normalizeFieldType(field.type) === 'blocks') {
          this.loadBlocksForField(field);
        }
      }
      return;
    }
  }

  private handleInput(e: Event): void {
    const target = e.target as HTMLElement;

    // Field property text input
    const propEl = target.closest<HTMLInputElement>('[data-field-prop]');
    if (propEl) {
      const fieldId = propEl.dataset.fieldProp!;
      const propKey = propEl.dataset.propKey!;
      this.updateFieldProp(fieldId, propKey, propEl.value);
      return;
    }
  }

  private handleChange(e: Event, _root: HTMLElement): void {
    const target = e.target as HTMLElement;

    // Field checkbox change
    const checkEl = target.closest<HTMLInputElement>('[data-field-check]');
    if (checkEl) {
      const fieldId = checkEl.dataset.fieldCheck!;
      const propKey = checkEl.dataset.checkKey!;
      this.updateFieldProp(fieldId, propKey, checkEl.checked);
      return;
    }
  }

  // ===========================================================================
  // Data mutations
  // ===========================================================================

  private handleMetadataChange(key: string, value: string): void {
    // Route status changes through the dedicated lifecycle handler (Phase 11 — Task 11.3)
    if (key === 'status' && this.config.onStatusChange) {
      this.config.onStatusChange(this.block.id, value as BlockDefinitionStatus);
      return;
    }

    const patch: Partial<BlockDefinition> = {};
    const self = this.block as unknown as Record<string, unknown>;
    switch (key) {
      case 'name':
        patch.name = value;
        self.name = value;
        break;
      case 'slug': {
        const prevSlug = (this.block.slug || this.block.type || '').toString();
        patch.slug = value;
        self.slug = value;
        if (!self.type || self.type === prevSlug) {
          patch.type = value;
          self.type = value;
        }
        break;
      }
      case 'description':
        patch.description = value;
        self.description = value;
        break;
      case 'category':
        patch.category = value;
        self.category = value;
        break;
      case 'icon':
        patch.icon = value;
        self.icon = value;
        break;
      case 'status':
        patch.status = value as BlockDefinition['status'];
        self.status = value;
        break;
    }
    this.config.onMetadataChange(this.block.id, patch);
  }

  private updateFieldProp(fieldId: string, propPath: string, value: string | boolean): void {
    const field = this.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const parts = propPath.split('.');
    if (parts.length === 1) {
      // Top-level field prop
      const key = parts[0] as keyof FieldDefinition;
      const rec = field as unknown as Record<string, unknown>;
      if (typeof value === 'boolean') {
        rec[key] = value;
      } else if (key === 'gridSpan') {
        rec[key] = value ? parseInt(value, 10) : undefined;
      } else {
        rec[key] = value || undefined;
      }
    } else if (parts[0] === 'config') {
      // Nested config prop (e.g., config.minBlocks, config.maxBlocks)
      if (!field.config) field.config = {};
      const cKey = parts[1] as string;
      const configRec = field.config as Record<string, unknown>;
      if (typeof value === 'string') {
        if (value === '') {
          delete configRec[cKey];
        } else if (['minBlocks', 'maxBlocks'].includes(cKey)) {
          configRec[cKey] = parseInt(value, 10);
        } else {
          configRec[cKey] = value;
        }
      }
      if (Object.keys(field.config).length === 0) {
        field.config = undefined;
      }
    } else if (parts[0] === 'validation') {
      // Nested validation prop
      if (!field.validation) field.validation = {};
      const vKey = parts[1] as string;
      if (typeof value === 'string') {
        if (value === '') {
          delete (field.validation as Record<string, unknown>)[vKey];
        } else if (['minLength', 'maxLength'].includes(vKey)) {
          (field.validation as Record<string, unknown>)[vKey] = parseInt(value, 10);
        } else if (['min', 'max'].includes(vKey)) {
          (field.validation as Record<string, unknown>)[vKey] = parseFloat(value);
        } else {
          (field.validation as Record<string, unknown>)[vKey] = value;
        }
      }
      // Clean up empty validation
      if (Object.keys(field.validation).length === 0) {
        field.validation = undefined;
      }
    }

    this.notifySchemaChange();
  }

  /** Load blocks and render inline picker for a blocks field (Phase 4) */
  private async loadBlocksForField(field: FieldDefinition): Promise<void> {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(field);
      return;
    }
    if (this.blocksLoading) return;
    this.blocksLoading = true;
    this.cachedBlocks = await loadAvailableBlocks(this.config.api);
    this.blocksLoading = false;
    // Only render if this field is still expanded
    if (this.expandedFieldId === field.id) {
      this.renderInlineBlockPickerForField(field);
    }
  }

  /** Render and bind inline block picker into the DOM container */
  private renderInlineBlockPickerForField(field: FieldDefinition): void {
    const container = this.config.container.querySelector<HTMLElement>(
      `[data-blocks-picker-container="${field.id}"]`
    );
    if (!container || !this.cachedBlocks) return;

    const config = (field.config ?? {}) as BlocksFieldConfig;
    const mode = this.getBlocksPickerMode(field.id);
    const isAllowed = mode === 'allowed';
    const selected = normalizeBlockSelection(
      new Set(isAllowed ? (config.allowedBlocks ?? []) : (config.deniedBlocks ?? [])),
      this.cachedBlocks,
    );
    const pickerLabel = isAllowed ? 'Allowed Blocks' : 'Denied Blocks';
    const pickerAccent = isAllowed ? 'blue' : 'red';
    const emptySelectionText = isAllowed ? 'All blocks allowed (no restrictions)' : 'No blocks denied';

    container.innerHTML = renderInlineBlockPicker({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: selected,
      onSelectionChange: (sel) => {
        if (!field.config) field.config = {};
        const cfgRec = field.config as Record<string, unknown>;
        if (isAllowed) {
          if (sel.size > 0) {
            cfgRec.allowedBlocks = Array.from(sel);
          } else {
            delete cfgRec.allowedBlocks;
          }
        } else {
          if (sel.size > 0) {
            cfgRec.deniedBlocks = Array.from(sel);
          } else {
            delete cfgRec.deniedBlocks;
          }
        }
        if (Object.keys(field.config).length === 0) field.config = undefined;
        this.notifySchemaChange();
      },
      label: pickerLabel,
      accent: pickerAccent,
      emptySelectionText,
    });

    bindInlineBlockPickerEvents(container, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: selected,
      onSelectionChange: (sel) => {
        if (!field.config) field.config = {};
        const cfgRec = field.config as Record<string, unknown>;
        if (isAllowed) {
          if (sel.size > 0) {
            cfgRec.allowedBlocks = Array.from(sel);
          } else {
            delete cfgRec.allowedBlocks;
          }
        } else {
          if (sel.size > 0) {
            cfgRec.deniedBlocks = Array.from(sel);
          } else {
            delete cfgRec.deniedBlocks;
          }
        }
        if (Object.keys(field.config).length === 0) field.config = undefined;
        this.notifySchemaChange();
      },
      label: pickerLabel,
      accent: pickerAccent,
      emptySelectionText,
    });
  }

  private openFieldConfigModal(field: FieldDefinition): void {
    const configForm = new FieldConfigForm({
      field,
      existingFieldNames: this.fields.filter((f) => f.id !== field.id).map((f) => f.name),
      apiBasePath: this.config.api.getBasePath(),
      onSave: (updatedField) => {
        const index = this.fields.findIndex((f) => f.id === field.id);
        if (index !== -1) {
          this.fields[index] = updatedField;
          this.notifySchemaChange();
          this.render();
        }
      },
      onCancel: () => {},
    });
    configForm.show();
  }

  private moveFieldToSection(fieldId: string, targetSection: string): void {
    const field = this.fields.find((f) => f.id === fieldId);
    if (!field) return;

    field.section = targetSection === DEFAULT_SECTION ? undefined : targetSection;
    this.moveMenuFieldId = null;
    this.notifySchemaChange();
    this.render();
  }

  // ===========================================================================
  // Field Reorder (Phase 10 — Task 10.1 drag, Task 10.2 keyboard)
  // ===========================================================================

  /** Move a field up (-1) or down (+1) within its section */
  private moveFieldInSection(fieldId: string, direction: -1 | 1): void {
    const field = this.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const sectionName = field.section || DEFAULT_SECTION;
    const sectionFields = this.fields.filter((f) => (f.section || DEFAULT_SECTION) === sectionName);
    const indexInSection = sectionFields.findIndex((f) => f.id === fieldId);
    const newIndex = indexInSection + direction;

    if (newIndex < 0 || newIndex >= sectionFields.length) return;

    // Swap in the master fields array
    const globalA = this.fields.indexOf(sectionFields[indexInSection]);
    const globalB = this.fields.indexOf(sectionFields[newIndex]);
    [this.fields[globalA], this.fields[globalB]] = [this.fields[globalB], this.fields[globalA]];

    this.notifySchemaChange();
    this.render();
  }

  /** Reorder a field by moving it before a target field in the same section */
  private reorderFieldBefore(draggedId: string, targetId: string): void {
    if (draggedId === targetId) return;

    const dragged = this.fields.find((f) => f.id === draggedId);
    const target = this.fields.find((f) => f.id === targetId);
    if (!dragged || !target) return;

    // Only reorder within the same section
    const dragSection = dragged.section || DEFAULT_SECTION;
    const targetSection = target.section || DEFAULT_SECTION;
    if (dragSection !== targetSection) return;

    // Remove dragged from array
    const fromIndex = this.fields.indexOf(dragged);
    this.fields.splice(fromIndex, 1);

    // Insert before target
    const toIndex = this.fields.indexOf(target);
    this.fields.splice(toIndex, 0, dragged);

    this.notifySchemaChange();
    this.render();
  }

  /** Bind drag events on [data-field-card] for intra-section reordering */
  private bindFieldReorderEvents(root: HTMLElement): void {
    const cards = root.querySelectorAll<HTMLElement>('[data-field-card]');

    cards.forEach((card) => {
      const fieldId = card.dataset.fieldCard!;
      const sectionName = card.dataset.fieldSection!;

      // Track whether the mousedown was on the grip so we can gate dragstart
      let gripEngaged = false;
      card.addEventListener('mousedown', (e) => {
        gripEngaged = !!(e.target as HTMLElement).closest('[data-field-grip]');
      });

      card.addEventListener('dragstart', (e) => {
        if (!gripEngaged) {
          e.preventDefault();
          return;
        }
        this.dragReorder = { fieldId, sectionName };
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData(FIELD_REORDER_MIME, fieldId);
        card.classList.add('opacity-50');
      });

      card.addEventListener('dragend', () => {
        this.dragReorder = null;
        this.dropTargetFieldId = null;
        card.classList.remove('opacity-50');
        // Clean up any lingering indicators
        root.querySelectorAll('[data-field-card]').forEach((c) => {
          c.classList.remove('border-t-2', 'border-t-blue-400');
        });
      });

      card.addEventListener('dragover', (e) => {
        // Only allow reorder within same section
        if (!this.dragReorder) return;
        if (this.dragReorder.sectionName !== sectionName) return;
        if (this.dragReorder.fieldId === fieldId) return;

        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';

        // Show drop indicator
        if (this.dropTargetFieldId !== fieldId) {
          // Clear previous indicator
          root.querySelectorAll('[data-field-card]').forEach((c) => {
            c.classList.remove('border-t-2', 'border-t-blue-400');
          });
          card.classList.add('border-t-2', 'border-t-blue-400');
          this.dropTargetFieldId = fieldId;
        }
      });

      card.addEventListener('dragleave', () => {
        if (this.dropTargetFieldId === fieldId) {
          card.classList.remove('border-t-2', 'border-t-blue-400');
          this.dropTargetFieldId = null;
        }
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer?.getData(FIELD_REORDER_MIME);
        card.classList.remove('border-t-2', 'border-t-blue-400');
        this.dropTargetFieldId = null;
        this.dragReorder = null;

        if (draggedId && draggedId !== fieldId) {
          this.reorderFieldBefore(draggedId, fieldId);
        }
      });
    });
  }

  /** Bind section-select dropdown changes (Phase 10 — Task 10.3) */
  private bindSectionSelectEvents(root: HTMLElement): void {
    root.querySelectorAll<HTMLSelectElement>('[data-field-section-select]').forEach((select) => {
      select.addEventListener('change', () => {
        const fieldId = select.dataset.fieldSectionSelect!;
        const targetSection = select.value;

        if (targetSection === '__new__') {
          const field = this.fields.find((f) => f.id === fieldId);
          const previousSection = field?.section || DEFAULT_SECTION;
          const modal = new TextPromptModal({
            title: 'Create New Section',
            label: 'Section name',
            placeholder: 'e.g. sidebar',
            confirmLabel: 'Create',
            inputClass: inputClasses(),
            onConfirm: (value) => {
              const section = value.trim().toLowerCase().replace(/\s+/g, '_');
              if (section) {
                this.moveFieldToSection(fieldId, section);
              }
            },
            onCancel: () => {
              select.value = previousSection;
            },
          });
          modal.show();
          return;
        }

        this.moveFieldToSection(fieldId, targetSection);
      });
    });
  }

  private notifySchemaChange(): void {
    this.config.onSchemaChange(this.block.id, [...this.fields]);
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
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

import type { BlockDefinition, BlockDefinitionStatus, FieldDefinition, FieldType, FieldTypeMetadata } from './types';
import { schemaToFields, fieldsToSchema, ContentTypeAPIClient } from './api-client';
import { getFieldTypeMetadata, normalizeFieldType } from './field-type-picker';
import { PALETTE_DRAG_MIME, PALETTE_DRAG_META_MIME } from './field-palette-panel';

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
  private saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private saveMessage: string = '';
  private saveDisplayTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: BlockEditorPanelConfig) {
    this.config = config;
    this.block = { ...config.block };
    this.fields = config.block.schema ? schemaToFields(config.block.schema) : [];
  }

  render(): void {
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
    const slugOrType = this.block.slug || this.block.type || '';
    return `
      <div class="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <h2 class="text-sm font-semibold text-gray-900 truncate" data-editor-block-name>${esc(this.block.name || 'Untitled')}</h2>
          <p class="text-[11px] text-gray-400 font-mono truncate">${esc(slugOrType)}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span data-editor-save-indicator>${this.renderSaveState()}</span>
          <span class="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusClasses(this.block.status)}" data-editor-status-badge>${esc(this.block.status || 'draft')}</span>
        </div>
      </div>`;
  }

  // ===========================================================================
  // Save state indicator (Phase 11 — Task 11.2)
  // ===========================================================================

  private renderSaveState(): string {
    switch (this.saveState) {
      case 'saving':
        return `<span data-save-state class="flex items-center gap-1 text-[11px] text-blue-600">
          <span class="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          Saving\u2026
        </span>`;
      case 'saved':
        return `<span data-save-state class="flex items-center gap-1 text-[11px] text-green-600">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Saved
        </span>`;
      case 'error':
        return `<span data-save-state class="flex items-center gap-1 text-[11px] text-red-500" title="${esc(this.saveMessage)}">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Save failed
        </span>`;
      default:
        return '';
    }
  }

  /** Update the save state indicator without a full re-render (Phase 11 — Task 11.2) */
  updateSaveState(state: 'idle' | 'saving' | 'saved' | 'error', message?: string): void {
    if (this.saveDisplayTimer) {
      clearTimeout(this.saveDisplayTimer);
      this.saveDisplayTimer = null;
    }

    this.saveState = state;
    this.saveMessage = message ?? '';

    // Update the indicator in-place
    const container = this.config.container.querySelector('[data-editor-save-indicator]');
    if (container) {
      container.innerHTML = this.renderSaveState();
    }

    // Auto-clear "saved" state after a delay
    if (state === 'saved') {
      this.saveDisplayTimer = setTimeout(() => {
        this.saveState = 'idle';
        this.saveMessage = '';
        const el = this.config.container.querySelector('[data-editor-save-indicator]');
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
        ? `<p class="mt-0.5 text-[10px] text-gray-400">Internal type: ${esc(b.type)}</p>`
        : '';
    return `
      <div class="border-b border-gray-100" data-editor-metadata>
        <button type="button" data-toggle-metadata
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors">
          <span>Block Metadata</span>
          <svg class="w-4 h-4 text-gray-400 transition-transform" data-metadata-chevron fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div class="px-5 pb-4 space-y-3" data-metadata-body>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Name</label>
              <input type="text" data-meta-field="name" value="${esc(b.name)}"
                     class="${inputClasses()}" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Slug</label>
              <input type="text" data-meta-field="slug" value="${esc(slugValue)}" pattern="^[a-z][a-z0-9_-]*$"
                     class="${inputClasses()} font-mono" />
              ${typeHint}
            </div>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${inputClasses()} resize-none">${esc(b.description ?? '')}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Category</label>
              <select data-meta-field="category" class="${inputClasses()}">
                ${this.config.categories.map((c) => `<option value="${esc(c)}" ${c === (b.category ?? '') ? 'selected' : ''}>${esc(titleCase(c))}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Icon</label>
              <input type="text" data-meta-field="icon" value="${esc(b.icon ?? '')}"
                     placeholder="emoji or key"
                     class="${inputClasses()}" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Status</label>
              <select data-meta-field="status" class="${inputClasses()}">
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
        <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
          <span class="text-[11px] text-gray-400">0 fields</span>
        </div>
        <div data-field-drop-zone
             class="flex flex-col items-center justify-center py-16 px-5 text-center border-2 border-dashed ${this.dropHighlight ? 'border-blue-400 bg-blue-50/50' : 'border-transparent'} rounded-lg mx-3 my-2 transition-colors">
          <svg class="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-sm text-gray-400">No fields defined.</p>
          <p class="text-xs text-gray-300 mt-1">Drag fields from the palette or click a field type to add.</p>
        </div>`;
    }

    let html = `
      <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
        <span class="text-[11px] text-gray-400">${this.fields.length} field${this.fields.length !== 1 ? 's' : ''}</span>
      </div>`;

    for (const sectionName of sectionNames) {
      const fields = sections.get(sectionName)!;
      const state = this.getSectionState(sectionName);
      const isCollapsed = state.collapsed;

      html += `
        <div data-section="${esc(sectionName)}" class="border-b border-gray-100">
          <button type="button" data-toggle-section="${esc(sectionName)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 transition-colors group">
            <svg class="w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}"
                 data-section-chevron="${esc(sectionName)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">${esc(titleCase(sectionName))}</span>
            <span class="text-[10px] text-gray-400 ml-auto">${fields.length}</span>
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
           class="mx-3 my-2 py-3 border-2 border-dashed rounded-lg text-center transition-colors ${this.dropHighlight ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}">
        <p class="text-[11px] text-gray-400">Drop a field here or click a field type in the palette</p>
      </div>`;

    return html;
  }

  // ===========================================================================
  // Rendering – Single field card (Task 8.2)
  // ===========================================================================

  private renderFieldCard(field: FieldDefinition, allSections: string[], sectionFields: FieldDefinition[]): string {
    const isExpanded = field.id === this.expandedFieldId;
    const meta = getFieldTypeMetadata(field.type);
    const sectionName = field.section || DEFAULT_SECTION;
    const indexInSection = sectionFields.indexOf(field);
    const isFirst = indexInSection === 0;
    const isLast = indexInSection === sectionFields.length - 1;
    const isDropTarget = this.dropTargetFieldId === field.id;

    return `
      <div data-field-card="${esc(field.id)}"
           data-field-section="${esc(sectionName)}"
           draggable="true"
           class="rounded-lg border ${isDropTarget ? 'border-t-2 border-t-blue-400' : ''} ${isExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'} transition-colors">
        <!-- Collapsed header -->
        <div class="flex items-center gap-1.5 px-2 py-2 select-none" data-field-toggle="${esc(field.id)}">
          <!-- Drag handle (Phase 10 — Task 10.1) -->
          <span class="flex-shrink-0 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing" data-field-grip="${esc(field.id)}">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
              <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
              <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
            </svg>
          </span>
          <span class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-500 text-[10px]">
            ${meta?.icon ?? '?'}
          </span>
          <span class="flex-1 min-w-0 cursor-pointer">
            <span class="block text-[13px] font-medium text-gray-800 truncate">${esc(field.label || field.name)}</span>
            <span class="block text-[10px] text-gray-400 font-mono truncate">${esc(field.name)} &middot; ${esc(field.type)}</span>
          </span>
          ${field.required ? '<span class="flex-shrink-0 text-[9px] font-bold text-red-500 uppercase tracking-widest">req</span>' : ''}
          <!-- Up/Down buttons (Phase 10 — Task 10.2) -->
          <button type="button" data-field-move-up="${esc(field.id)}"
                  class="flex-shrink-0 p-0.5 rounded ${isFirst ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors"
                  title="Move up" ${isFirst ? 'disabled' : ''}>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
          </button>
          <button type="button" data-field-move-down="${esc(field.id)}"
                  class="flex-shrink-0 p-0.5 rounded ${isLast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors"
                  title="Move down" ${isLast ? 'disabled' : ''}>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <!-- Actions: move to section (Task 8.4) -->
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${esc(field.id)}"
                    class="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    title="Field actions" style="opacity:1;">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === field.id ? this.renderMoveToSectionMenu(field, allSections, sectionName) : ''}
          </div>
          <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform cursor-pointer ${isExpanded ? '' : '-rotate-90'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>

        <!-- Expanded properties (Task 8.2) -->
        ${isExpanded ? this.renderFieldProperties(field, allSections) : ''}
      </div>`;
  }

  // ===========================================================================
  // Rendering – Inline field property editor (Task 8.2)
  // ===========================================================================

  private renderFieldProperties(field: FieldDefinition, allSections: string[]): string {
    const validation = field.validation ?? {};
    const normalizedType = normalizeFieldType(field.type);
    const showStringVal = ['text', 'textarea', 'rich-text', 'markdown', 'code', 'slug'].includes(normalizedType);
    const showNumberVal = ['number', 'integer', 'currency', 'percentage'].includes(normalizedType);
    const currentSection = field.section || DEFAULT_SECTION;

    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 mt-1 pt-3" data-field-props="${esc(field.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="name"
                   value="${esc(field.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Label</label>
            <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="label"
                   value="${esc(field.label)}"
                   class="${inputClasses('xs')}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Description</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="description"
                 value="${esc(field.description ?? '')}" placeholder="Help text for editors"
                 class="${inputClasses('xs')}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="placeholder"
                 value="${esc(field.placeholder ?? '')}"
                 class="${inputClasses('xs')}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="required"
                   ${field.required ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="readonly"
                   ${field.readonly ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${esc(field.id)}" data-check-key="hidden"
                   ${field.hidden ? 'checked' : ''}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${showStringVal ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.minLength"
                   value="${validation.minLength ?? ''}" min="0"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.maxLength"
                   value="${validation.maxLength ?? ''}" min="0"
                   class="${inputClasses('xs')}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${esc(field.id)}" data-prop-key="validation.pattern"
                 value="${esc(validation.pattern ?? '')}" placeholder="^[a-z]+$"
                 class="${inputClasses('xs')} font-mono" />
        </div>` : ''}

        ${showNumberVal ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.min"
                   value="${validation.min ?? ''}" step="any"
                   class="${inputClasses('xs')}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="validation.max"
                   value="${validation.max ?? ''}" step="any"
                   class="${inputClasses('xs')}" />
          </div>
        </div>` : ''}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Section</label>
            <select data-field-section-select="${esc(field.id)}"
                    class="${inputClasses('xs')}">
              ${allSections.map((s) => `<option value="${esc(s)}" ${s === currentSection ? 'selected' : ''}>${esc(titleCase(s))}</option>`).join('')}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${esc(field.id)}" data-prop-key="gridSpan"
                   value="${field.gridSpan ?? ''}" min="1" max="12" placeholder="12"
                   class="${inputClasses('xs')}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100">
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
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400">Only one section exists.</div>
          <button type="button" data-move-new-section="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50">
            + Create new section
          </button>
        </div>`;
    }

    return `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Move to section</div>
        ${otherSections.map((s) => `
          <button type="button" data-move-to="${esc(s)}" data-move-field="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${esc(titleCase(s))}
          </button>`).join('')}
        <div class="border-t border-gray-100 mt-1 pt-1">
          <button type="button" data-move-new-section="${esc(field.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50">
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
        chevron?.classList.toggle('-rotate-90', hidden);
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
      if (chevron) chevron.classList.toggle('-rotate-90', state.collapsed);
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
      const newSection = prompt('Section name:');
      if (newSection && newSection.trim()) {
        this.moveFieldToSection(fieldId, newSection.trim().toLowerCase().replace(/\s+/g, '_'));
      }
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
      if (field && confirm(`Remove field "${field.label || field.name}"?`)) {
        this.fields = this.fields.filter((f) => f.id !== fieldId);
        if (this.expandedFieldId === fieldId) this.expandedFieldId = null;
        this.notifySchemaChange();
        this.render();
      }
      return;
    }

    // Field toggle (expand/collapse — Task 8.2 accordion)
    const fieldToggle = target.closest<HTMLElement>('[data-field-toggle]');
    if (fieldToggle) {
      const fieldId = fieldToggle.dataset.fieldToggle!;
      // Accordion: close current if same, otherwise switch
      this.expandedFieldId = this.expandedFieldId === fieldId ? null : fieldId;
      this.render();
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
        let targetSection = select.value;

        if (targetSection === '__new__') {
          const newSection = prompt('Section name:');
          if (newSection && newSection.trim()) {
            targetSection = newSection.trim().toLowerCase().replace(/\s+/g, '_');
          } else {
            // Revert selection
            const field = this.fields.find((f) => f.id === fieldId);
            select.value = field?.section || DEFAULT_SECTION;
            return;
          }
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

function statusClasses(status?: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'deprecated':
      return 'bg-red-100 text-red-700';
    case 'draft':
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

function inputClasses(size: 'sm' | 'xs' = 'sm'): string {
  const base = 'w-full border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  return size === 'xs'
    ? `${base} px-2 py-1 text-[12px]`
    : `${base} px-2.5 py-1.5 text-sm`;
}

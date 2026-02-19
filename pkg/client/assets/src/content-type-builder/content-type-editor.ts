/**
 * Content Type Editor
 *
 * Main editor component for creating/editing content types.
 * Includes field list with drag-and-drop ordering, quick edit cards,
 * and schema preview integration.
 */

import type {
  ContentType,
  ContentTypeEditorConfig,
  FieldDefinition,
  FieldType,
  JSONSchema,
  UISchemaOverlay,
  UILayoutConfig,
  UIOverride,
  ContentTypeBuilderState,
  SchemaValidationError,
  ContentTypeCapabilities,
  ContentTypeSchemaVersion,
  CompatibilityCheckResult,
  SchemaChange,
  BlocksFieldConfig,
  BlockDefinitionSummary,
} from './types';
import { ContentTypeAPIClient, fieldsToSchema, schemaToFields, generateFieldId, mergeSchemaWithBase } from './api-client';
import { FieldTypePicker, getFieldTypeMetadata, FIELD_TYPES, normalizeFieldType } from './field-type-picker';
import { FieldConfigForm } from './field-config-form';
import { FieldPalettePanel, PALETTE_DRAG_MIME, PALETTE_DRAG_META_MIME } from './field-palette-panel';
import { LayoutEditor } from './layout-editor';
import { Modal, ConfirmModal } from '../shared/modal';
import { inputClasses, textareaClasses, labelClasses } from './shared/field-input-classes';
import { renderIconTrigger, bindIconTriggerEvents, closeIconPicker } from './shared/icon-picker';
import { renderEntityHeader } from './shared/entity-header';
import { renderFieldCard as renderFieldCardShared, renderFieldKebab, renderDropZone } from './shared/field-card';
import { loadAvailableBlocks, normalizeBlockSelection, renderInlineBlockPicker, bindInlineBlockPickerEvents } from './shared/block-picker';

// =============================================================================
// Content Type Editor Component
// =============================================================================

const DEFAULT_SECTION = 'main';

// Extended state with layout
interface ExtendedBuilderState extends ContentTypeBuilderState {
  layout: UILayoutConfig;
  previewError: string | null;
  originalSchema: JSONSchema | null;
  initialFieldsSignature: string;
}

export class ContentTypeEditor {
  private config: ContentTypeEditorConfig;
  private container: HTMLElement;
  private api: ContentTypeAPIClient;
  private state: ExtendedBuilderState;
  private dragState: DragState | null = null;
  private dropIndicator: HTMLElement | null = null;
  private dragOverRAF: number | null = null;
  private staticEventsBound = false;
  private previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private palettePanel: FieldPalettePanel | null = null;
  private paletteVisible = false;
  private sectionStates: Map<string, { collapsed: boolean }> = new Map();
  private lifecycleOutsideClickHandler: ((e: MouseEvent) => void) | null = null;
  private cachedBlocks: BlockDefinitionSummary[] | null = null;
  private blocksLoading = false;
  private blockPickerModes: Map<string, 'allowed' | 'denied'> = new Map();
  /** Currently open field kebab menu (null = none open) */
  private fieldActionsMenuId: string | null = null;

  constructor(container: HTMLElement, config: ContentTypeEditorConfig) {
    this.container = container;
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
    const configuredEnvironment = this.normalizeEnvironment(config.environment);
    if (configuredEnvironment) {
      this.api.setEnvironment(configuredEnvironment);
    }
    this.state = {
      contentType: null,
      fields: [],
      isDirty: false,
      isLoading: false,
      isSaving: false,
      isPreviewing: false,
      validationErrors: [],
      selectedFieldId: null,
      previewHtml: null,
      previewError: null,
      layout: { type: 'flat', gridColumns: 12, tabs: [] },
      originalSchema: null,
      initialFieldsSignature: '',
    };
  }

  private normalizeEnvironment(value?: string): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized;
  }

  /**
   * Initialize the editor
   */
  async init(): Promise<void> {
    this.render();
    this.bindEvents();

    // Load existing content type if editing
    if (this.config.contentTypeId) {
      await this.loadContentType(this.config.contentTypeId);
    }
  }

  /**
   * Load a content type for editing
   */
  async loadContentType(idOrSlug: string): Promise<void> {
    this.state.isLoading = true;
    this.updateLoadingState();

    try {
      const contentType = await this.api.get(idOrSlug);
      this.state.contentType = contentType;
      this.state.fields = schemaToFields(contentType.schema);
      this.state.originalSchema = contentType.schema ?? null;
      this.state.initialFieldsSignature = this.serializeFields(this.state.fields);
      // Load layout from ui_schema
      if (contentType.ui_schema?.layout) {
        this.state.layout = {
          type: contentType.ui_schema.layout.type ?? 'flat',
          tabs: contentType.ui_schema.layout.tabs ?? [],
          gridColumns: contentType.ui_schema.layout.gridColumns ?? 12,
        };
      }
      this.state.isDirty = false;
      this.render();
      this.bindEvents();
      this.schedulePreview();
    } catch (error) {
      console.error('Failed to load content type:', error);
      this.showToast('Failed to load content type', 'error');
    } finally {
      this.state.isLoading = false;
      this.updateLoadingState();
    }
  }

  /**
   * Save the content type
   */
  async save(): Promise<void> {
    if (this.state.isSaving) return;

    // Validate required fields
    const nameInput = this.container.querySelector<HTMLInputElement>('[data-ct-name]');
    const name = nameInput?.value?.trim();
    if (!name) {
      this.showToast('Name is required', 'error');
      nameInput?.focus();
      return;
    }

    // Build content type data
    const schema = this.buildSchemaPayload();
    const contentType: Partial<ContentType> = {
      name,
      slug: this.getSlug(),
      description: this.getDescription(),
      icon: this.getIcon(),
      schema,
      ui_schema: this.buildUISchema(),
      capabilities: this.getCapabilities(),
    };

    this.state.isSaving = true;
    this.updateSavingState();

    try {
      let saved: ContentType;
      if (this.state.contentType?.id) {
        saved = await this.api.update(this.state.contentType.id, contentType);
      } else {
        saved = await this.api.create(contentType);
      }

      this.state.contentType = saved;
      this.state.originalSchema = saved.schema ?? null;
      this.state.initialFieldsSignature = this.serializeFields(this.state.fields);
      this.state.isDirty = false;
      this.showToast('Content type saved successfully', 'success');
      this.config.onSave?.(saved);
    } catch (error) {
      console.error('Failed to save content type:', error);
      const message = error instanceof Error ? error.message : 'Failed to save content type';
      this.showToast(message, 'error');
    } finally {
      this.state.isSaving = false;
      this.updateSavingState();
    }
  }

  private buildSchemaPayload(): JSONSchema {
    const generated = fieldsToSchema(this.state.fields, this.getSlug());
    if (!this.schemaHasChanges() && this.state.originalSchema) {
      return this.state.originalSchema;
    }
    return mergeSchemaWithBase(this.state.originalSchema, generated);
  }

  private schemaHasChanges(): boolean {
    if (!this.state.initialFieldsSignature) {
      return true;
    }
    return this.serializeFields(this.state.fields) !== this.state.initialFieldsSignature;
  }

  private serializeFields(fields: FieldDefinition[]): string {
    const normalized = fields.map((field) => ({
      name: field.name,
      type: field.type,
      label: field.label,
      description: field.description,
      placeholder: field.placeholder,
      helpText: field.helpText,
      required: field.required,
      readonly: field.readonly,
      hidden: field.hidden,
      filterable: field.filterable,
      defaultValue: field.defaultValue,
      section: field.section,
      gridSpan: field.gridSpan,
      order: field.order,
      validation: field.validation,
      config: field.config,
    }));
    return JSON.stringify(normalized);
  }

  /**
   * Add a new field
   */
  addField(type: FieldType): void {
    const metadata = getFieldTypeMetadata(type);

    // Auto-generate defaults for blocks fields (Phase 4 — Task 4.2)
    if (type === 'blocks') {
      const existingNames = new Set(this.state.fields.map((f) => f.name));
      let name = 'content_blocks';
      let label = 'Content Blocks';
      let counter = 1;
      while (existingNames.has(name)) {
        name = `content_blocks_${counter}`;
        label = `Content Blocks ${counter}`;
        counter++;
      }
      const field: FieldDefinition = {
        id: generateFieldId(),
        name,
        type,
        label,
        required: false,
        order: this.state.fields.length,
        ...(metadata?.defaultConfig ?? {}),
      };
      this.state.fields.push(field);
      this.state.selectedFieldId = field.id;
      this.state.isDirty = true;
      this.renderFieldList();
      this.updateDirtyState();
      this.schedulePreview();
      this.loadBlocksForField(field);
      return;
    }

    const field: FieldDefinition = {
      id: generateFieldId(),
      name: `new_${type}_${this.state.fields.length + 1}`,
      type,
      label: metadata?.label ?? type,
      required: false,
      order: this.state.fields.length,
      ...(metadata?.defaultConfig ?? {}),
    };

    // Open config form for the new field
    const configForm = new FieldConfigForm({
      field,
      existingFieldNames: this.state.fields.map((f) => f.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (updatedField) => {
        this.state.fields.push(updatedField);
        this.state.isDirty = true;
        this.renderFieldList();
        this.updateDirtyState();
        this.schedulePreview();
      },
      onCancel: () => {},
    });
    configForm.show();
  }

  /**
   * Edit an existing field
   */
  editField(fieldId: string): void {
    const field = this.state.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const configForm = new FieldConfigForm({
      field,
      existingFieldNames: this.state.fields.filter((f) => f.id !== fieldId).map((f) => f.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (updatedField) => {
        const index = this.state.fields.findIndex((f) => f.id === fieldId);
        if (index !== -1) {
          this.state.fields[index] = updatedField;
          this.state.isDirty = true;
          this.renderFieldList();
          this.updateDirtyState();
          this.schedulePreview();
        }
      },
      onCancel: () => {},
    });
    configForm.show();
  }

  /**
   * Remove a field
   */
  async removeField(fieldId: string): Promise<void> {
    const index = this.state.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const field = this.state.fields[index];
    const confirmed = await ConfirmModal.confirm(
      `Remove field "${field.label}"?`,
      { title: 'Remove Field', confirmText: 'Remove', confirmVariant: 'danger' },
    );
    if (!confirmed) return;

    this.state.fields.splice(index, 1);
    this.state.isDirty = true;
    this.renderFieldList();
    this.updateDirtyState();
    this.schedulePreview();
  }

  /**
   * Move a field to a new position (optionally across sections)
   */
  moveField(fieldId: string, targetSection: string, targetIndex: number): void {
    const currentIndex = this.state.fields.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1) return;

    const field = this.state.fields[currentIndex];
    const sourceSection = field.section || DEFAULT_SECTION;
    const normalizedTarget = targetSection || DEFAULT_SECTION;

    const sections = this.groupFieldsBySection();
    const sourceList = sections.get(sourceSection);
    if (!sourceList) return;

    const fromIndex = sourceList.findIndex((f) => f.id === fieldId);
    if (fromIndex === -1) return;

    sourceList.splice(fromIndex, 1);
    if (sourceList.length === 0) {
      sections.delete(sourceSection);
    }

    if (!sections.has(normalizedTarget)) {
      sections.set(normalizedTarget, []);
    }

    const targetList = sections.get(normalizedTarget)!;
    let insertIndex = Math.max(0, Math.min(targetIndex, targetList.length));
    if (sourceSection === normalizedTarget && fromIndex < insertIndex) {
      insertIndex -= 1;
    }
    targetList.splice(insertIndex, 0, field);

    field.section = normalizedTarget === DEFAULT_SECTION ? undefined : normalizedTarget;

    const ordered = new Map<string, FieldDefinition[]>();
    if (sections.has(DEFAULT_SECTION)) {
      ordered.set(DEFAULT_SECTION, sections.get(DEFAULT_SECTION)!);
    }
    for (const [key, list] of sections) {
      if (key === DEFAULT_SECTION) continue;
      ordered.set(key, list);
    }
    this.state.fields = Array.from(ordered.values()).flat();

    // Update order values
    this.state.fields.forEach((f, i) => {
      f.order = i;
    });

    this.state.isDirty = true;
    this.renderFieldList();
    this.updateDirtyState();
    this.schedulePreview();
  }

  /**
   * Move a field up (-1) or down (+1) within its section
   */
  moveFieldByDirection(fieldId: string, direction: -1 | 1): void {
    const field = this.state.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const sectionName = field.section || DEFAULT_SECTION;
    const sectionFields = this.state.fields.filter((f) => (f.section || DEFAULT_SECTION) === sectionName);
    const indexInSection = sectionFields.findIndex((f) => f.id === fieldId);
    const newIndex = indexInSection + direction;

    if (newIndex < 0 || newIndex >= sectionFields.length) return;

    // Swap in the master fields array
    const globalA = this.state.fields.indexOf(sectionFields[indexInSection]);
    const globalB = this.state.fields.indexOf(sectionFields[newIndex]);
    [this.state.fields[globalA], this.state.fields[globalB]] = [this.state.fields[globalB], this.state.fields[globalA]];

    this.state.isDirty = true;
    this.renderFieldList();
    this.updateDirtyState();
    this.schedulePreview();
  }

  /**
   * Validate the schema
   */
  async validateSchema(): Promise<void> {
    const schema = this.buildSchemaPayload();

    try {
      const result = await this.api.validateSchema({
        schema,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema(),
      });

      if (result.valid) {
        this.state.validationErrors = [];
        this.showToast('Schema is valid', 'success');
      } else {
        this.state.validationErrors = result.errors ?? [];
        this.showToast('Schema has validation errors', 'error');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      const message = error instanceof Error ? error.message : 'Validation failed';
      this.showToast(message, 'error');
    }

    this.renderValidationErrors();
  }

  /**
   * Preview the schema as a rendered form
   */
  async previewSchema(): Promise<void> {
    if (this.state.isPreviewing) return;

    // Guard: skip API call when there are no fields
    if (this.state.fields.length === 0) {
      this.state.previewHtml = null;
      this.state.previewError = null;
      const previewContainer = this.container.querySelector('[data-ct-preview-container]');
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-sm">Add fields to preview the form</p>
          </div>
        `;
      }
      return;
    }

    const schema = fieldsToSchema(this.state.fields, this.getSlug());

    this.state.isPreviewing = true;
    this.updatePreviewState();

    try {
      const result = await this.api.previewSchema({
        schema,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema(),
      });

      this.state.previewHtml = result.html;
      this.state.previewError = null;
      this.renderPreview();
    } catch (error) {
      console.error('Preview failed:', error);
      const message = error instanceof Error ? error.message : 'Preview failed';
      this.state.previewHtml = null;
      this.state.previewError = message;
      this.renderPreview();
    } finally {
      this.state.isPreviewing = false;
      this.updatePreviewState();
    }
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private render(): void {
    closeIconPicker();
    // Recreate palette after full re-render to avoid stale DOM references
    this.palettePanel = null;
    this.container.innerHTML = `
      <div class="content-type-editor flex flex-col h-full" data-content-type-editor>
        <!-- Header -->
        ${this.renderHeader()}

        <!-- Main Content -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left Panel: Basic Info + Fields -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            ${this.renderBasicInfo()}
            ${this.renderFieldsSection()}
            ${this.renderCapabilitiesSection()}
          </div>

          <!-- Right Panel: Preview -->
          <div class="w-[400px] border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-950 overflow-y-auto">
            ${this.renderPreviewPanel()}
          </div>
        </div>

        <!-- Validation Errors -->
        <div data-ct-validation-errors class="hidden"></div>
      </div>
    `;
  }

  private renderBasicInfo(): string {
    const ct = this.state.contentType;

    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Basic Information</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${labelClasses()}">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${escapeHtml(ct?.name ?? '')}"
              placeholder="Blog Post"
              required
              class="${inputClasses()}"
            />
          </div>

          <div>
            <label class="${labelClasses()}">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${escapeHtml(ct?.slug ?? '')}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="${inputClasses()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="${labelClasses()}">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="${textareaClasses()}"
          >${escapeHtml(ct?.description ?? '')}</textarea>
        </div>

        <div class="mt-4">
          <label class="${labelClasses()}">
            Icon
          </label>
          ${renderIconTrigger(ct?.icon ?? '', 'data-ct-icon')}
        </div>
      </div>
    `;
  }

  private renderFieldsSection(): string {
    const layoutType = this.state.layout.type ?? 'flat';
    const layoutLabel = layoutType === 'tabs' ? 'Tabs' : layoutType === 'sections' ? 'Sections' : 'Flat';

    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <h2 class="text-sm font-medium text-gray-900 dark:text-white">
              Fields (${this.state.fields.length})
            </h2>
            <button
              type="button"
              data-ct-layout
              class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
              </svg>
              Layout: ${layoutLabel}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-ct-toggle-palette
              class="flex items-center gap-1 px-2 py-1 text-xs ${this.paletteVisible ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'} rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
              </svg>
              Palette
            </button>
            <button
              type="button"
              data-ct-add-field
              class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Field
            </button>
          </div>
        </div>

        <div data-ct-palette class="${this.paletteVisible ? '' : 'hidden'} border-b border-gray-200 dark:border-gray-700">
          <div data-ct-palette-container class="h-[300px] overflow-y-auto"></div>
        </div>

        <div data-ct-field-list class="p-4">
          ${this.renderFieldListHTML()}
        </div>
      </div>
    `;
  }

  private renderFieldListHTML(): string {
    return this.renderFieldListContent();
  }

  private renderFieldCard(field: FieldDefinition, index: number, sectionFields?: FieldDefinition[]): string {
    const isBlocks = normalizeFieldType(field.type) === 'blocks';
    const isExpanded = isBlocks && this.state.selectedFieldId === field.id;

    // Check for validation errors for this field
    const fieldErrors = this.state.validationErrors.filter(
      (err) => err.path.includes(`/${field.name}`) || err.path.includes(`properties.${field.name}`)
    );
    const hasErrors = fieldErrors.length > 0;

    // Build constraints summary
    const constraints: string[] = [];
    if (field.validation?.minLength !== undefined) constraints.push(`min: ${field.validation.minLength}`);
    if (field.validation?.maxLength !== undefined) constraints.push(`max: ${field.validation.maxLength}`);
    if (field.validation?.min !== undefined) constraints.push(`>= ${field.validation.min}`);
    if (field.validation?.max !== undefined) constraints.push(`<= ${field.validation.max}`);
    if (field.validation?.pattern) constraints.push('pattern');

    // Determine position in section for reorder buttons
    const list = sectionFields ?? this.state.fields;
    const indexInList = list.indexOf(field);

    // Kebab menu with dropdown
    const menuOpen = this.fieldActionsMenuId === field.id;
    const actionsHtml = `
          <div class="relative flex-shrink-0">
            ${renderFieldKebab(field.id)}
            ${menuOpen ? this.renderFieldActionsMenu(field) : ''}
          </div>`;

    return renderFieldCardShared({
      field,
      sectionName: field.section || DEFAULT_SECTION,
      isSelected: this.state.selectedFieldId === field.id,
      isExpanded,
      hasErrors,
      errorMessages: fieldErrors.map(err => err.message),
      constraintBadges: constraints,
      index,
      actionsHtml,
      showReorderButtons: true,
      isFirst: indexInList === 0,
      isLast: indexInList === list.length - 1,
      compact: false,
      renderExpandedContent: isBlocks ? () => this.renderBlocksInlineContent(field) : undefined,
    });
  }

  private renderFieldActionsMenu(field: FieldDefinition): string {
    const itemClass = 'w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2';
    return `
      <div data-ct-field-actions-menu class="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <button type="button" data-field-action-edit="${escapeHtml(field.id)}" class="${itemClass}">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
        <button type="button" data-field-action-remove="${escapeHtml(field.id)}" class="${itemClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Remove
        </button>
      </div>`;
  }

  private renderBlocksInlineContent(field: FieldDefinition): string {
    const config = (field.config ?? {}) as BlocksFieldConfig;
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
        <div class="flex items-center justify-center py-6" data-ct-blocks-loading="${escapeHtml(field.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    }

    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${escapeHtml(field.id)}">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-ct-blocks-mode-toggle="${escapeHtml(field.id)}" data-ct-blocks-mode="allowed"
                    class="${toggleBase} ${allowedClass}">
              Allowed
            </button>
            <button type="button" data-ct-blocks-mode-toggle="${escapeHtml(field.id)}" data-ct-blocks-mode="denied"
                    class="${toggleBase} ${deniedClass}">
              Denied
            </button>
          </div>
          <button type="button" data-ct-blocks-open-library="${escapeHtml(field.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-ct-blocks-picker-container="${escapeHtml(field.id)}">
          ${pickerHtml}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-ct-blocks-advanced="${escapeHtml(field.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>
      </div>`;
  }

  private renderCapabilitiesSection(): string {
    const caps = this.state.contentType?.capabilities ?? {};

    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Capabilities</h2>

        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="versioning"
              ${caps.versioning ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Versioning</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="scheduling"
              ${caps.scheduling ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Scheduling</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="seo"
              ${caps.seo ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">SEO Fields</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="localization"
              ${caps.localization ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Localization</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="blocks"
              ${caps.blocks ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Block Editor</span>
          </label>
        </div>
      </div>
    `;
  }

  private renderPreviewPanel(): string {
    return `
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-gray-900 dark:text-white">Form Preview</h2>
          <button
            type="button"
            data-ct-refresh-preview
            class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Refresh
          </button>
        </div>

        <div
          data-ct-preview-container
          class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]"
        >
          ${
            this.state.previewHtml
              ? this.state.previewHtml
              : `
            <div class="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <p class="text-sm">Click "Preview" to see the generated form</p>
            </div>
          `
          }
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // Status Badges & Lifecycle Actions
  // ===========================================================================

  private renderHeader(): string {
    const ct = this.state.contentType;
    return renderEntityHeader({
      name: ct ? 'Edit Content Type' : 'Create Content Type',
      subtitle: ct ? `Editing: ${ct.name}` : 'Define fields and configure your content type',
      status: ct?.status,
      version: ct?.schema_version,
      actions: this.renderHeaderActions(),
    });
  }

  private renderHeaderActions(): string {
    const ct = this.state.contentType;
    const btnClass = 'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700';
    return `
      ${this.state.validationErrors.length > 0 ? `
        <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? 's' : ''}
        </span>
      ` : ''}
      ${ct ? this.renderLifecycleActions(ct) : ''}
      <button type="button" data-ct-validate class="${btnClass}">Validate</button>
      <button type="button" data-ct-preview class="${btnClass}">Preview</button>
      <button type="button" data-ct-cancel class="${btnClass}">Cancel</button>
      <button type="button" data-ct-save class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        ${ct ? 'Save Changes' : 'Create Content Type'}
      </button>
    `;
  }

  private renderLifecycleActions(ct: ContentType): string {
    const status = (ct.status ?? '').toLowerCase();
    const isDraft = status === '' || status === 'draft';
    const isActive = status === 'active' || status === 'published';
    return `
      <div class="relative" data-ct-lifecycle-menu>
        <button
          type="button"
          data-ct-lifecycle-trigger
          class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
          Actions
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div
          data-ct-lifecycle-dropdown
          class="hidden absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
        >
          <div class="py-1">
            ${isDraft ? `
              <button
                type="button"
                data-ct-publish
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Publish
              </button>
            ` : isActive ? `
              <button
                type="button"
                data-ct-deprecate
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                Deprecate
              </button>
            ` : ''}
            <button
              type="button"
              data-ct-clone
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              Clone
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              type="button"
              data-ct-versions
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Version History
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // Lifecycle Actions
  // ===========================================================================

  /**
   * Publish the content type
   */
  async publishContentType(): Promise<void> {
    if (!this.state.contentType?.id) return;

    // First check compatibility
    const schema = this.buildSchemaPayload();
    let compatResult: CompatibilityCheckResult | null = null;
    let compatError: string | null = null;

    try {
      compatResult = await this.api.checkCompatibility(
        this.state.contentType.id,
        schema,
        this.buildUISchema()
      );
    } catch (error) {
      compatError = error instanceof Error ? error.message : 'Compatibility check failed';
    }

    // Show confirmation modal
    const modal = new PublishConfirmationModal({
      contentType: this.state.contentType,
      compatibilityResult: compatResult,
      compatibilityError: compatError ?? undefined,
      onConfirm: async (force: boolean) => {
        try {
          const published = await this.api.publish(this.state.contentType!.id, force);
          this.state.contentType = published;
          this.state.isDirty = false;
          this.render();
          this.bindEvents();
          this.showToast('Content type published successfully', 'success');
          this.config.onSave?.(published);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to publish content type';
          this.showToast(message, 'error');
        }
      },
      onCancel: () => {},
    });
    modal.show();
  }

  /**
   * Deprecate the content type
   */
  async deprecateContentType(): Promise<void> {
    if (!this.state.contentType?.id) return;

    const confirmed = await ConfirmModal.confirm(
      `Are you sure you want to deprecate "${this.state.contentType.name}"? Deprecated content types can still be used but are hidden from new content creation.`,
      { title: 'Deprecate Content Type', confirmText: 'Deprecate', confirmVariant: 'danger' },
    );
    if (!confirmed) return;

    try {
      const deprecated = await this.api.deprecate(this.state.contentType.id);
      this.state.contentType = deprecated;
      this.render();
      this.bindEvents();
      this.showToast('Content type deprecated successfully', 'success');
      this.config.onSave?.(deprecated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deprecate content type';
      this.showToast(message, 'error');
    }
  }

  /**
   * Clone the content type
   */
  async cloneContentType(): Promise<void> {
    if (!this.state.contentType?.id) return;

    const modal = new CloneContentTypeModal({
      contentType: this.state.contentType,
      onConfirm: async (newSlug: string, newName?: string) => {
        try {
          const cloned = await this.api.clone(this.state.contentType!.id, newSlug, newName);
          this.showToast(`Content type cloned as "${cloned.name}"`, 'success');
          // Optionally navigate to the cloned content type
          if (this.config.onSave) {
            this.config.onSave(cloned);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to clone content type';
          this.showToast(message, 'error');
        }
      },
      onCancel: () => {},
    });
    modal.show();
  }

  /**
   * Show version history
   */
  showVersionHistory(): void {
    if (!this.state.contentType?.id) return;

    const viewer = new ContentTypeVersionHistoryViewer({
      apiBasePath: this.config.apiBasePath,
      contentType: this.state.contentType,
    });
    viewer.show();
  }

  // ===========================================================================
  // Event Binding
  // ===========================================================================

  private bindEvents(): void {
    if (!this.staticEventsBound) {
      this.bindStaticEvents();
      this.staticEventsBound = true;
    }
    this.bindDynamicEvents();
  }

  private bindStaticEvents(): void {
    // Field actions (delegated)
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Kebab menu trigger — toggle dropdown
      const actionsBtn = target.closest<HTMLElement>('[data-field-actions]');
      if (actionsBtn) {
        e.stopPropagation();
        const fieldId = actionsBtn.dataset.fieldActions!;
        this.fieldActionsMenuId = this.fieldActionsMenuId === fieldId ? null : fieldId;
        this.renderFieldList();
        return;
      }

      // Kebab dropdown: Edit
      const editAction = target.closest<HTMLElement>('[data-field-action-edit]');
      if (editAction) {
        const fieldId = editAction.dataset.fieldActionEdit!;
        this.fieldActionsMenuId = null;
        this.editField(fieldId);
        return;
      }

      // Kebab dropdown: Remove
      const removeAction = target.closest<HTMLElement>('[data-field-action-remove]');
      if (removeAction) {
        const fieldId = removeAction.dataset.fieldActionRemove!;
        this.fieldActionsMenuId = null;
        this.removeField(fieldId);
        return;
      }

      // Reorder: Move up
      const moveUpBtn = target.closest<HTMLElement>('[data-field-move-up]');
      if (moveUpBtn && !moveUpBtn.hasAttribute('disabled')) {
        e.stopPropagation();
        const fieldId = moveUpBtn.dataset.fieldMoveUp!;
        this.moveFieldByDirection(fieldId, -1);
        return;
      }

      // Reorder: Move down
      const moveDownBtn = target.closest<HTMLElement>('[data-field-move-down]');
      if (moveDownBtn && !moveDownBtn.hasAttribute('disabled')) {
        e.stopPropagation();
        const fieldId = moveDownBtn.dataset.fieldMoveDown!;
        this.moveFieldByDirection(fieldId, 1);
        return;
      }

      // Blocks picker mode toggle (allowed/denied)
      const blocksMode = target.closest<HTMLElement>('[data-ct-blocks-mode-toggle]');
      if (blocksMode) {
        const fieldId = blocksMode.dataset.ctBlocksModeToggle!;
        const mode = (blocksMode.dataset.ctBlocksMode as 'allowed' | 'denied') ?? 'allowed';
        this.blockPickerModes.set(fieldId, mode);
        this.renderFieldList();
        const field = this.state.fields.find((f) => f.id === fieldId);
        if (field && normalizeFieldType(field.type) === 'blocks') {
          this.loadBlocksForField(field);
        }
        return;
      }

      // Open Block Library
      const blocksOpenLibrary = target.closest<HTMLElement>('[data-ct-blocks-open-library]');
      if (blocksOpenLibrary) {
        const basePath = this.api.getBasePath();
        window.location.href = `${basePath}/content/block-library`;
        return;
      }

      // Advanced settings modal
      const blocksAdvanced = target.closest<HTMLElement>('[data-ct-blocks-advanced]');
      if (blocksAdvanced) {
        const fieldId = blocksAdvanced.dataset.ctBlocksAdvanced!;
        if (fieldId) this.editField(fieldId);
        return;
      }

      // Retry loading blocks for field
      const blocksRetry = target.closest<HTMLElement>('[data-ct-blocks-retry]');
      if (blocksRetry) {
        const fieldId = blocksRetry.dataset.ctBlocksRetry!;
        const field = this.state.fields.find((f) => f.id === fieldId);
        if (field) {
          this.cachedBlocks = null;
          this.loadBlocksForField(field);
        }
        return;
      }

      // Field toggle (expand/collapse for inline blocks)
      const fieldToggle = target.closest<HTMLElement>('[data-field-toggle]');
      if (fieldToggle && !target.closest('button')) {
        const fieldId = fieldToggle.dataset.fieldToggle!;
        this.state.selectedFieldId = this.state.selectedFieldId === fieldId ? null : fieldId;
        this.renderFieldList();
        if (this.state.selectedFieldId) {
          const field = this.state.fields.find((f) => f.id === this.state.selectedFieldId);
          if (field && normalizeFieldType(field.type) === 'blocks') {
            this.loadBlocksForField(field);
          }
        }
        return;
      }

      // Select field card
      const fieldCard = target.closest('[data-field-card]');
      if (fieldCard && !target.closest('button') && !target.closest('[data-field-props]')) {
        const fieldId = fieldCard.getAttribute('data-field-card');
        if (fieldId) {
          this.state.selectedFieldId = this.state.selectedFieldId === fieldId ? null : fieldId;
          this.renderFieldList();
        }
      }

      // Close kebab menu on any click that didn't match a menu action
      if (this.fieldActionsMenuId && !target.closest('[data-field-actions]') && !target.closest('[data-ct-field-actions-menu]')) {
        this.fieldActionsMenuId = null;
        this.renderFieldList();
      }
    });

    // Mark dirty on input changes + auto-slug
    this.container.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.matches('[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]') ||
        target.matches('[data-ct-cap]')
      ) {
        this.state.isDirty = true;
        this.updateDirtyState();
      }

      if (target.matches('[data-ct-name]')) {
        const nameInput = target as HTMLInputElement;
        const slugInput = this.container.querySelector<HTMLInputElement>('[data-ct-slug]');
        if (slugInput && !slugInput.dataset.userModified && !this.state.contentType?.slug) {
          slugInput.value = nameToSlug(nameInput.value);
        }
        this.schedulePreview();
        return;
      }

      if (target.matches('[data-ct-slug]')) {
        const slugInput = target as HTMLInputElement;
        slugInput.dataset.userModified = 'true';
        this.schedulePreview();
        return;
      }
    });
  }

  private bindDynamicEvents(): void {
    // Header actions
    this.container.querySelector('[data-ct-save]')?.addEventListener('click', () => this.save());
    this.container.querySelector('[data-ct-validate]')?.addEventListener('click', () => this.validateSchema());
    this.container.querySelector('[data-ct-preview]')?.addEventListener('click', () => this.previewSchema());
    this.container.querySelector('[data-ct-cancel]')?.addEventListener('click', () => this.config.onCancel?.());

    // Lifecycle actions dropdown
    this.bindLifecycleMenuEvents();

    // Add field buttons
    this.container.querySelector('[data-ct-add-field]')?.addEventListener('click', () => this.showFieldTypePicker());
    this.container.querySelector('[data-ct-add-field-empty]')?.addEventListener('click', () =>
      this.showFieldTypePicker()
    );

    // Palette toggle
    this.container.querySelector('[data-ct-toggle-palette]')?.addEventListener('click', () => this.togglePalette());

    // Initialize palette if visible
    this.initPaletteIfNeeded();

    // Layout button
    this.container.querySelector('[data-ct-layout]')?.addEventListener('click', () => this.showLayoutEditor());

    // Preview refresh
    this.container.querySelector('[data-ct-refresh-preview]')?.addEventListener('click', () => this.previewSchema());

    // Icon picker trigger
    bindIconTriggerEvents(this.container, '[data-icon-trigger]', (trigger) => {
      const hiddenInput = trigger.querySelector<HTMLInputElement>('[data-ct-icon]');
      return {
        value: hiddenInput?.value ?? '',
        onSelect: (v: string) => {
          if (hiddenInput) {
            hiddenInput.value = v;
            this.state.isDirty = true;
            this.updateDirtyState();
          }
        },
        onClear: () => {
          if (hiddenInput) {
            hiddenInput.value = '';
            this.state.isDirty = true;
            this.updateDirtyState();
          }
        },
      };
    });

    // Section toggles
    this.bindSectionToggleEvents();

    // Drag and drop
    this.bindDragEvents();
  }

  private removeDropIndicator(): void {
    if (this.dropIndicator && this.dropIndicator.parentNode) {
      this.dropIndicator.parentNode.removeChild(this.dropIndicator);
    }
    this.dropIndicator = null;
  }

  private getOrCreateDropIndicator(): HTMLElement {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement('div');
      this.dropIndicator.className =
        'drop-indicator h-0.5 bg-blue-500 rounded-full my-1 pointer-events-none';
    }
    return this.dropIndicator;
  }

  private bindDragEvents(): void {
    const fieldList = this.container.querySelector('[data-ct-field-list]');
    if (!fieldList) return;

    // Drag start
    fieldList.addEventListener('dragstart', (evt) => {
      const e = evt as DragEvent;
      const target = e.target as HTMLElement;
      const card = target.closest<HTMLElement>('[data-field-card]');
      if (!card) return;

      const fieldId = card.getAttribute('data-field-card');
      const index = parseInt(card.getAttribute('data-field-index') ?? '0', 10);
      const sectionName = card.getAttribute('data-field-section') ?? DEFAULT_SECTION;

      this.dragState = {
        fieldId: fieldId ?? '',
        startSection: sectionName,
        currentSection: sectionName,
        startIndex: index,
        currentIndex: index,
      };

      card.classList.add('opacity-50');
      e.dataTransfer?.setData('text/plain', fieldId ?? '');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    // Drag enter — mark container as valid drop zone
    fieldList.addEventListener('dragenter', (evt) => {
      evt.preventDefault();
    });

    // Drag over — throttled via rAF, reuses cached indicator
    fieldList.addEventListener('dragover', (evt) => {
      evt.preventDefault();
      const e = evt as DragEvent;
      if (!this.dragState) return;

      const clientY = e.clientY;
      const target = e.target as HTMLElement;

      if (this.dragOverRAF) return;
      this.dragOverRAF = requestAnimationFrame(() => {
        this.dragOverRAF = null;
        if (!this.dragState) return;

        const card = target.closest<HTMLElement>('[data-field-card]');
        if (!card || card.getAttribute('data-field-card') === this.dragState.fieldId) return;

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = clientY < midY;

        // Reuse cached indicator — just move it in the DOM
        const indicator = this.getOrCreateDropIndicator();
        const anchor = insertBefore ? card : card.nextSibling;
        if (indicator.nextSibling !== anchor || indicator.parentNode !== card.parentElement) {
          card.parentElement?.insertBefore(indicator, anchor);
        }

        // Update current index
        const targetIndex = parseInt(card.getAttribute('data-field-index') ?? '0', 10);
        const targetSection = card.getAttribute('data-field-section') ?? DEFAULT_SECTION;
        this.dragState.currentSection = targetSection;
        this.dragState.currentIndex = insertBefore ? targetIndex : targetIndex + 1;
      });
    });

    // Drag leave — only remove indicator when cursor truly leaves the field list
    fieldList.addEventListener('dragleave', (evt) => {
      const e = evt as DragEvent;
      const related = e.relatedTarget as Node | null;
      if (!related || !fieldList.contains(related)) {
        this.removeDropIndicator();
      }
    });

    // Drop
    fieldList.addEventListener('drop', (e) => {
      e.preventDefault();
      this.removeDropIndicator();

      if (!this.dragState) return;

      const { fieldId, startIndex, currentIndex, startSection, currentSection } = this.dragState;
      if (startIndex !== currentIndex || startSection !== currentSection) {
        this.moveField(fieldId, currentSection, currentIndex);
      }

      this.dragState = null;
    });

    // Drag end
    fieldList.addEventListener('dragend', () => {
      fieldList.querySelectorAll('.opacity-50').forEach((el) => el.classList.remove('opacity-50'));
      this.removeDropIndicator();
      if (this.dragOverRAF) {
        cancelAnimationFrame(this.dragOverRAF);
        this.dragOverRAF = null;
      }
      this.dragState = null;
    });
  }

  /** Bind drag-and-drop events on [data-field-drop-zone] for palette drops */
  private bindFieldDropZoneEvents(root: HTMLElement): void {
    const dropZones = root.querySelectorAll<HTMLElement>('[data-field-drop-zone]');
    dropZones.forEach((zone) => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
        zone.classList.remove('border-gray-200', 'hover:border-gray-300', 'border-transparent');
        zone.classList.add('border-blue-400', 'bg-blue-50/50');
      });

      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget as Node)) {
          zone.classList.remove('border-blue-400', 'bg-blue-50/50');
          zone.classList.add('border-gray-200', 'hover:border-gray-300');
        }
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('border-blue-400', 'bg-blue-50/50');
        zone.classList.add('border-gray-200', 'hover:border-gray-300');

        // Try full metadata first
        const metaRaw = e.dataTransfer?.getData(PALETTE_DRAG_META_MIME);
        if (metaRaw) {
          try {
            const parsed = JSON.parse(metaRaw);
            if (parsed?.type) {
              this.addField(parsed.type as FieldType);
              return;
            }
          } catch { /* fall through */ }
        }
        // Fall back to type-only
        const fieldType = e.dataTransfer?.getData(PALETTE_DRAG_MIME);
        if (fieldType) {
          this.addField(fieldType as FieldType);
        }
      });
    });
  }

  private bindLifecycleMenuEvents(): void {
    const menuContainer = this.container.querySelector('[data-ct-lifecycle-menu]');
    if (!menuContainer) {
      if (this.lifecycleOutsideClickHandler) {
        document.removeEventListener('click', this.lifecycleOutsideClickHandler);
        this.lifecycleOutsideClickHandler = null;
      }
      return;
    }

    const trigger = menuContainer.querySelector('[data-ct-lifecycle-trigger]');
    const dropdown = menuContainer.querySelector('[data-ct-lifecycle-dropdown]');

    if (trigger && dropdown) {
      // Toggle dropdown on click
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      if (this.lifecycleOutsideClickHandler) {
        document.removeEventListener('click', this.lifecycleOutsideClickHandler);
      }
      this.lifecycleOutsideClickHandler = (e) => {
        if (!menuContainer.contains(e.target as Node)) {
          dropdown.classList.add('hidden');
        }
      };
      document.addEventListener('click', this.lifecycleOutsideClickHandler);
    }

    // Lifecycle action buttons
    this.container.querySelector('[data-ct-publish]')?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.publishContentType();
    });

    this.container.querySelector('[data-ct-deprecate]')?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.deprecateContentType();
    });

    this.container.querySelector('[data-ct-clone]')?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.cloneContentType();
    });

    this.container.querySelector('[data-ct-versions]')?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.showVersionHistory();
    });
  }

  private togglePalette(): void {
    this.paletteVisible = !this.paletteVisible;
    const wrapper = this.container.querySelector<HTMLElement>('[data-ct-palette]');
    if (wrapper) {
      wrapper.classList.toggle('hidden', !this.paletteVisible);
    }
    const btn = this.container.querySelector<HTMLElement>('[data-ct-toggle-palette]');
    if (btn) {
      btn.setAttribute('aria-expanded', String(this.paletteVisible));
    }
    this.initPaletteIfNeeded();
  }

  private initPaletteIfNeeded(): void {
    if (!this.paletteVisible || this.palettePanel) return;
    const el = this.container.querySelector<HTMLElement>('[data-ct-palette-container]');
    if (!el) return;
    this.palettePanel = new FieldPalettePanel({
      container: el,
      api: this.api,
      onAddField: (meta) => this.addField(meta.type as FieldType),
    });
    this.palettePanel.init();
    this.palettePanel.enable();
  }

  private showFieldTypePicker(): void {
    const picker = new FieldTypePicker({
      onSelect: (type) => this.addField(type),
      onCancel: () => {},
    });
    picker.show();
  }

  private showLayoutEditor(): void {
    const editor = new LayoutEditor({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (layout) => {
        this.state.layout = layout;
        this.state.isDirty = true;
        this.renderFieldList();
        this.updateDirtyState();
        this.schedulePreview();
        // Re-render fields section to update layout badge
        const fieldsSection = this.container.querySelector('[data-ct-field-list]')?.closest('.rounded-lg');
        if (fieldsSection) {
          const newFieldsSection = document.createElement('div');
          newFieldsSection.innerHTML = this.renderFieldsSection();
          fieldsSection.replaceWith(newFieldsSection.firstElementChild!);
          this.bindFieldsEvents();
        }
      },
      onCancel: () => {},
    });
    editor.show();
  }

  private bindFieldsEvents(): void {
    // Re-bind field section events after re-render
    this.container.querySelector('[data-ct-add-field]')?.addEventListener('click', () => this.showFieldTypePicker());
    this.container.querySelector('[data-ct-add-field-empty]')?.addEventListener('click', () => this.showFieldTypePicker());
    this.container.querySelector('[data-ct-layout]')?.addEventListener('click', () => this.showLayoutEditor());
    this.container.querySelector('[data-ct-toggle-palette]')?.addEventListener('click', () => this.togglePalette());
    this.palettePanel = null;
    this.initPaletteIfNeeded();
    this.bindSectionToggleEvents();
    this.bindDragEvents();
  }

  private bindSectionToggleEvents(): void {
    this.container.querySelectorAll<HTMLElement>('[data-ct-toggle-section]').forEach((btn) => {
      const sectionName = btn.getAttribute('data-ct-toggle-section');
      if (sectionName) {
        btn.addEventListener('click', () => this.toggleSection(sectionName));
      }
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private getSlug(): string {
    const slugInput = this.container.querySelector<HTMLInputElement>('[data-ct-slug]');
    const nameInput = this.container.querySelector<HTMLInputElement>('[data-ct-name]');
    const slug = slugInput?.value?.trim();
    if (slug) return slug;
    return nameToSlug(nameInput?.value ?? '');
  }

  private getDescription(): string | undefined {
    const input = this.container.querySelector<HTMLTextAreaElement>('[data-ct-description]');
    if (!input) return undefined;
    return input.value.trim();
  }

  private getIcon(): string | undefined {
    const input = this.container.querySelector<HTMLInputElement>('[data-ct-icon]');
    if (!input) return undefined;
    return input.value.trim();
  }

  private getCapabilities(): ContentTypeCapabilities {
    const existing = this.state.contentType?.capabilities;
    const caps: ContentTypeCapabilities =
      existing && typeof existing === 'object' ? { ...existing } : {};

    this.container.querySelectorAll<HTMLInputElement>('[data-ct-cap]').forEach((input) => {
      const key = input.getAttribute('data-ct-cap');
      if (key) {
        caps[key] = input.checked;
      }
    });
    return caps;
  }

  private buildUISchema(): UISchemaOverlay | undefined {
    const uiSchema: UISchemaOverlay = {};

    // Build layout from state
    const layout: UILayoutConfig = {
      type: this.state.layout.type ?? 'flat',
      gridColumns: this.state.layout.gridColumns ?? 12,
    };

    // Include tabs if using tabs or sections layout
    if (layout.type === 'tabs' || layout.type === 'sections') {
      // Merge explicit tabs with field sections
      const tabsById = new Map<string, { id: string; label: string; order: number; icon?: string }>();

      // Add explicit tabs from layout
      (this.state.layout.tabs ?? []).forEach((tab, i) => {
        tabsById.set(tab.id, {
          id: tab.id,
          label: tab.label,
          order: tab.order ?? i,
          icon: tab.icon,
        });
      });

      // Add implicit tabs from field sections
      this.state.fields.forEach((field) => {
        if (field.section && !tabsById.has(field.section)) {
          tabsById.set(field.section, {
            id: field.section,
            label: titleCase(field.section),
            order: tabsById.size,
          });
        }
      });

      if (tabsById.size > 0) {
        layout.tabs = Array.from(tabsById.values()).sort((a, b) => a.order - b.order);
      }
    }

    uiSchema.layout = layout;

    // Build field overrides
    const overrides: UIOverride[] = [];
    this.state.fields.forEach((field) => {
      const override: UIOverride = { path: `#/properties/${field.name}` };
      const formgen: Record<string, unknown> = {};

      // Add formgen properties that aren't in the schema
      if (field.section) formgen.section = field.section;
      if (field.gridSpan) formgen.grid = { span: field.gridSpan };
      if (field.order !== undefined) formgen.order = field.order;
      if (field.readonly) formgen.readonly = true;
      if (field.hidden) formgen.hidden = true;

      if (Object.keys(formgen).length > 0) {
        override['x-formgen'] = formgen;
        overrides.push(override);
      }
    });

    if (overrides.length > 0) {
      uiSchema.overrides = overrides;
    }

    // Only return if there's meaningful content
    if (
      (layout.type === 'flat' && !layout.tabs?.length && overrides.length === 0) ||
      (!uiSchema.layout && !uiSchema.overrides)
    ) {
      return undefined;
    }

    return uiSchema;
  }

  private updateLoadingState(): void {
    const saveBtn = this.container.querySelector<HTMLButtonElement>('[data-ct-save]');
    if (saveBtn) {
      saveBtn.disabled = this.state.isLoading;
    }
  }

  private updateSavingState(): void {
    const saveBtn = this.container.querySelector<HTMLButtonElement>('[data-ct-save]');
    if (saveBtn) {
      saveBtn.disabled = this.state.isSaving;
      saveBtn.textContent = this.state.isSaving ? 'Saving...' : this.state.contentType ? 'Save Changes' : 'Create Content Type';
    }
  }

  private updatePreviewState(): void {
    const previewBtn = this.container.querySelector<HTMLButtonElement>('[data-ct-preview]');
    if (previewBtn) {
      previewBtn.disabled = this.state.isPreviewing;
      previewBtn.textContent = this.state.isPreviewing ? 'Loading...' : 'Preview';
    }
  }

  private updateDirtyState(): void {
    // Dirty dot on Save button
    const saveBtn = this.container.querySelector<HTMLButtonElement>('[data-ct-save]');
    if (saveBtn) {
      let dot = saveBtn.querySelector('[data-dirty-dot]');
      if (this.state.isDirty) {
        if (!dot) {
          dot = document.createElement('span');
          dot.setAttribute('data-dirty-dot', '');
          dot.className = 'inline-block w-2 h-2 rounded-full bg-orange-400 ml-1.5 align-middle';
          dot.setAttribute('title', 'Unsaved changes');
          saveBtn.appendChild(dot);
        }
      } else {
        dot?.remove();
      }
    }

    // "Unsaved changes" badge in header
    const headerEl = this.container.querySelector('[data-content-type-editor] h1');
    if (headerEl) {
      let badge = headerEl.parentElement?.querySelector('[data-dirty-badge]');
      if (this.state.isDirty) {
        if (!badge) {
          badge = document.createElement('span');
          badge.setAttribute('data-dirty-badge', '');
          badge.className = 'px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
          badge.textContent = 'Modified';
          headerEl.parentElement?.appendChild(badge);
        }
      } else {
        badge?.remove();
      }
    }
  }

  private renderFieldList(): void {
    const fieldListContainer = this.container.querySelector('[data-ct-field-list]');
    if (fieldListContainer) {
      fieldListContainer.innerHTML = this.renderFieldListContent();
      this.bindSectionToggleEvents();
      this.bindDragEvents();
      this.bindFieldDropZoneEvents(fieldListContainer as HTMLElement);
      const selected = this.state.fields.find((f) => f.id === this.state.selectedFieldId);
      if (selected && normalizeFieldType(selected.type) === 'blocks' && this.cachedBlocks) {
        this.renderInlineBlockPickerForField(selected);
      }
    }
  }

  private renderFieldListContent(): string {
    if (this.state.fields.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <p class="text-sm mb-3">No fields yet</p>
          <button
            type="button"
            data-ct-add-field-empty
            class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add your first field
          </button>
        </div>
      `;
    }

    const sections = this.groupFieldsBySection();
    const sectionNames = Array.from(sections.keys());

    // Single section — render flat (no section headers)
    if (sectionNames.length <= 1) {
      const allFields = this.state.fields;
      return `
        <div class="space-y-2">
          ${allFields.map((field, index) => this.renderFieldCard(field, index, allFields)).join('')}
        </div>
        ${renderDropZone({ highlight: false })}
      `;
    }

    // Multiple sections — render grouped with collapsible headers
    let html = '';

    for (const sectionName of sectionNames) {
      const fields = sections.get(sectionName)!;
      const state = this.getSectionState(sectionName);
      const isCollapsed = state.collapsed;

      html += `
        <div data-ct-section="${escapeHtml(sectionName)}" class="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <button type="button" data-ct-toggle-section="${escapeHtml(sectionName)}"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <span class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
              ${isCollapsed
                ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
                : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
              }
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${escapeHtml(titleCase(sectionName))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${fields.length}</span>
          </button>

          <div class="${isCollapsed ? 'hidden' : ''}" data-ct-section-body="${escapeHtml(sectionName)}">
            <div class="space-y-2 px-1 pb-2">
              ${fields.map((field, index) => this.renderFieldCard(field, index, fields)).join('')}
            </div>
          </div>
        </div>`;
    }

    html += renderDropZone({ highlight: false });

    return html;
  }

  // ===========================================================================
  // Section Grouping
  // ===========================================================================

  private groupFieldsBySection(): Map<string, FieldDefinition[]> {
    const map = new Map<string, FieldDefinition[]>();
    for (const field of this.state.fields) {
      const section = field.section || DEFAULT_SECTION;
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(field);
    }
    // Ensure default section is always first
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

  private getSectionState(sectionName: string): { collapsed: boolean } {
    if (!this.sectionStates.has(sectionName)) {
      this.sectionStates.set(sectionName, { collapsed: false });
    }
    return this.sectionStates.get(sectionName)!;
  }

  private toggleSection(sectionName: string): void {
    const state = this.getSectionState(sectionName);
    state.collapsed = !state.collapsed;
    const body = this.container.querySelector<HTMLElement>(`[data-ct-section-body="${sectionName}"]`);
    if (body) {
      body.classList.toggle('hidden', state.collapsed);
    }
    const btn = this.container.querySelector<HTMLElement>(`[data-ct-toggle-section="${sectionName}"]`);
    const chevron = btn?.querySelector('span:first-child');
    if (chevron) {
      chevron.innerHTML = state.collapsed
        ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>'
        : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
    }
  }

  private getBlocksPickerMode(fieldId: string): 'allowed' | 'denied' {
    return this.blockPickerModes.get(fieldId) ?? 'allowed';
  }

  private async loadBlocksForField(field: FieldDefinition): Promise<void> {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(field);
      return;
    }
    if (this.blocksLoading) return;
    this.blocksLoading = true;
    try {
      this.cachedBlocks = await loadAvailableBlocks(this.api);
      if (this.state.selectedFieldId === field.id) {
        this.renderInlineBlockPickerForField(field);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load block definitions';
      this.renderInlineBlockPickerError(field.id, message);
      this.showToast(`Failed to load block definitions: ${message}`, 'error');
    } finally {
      this.blocksLoading = false;
    }
  }

  private renderInlineBlockPickerError(fieldID: string, message: string): void {
    const container = this.container.querySelector<HTMLElement>(
      `[data-ct-blocks-picker-container="${fieldID}"]`
    );
    if (!container) return;
    container.innerHTML = `
      <div class="rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20">
        <div class="flex items-start gap-2">
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-red-700 dark:text-red-300">${escapeHtml(message)}</p>
        </div>
        <button type="button" data-ct-blocks-retry="${escapeHtml(fieldID)}"
                class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Retry
        </button>
      </div>
    `;
  }

  private renderInlineBlockPickerForField(field: FieldDefinition): void {
    const container = this.container.querySelector<HTMLElement>(
      `[data-ct-blocks-picker-container="${field.id}"]`
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
      onSelectionChange: (sel) => this.applyBlockSelection(field, mode, sel),
      label: pickerLabel,
      accent: pickerAccent,
      emptySelectionText,
    });

    bindInlineBlockPickerEvents(container, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: selected,
      onSelectionChange: (sel) => this.applyBlockSelection(field, mode, sel),
      label: pickerLabel,
      accent: pickerAccent,
      emptySelectionText,
    });
  }

  private applyBlockSelection(
    field: FieldDefinition,
    mode: 'allowed' | 'denied',
    selected: Set<string>,
  ): void {
    if (!field.config) field.config = {};
    const cfgRec = field.config as Record<string, unknown>;
    if (mode === 'allowed') {
      if (selected.size > 0) {
        cfgRec.allowedBlocks = Array.from(selected);
      } else {
        delete cfgRec.allowedBlocks;
      }
    } else {
      if (selected.size > 0) {
        cfgRec.deniedBlocks = Array.from(selected);
      } else {
        delete cfgRec.deniedBlocks;
      }
    }
    if (Object.keys(field.config).length === 0) field.config = undefined;
    this.state.isDirty = true;
    this.updateDirtyState();
    this.schedulePreview();
  }

  private renderPreview(): void {
    const previewContainer = this.container.querySelector('[data-ct-preview-container]');
    if (!previewContainer) return;

    if (this.state.previewError) {
      previewContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-40 text-red-400">
          <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-sm font-medium">Preview failed</p>
          <p class="text-xs text-red-300 mt-1 max-w-xs text-center">${this.state.previewError}</p>
        </div>
      `;
    } else if (this.state.previewHtml) {
      previewContainer.innerHTML = this.state.previewHtml;
      this.initPreviewEditors();
    }
  }

  /**
   * Initialize preview field enhancements that require client-side behavior.
   * formgen-behaviors provides JSON editor hydration and
   * formgen-relationships provides WYSIWYG hydration.
   */
  private initPreviewEditors(): void {
    const fb = (window as any).FormgenBehaviors;
    if (typeof fb?.initJSONEditors === 'function') {
      fb.initJSONEditors();
    }

    const rel = (window as any).FormgenRelationships;
    const initWysiwyg = rel?.autoInitWysiwyg ?? fb?.autoInitWysiwyg;
    if (typeof initWysiwyg === 'function') {
      initWysiwyg();
    }
  }

  private renderValidationErrors(): void {
    const errorsContainer = this.container.querySelector('[data-ct-validation-errors]');
    if (!errorsContainer) return;

    if (this.state.validationErrors.length === 0) {
      errorsContainer.classList.add('hidden');
      errorsContainer.innerHTML = '';
      // Re-render field list to clear error styling
      this.renderFieldList();
      return;
    }

    // Group errors by field
    const errorsByField = new Map<string, SchemaValidationError[]>();
    const generalErrors: SchemaValidationError[] = [];

    for (const err of this.state.validationErrors) {
      const fieldMatch = err.path.match(/properties[./](\w+)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        if (!errorsByField.has(fieldName)) {
          errorsByField.set(fieldName, []);
        }
        errorsByField.get(fieldName)!.push(err);
      } else {
        generalErrors.push(err);
      }
    }

    errorsContainer.classList.remove('hidden');
    errorsContainer.innerHTML = `
      <div class="fixed bottom-4 right-4 max-w-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg overflow-hidden z-40">
        <div class="flex items-center justify-between px-4 py-2 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-red-800 dark:text-red-200">
              ${this.state.validationErrors.length} Validation Error${this.state.validationErrors.length > 1 ? 's' : ''}
            </span>
          </div>
          <button type="button" class="text-red-400 hover:text-red-600" data-close-validation-errors>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="px-4 py-3 max-h-64 overflow-y-auto">
          ${generalErrors.length > 0 ? `
            <div class="mb-3">
              <div class="text-xs font-medium text-red-700 dark:text-red-300 uppercase mb-1">Schema</div>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                ${generalErrors.map((err) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${escapeHtml(err.message)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${Array.from(errorsByField.entries()).map(([fieldName, errors]) => {
            const field = this.state.fields.find((f) => f.name === fieldName);
            return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${escapeHtml(field?.label ?? fieldName)} <span class="font-mono">(${escapeHtml(fieldName)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${errors.map((err) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${escapeHtml(err.message)}</li>`).join('')}
                </ul>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Bind close button
    errorsContainer.querySelector('[data-close-validation-errors]')?.addEventListener('click', () => {
      errorsContainer.classList.add('hidden');
    });

    // Re-render field list to show error styling
    this.renderFieldList();
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    // Prefer global notify helper
    const notify = (window as any).notify as
      | { success?: (msg: string) => void; error?: (msg: string) => void; info?: (msg: string) => void }
      | undefined;
    const notifyFn = notify?.[type];
    if (typeof notifyFn === 'function') {
      notifyFn(message);
      return;
    }

    // Fallback to console
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  private schedulePreview(delayMs: number = 400): void {
    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }
    this.previewDebounceTimer = setTimeout(() => {
      this.previewDebounceTimer = null;
      this.previewSchema();
    }, delayMs);
  }
}

// =============================================================================
// Types
// =============================================================================

interface DragState {
  fieldId: string;
  startSection: string;
  currentSection: string;
  startIndex: number;
  currentIndex: number;
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
// Publish Confirmation Modal
// =============================================================================

interface PublishConfirmationModalConfig {
  contentType: ContentType;
  compatibilityResult: CompatibilityCheckResult | null;
  compatibilityError?: string;
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
}

class PublishConfirmationModal extends Modal {
  private config: PublishConfirmationModalConfig;

  constructor(config: PublishConfirmationModalConfig) {
    super({ size: 'lg', flexColumn: false });
    this.config = config;
  }

  protected onBeforeHide(): boolean {
    this.config.onCancel();
    return true;
  }

  protected renderContent(): string {
    const { contentType, compatibilityResult, compatibilityError } = this.config;
    const hasCompatibilityError = Boolean(compatibilityError);
    const hasBreakingChanges = (compatibilityResult?.breaking_changes?.length ?? 0) > 0;
    const hasWarnings = (compatibilityResult?.warnings?.length ?? 0) > 0;
    const affectedCount = compatibilityResult?.affected_entries_count ?? 0;
    const confirmDisabled = hasCompatibilityError || hasBreakingChanges;
    const confirmClass = hasCompatibilityError
      ? 'bg-gray-400 cursor-not-allowed'
      : hasBreakingChanges
        ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
        : 'bg-green-600 hover:bg-green-700';

    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${escapeHtml(contentType.name)}</strong>.
          ${contentType.status === 'draft' ? 'This will make it available for content creation.' : 'This will create a new version of the schema.'}
        </p>

        ${hasCompatibilityError ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Compatibility Check Failed</span>
            </div>
            <p class="ml-7 text-sm text-red-700 dark:text-red-300">
              Publishing is blocked until compatibility can be verified.
            </p>
            ${compatibilityError ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${escapeHtml(compatibilityError)}
              </p>
            ` : ''}
          </div>
        ` : ''}

        ${!hasCompatibilityError && hasBreakingChanges ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${compatibilityResult!.breaking_changes.map((change) => `
                <li>• ${escapeHtml(change.description || `${change.type}: ${change.path}`)}</li>
              `).join('')}
            </ul>
            ${affectedCount > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${affectedCount} content ${affectedCount === 1 ? 'entry' : 'entries'} will require migration.
              </p>
            ` : ''}
          </div>
        ` : ''}

        ${!hasCompatibilityError && hasWarnings ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${compatibilityResult!.warnings.map((change) => `
                <li>• ${escapeHtml(change.description || `${change.type}: ${change.path}`)}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${!hasCompatibilityError && !hasBreakingChanges && !hasWarnings ? `
          <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-200">Schema is compatible</span>
            </div>
            <p class="mt-1 ml-7 text-sm text-green-700 dark:text-green-300">
              No breaking changes detected. Publishing is safe.
            </p>
          </div>
        ` : ''}

        ${!hasCompatibilityError && hasBreakingChanges ? `
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              data-publish-force
              class="mt-0.5 w-4 h-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">
              I understand there are breaking changes and want to publish anyway
            </span>
          </label>
        ` : ''}
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-publish-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-publish-confirm
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${confirmClass}"
          ${confirmDisabled ? 'disabled' : ''}
        >
          ${hasBreakingChanges ? 'Publish with Breaking Changes' : 'Publish'}
        </button>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-publish-cancel]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    const confirmBtn = this.container?.querySelector<HTMLButtonElement>('[data-publish-confirm]');
    const forceCheckbox = this.container?.querySelector<HTMLInputElement>('[data-publish-force]');
    const blockPublish = Boolean(this.config.compatibilityError);

    // Enable confirm button when force checkbox is checked (for breaking changes)
    forceCheckbox?.addEventListener('change', () => {
      if (confirmBtn && !blockPublish) {
        confirmBtn.disabled = !forceCheckbox.checked;
      }
    });

    confirmBtn?.addEventListener('click', () => {
      if (blockPublish) {
        return;
      }
      const force = forceCheckbox?.checked ?? false;
      this.config.onConfirm(force);
      this.hide();
    });
  }
}

// =============================================================================
// Clone Content Type Modal
// =============================================================================

interface CloneContentTypeModalConfig {
  contentType: ContentType;
  onConfirm: (newSlug: string, newName?: string) => void;
  onCancel: () => void;
}

class CloneContentTypeModal extends Modal {
  private config: CloneContentTypeModalConfig;

  constructor(config: CloneContentTypeModalConfig) {
    super({ size: 'md', initialFocus: '[data-clone-slug]' });
    this.config = config;
  }

  protected onBeforeHide(): boolean {
    this.config.onCancel();
    return true;
  }

  protected renderContent(): string {
    const { contentType } = this.config;
    const suggestedSlug = `${contentType.slug}-copy`;
    const suggestedName = `${contentType.name} (Copy)`;

    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${escapeHtml(contentType.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="${labelClasses()}">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${escapeHtml(suggestedSlug)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="${inputClasses()}"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
          <div data-clone-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        </div>

        <div>
          <label class="${labelClasses()}">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${escapeHtml(suggestedName)}"
            placeholder="My Content Type"
            class="${inputClasses()}"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-clone-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-clone-confirm
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Clone
        </button>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-clone-cancel]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    this.container?.querySelector('[data-clone-confirm]')?.addEventListener('click', () => {
      const slugInput = this.container?.querySelector<HTMLInputElement>('[data-clone-slug]');
      const nameInput = this.container?.querySelector<HTMLInputElement>('[data-clone-name]');

      const newSlug = slugInput?.value?.trim();
      const newName = nameInput?.value?.trim();
      const errorEl = this.container?.querySelector<HTMLElement>('[data-clone-error]');

      const showError = (msg: string): void => {
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.classList.remove('hidden');
        }
      };

      if (!newSlug) {
        showError('Slug is required');
        slugInput?.focus();
        return;
      }

      if (!/^[a-z][a-z0-9_\-]*$/.test(newSlug)) {
        showError('Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.');
        slugInput?.focus();
        return;
      }

      this.config.onConfirm(newSlug, newName || undefined);
      this.hide();
    });

    // Enter key to submit
    this.container?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.container?.querySelector<HTMLButtonElement>('[data-clone-confirm]')?.click();
      }
    });
  }
}

// =============================================================================
// Content Type Version History Viewer
// =============================================================================

interface ContentTypeVersionHistoryViewerConfig {
  apiBasePath: string;
  contentType: ContentType;
}

class ContentTypeVersionHistoryViewer extends Modal {
  private config: ContentTypeVersionHistoryViewerConfig;
  private api: ContentTypeAPIClient;
  private versions: ContentTypeSchemaVersion[] = [];
  private expandedVersions: Set<string> = new Set();

  constructor(config: ContentTypeVersionHistoryViewerConfig) {
    super({ size: '2xl', maxHeight: 'max-h-[80vh]' });
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
  }

  protected async onAfterShow(): Promise<void> {
    await this.loadVersions();
  }

  protected renderContent(): string {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(this.config.contentType.name)} (${escapeHtml(this.config.contentType.slug)})</p>
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
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-viewer-close]')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private async loadVersions(): Promise<void> {
    try {
      const result = await this.api.getVersionHistory(this.config.contentType.id);
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
          <p class="text-xs mt-2">Current version: ${escapeHtml(this.config.contentType.schema_version ?? '1.0.0')}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((version, index) => this.renderVersionCard(version, index === 0)).join('')}
      </div>
    `;

    // Bind expand/collapse events
    listEl.querySelectorAll('[data-toggle-version]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const versionId = btn.getAttribute('data-toggle-version');
        if (versionId) {
          if (this.expandedVersions.has(versionId)) {
            this.expandedVersions.delete(versionId);
          } else {
            this.expandedVersions.add(versionId);
          }
          this.renderVersionsList();
        }
      });
    });
  }

  private renderVersionCard(version: ContentTypeSchemaVersion, isCurrent: boolean): string {
    const isExpanded = this.expandedVersions.has(version.version);
    const hasChanges = (version.changes?.length ?? 0) > 0;
    const hasBreakingChanges = version.is_breaking || version.changes?.some((c) => c.is_breaking);

    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${escapeHtml(version.version)}</span>
              ${isCurrent ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ''}
              ${hasBreakingChanges ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ''}
              ${this.getMigrationBadge(version.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(version.created_at)}</span>
            ${hasChanges ? `
              <button
                type="button"
                data-toggle-version="${escapeHtml(version.version)}"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg class="w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>

        ${version.migration_status && version.total_count ? `
          <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Migration Progress</span>
              <span>${version.migrated_count ?? 0}/${version.total_count}</span>
            </div>
            <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full" style="width: ${((version.migrated_count ?? 0) / version.total_count) * 100}%"></div>
            </div>
          </div>
        ` : ''}

        ${isExpanded && hasChanges ? `
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
            <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Changes</h4>
            <ul class="space-y-2">
              ${version.changes!.map((change) => this.renderChangeItem(change)).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderChangeItem(change: SchemaChange): string {
    const typeColors = {
      added: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      removed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      modified: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };

    const typeIcons = {
      added: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>',
      removed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>',
      modified: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>',
    };

    return `
      <li class="flex items-start gap-2 text-sm">
        <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${typeColors[change.type]}">
          <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${typeIcons[change.type]}
          </svg>
          ${change.type}
        </span>
        <div class="flex-1">
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${escapeHtml(change.path)}</span>
          ${change.field ? `<span class="text-gray-500 dark:text-gray-400"> (${escapeHtml(change.field)})</span>` : ''}
          ${change.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${escapeHtml(change.description)}</p>` : ''}
          ${change.is_breaking ? '<span class="ml-1 text-xs text-red-500 dark:text-red-400">Breaking</span>' : ''}
        </div>
      </li>
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

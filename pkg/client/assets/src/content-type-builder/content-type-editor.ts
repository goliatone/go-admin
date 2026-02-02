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
  ContentTypeStatus,
  ContentTypeSchemaVersion,
  CompatibilityCheckResult,
  SchemaChange,
} from './types';
import { ContentTypeAPIClient, fieldsToSchema, schemaToFields, generateFieldId } from './api-client';
import { FieldTypePicker, getFieldTypeMetadata, FIELD_TYPES } from './field-type-picker';
import { FieldConfigForm } from './field-config-form';
import { LayoutEditor } from './layout-editor';
import { badge } from '../shared/badge';
import { Modal } from '../shared/modal';

// =============================================================================
// Content Type Editor Component
// =============================================================================

// Extended state with layout
interface ExtendedBuilderState extends ContentTypeBuilderState {
  layout: UILayoutConfig;
  previewError: string | null;
}

export class ContentTypeEditor {
  private config: ContentTypeEditorConfig;
  private container: HTMLElement;
  private api: ContentTypeAPIClient;
  private state: ExtendedBuilderState;
  private dragState: DragState | null = null;
  private staticEventsBound = false;
  private previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lifecycleOutsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement, config: ContentTypeEditorConfig) {
    this.container = container;
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
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
    };
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
    const schema = fieldsToSchema(this.state.fields, this.getSlug());
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

  /**
   * Add a new field
   */
  addField(type: FieldType): void {
    const metadata = getFieldTypeMetadata(type);
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
  removeField(fieldId: string): void {
    const index = this.state.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const field = this.state.fields[index];
    if (!confirm(`Remove field "${field.label}"?`)) return;

    this.state.fields.splice(index, 1);
    this.state.isDirty = true;
    this.renderFieldList();
    this.updateDirtyState();
    this.schedulePreview();
  }

  /**
   * Move a field to a new position
   */
  moveField(fieldId: string, newIndex: number): void {
    const currentIndex = this.state.fields.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const field = this.state.fields.splice(currentIndex, 1)[0];
    this.state.fields.splice(newIndex, 0, field);

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
   * Validate the schema
   */
  async validateSchema(): Promise<void> {
    const schema = fieldsToSchema(this.state.fields, this.getSlug());

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
    const ct = this.state.contentType;
    const statusBadge = this.getStatusBadge(ct?.status);

    this.container.innerHTML = `
      <div class="content-type-editor flex flex-col h-full" data-content-type-editor>
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                ${ct ? 'Edit Content Type' : 'Create Content Type'}
              </h1>
              ${ct ? statusBadge : ''}
              ${ct?.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${escapeHtml(ct.schema_version)}</span>` : ''}
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              ${ct ? `Editing: ${ct.name}` : 'Define fields and configure your content type'}
            </p>
          </div>
          <div class="flex items-center gap-3">
            ${this.state.validationErrors.length > 0 ? `
              <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? 's' : ''}
              </span>
            ` : ''}

            <!-- Lifecycle Actions (only for existing content types) -->
            ${ct ? this.renderLifecycleActions(ct) : ''}

            <button
              type="button"
              data-ct-validate
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Validate
            </button>
            <button
              type="button"
              data-ct-preview
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Preview
            </button>
            <button
              type="button"
              data-ct-cancel
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ct-save
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ${ct ? 'Save Changes' : 'Create Content Type'}
            </button>
          </div>
        </div>

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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${escapeHtml(ct?.name ?? '')}"
              placeholder="Blog Post"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${escapeHtml(ct?.slug ?? '')}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          >${escapeHtml(ct?.description ?? '')}</textarea>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Icon
          </label>
          <input
            type="text"
            data-ct-icon
            value="${escapeHtml(ct?.icon ?? '')}"
            placeholder="file-text"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

        <div data-ct-field-list class="p-4">
          ${this.renderFieldListHTML()}
        </div>
      </div>
    `;
  }

  private renderFieldListHTML(): string {
    return this.renderFieldListContent();
  }

  private renderFieldCard(field: FieldDefinition, index: number): string {
    const metadata = getFieldTypeMetadata(field.type);
    const isSelected = this.state.selectedFieldId === field.id;

    // Check for validation errors for this field
    const fieldErrors = this.state.validationErrors.filter(
      (err) => err.path.includes(`/${field.name}`) || err.path.includes(`properties.${field.name}`)
    );
    const hasErrors = fieldErrors.length > 0;

    // Build constraints summary
    const constraints: string[] = [];
    if (field.validation?.minLength) constraints.push(`min: ${field.validation.minLength}`);
    if (field.validation?.maxLength) constraints.push(`max: ${field.validation.maxLength}`);
    if (field.validation?.min !== undefined) constraints.push(`>= ${field.validation.min}`);
    if (field.validation?.max !== undefined) constraints.push(`<= ${field.validation.max}`);
    if (field.validation?.pattern) constraints.push('pattern');

    return `
      <div
        class="field-card flex items-center gap-3 p-3 border rounded-lg transition-colors ${
          hasErrors
            ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
            : isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600'
        }"
        data-field-card="${field.id}"
        data-field-index="${index}"
        draggable="true"
      >
        <!-- Drag Handle -->
        <div
          class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          data-field-drag-handle
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
        </div>

        <!-- Field Type Icon -->
        <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${
          hasErrors ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
        }">
          ${hasErrors ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : (metadata?.icon ?? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>')}
        </div>

        <!-- Field Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white truncate">${escapeHtml(field.label)}</span>
            ${field.required ? '<span class="text-xs text-red-500">Required</span>' : ''}
            ${field.readonly ? '<span class="text-xs text-gray-400">Read-only</span>' : ''}
            ${field.hidden ? '<span class="text-xs text-gray-400">Hidden</span>' : ''}
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-mono">${escapeHtml(field.name)}</span>
            <span>•</span>
            <span>${metadata?.label ?? field.type}</span>
            ${field.section ? `<span>• ${escapeHtml(field.section)}</span>` : ''}
            ${field.gridSpan ? `<span>• ${field.gridSpan} cols</span>` : ''}
          </div>
          ${constraints.length > 0 ? `
            <div class="flex items-center gap-1 mt-1">
              ${constraints.map(c => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${escapeHtml(c)}</span>`).join('')}
            </div>
          ` : ''}
          ${hasErrors ? `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${fieldErrors.map(err => escapeHtml(err.message)).join(', ')}
            </div>
          ` : ''}
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            data-field-edit="${field.id}"
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit field"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button
            type="button"
            data-field-remove="${field.id}"
            class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Remove field"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
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

  private getStatusBadge(status?: ContentTypeStatus): string {
    const variant = status || 'unknown';
    const label = variant.charAt(0).toUpperCase() + variant.slice(1);
    return badge(label, 'status', variant);
  }

  private renderLifecycleActions(ct: ContentType): string {
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
            ${ct.status === 'draft' ? `
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
            ` : ct.status === 'active' ? `
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
    const schema = fieldsToSchema(this.state.fields, this.getSlug());
    let compatResult: CompatibilityCheckResult | null = null;

    try {
      compatResult = await this.api.checkCompatibility(
        this.state.contentType.id,
        schema,
        this.buildUISchema()
      );
    } catch {
      // Compatibility check endpoint might not be available; proceed with warning
    }

    // Show confirmation modal
    const modal = new PublishConfirmationModal({
      contentType: this.state.contentType,
      compatibilityResult: compatResult,
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

    if (!confirm(`Are you sure you want to deprecate "${this.state.contentType.name}"?\n\nDeprecated content types can still be used but are hidden from new content creation.`)) {
      return;
    }

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

      // Edit field
      const editBtn = target.closest('[data-field-edit]');
      if (editBtn) {
        const fieldId = editBtn.getAttribute('data-field-edit');
        if (fieldId) this.editField(fieldId);
        return;
      }

      // Remove field
      const removeBtn = target.closest('[data-field-remove]');
      if (removeBtn) {
        const fieldId = removeBtn.getAttribute('data-field-remove');
        if (fieldId) this.removeField(fieldId);
        return;
      }

      // Select field card
      const fieldCard = target.closest('[data-field-card]');
      if (fieldCard && !target.closest('button')) {
        const fieldId = fieldCard.getAttribute('data-field-card');
        if (fieldId) {
          this.state.selectedFieldId = this.state.selectedFieldId === fieldId ? null : fieldId;
          this.renderFieldList();
        }
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

    // Layout button
    this.container.querySelector('[data-ct-layout]')?.addEventListener('click', () => this.showLayoutEditor());

    // Preview refresh
    this.container.querySelector('[data-ct-refresh-preview]')?.addEventListener('click', () => this.previewSchema());

    // Drag and drop
    this.bindDragEvents();
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

      this.dragState = {
        fieldId: fieldId ?? '',
        startIndex: index,
        currentIndex: index,
      };

      card.classList.add('opacity-50');
      e.dataTransfer?.setData('text/plain', fieldId ?? '');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    // Drag over
    fieldList.addEventListener('dragover', (evt) => {
      evt.preventDefault();
      const e = evt as DragEvent;
      if (!this.dragState) return;

      const target = e.target as HTMLElement;
      const card = target.closest<HTMLElement>('[data-field-card]');
      if (!card || card.getAttribute('data-field-card') === this.dragState.fieldId) return;

      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = e.clientY < midY;

      // Visual feedback
      fieldList.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      const indicator = document.createElement('div');
      indicator.className =
        'drop-indicator h-0.5 bg-blue-500 rounded-full my-1 transition-opacity';
      if (insertBefore) {
        card.parentElement?.insertBefore(indicator, card);
      } else {
        card.parentElement?.insertBefore(indicator, card.nextSibling);
      }

      // Update current index
      const targetIndex = parseInt(card.getAttribute('data-field-index') ?? '0', 10);
      this.dragState.currentIndex = insertBefore ? targetIndex : targetIndex + 1;
    });

    // Drag leave
    fieldList.addEventListener('dragleave', () => {
      fieldList.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
    });

    // Drop
    fieldList.addEventListener('drop', (e) => {
      e.preventDefault();
      fieldList.querySelectorAll('.drop-indicator').forEach((el) => el.remove());

      if (!this.dragState) return;

      const { fieldId, startIndex, currentIndex } = this.dragState;
      if (startIndex !== currentIndex) {
        const adjustedIndex = currentIndex > startIndex ? currentIndex - 1 : currentIndex;
        this.moveField(fieldId, adjustedIndex);
      }

      this.dragState = null;
    });

    // Drag end
    fieldList.addEventListener('dragend', () => {
      fieldList.querySelectorAll('.opacity-50').forEach((el) => el.classList.remove('opacity-50'));
      fieldList.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      this.dragState = null;
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
    this.bindDragEvents();
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
    const value = input?.value?.trim();
    return value || undefined;
  }

  private getIcon(): string | undefined {
    const input = this.container.querySelector<HTMLInputElement>('[data-ct-icon]');
    const value = input?.value?.trim();
    return value || undefined;
  }

  private getCapabilities(): ContentTypeCapabilities {
    const caps: ContentTypeCapabilities = {};
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
      this.bindDragEvents();
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

    return `
      <div class="space-y-2">
        ${this.state.fields.map((field, index) => this.renderFieldCard(field, index)).join('')}
      </div>
    `;
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
    const { contentType, compatibilityResult } = this.config;
    const hasBreakingChanges = (compatibilityResult?.breaking_changes?.length ?? 0) > 0;
    const hasWarnings = (compatibilityResult?.warnings?.length ?? 0) > 0;
    const affectedCount = compatibilityResult?.affected_entries_count ?? 0;

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

        ${hasBreakingChanges ? `
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

        ${hasWarnings ? `
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

        ${!hasBreakingChanges && !hasWarnings ? `
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

        ${hasBreakingChanges ? `
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
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${hasBreakingChanges ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50' : 'bg-green-600 hover:bg-green-700'}"
          ${hasBreakingChanges ? 'disabled' : ''}
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

    // Enable confirm button when force checkbox is checked (for breaking changes)
    forceCheckbox?.addEventListener('change', () => {
      if (confirmBtn) {
        confirmBtn.disabled = !forceCheckbox.checked;
      }
    });

    confirmBtn?.addEventListener('click', () => {
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
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${escapeHtml(suggestedSlug)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${escapeHtml(suggestedName)}"
            placeholder="My Content Type"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      if (!newSlug) {
        alert('Slug is required');
        slugInput?.focus();
        return;
      }

      if (!/^[a-z][a-z0-9_\-]*$/.test(newSlug)) {
        alert('Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.');
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

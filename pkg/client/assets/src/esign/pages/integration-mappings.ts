/**
 * E-Sign Integration Mappings Page Controller
 * CRUD management for integration mapping specifications
 */

import { qs, qsa, show, hide, onReady, announce } from '../utils/dom-helpers.js';
import { debounce } from '../utils/async-helpers.js';

/**
 * Configuration for the integration mappings page
 */
export interface IntegrationMappingsConfig {
  basePath: string;
  apiBasePath?: string;
}

/**
 * Mapping specification
 */
interface MappingSpec {
  id: string;
  name: string;
  provider: string;
  status: 'draft' | 'published';
  version: number;
  compiled_hash?: string;
  updated_at?: string;
  external_schema?: {
    object_type: string;
    version?: string;
    fields: SchemaField[];
  };
  rules?: MappingRule[];
}

interface SchemaField {
  object?: string;
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
}

interface MappingRule {
  source_object?: string;
  source_field: string;
  target_entity: 'participant' | 'agreement' | 'field_definition' | 'field_instance';
  target_path: string;
}

interface TransformResult {
  participants: Array<Record<string, unknown>>;
  field_definitions: Array<{ path: string; value: unknown }>;
  field_instances: Array<{ path: string; value: unknown }>;
  agreement: Record<string, unknown>;
  matched_rules: Array<{ source: string; matched: boolean; value?: unknown }>;
}

type PageState = 'loading' | 'empty' | 'error' | 'list';
type PreviewState = 'empty' | 'loading' | 'error' | 'success';

/**
 * Integration Mappings page controller
 * Manages CRUD operations, validation, and preview for mapping specifications
 */
export class IntegrationMappingsController {
  private readonly config: IntegrationMappingsConfig;
  private readonly apiBase: string;
  private readonly mappingsEndpoint: string;

  private mappings: MappingSpec[] = [];
  private editingMappingId: string | null = null;
  private pendingPublishId: string | null = null;
  private pendingDeleteId: string | null = null;
  private currentPreviewMapping: MappingSpec | null = null;

  private readonly elements: {
    announcements: HTMLElement | null;
    loadingState: HTMLElement | null;
    emptyState: HTMLElement | null;
    errorState: HTMLElement | null;
    mappingsList: HTMLElement | null;
    mappingsTbody: HTMLElement | null;
    searchInput: HTMLInputElement | null;
    filterStatus: HTMLSelectElement | null;
    filterProvider: HTMLSelectElement | null;
    refreshBtn: HTMLElement | null;
    retryBtn: HTMLElement | null;
    errorMessage: HTMLElement | null;
    createMappingBtn: HTMLElement | null;
    createMappingEmptyBtn: HTMLElement | null;
    mappingModal: HTMLElement | null;
    mappingModalTitle: HTMLElement | null;
    closeModalBtn: HTMLElement | null;
    cancelModalBtn: HTMLElement | null;
    mappingForm: HTMLFormElement | null;
    mappingIdInput: HTMLInputElement | null;
    mappingVersionInput: HTMLInputElement | null;
    mappingNameInput: HTMLInputElement | null;
    mappingProviderInput: HTMLInputElement | null;
    schemaObjectTypeInput: HTMLInputElement | null;
    schemaVersionInput: HTMLInputElement | null;
    schemaFieldsContainer: HTMLElement | null;
    addFieldBtn: HTMLElement | null;
    mappingRulesContainer: HTMLElement | null;
    addRuleBtn: HTMLElement | null;
    validateBtn: HTMLElement | null;
    saveBtn: HTMLElement | null;
    formValidationStatus: HTMLElement | null;
    mappingStatusBadge: HTMLElement | null;
    publishModal: HTMLElement | null;
    publishMappingName: HTMLElement | null;
    publishMappingVersion: HTMLElement | null;
    publishCancelBtn: HTMLElement | null;
    publishConfirmBtn: HTMLElement | null;
    deleteModal: HTMLElement | null;
    deleteCancelBtn: HTMLElement | null;
    deleteConfirmBtn: HTMLElement | null;
    previewModal: HTMLElement | null;
    closePreviewBtn: HTMLElement | null;
    previewMappingName: HTMLElement | null;
    previewMappingProvider: HTMLElement | null;
    previewObjectType: HTMLElement | null;
    previewMappingStatus: HTMLElement | null;
    previewSourceInput: HTMLTextAreaElement | null;
    sourceSyntaxError: HTMLElement | null;
    loadSampleBtn: HTMLElement | null;
    runPreviewBtn: HTMLElement | null;
    clearPreviewBtn: HTMLElement | null;
    previewEmpty: HTMLElement | null;
    previewLoading: HTMLElement | null;
    previewError: HTMLElement | null;
    previewErrorMessage: HTMLElement | null;
    previewSuccess: HTMLElement | null;
    previewParticipants: HTMLElement | null;
    participantsCount: HTMLElement | null;
    previewFields: HTMLElement | null;
    fieldsCount: HTMLElement | null;
    previewMetadata: HTMLElement | null;
    previewRawJson: HTMLElement | null;
    previewRulesTbody: HTMLElement | null;
  };

  constructor(config: IntegrationMappingsConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;
    this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`;

    this.elements = {
      announcements: qs('#mappings-announcements'),
      loadingState: qs('#loading-state'),
      emptyState: qs('#empty-state'),
      errorState: qs('#error-state'),
      mappingsList: qs('#mappings-list'),
      mappingsTbody: qs('#mappings-tbody'),
      searchInput: qs<HTMLInputElement>('#search-mappings'),
      filterStatus: qs<HTMLSelectElement>('#filter-status'),
      filterProvider: qs<HTMLSelectElement>('#filter-provider'),
      refreshBtn: qs('#refresh-btn'),
      retryBtn: qs('#retry-btn'),
      errorMessage: qs('#error-message'),
      createMappingBtn: qs('#create-mapping-btn'),
      createMappingEmptyBtn: qs('#create-mapping-empty-btn'),
      mappingModal: qs('#mapping-modal'),
      mappingModalTitle: qs('#mapping-modal-title'),
      closeModalBtn: qs('#close-modal-btn'),
      cancelModalBtn: qs('#cancel-modal-btn'),
      mappingForm: qs<HTMLFormElement>('#mapping-form'),
      mappingIdInput: qs<HTMLInputElement>('#mapping-id'),
      mappingVersionInput: qs<HTMLInputElement>('#mapping-version'),
      mappingNameInput: qs<HTMLInputElement>('#mapping-name'),
      mappingProviderInput: qs<HTMLInputElement>('#mapping-provider'),
      schemaObjectTypeInput: qs<HTMLInputElement>('#schema-object-type'),
      schemaVersionInput: qs<HTMLInputElement>('#schema-version'),
      schemaFieldsContainer: qs('#schema-fields-container'),
      addFieldBtn: qs('#add-field-btn'),
      mappingRulesContainer: qs('#mapping-rules-container'),
      addRuleBtn: qs('#add-rule-btn'),
      validateBtn: qs('#validate-btn'),
      saveBtn: qs('#save-btn'),
      formValidationStatus: qs('#form-validation-status'),
      mappingStatusBadge: qs('#mapping-status-badge'),
      publishModal: qs('#publish-modal'),
      publishMappingName: qs('#publish-mapping-name'),
      publishMappingVersion: qs('#publish-mapping-version'),
      publishCancelBtn: qs('#publish-cancel-btn'),
      publishConfirmBtn: qs('#publish-confirm-btn'),
      deleteModal: qs('#delete-modal'),
      deleteCancelBtn: qs('#delete-cancel-btn'),
      deleteConfirmBtn: qs('#delete-confirm-btn'),
      previewModal: qs('#preview-modal'),
      closePreviewBtn: qs('#close-preview-btn'),
      previewMappingName: qs('#preview-mapping-name'),
      previewMappingProvider: qs('#preview-mapping-provider'),
      previewObjectType: qs('#preview-object-type'),
      previewMappingStatus: qs('#preview-mapping-status'),
      previewSourceInput: qs<HTMLTextAreaElement>('#preview-source-input'),
      sourceSyntaxError: qs('#source-syntax-error'),
      loadSampleBtn: qs('#load-sample-btn'),
      runPreviewBtn: qs('#run-preview-btn'),
      clearPreviewBtn: qs('#clear-preview-btn'),
      previewEmpty: qs('#preview-empty'),
      previewLoading: qs('#preview-loading'),
      previewError: qs('#preview-error'),
      previewErrorMessage: qs('#preview-error-message'),
      previewSuccess: qs('#preview-success'),
      previewParticipants: qs('#preview-participants'),
      participantsCount: qs('#participants-count'),
      previewFields: qs('#preview-fields'),
      fieldsCount: qs('#fields-count'),
      previewMetadata: qs('#preview-metadata'),
      previewRawJson: qs('#preview-raw-json'),
      previewRulesTbody: qs('#preview-rules-tbody'),
    };
  }

  /**
   * Initialize the mappings page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadMappings();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const {
      createMappingBtn,
      createMappingEmptyBtn,
      closeModalBtn,
      cancelModalBtn,
      refreshBtn,
      retryBtn,
      addFieldBtn,
      addRuleBtn,
      validateBtn,
      mappingForm,
      publishCancelBtn,
      publishConfirmBtn,
      deleteCancelBtn,
      deleteConfirmBtn,
      closePreviewBtn,
      loadSampleBtn,
      runPreviewBtn,
      clearPreviewBtn,
      previewSourceInput,
      searchInput,
      filterStatus,
      filterProvider,
      mappingModal,
      publishModal,
      deleteModal,
      previewModal,
    } = this.elements;

    // Create/edit modal
    createMappingBtn?.addEventListener('click', () => this.openCreateModal());
    createMappingEmptyBtn?.addEventListener('click', () => this.openCreateModal());
    closeModalBtn?.addEventListener('click', () => this.closeModal());
    cancelModalBtn?.addEventListener('click', () => this.closeModal());

    // List actions
    refreshBtn?.addEventListener('click', () => this.loadMappings());
    retryBtn?.addEventListener('click', () => this.loadMappings());

    // Form actions
    addFieldBtn?.addEventListener('click', () => this.addSchemaField());
    addRuleBtn?.addEventListener('click', () => this.addMappingRule());
    validateBtn?.addEventListener('click', () => this.validateMapping());
    mappingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMapping();
    });

    // Publish modal
    publishCancelBtn?.addEventListener('click', () => this.closePublishModal());
    publishConfirmBtn?.addEventListener('click', () => this.publishMapping());

    // Delete modal
    deleteCancelBtn?.addEventListener('click', () => this.closeDeleteModal());
    deleteConfirmBtn?.addEventListener('click', () => this.deleteMapping());

    // Preview modal
    closePreviewBtn?.addEventListener('click', () => this.closePreviewModal());
    loadSampleBtn?.addEventListener('click', () => this.loadSamplePayload());
    runPreviewBtn?.addEventListener('click', () => this.runPreviewTransform());
    clearPreviewBtn?.addEventListener('click', () => this.clearPreview());
    previewSourceInput?.addEventListener('input', debounce(() => this.validateSourceJson(), 300));

    // Filters
    searchInput?.addEventListener('input', debounce(() => this.renderMappings(), 300));
    filterStatus?.addEventListener('change', () => this.renderMappings());
    filterProvider?.addEventListener('change', () => this.renderMappings());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (mappingModal && !mappingModal.classList.contains('hidden')) this.closeModal();
        if (publishModal && !publishModal.classList.contains('hidden')) this.closePublishModal();
        if (deleteModal && !deleteModal.classList.contains('hidden')) this.closeDeleteModal();
        if (previewModal && !previewModal.classList.contains('hidden')) this.closePreviewModal();
      }
    });

    // Backdrop click
    [mappingModal, publishModal, deleteModal, previewModal].forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modal || target.getAttribute('aria-hidden') === 'true') {
          if (modal === mappingModal) this.closeModal();
          else if (modal === publishModal) this.closePublishModal();
          else if (modal === deleteModal) this.closeDeleteModal();
          else if (modal === previewModal) this.closePreviewModal();
        }
      });
    });
  }

  /**
   * Announce message for screen readers
   */
  private announce(message: string): void {
    const { announcements } = this.elements;
    if (announcements) {
      announcements.textContent = message;
    }
    announce(message);
  }

  /**
   * Show a specific page state
   */
  private showState(state: PageState): void {
    const { loadingState, emptyState, errorState, mappingsList } = this.elements;

    hide(loadingState);
    hide(emptyState);
    hide(errorState);
    hide(mappingsList);

    switch (state) {
      case 'loading':
        show(loadingState);
        break;
      case 'empty':
        show(emptyState);
        break;
      case 'error':
        show(errorState);
        break;
      case 'list':
        show(mappingsList);
        break;
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Format date string
   */
  private formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return dateStr;
    }
  }

  /**
   * Get status badge HTML
   */
  private getStatusBadge(status: string): string {
    const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
      published: { label: 'Published', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    };
    const config = configs[status] || configs.draft;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}">
      <span class="w-1.5 h-1.5 rounded-full ${config.dot}" aria-hidden="true"></span>
      ${config.label}
    </span>`;
  }

  /**
   * Load mappings from API
   */
  async loadMappings(): Promise<void> {
    this.showState('loading');

    try {
      const response = await fetch(this.mappingsEndpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.mappings = data.mappings || [];

      // Populate provider filter
      this.populateProviderFilter();

      this.renderMappings();
      this.announce(`Loaded ${this.mappings.length} mappings`);
    } catch (error) {
      console.error('Error loading mappings:', error);
      const { errorMessage } = this.elements;
      if (errorMessage) {
        errorMessage.textContent = error instanceof Error ? error.message : 'An error occurred';
      }
      this.showState('error');
      this.announce('Error loading mappings');
    }
  }

  /**
   * Populate provider filter dropdown
   */
  private populateProviderFilter(): void {
    const { filterProvider } = this.elements;
    if (!filterProvider) return;

    const providers = [...new Set(this.mappings.map((m) => m.provider).filter(Boolean))];
    filterProvider.innerHTML =
      '<option value="">All Providers</option>' +
      providers.map((p) => `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p)}</option>`).join('');
  }

  /**
   * Render mappings list with filters applied
   */
  private renderMappings(): void {
    const { mappingsTbody, searchInput, filterStatus, filterProvider } = this.elements;
    if (!mappingsTbody) return;

    const search = (searchInput?.value || '').toLowerCase();
    const statusFilter = filterStatus?.value || '';
    const providerFilter = filterProvider?.value || '';

    const filtered = this.mappings.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search) && !m.provider.toLowerCase().includes(search)) {
        return false;
      }
      if (statusFilter && m.status !== statusFilter) return false;
      if (providerFilter && m.provider !== providerFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      this.showState('empty');
      return;
    }

    mappingsTbody.innerHTML = filtered
      .map(
        (m) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(m.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(m.compiled_hash ? m.compiled_hash.slice(0, 12) + '...' : '')}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(m.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(m.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${m.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(m.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Preview ${this.escapeHtml(m.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Edit ${this.escapeHtml(m.name)}">
              Edit
            </button>
            ${
              m.status === 'draft'
                ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Publish ${this.escapeHtml(m.name)}">
                Publish
              </button>
            `
                : ''
            }
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(m.id)}" aria-label="Delete ${this.escapeHtml(m.name)}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    this.showState('list');
    this.attachRowListeners();
  }

  /**
   * Attach event listeners to table row buttons
   */
  private attachRowListeners(): void {
    const { mappingsTbody } = this.elements;
    if (!mappingsTbody) return;

    mappingsTbody.querySelectorAll<HTMLElement>('.preview-mapping-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openPreviewModal(btn.dataset.id || ''));
    });

    mappingsTbody.querySelectorAll<HTMLElement>('.edit-mapping-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id || ''));
    });

    mappingsTbody.querySelectorAll<HTMLElement>('.publish-mapping-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openPublishModal(btn.dataset.id || ''));
    });

    mappingsTbody.querySelectorAll<HTMLElement>('.delete-mapping-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openDeleteModal(btn.dataset.id || ''));
    });
  }

  // Form management methods

  /**
   * Create a schema field row element
   */
  private createSchemaFieldRow(field: Partial<SchemaField> = {}): HTMLElement {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded-lg schema-field-row';
    row.innerHTML = `
      <input type="text" placeholder="object" value="${this.escapeHtml(field.object || '')}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${this.escapeHtml(field.field || '')}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <select class="field-type px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="string" ${field.type === 'string' ? 'selected' : ''}>string</option>
        <option value="number" ${field.type === 'number' ? 'selected' : ''}>number</option>
        <option value="boolean" ${field.type === 'boolean' ? 'selected' : ''}>boolean</option>
        <option value="date" ${field.type === 'date' ? 'selected' : ''}>date</option>
      </select>
      <label class="flex items-center gap-1 text-xs">
        <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''}> Req
      </label>
      <button type="button" class="remove-field-btn text-red-500 hover:text-red-600" aria-label="Remove field">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;
    row.querySelector('.remove-field-btn')?.addEventListener('click', () => row.remove());
    return row;
  }

  /**
   * Create a mapping rule row element
   */
  private createMappingRuleRow(rule: Partial<MappingRule> = {}): HTMLElement {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded-lg mapping-rule-row';
    row.innerHTML = `
      <input type="text" placeholder="source_object" value="${this.escapeHtml(rule.source_object || '')}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${this.escapeHtml(rule.source_field || '')}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${rule.target_entity === 'participant' ? 'selected' : ''}>participant</option>
        <option value="agreement" ${rule.target_entity === 'agreement' ? 'selected' : ''}>agreement</option>
        <option value="field_definition" ${rule.target_entity === 'field_definition' ? 'selected' : ''}>field_definition</option>
        <option value="field_instance" ${rule.target_entity === 'field_instance' ? 'selected' : ''}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${this.escapeHtml(rule.target_path || '')}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <button type="button" class="remove-rule-btn text-red-500 hover:text-red-600" aria-label="Remove rule">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;
    row.querySelector('.remove-rule-btn')?.addEventListener('click', () => row.remove());
    return row;
  }

  /**
   * Add a new schema field row
   */
  private addSchemaField(field?: Partial<SchemaField>): void {
    const { schemaFieldsContainer } = this.elements;
    if (schemaFieldsContainer) {
      schemaFieldsContainer.appendChild(this.createSchemaFieldRow(field));
    }
  }

  /**
   * Add a new mapping rule row
   */
  private addMappingRule(rule?: Partial<MappingRule>): void {
    const { mappingRulesContainer } = this.elements;
    if (mappingRulesContainer) {
      mappingRulesContainer.appendChild(this.createMappingRuleRow(rule));
    }
  }

  /**
   * Collect form data into a mapping spec object
   */
  private collectFormData(): Partial<MappingSpec> {
    const {
      mappingIdInput,
      mappingVersionInput,
      mappingNameInput,
      mappingProviderInput,
      schemaObjectTypeInput,
      schemaVersionInput,
      schemaFieldsContainer,
      mappingRulesContainer,
    } = this.elements;

    const fields: SchemaField[] = [];
    schemaFieldsContainer?.querySelectorAll<HTMLElement>('.schema-field-row').forEach((row) => {
      fields.push({
        object: (row.querySelector<HTMLInputElement>('.field-object')?.value || '').trim(),
        field: (row.querySelector<HTMLInputElement>('.field-name')?.value || '').trim(),
        type: (row.querySelector<HTMLSelectElement>('.field-type')?.value || 'string') as SchemaField['type'],
        required: row.querySelector<HTMLInputElement>('.field-required')?.checked || false,
      });
    });

    const rules: MappingRule[] = [];
    mappingRulesContainer?.querySelectorAll<HTMLElement>('.mapping-rule-row').forEach((row) => {
      rules.push({
        source_object: (row.querySelector<HTMLInputElement>('.rule-source-object')?.value || '').trim(),
        source_field: (row.querySelector<HTMLInputElement>('.rule-source-field')?.value || '').trim(),
        target_entity: (row.querySelector<HTMLSelectElement>('.rule-target-entity')?.value ||
          'participant') as MappingRule['target_entity'],
        target_path: (row.querySelector<HTMLInputElement>('.rule-target-path')?.value || '').trim(),
      });
    });

    return {
      id: mappingIdInput?.value.trim() || undefined,
      version: parseInt(mappingVersionInput?.value || '0', 10) || 0,
      name: mappingNameInput?.value.trim() || '',
      provider: mappingProviderInput?.value.trim() || '',
      external_schema: {
        object_type: schemaObjectTypeInput?.value.trim() || '',
        version: schemaVersionInput?.value.trim() || undefined,
        fields,
      },
      rules,
    };
  }

  /**
   * Populate form with mapping data
   */
  private populateForm(mapping: MappingSpec): void {
    const {
      mappingIdInput,
      mappingVersionInput,
      mappingNameInput,
      mappingProviderInput,
      schemaObjectTypeInput,
      schemaVersionInput,
      schemaFieldsContainer,
      mappingRulesContainer,
      mappingStatusBadge,
      formValidationStatus,
    } = this.elements;

    if (mappingIdInput) mappingIdInput.value = mapping.id || '';
    if (mappingVersionInput) mappingVersionInput.value = String(mapping.version || 0);
    if (mappingNameInput) mappingNameInput.value = mapping.name || '';
    if (mappingProviderInput) mappingProviderInput.value = mapping.provider || '';

    const schema = mapping.external_schema || { object_type: '', fields: [] };
    if (schemaObjectTypeInput) schemaObjectTypeInput.value = schema.object_type || '';
    if (schemaVersionInput) schemaVersionInput.value = schema.version || '';

    if (schemaFieldsContainer) {
      schemaFieldsContainer.innerHTML = '';
      (schema.fields || []).forEach((f) => schemaFieldsContainer.appendChild(this.createSchemaFieldRow(f)));
    }

    if (mappingRulesContainer) {
      mappingRulesContainer.innerHTML = '';
      (mapping.rules || []).forEach((r) => mappingRulesContainer.appendChild(this.createMappingRuleRow(r)));
    }

    if (mapping.status && mappingStatusBadge) {
      mappingStatusBadge.innerHTML = this.getStatusBadge(mapping.status);
      mappingStatusBadge.classList.remove('hidden');
    } else if (mappingStatusBadge) {
      mappingStatusBadge.classList.add('hidden');
    }

    hide(formValidationStatus);
  }

  /**
   * Reset the form to initial state
   */
  private resetForm(): void {
    const {
      mappingForm,
      mappingIdInput,
      mappingVersionInput,
      schemaFieldsContainer,
      mappingRulesContainer,
      mappingStatusBadge,
      formValidationStatus,
    } = this.elements;

    mappingForm?.reset();
    if (mappingIdInput) mappingIdInput.value = '';
    if (mappingVersionInput) mappingVersionInput.value = '0';
    if (schemaFieldsContainer) schemaFieldsContainer.innerHTML = '';
    if (mappingRulesContainer) mappingRulesContainer.innerHTML = '';
    if (mappingStatusBadge) mappingStatusBadge.classList.add('hidden');
    hide(formValidationStatus);
    this.editingMappingId = null;
  }

  // Modal methods

  /**
   * Open create mapping modal
   */
  private openCreateModal(): void {
    const { mappingModal, mappingModalTitle, mappingNameInput } = this.elements;

    this.resetForm();
    if (mappingModalTitle) mappingModalTitle.textContent = 'New Mapping Specification';

    // Add default field and rule
    this.addSchemaField({ field: 'email', type: 'string', required: true });
    this.addMappingRule({ target_entity: 'participant', target_path: 'email' });

    show(mappingModal);
    mappingNameInput?.focus();
  }

  /**
   * Open edit mapping modal
   */
  private openEditModal(id: string): void {
    const mapping = this.mappings.find((m) => m.id === id);
    if (!mapping) return;

    const { mappingModal, mappingModalTitle, mappingNameInput } = this.elements;

    this.editingMappingId = id;
    if (mappingModalTitle) mappingModalTitle.textContent = 'Edit Mapping Specification';
    this.populateForm(mapping);

    show(mappingModal);
    mappingNameInput?.focus();
  }

  /**
   * Close mapping modal
   */
  private closeModal(): void {
    const { mappingModal } = this.elements;
    hide(mappingModal);
    this.resetForm();
  }

  /**
   * Open publish confirmation modal
   */
  private openPublishModal(id: string): void {
    const mapping = this.mappings.find((m) => m.id === id);
    if (!mapping) return;

    const { publishModal, publishMappingName, publishMappingVersion } = this.elements;

    this.pendingPublishId = id;
    if (publishMappingName) publishMappingName.textContent = mapping.name;
    if (publishMappingVersion) publishMappingVersion.textContent = `v${mapping.version || 1}`;

    show(publishModal);
  }

  /**
   * Close publish modal
   */
  private closePublishModal(): void {
    hide(this.elements.publishModal);
    this.pendingPublishId = null;
  }

  /**
   * Open delete confirmation modal
   */
  private openDeleteModal(id: string): void {
    this.pendingDeleteId = id;
    show(this.elements.deleteModal);
  }

  /**
   * Close delete modal
   */
  private closeDeleteModal(): void {
    hide(this.elements.deleteModal);
    this.pendingDeleteId = null;
  }

  // CRUD operations

  /**
   * Validate mapping
   */
  async validateMapping(): Promise<void> {
    const { validateBtn, formValidationStatus } = this.elements;
    if (!validateBtn) return;

    const data = this.collectFormData();

    validateBtn.setAttribute('disabled', 'true');
    validateBtn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Validating...`;

    try {
      const response = await fetch(this.mappingsEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, validate_only: true }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'ok') {
        if (formValidationStatus) {
          formValidationStatus.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((result.mapping?.compiled_hash || '').slice(0, 16))}</code></p>
              </div>
            </div>
          `;
          formValidationStatus.className = 'rounded-lg p-4';
        }
        this.announce('Validation passed');
      } else {
        const errors = result.errors || [result.error?.message || 'Validation failed'];
        if (formValidationStatus) {
          formValidationStatus.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${errors.map((e: string) => `<li>${this.escapeHtml(e)}</li>`).join('')}</ul>
              </div>
            </div>
          `;
          formValidationStatus.className = 'rounded-lg p-4';
        }
        this.announce('Validation failed');
      }

      show(formValidationStatus);
    } catch (error) {
      console.error('Validation error:', error);
      if (formValidationStatus) {
        formValidationStatus.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</div>`;
        show(formValidationStatus);
      }
    } finally {
      validateBtn.removeAttribute('disabled');
      validateBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Validate`;
    }
  }

  /**
   * Save mapping (create or update)
   */
  async saveMapping(): Promise<void> {
    const { saveBtn } = this.elements;
    if (!saveBtn) return;

    const data = this.collectFormData();

    saveBtn.setAttribute('disabled', 'true');
    saveBtn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Saving...`;

    try {
      const isUpdate = !!data.id;
      const url = isUpdate ? `${this.mappingsEndpoint}/${data.id}` : this.mappingsEndpoint;
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast(isUpdate ? 'Mapping updated' : 'Mapping created', 'success');
      this.announce(isUpdate ? 'Mapping updated' : 'Mapping created');
      this.closeModal();
      await this.loadMappings();
    } catch (error) {
      console.error('Save error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to save: ${message}`, 'error');
      this.announce(`Failed to save: ${message}`);
    } finally {
      saveBtn.removeAttribute('disabled');
      saveBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Save Draft`;
    }
  }

  /**
   * Publish mapping
   */
  async publishMapping(): Promise<void> {
    if (!this.pendingPublishId) return;

    const mapping = this.mappings.find((m) => m.id === this.pendingPublishId);
    if (!mapping) return;

    const { publishConfirmBtn } = this.elements;
    if (!publishConfirmBtn) return;

    publishConfirmBtn.setAttribute('disabled', 'true');
    publishConfirmBtn.textContent = 'Publishing...';

    try {
      const response = await fetch(`${this.mappingsEndpoint}/${this.pendingPublishId}/publish`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ expected_version: mapping.version }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast('Mapping published', 'success');
      this.announce('Mapping published');
      this.closePublishModal();
      await this.loadMappings();
    } catch (error) {
      console.error('Publish error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to publish: ${message}`, 'error');
    } finally {
      publishConfirmBtn.removeAttribute('disabled');
      publishConfirmBtn.textContent = 'Publish';
    }
  }

  /**
   * Delete mapping
   */
  async deleteMapping(): Promise<void> {
    if (!this.pendingDeleteId) return;

    const { deleteConfirmBtn } = this.elements;
    if (!deleteConfirmBtn) return;

    deleteConfirmBtn.setAttribute('disabled', 'true');
    deleteConfirmBtn.textContent = 'Deleting...';

    try {
      const response = await fetch(`${this.mappingsEndpoint}/${this.pendingDeleteId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast('Mapping deleted', 'success');
      this.announce('Mapping deleted');
      this.closeDeleteModal();
      await this.loadMappings();
    } catch (error) {
      console.error('Delete error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to delete: ${message}`, 'error');
    } finally {
      deleteConfirmBtn.removeAttribute('disabled');
      deleteConfirmBtn.textContent = 'Delete';
    }
  }

  // Preview methods

  /**
   * Open preview modal
   */
  private openPreviewModal(id: string): void {
    const mapping = this.mappings.find((m) => m.id === id);
    if (!mapping) return;

    const {
      previewModal,
      previewMappingName,
      previewMappingProvider,
      previewObjectType,
      previewMappingStatus,
      previewSourceInput,
      sourceSyntaxError,
    } = this.elements;

    this.currentPreviewMapping = mapping;

    if (previewMappingName) previewMappingName.textContent = mapping.name;
    if (previewMappingProvider) previewMappingProvider.textContent = mapping.provider;
    if (previewObjectType) previewObjectType.textContent = mapping.external_schema?.object_type || '-';
    if (previewMappingStatus) previewMappingStatus.innerHTML = this.getStatusBadge(mapping.status);

    this.renderPreviewRules(mapping.rules || []);
    this.showPreviewState('empty');

    if (previewSourceInput) previewSourceInput.value = '';
    hide(sourceSyntaxError);

    show(previewModal);
    previewSourceInput?.focus();
  }

  /**
   * Close preview modal
   */
  private closePreviewModal(): void {
    hide(this.elements.previewModal);
    this.currentPreviewMapping = null;
    if (this.elements.previewSourceInput) {
      this.elements.previewSourceInput.value = '';
    }
  }

  /**
   * Show preview state
   */
  private showPreviewState(state: PreviewState): void {
    const { previewEmpty, previewLoading, previewError, previewSuccess } = this.elements;

    hide(previewEmpty);
    hide(previewLoading);
    hide(previewError);
    hide(previewSuccess);

    switch (state) {
      case 'empty':
        show(previewEmpty);
        break;
      case 'loading':
        show(previewLoading);
        break;
      case 'error':
        show(previewError);
        break;
      case 'success':
        show(previewSuccess);
        break;
    }
  }

  /**
   * Render preview rules table
   */
  private renderPreviewRules(rules: MappingRule[]): void {
    const { previewRulesTbody } = this.elements;
    if (!previewRulesTbody) return;

    if (!rules || rules.length === 0) {
      previewRulesTbody.innerHTML =
        '<tr><td colspan="5" class="px-3 py-4 text-center text-sm text-gray-500">No mapping rules defined</td></tr>';
      return;
    }

    previewRulesTbody.innerHTML = rules
      .map(
        (rule) => `
      <tr>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(rule.source_object ? rule.source_object + '.' : '')}${this.escapeHtml(rule.source_field)}</td>
        <td class="px-3 py-2 text-center text-gray-400">→</td>
        <td class="px-3 py-2">
          <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">${this.escapeHtml(rule.target_entity)}</span>
        </td>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(rule.target_path)}</td>
        <td class="px-3 py-2" data-rule-source="${this.escapeHtml(rule.source_field)}">
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Pending</span>
        </td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * Load sample payload
   */
  private loadSamplePayload(): void {
    if (!this.currentPreviewMapping) return;

    const { previewSourceInput, sourceSyntaxError } = this.elements;
    const schema = this.currentPreviewMapping.external_schema || { object_type: 'data', fields: [] };
    const objectType = schema.object_type || 'data';
    const fields = schema.fields || [];

    const sample: Record<string, Record<string, unknown>> = {};
    const innerObj: Record<string, unknown> = {};

    fields.forEach((field) => {
      const key = field.field || 'field';
      switch (field.type) {
        case 'string':
          innerObj[key] = key === 'email' ? 'john.doe@example.com' : key === 'name' ? 'John Doe' : `sample_${key}`;
          break;
        case 'number':
          innerObj[key] = 123;
          break;
        case 'boolean':
          innerObj[key] = true;
          break;
        case 'date':
          innerObj[key] = new Date().toISOString().split('T')[0];
          break;
        default:
          innerObj[key] = `sample_${key}`;
      }
    });

    sample[objectType] = innerObj;

    if (previewSourceInput) {
      previewSourceInput.value = JSON.stringify(sample, null, 2);
    }
    hide(sourceSyntaxError);
  }

  /**
   * Validate source JSON
   */
  private validateSourceJson(): unknown | null {
    const { previewSourceInput, sourceSyntaxError } = this.elements;
    const value = previewSourceInput?.value.trim() || '';

    if (!value) {
      hide(sourceSyntaxError);
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      hide(sourceSyntaxError);
      return parsed;
    } catch (e) {
      if (sourceSyntaxError) {
        sourceSyntaxError.textContent = `JSON Syntax Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`;
        show(sourceSyntaxError);
      }
      return null;
    }
  }

  /**
   * Run preview transform
   */
  private async runPreviewTransform(): Promise<void> {
    const { previewSourceInput, previewErrorMessage } = this.elements;
    const sourcePayload = this.validateSourceJson();

    if (sourcePayload === null && previewSourceInput?.value.trim()) {
      return; // JSON syntax error
    }

    if (!sourcePayload) {
      this.showPreviewState('empty');
      return;
    }

    if (!this.currentPreviewMapping) return;

    this.showPreviewState('loading');

    try {
      const result = this.simulateTransform(sourcePayload as Record<string, unknown>, this.currentPreviewMapping);
      this.renderPreviewResult(result);
      this.showPreviewState('success');
    } catch (error) {
      console.error('Transform error:', error);
      if (previewErrorMessage) {
        previewErrorMessage.textContent = error instanceof Error ? error.message : 'Transform failed';
      }
      this.showPreviewState('error');
    }
  }

  /**
   * Simulate transform (client-side preview)
   */
  private simulateTransform(sourcePayload: Record<string, unknown>, mapping: MappingSpec): TransformResult {
    const rules = mapping.rules || [];
    const result: TransformResult = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: [],
    };

    const participantData: Record<string, unknown> = {};
    const agreementData: Record<string, unknown> = {};
    const fieldDefData: Array<{ path: string; value: unknown }> = [];

    rules.forEach((rule) => {
      const sourceValue = this.resolveSourceValue(sourcePayload, rule.source_object, rule.source_field);
      const matched = sourceValue !== undefined;

      result.matched_rules.push({
        source: rule.source_field,
        matched,
        value: sourceValue,
      });

      if (!matched) return;

      switch (rule.target_entity) {
        case 'participant':
          participantData[rule.target_path] = sourceValue;
          break;
        case 'agreement':
          agreementData[rule.target_path] = sourceValue;
          break;
        case 'field_definition':
          fieldDefData.push({ path: rule.target_path, value: sourceValue });
          break;
      }
    });

    if (Object.keys(participantData).length > 0) {
      result.participants.push({
        ...participantData,
        role: (participantData.role as string) || 'signer',
        signing_stage: (participantData.signing_stage as number) || 1,
      });
    }

    result.agreement = agreementData;
    result.field_definitions = fieldDefData;

    return result;
  }

  /**
   * Resolve source value from payload
   */
  private resolveSourceValue(
    payload: Record<string, unknown>,
    sourceObject?: string,
    sourceField?: string
  ): unknown {
    if (!payload || !sourceField) return undefined;

    // Try direct field access with source object
    if (sourceObject && payload[sourceObject]) {
      const obj = payload[sourceObject] as Record<string, unknown>;
      return obj[sourceField];
    }

    // Try nested access using first key
    for (const key of Object.keys(payload)) {
      if (typeof payload[key] === 'object' && payload[key] !== null) {
        const obj = payload[key] as Record<string, unknown>;
        if (sourceField in obj) {
          return obj[sourceField];
        }
      }
    }

    // Try direct access
    return payload[sourceField];
  }

  /**
   * Render preview result
   */
  private renderPreviewResult(result: TransformResult): void {
    const {
      previewParticipants,
      participantsCount,
      previewFields,
      fieldsCount,
      previewMetadata,
      previewRawJson,
      previewRulesTbody,
    } = this.elements;

    // Render participants
    const participants = result.participants || [];
    if (participantsCount) participantsCount.textContent = `(${participants.length})`;

    if (previewParticipants) {
      if (participants.length === 0) {
        previewParticipants.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>';
      } else {
        previewParticipants.innerHTML = participants
          .map(
            (p) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(p.name || p.email || '?').charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(p.name || '-'))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(p.email || '-'))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(p.role))}</span>
              <span class="text-xs text-gray-500">Stage ${p.signing_stage}</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // Render field definitions
    const fields = result.field_definitions || [];
    if (fieldsCount) fieldsCount.textContent = `(${fields.length})`;

    if (previewFields) {
      if (fields.length === 0) {
        previewFields.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>';
      } else {
        previewFields.innerHTML = fields
          .map(
            (f) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(f.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(f.value))}</span>
          </div>
        `
          )
          .join('');
      }
    }

    // Render agreement metadata
    const metadata = result.agreement || {};
    const metaEntries = Object.entries(metadata);

    if (previewMetadata) {
      if (metaEntries.length === 0) {
        previewMetadata.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>';
      } else {
        previewMetadata.innerHTML = metaEntries
          .map(
            ([key, value]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(key)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(value))}</span>
          </div>
        `
          )
          .join('');
      }
    }

    // Render raw JSON
    if (previewRawJson) {
      previewRawJson.textContent = JSON.stringify(result, null, 2);
    }

    // Update rule status indicators
    (result.matched_rules || []).forEach((rule) => {
      const cell = previewRulesTbody?.querySelector(`[data-rule-source="${this.escapeHtml(rule.source)}"] span`);
      if (cell) {
        if (rule.matched) {
          cell.className = 'px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700';
          cell.textContent = 'Matched';
        } else {
          cell.className = 'px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700';
          cell.textContent = 'Not Found';
        }
      }
    });
  }

  /**
   * Clear preview
   */
  private clearPreview(): void {
    const { previewSourceInput, sourceSyntaxError } = this.elements;

    if (previewSourceInput) previewSourceInput.value = '';
    hide(sourceSyntaxError);
    this.showPreviewState('empty');
    this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    const win = window as unknown as Record<string, unknown>;
    const toastManager = win.toastManager as
      | { success: (msg: string) => void; error: (msg: string) => void }
      | undefined;

    if (toastManager) {
      if (type === 'success') {
        toastManager.success(message);
      } else {
        toastManager.error(message);
      }
    }
  }
}

/**
 * Initialize integration mappings page from config
 */
export function initIntegrationMappings(config: IntegrationMappingsConfig): IntegrationMappingsController {
  const controller = new IntegrationMappingsController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap integration mappings page from template context
 */
export function bootstrapIntegrationMappings(config: { basePath: string; apiBasePath?: string }): void {
  const pageConfig: IntegrationMappingsConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
  };

  const controller = new IntegrationMappingsController(pageConfig);
  onReady(() => controller.init());

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignIntegrationMappingsController = controller;
  }
}

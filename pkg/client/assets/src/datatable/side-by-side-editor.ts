/**
 * Side-by-Side Translation Editor (Phase 5 - TX-051)
 *
 * Provides a split-pane translation editor with source-target field pairing
 * and drift banner support. Uses the `source_target_drift` contract from backend.
 *
 * Contract (from backend translation_contracts.go):
 * - source_target_drift.source_hash: Hash of source content for drift detection
 * - source_target_drift.source_version: Version of source content
 * - source_target_drift.changed_fields_summary: { count: number, fields: string[] }
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Source-target drift metadata from backend
 */
export interface SourceTargetDrift {
  /** Hash of source content */
  sourceHash: string | null;
  /** Version of source content */
  sourceVersion: string | null;
  /** Changed fields summary */
  changedFieldsSummary: {
    /** Number of changed fields */
    count: number;
    /** List of changed field names */
    fields: string[];
  };
  /** Whether drift is detected */
  hasDrift: boolean;
}

/**
 * Field definition for side-by-side editing
 */
export interface SideBySideField {
  /** Field key/name */
  key: string;
  /** Display label */
  label: string;
  /** Field type (text, textarea, richtext, etc.) */
  type: 'text' | 'textarea' | 'richtext' | 'html';
  /** Whether the source has changed for this field */
  hasSourceChanged: boolean;
  /** Source value (read-only) */
  sourceValue: string;
  /** Target value (editable) */
  targetValue: string;
  /** Source locale */
  sourceLocale: string;
  /** Target locale */
  targetLocale: string;
  /** Whether field is required */
  required?: boolean;
  /** Character limit */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Side-by-side editor configuration
 */
export interface SideBySideEditorConfig {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Fields to display */
  fields: SideBySideField[];
  /** Source-target drift metadata */
  drift: SourceTargetDrift | null;
  /** Source locale code */
  sourceLocale: string;
  /** Target locale code */
  targetLocale: string;
  /** Panel name for API calls */
  panelName: string;
  /** Record ID being edited */
  recordId: string;
  /** Base API path */
  basePath?: string;
  /** Callback when a field value changes */
  onChange?: (key: string, value: string) => void;
  /** Callback when drift is acknowledged */
  onDriftAcknowledge?: () => void;
  /** Callback to copy source to target */
  onCopySource?: (key: string) => void;
  /** Labels for UI elements */
  labels?: SideBySideLabels;
}

/**
 * UI labels for the side-by-side editor
 */
export interface SideBySideLabels {
  sourceColumn?: string;
  targetColumn?: string;
  driftBannerTitle?: string;
  driftBannerDescription?: string;
  driftAcknowledgeButton?: string;
  driftViewChangesButton?: string;
  copySourceButton?: string;
  fieldChangedIndicator?: string;
}

/**
 * Default labels
 */
export const DEFAULT_SIDE_BY_SIDE_LABELS: Required<SideBySideLabels> = {
  sourceColumn: 'Source',
  targetColumn: 'Translation',
  driftBannerTitle: 'Source content has changed',
  driftBannerDescription: 'The source content has been updated since this translation was last edited.',
  driftAcknowledgeButton: 'Acknowledge',
  driftViewChangesButton: 'View Changes',
  copySourceButton: 'Copy from source',
  fieldChangedIndicator: 'Source changed',
};

// ============================================================================
// Drift Extraction
// ============================================================================

/**
 * Extract source-target drift metadata from a record payload
 */
export function extractSourceTargetDrift(record: Record<string, unknown>): SourceTargetDrift {
  const result: SourceTargetDrift = {
    sourceHash: null,
    sourceVersion: null,
    changedFieldsSummary: { count: 0, fields: [] },
    hasDrift: false,
  };

  if (!record || typeof record !== 'object') {
    return result;
  }

  // Check for source_target_drift nested object (canonical format)
  const drift = record.source_target_drift as Record<string, unknown> | undefined;

  if (drift && typeof drift === 'object') {
    result.sourceHash = typeof drift.source_hash === 'string' ? drift.source_hash : null;
    result.sourceVersion = typeof drift.source_version === 'string' ? drift.source_version : null;

    const summary = drift.changed_fields_summary as Record<string, unknown> | undefined;
    if (summary && typeof summary === 'object') {
      result.changedFieldsSummary.count = typeof summary.count === 'number' ? summary.count : 0;
      result.changedFieldsSummary.fields = Array.isArray(summary.fields)
        ? summary.fields.filter((f): f is string => typeof f === 'string')
        : [];
    }

    // Drift is present if there are changed fields
    result.hasDrift = result.changedFieldsSummary.count > 0 || result.changedFieldsSummary.fields.length > 0;
  }

  return result;
}

/**
 * Check if a specific field has source changes
 */
export function hasFieldDrift(drift: SourceTargetDrift | null, fieldKey: string): boolean {
  if (!drift || !drift.hasDrift) {
    return false;
  }
  return drift.changedFieldsSummary.fields.some(
    f => f.toLowerCase() === fieldKey.toLowerCase()
  );
}

/**
 * Get list of changed field keys
 */
export function getChangedFields(drift: SourceTargetDrift | null): string[] {
  if (!drift || !drift.hasDrift) {
    return [];
  }
  return [...drift.changedFieldsSummary.fields];
}

// ============================================================================
// Side-by-Side Editor Component
// ============================================================================

export class SideBySideEditor {
  private container: HTMLElement | null = null;
  private config: Required<Omit<SideBySideEditorConfig, 'container' | 'onChange' | 'onDriftAcknowledge' | 'onCopySource'>> & {
    container: HTMLElement | null;
    onChange?: (key: string, value: string) => void;
    onDriftAcknowledge?: () => void;
    onCopySource?: (key: string) => void;
  };
  private driftAcknowledged: boolean = false;

  constructor(config: SideBySideEditorConfig) {
    const containerEl = typeof config.container === 'string'
      ? document.querySelector<HTMLElement>(config.container)
      : config.container;

    this.config = {
      container: containerEl,
      fields: config.fields,
      drift: config.drift,
      sourceLocale: config.sourceLocale,
      targetLocale: config.targetLocale,
      panelName: config.panelName,
      recordId: config.recordId,
      basePath: config.basePath || '/admin',
      onChange: config.onChange,
      onDriftAcknowledge: config.onDriftAcknowledge,
      onCopySource: config.onCopySource,
      labels: { ...DEFAULT_SIDE_BY_SIDE_LABELS, ...config.labels },
    };

    this.container = containerEl;
  }

  /**
   * Render the side-by-side editor
   */
  render(): void {
    if (!this.container) {
      console.warn('[SideBySideEditor] Container not found');
      return;
    }

    this.container.innerHTML = this.buildHTML();
    this.attachEventListeners();
  }

  /**
   * Build HTML for the editor
   */
  buildHTML(): string {
    const { drift, labels, sourceLocale, targetLocale, fields } = this.config;

    const driftBanner = this.shouldShowDriftBanner()
      ? this.renderDriftBanner(drift!, labels)
      : '';

    const fieldsHtml = fields.map(field => this.renderFieldRow(field, labels)).join('');

    return `
      <div class="side-by-side-editor" data-source-locale="${sourceLocale}" data-target-locale="${targetLocale}">
        ${driftBanner}
        <div class="sbs-columns">
          <div class="sbs-header">
            <div class="sbs-column-header sbs-source-header">
              <span class="sbs-column-title">${escapeHtml(labels.sourceColumn!)}</span>
              <span class="sbs-locale-badge">${sourceLocale.toUpperCase()}</span>
            </div>
            <div class="sbs-column-header sbs-target-header">
              <span class="sbs-column-title">${escapeHtml(labels.targetColumn!)}</span>
              <span class="sbs-locale-badge">${targetLocale.toUpperCase()}</span>
            </div>
          </div>
          <div class="sbs-fields">
            ${fieldsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the drift warning banner
   */
  private renderDriftBanner(drift: SourceTargetDrift, labels: SideBySideLabels): string {
    const l = { ...DEFAULT_SIDE_BY_SIDE_LABELS, ...labels };
    const changedCount = drift.changedFieldsSummary.count;
    const changedFields = drift.changedFieldsSummary.fields;

    const fieldsList = changedFields.length > 0
      ? `<ul class="sbs-drift-fields-list">${changedFields.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : '';

    return `
      <div class="sbs-drift-banner" role="alert" aria-live="polite" data-drift-banner="true">
        <div class="sbs-drift-icon">
          <svg class="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="sbs-drift-content">
          <h3 class="sbs-drift-title">${escapeHtml(l.driftBannerTitle)}</h3>
          <p class="sbs-drift-description">
            ${escapeHtml(l.driftBannerDescription)}
            ${changedCount > 0 ? `<span class="sbs-drift-count">${changedCount} field${changedCount !== 1 ? 's' : ''} changed.</span>` : ''}
          </p>
          ${fieldsList}
        </div>
        <div class="sbs-drift-actions">
          <button type="button" class="sbs-drift-acknowledge" data-action="acknowledge-drift">
            ${escapeHtml(l.driftAcknowledgeButton)}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render a single field row
   */
  private renderFieldRow(field: SideBySideField, labels: SideBySideLabels): string {
    const l = { ...DEFAULT_SIDE_BY_SIDE_LABELS, ...labels };
    const changedIndicator = field.hasSourceChanged
      ? `<span class="sbs-field-changed" title="${escapeHtml(l.fieldChangedIndicator)}">
          <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </span>`
      : '';

    const sourceInput = this.renderSourceField(field);
    const targetInput = this.renderTargetField(field);

    const copyButton = `
      <button type="button"
              class="sbs-copy-source"
              data-action="copy-source"
              data-field="${escapeAttr(field.key)}"
              title="${escapeAttr(l.copySourceButton)}"
              aria-label="${escapeAttr(l.copySourceButton)} for ${escapeAttr(field.label)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;

    const rowClass = field.hasSourceChanged ? 'sbs-field-row sbs-field-changed-row' : 'sbs-field-row';

    return `
      <div class="${rowClass}" data-field-key="${escapeAttr(field.key)}">
        <div class="sbs-field-header">
          <label class="sbs-field-label">
            ${escapeHtml(field.label)}
            ${field.required ? '<span class="sbs-required">*</span>' : ''}
          </label>
          ${changedIndicator}
        </div>
        <div class="sbs-field-content">
          <div class="sbs-source-field">
            ${sourceInput}
          </div>
          <div class="sbs-field-actions">
            ${copyButton}
          </div>
          <div class="sbs-target-field">
            ${targetInput}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render source field (read-only)
   */
  private renderSourceField(field: SideBySideField): string {
    const value = escapeHtml(field.sourceValue || '');

    if (field.type === 'textarea' || field.type === 'richtext' || field.type === 'html') {
      return `
        <div class="sbs-source-content sbs-textarea-field"
             data-field="${escapeAttr(field.key)}"
             aria-label="Source: ${escapeAttr(field.label)}">
          ${value || '<span class="sbs-empty">Empty</span>'}
        </div>
      `;
    }

    return `
      <div class="sbs-source-content sbs-text-field"
           data-field="${escapeAttr(field.key)}"
           aria-label="Source: ${escapeAttr(field.label)}">
        ${value || '<span class="sbs-empty">Empty</span>'}
      </div>
    `;
  }

  /**
   * Render target field (editable)
   */
  private renderTargetField(field: SideBySideField): string {
    const value = escapeHtml(field.targetValue || '');
    const placeholder = field.placeholder ? `placeholder="${escapeAttr(field.placeholder)}"` : '';
    const required = field.required ? 'required' : '';
    const maxLength = field.maxLength ? `maxlength="${field.maxLength}"` : '';

    if (field.type === 'textarea' || field.type === 'richtext' || field.type === 'html') {
      return `
        <textarea class="sbs-target-input sbs-textarea-input"
                  name="${escapeAttr(field.key)}"
                  data-field="${escapeAttr(field.key)}"
                  aria-label="Translation: ${escapeAttr(field.label)}"
                  ${placeholder}
                  ${required}
                  ${maxLength}>${value}</textarea>
      `;
    }

    return `
      <input type="text"
             class="sbs-target-input sbs-text-input"
             name="${escapeAttr(field.key)}"
             data-field="${escapeAttr(field.key)}"
             value="${value}"
             aria-label="Translation: ${escapeAttr(field.label)}"
             ${placeholder}
             ${required}
             ${maxLength}>
    `;
  }

  /**
   * Check if drift banner should be shown
   */
  private shouldShowDriftBanner(): boolean {
    return !this.driftAcknowledged && this.config.drift !== null && this.config.drift.hasDrift;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Drift acknowledge button
    const acknowledgeBtn = this.container.querySelector('[data-action="acknowledge-drift"]');
    if (acknowledgeBtn) {
      acknowledgeBtn.addEventListener('click', () => this.acknowledgeDrift());
    }

    // Copy source buttons
    this.container.querySelectorAll('[data-action="copy-source"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fieldKey = (e.currentTarget as HTMLElement).dataset.field;
        if (fieldKey) {
          this.copySourceToTarget(fieldKey);
        }
      });
    });

    // Input change listeners
    this.container.querySelectorAll('.sbs-target-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const fieldKey = target.dataset.field;
        if (fieldKey && this.config.onChange) {
          this.config.onChange(fieldKey, target.value);
        }
      });
    });
  }

  /**
   * Acknowledge drift
   */
  acknowledgeDrift(): void {
    this.driftAcknowledged = true;

    const banner = this.container?.querySelector('[data-drift-banner]');
    if (banner) {
      banner.classList.add('sbs-drift-acknowledged');
      setTimeout(() => banner.remove(), 300);
    }

    if (this.config.onDriftAcknowledge) {
      this.config.onDriftAcknowledge();
    }
  }

  /**
   * Copy source value to target field
   */
  copySourceToTarget(fieldKey: string): void {
    const field = this.config.fields.find(f => f.key === fieldKey);
    if (!field) return;

    const targetInput = this.container?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `.sbs-target-input[data-field="${fieldKey}"]`
    );

    if (targetInput) {
      targetInput.value = field.sourceValue || '';

      // Trigger input event for change detection
      const event = new Event('input', { bubbles: true });
      targetInput.dispatchEvent(event);
    }

    if (this.config.onCopySource) {
      this.config.onCopySource(fieldKey);
    }
  }

  /**
   * Get current field values
   */
  getValues(): Record<string, string> {
    const values: Record<string, string> = {};

    if (!this.container) return values;

    this.container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.sbs-target-input').forEach(input => {
      const fieldKey = input.dataset.field;
      if (fieldKey) {
        values[fieldKey] = input.value;
      }
    });

    return values;
  }

  /**
   * Set field value programmatically
   */
  setValue(fieldKey: string, value: string): void {
    const input = this.container?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `.sbs-target-input[data-field="${fieldKey}"]`
    );

    if (input) {
      input.value = value;
    }
  }

  /**
   * Update fields and re-render
   */
  setFields(fields: SideBySideField[]): void {
    this.config.fields = fields;
    this.render();
  }

  /**
   * Update drift metadata
   */
  setDrift(drift: SourceTargetDrift | null): void {
    this.config.drift = drift;
    this.driftAcknowledged = false;
    this.render();
  }

  /**
   * Check if drift is currently acknowledged
   */
  isDriftAcknowledged(): boolean {
    return this.driftAcknowledged;
  }

  /**
   * Destroy the editor
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and render a side-by-side editor
 */
export function createSideBySideEditor(config: SideBySideEditorConfig): SideBySideEditor {
  const editor = new SideBySideEditor(config);
  editor.render();
  return editor;
}

/**
 * Initialize side-by-side editor from record data
 */
export function initSideBySideEditorFromRecord(
  container: HTMLElement | string,
  record: Record<string, unknown>,
  sourceRecord: Record<string, unknown>,
  fieldKeys: string[],
  config: Partial<SideBySideEditorConfig>
): SideBySideEditor {
  const drift = extractSourceTargetDrift(record);

  const fields: SideBySideField[] = fieldKeys.map(key => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    type: 'text' as const,
    hasSourceChanged: hasFieldDrift(drift, key),
    sourceValue: String(sourceRecord[key] || ''),
    targetValue: String(record[key] || ''),
    sourceLocale: config.sourceLocale || 'en',
    targetLocale: config.targetLocale || '',
  }));

  return createSideBySideEditor({
    container,
    fields,
    drift,
    sourceLocale: config.sourceLocale || 'en',
    targetLocale: config.targetLocale || '',
    panelName: config.panelName || '',
    recordId: config.recordId || '',
    ...config,
  });
}

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for the side-by-side editor
 */
export function getSideBySideEditorStyles(): string {
  return `
    /* Side-by-Side Editor Styles */
    .side-by-side-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }

    /* Drift Banner */
    .sbs-drift-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 0.5rem;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .sbs-drift-banner.sbs-drift-acknowledged {
      opacity: 0;
      transform: translateY(-0.5rem);
    }

    .sbs-drift-icon {
      flex-shrink: 0;
      color: #d97706;
    }

    .sbs-drift-content {
      flex: 1;
    }

    .sbs-drift-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 0.25rem 0;
    }

    .sbs-drift-description {
      font-size: 0.875rem;
      color: #b45309;
      margin: 0;
    }

    .sbs-drift-count {
      font-weight: 500;
    }

    .sbs-drift-fields-list {
      margin: 0.5rem 0 0 0;
      padding-left: 1.25rem;
      font-size: 0.75rem;
      color: #92400e;
    }

    .sbs-drift-actions {
      flex-shrink: 0;
    }

    .sbs-drift-acknowledge {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #92400e;
      background-color: white;
      border: 1px solid #fcd34d;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .sbs-drift-acknowledge:hover {
      background-color: #fef3c7;
    }

    /* Columns Layout */
    .sbs-columns {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .sbs-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-column-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
    }

    .sbs-source-header {
      border-right: 1px solid #e5e7eb;
    }

    .sbs-target-header {
      padding-left: calc(1rem + 2.5rem); /* Account for copy button column */
    }

    .sbs-column-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sbs-locale-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      background-color: #e5e7eb;
      color: #4b5563;
      border-radius: 0.25rem;
    }

    /* Fields */
    .sbs-fields {
      display: flex;
      flex-direction: column;
    }

    .sbs-field-row {
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-row:last-child {
      border-bottom: none;
    }

    .sbs-field-row.sbs-field-changed-row {
      background-color: #fffbeb;
    }

    .sbs-field-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .sbs-field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .sbs-required {
      color: #dc2626;
    }

    .sbs-field-changed {
      display: flex;
      align-items: center;
    }

    .sbs-field-content {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      min-height: 5rem;
    }

    .sbs-source-field,
    .sbs-target-field {
      padding: 0.75rem 1rem;
    }

    .sbs-source-field {
      background-color: #f9fafb;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-source-content {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .sbs-empty {
      font-style: italic;
      color: #9ca3af;
    }

    .sbs-field-actions {
      display: flex;
      align-items: flex-start;
      padding: 0.75rem 0.5rem;
      background-color: #f3f4f6;
      border-right: 1px solid #e5e7eb;
    }

    .sbs-copy-source {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      color: #6b7280;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sbs-copy-source:hover {
      color: #3b82f6;
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .sbs-target-input {
      width: 100%;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #111827;
      background-color: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .sbs-target-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .sbs-textarea-input {
      min-height: 6rem;
      resize: vertical;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sbs-header {
        display: none;
      }

      .sbs-field-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .sbs-source-field,
      .sbs-field-actions,
      .sbs-target-field {
        border: none;
        padding: 0.5rem 1rem;
      }

      .sbs-source-field {
        background-color: #f9fafb;
        border-radius: 0.375rem;
      }

      .sbs-source-field::before {
        content: 'Source';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-target-field::before {
        content: 'Translation';
        display: block;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .sbs-field-actions {
        background: transparent;
        padding: 0 1rem;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .sbs-drift-banner {
        background-color: #451a03;
        border-color: #92400e;
      }

      .sbs-drift-title {
        color: #fcd34d;
      }

      .sbs-drift-description {
        color: #fbbf24;
      }

      .sbs-drift-acknowledge {
        background-color: #1f2937;
        border-color: #92400e;
        color: #fcd34d;
      }

      .sbs-columns {
        border-color: #374151;
      }

      .sbs-header,
      .sbs-field-header,
      .sbs-source-field {
        background-color: #1f2937;
      }

      .sbs-column-title,
      .sbs-field-label {
        color: #e5e7eb;
      }

      .sbs-locale-badge {
        background-color: #374151;
        color: #d1d5db;
      }

      .sbs-source-content {
        color: #9ca3af;
      }

      .sbs-field-actions {
        background-color: #111827;
      }

      .sbs-copy-source {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #9ca3af;
      }

      .sbs-target-input {
        background-color: #1f2937;
        border-color: #4b5563;
        color: #f3f4f6;
      }

      .sbs-field-row.sbs-field-changed-row {
        background-color: #451a03;
      }
    }
  `;
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
export declare const DEFAULT_SIDE_BY_SIDE_LABELS: Required<SideBySideLabels>;
/**
 * Extract source-target drift metadata from a record payload
 */
export declare function extractSourceTargetDrift(record: Record<string, unknown>): SourceTargetDrift;
/**
 * Check if a specific field has source changes
 */
export declare function hasFieldDrift(drift: SourceTargetDrift | null, fieldKey: string): boolean;
/**
 * Get list of changed field keys
 */
export declare function getChangedFields(drift: SourceTargetDrift | null): string[];
export declare class SideBySideEditor {
    private container;
    private config;
    private driftAcknowledged;
    constructor(config: SideBySideEditorConfig);
    /**
     * Render the side-by-side editor
     */
    render(): void;
    /**
     * Build HTML for the editor
     */
    buildHTML(): string;
    /**
     * Render the drift warning banner
     */
    private renderDriftBanner;
    /**
     * Render a single field row
     */
    private renderFieldRow;
    /**
     * Render source field (read-only)
     */
    private renderSourceField;
    /**
     * Render target field (editable)
     */
    private renderTargetField;
    /**
     * Check if drift banner should be shown
     */
    private shouldShowDriftBanner;
    /**
     * Attach event listeners
     */
    private attachEventListeners;
    /**
     * Acknowledge drift
     */
    acknowledgeDrift(): void;
    /**
     * Copy source value to target field
     */
    copySourceToTarget(fieldKey: string): void;
    /**
     * Get current field values
     */
    getValues(): Record<string, string>;
    /**
     * Set field value programmatically
     */
    setValue(fieldKey: string, value: string): void;
    /**
     * Update fields and re-render
     */
    setFields(fields: SideBySideField[]): void;
    /**
     * Update drift metadata
     */
    setDrift(drift: SourceTargetDrift | null): void;
    /**
     * Check if drift is currently acknowledged
     */
    isDriftAcknowledged(): boolean;
    /**
     * Destroy the editor
     */
    destroy(): void;
}
/**
 * Create and render a side-by-side editor
 */
export declare function createSideBySideEditor(config: SideBySideEditorConfig): SideBySideEditor;
/**
 * Initialize side-by-side editor from record data
 */
export declare function initSideBySideEditorFromRecord(container: HTMLElement | string, record: Record<string, unknown>, sourceRecord: Record<string, unknown>, fieldKeys: string[], config: Partial<SideBySideEditorConfig>): SideBySideEditor;
/**
 * Get CSS styles for the side-by-side editor
 */
export declare function getSideBySideEditorStyles(): string;
//# sourceMappingURL=side-by-side-editor.d.ts.map
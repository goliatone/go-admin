/**
 * Content Type Builder Module
 *
 * A visual UI for creating and editing content types with drag-and-drop field ordering,
 * field type picker, configuration forms, and live schema preview.
 */

// Re-export types
export type {
  ContentType,
  ContentTypeStatus,
  ContentTypeCapabilities,
  JSONSchema,
  JSONSchemaType,
  FormgenExtension,
  AdminExtension,
  UISchemaOverlay,
  UILayoutConfig,
  UITab,
  UIOverride,
  ConditionalField,
  FieldDefinition,
  FieldType,
  FieldValidation,
  FieldTypeConfig,
  FieldTypeMetadata,
  FieldTypeCategory,
  // Advanced field configs
  TextFieldConfig,
  NumberFieldConfig,
  SelectFieldConfig,
  MediaFieldConfig,
  ReferenceFieldConfig,
  RepeaterFieldConfig,
  BlocksFieldConfig,
  CodeFieldConfig,
  SlugFieldConfig,
  ColorFieldConfig,
  LocationFieldConfig,
  DateRangeFieldConfig,
  // Block definition types
  BlockDefinition,
  BlockDefinitionStatus,
  BlockDefinitionListResponse,
  BlockDefinitionSummary,
  BlockLibraryManagerConfig,
  BlockLibraryManagerState,
  BlockSchemaVersion,
  // Content type versioning types
  ContentTypeSchemaVersion,
  SchemaChange,
  CompatibilityCheckResult,
  // API types
  ContentTypeListResponse,
  SchemaValidationRequest,
  SchemaValidationResponse,
  SchemaPreviewRequest,
  SchemaPreviewResponse,
  ContentTypeBuilderState,
  ContentTypeEditorConfig,
  FieldTypePickerConfig,
  FieldConfigFormConfig,
  SchemaPreviewConfig,
  ContentTypeBuilderEvent,
} from './types';

// Re-export API client
export { ContentTypeAPIClient, ContentTypeAPIError, fieldsToSchema, schemaToFields, generateFieldId } from './api-client';

// Re-export field type picker
export { FieldTypePicker, FIELD_TYPES, FIELD_CATEGORIES, getFieldTypeMetadata, getFieldTypesByCategory } from './field-type-picker';

// Re-export field config form
export { FieldConfigForm } from './field-config-form';

// Re-export layout editor
export { LayoutEditor } from './layout-editor';
export type { LayoutEditorConfig } from './layout-editor';

// Re-export main editor
export { ContentTypeEditor, initContentTypeEditors } from './content-editor-runtime.js';

// Re-export block library manager
export { BlockLibraryManager, initBlockLibraryManagers } from './block-library-manager';

// Re-export block library IDE
export { BlockLibraryIDE, initBlockLibraryIDE } from './block-library-ide';

// Re-export block editor panel
export { BlockEditorPanel } from './block-editor-panel';

// Re-export field palette panel (Phase 9)
export { FieldPalettePanel, PALETTE_DRAG_MIME } from './field-palette-panel';

// Re-export icon picker (shared)
export { registerIconTab, unregisterIconTab, getIconTabs, resolveIcon } from './shared/icon-picker';
export type { IconTab, IconEntry, IconPickerConfig } from './shared/icon-picker';

// Re-export content-types channel switcher (T10 — styled modal, no native prompt)
export { initContentTypeChannelSwitcher, normalizeChannelName } from './shared/channel-switcher';

// Re-export shared schema-preview primitives (T14 — Content Types + Block Library)
export { PreviewModal, wrapReadonlyPreview, initPreviewEditors } from './shared/schema-preview';

// Re-export starter field-set presets (T15)
export { FIELD_SET_PRESETS, getFieldSetPreset } from './shared/field-presets';
export type { FieldSetPreset, PresetField } from './shared/field-presets';

// Re-export shared field-card primitives (T16 — unified trailing controls)
export { renderFieldCard, renderFieldKebab, renderDropZone } from './shared/field-card';
export type { FieldCardConfig, DropZoneConfig } from './shared/field-card';

// =============================================================================
// Auto-initialization
// =============================================================================

import { initBlockLibraryIDE } from './block-library-ide';
import { onReady } from '../shared/dom-ready.js';
import { initContentTypeEditorRuntime } from './content-editor-runtime.js';

// Auto-initialize on DOM ready
onReady(() => {
  initContentTypeEditorRuntime();
  initBlockLibraryIDE();
});

/**
 * Content Type Builder Module
 *
 * A visual UI for creating and editing content types with drag-and-drop field ordering,
 * field type picker, configuration forms, and live schema preview.
 */
export type { ContentType, ContentTypeStatus, ContentTypeCapabilities, JSONSchema, JSONSchemaType, FormgenExtension, AdminExtension, UISchemaOverlay, UILayoutConfig, UITab, UIOverride, ConditionalField, FieldDefinition, FieldType, FieldValidation, FieldTypeConfig, FieldTypeMetadata, FieldTypeCategory, TextFieldConfig, NumberFieldConfig, SelectFieldConfig, MediaFieldConfig, ReferenceFieldConfig, RepeaterFieldConfig, BlocksFieldConfig, CodeFieldConfig, SlugFieldConfig, ColorFieldConfig, LocationFieldConfig, DateRangeFieldConfig, BlockDefinition, BlockDefinitionStatus, BlockDefinitionListResponse, BlockDefinitionSummary, BlockLibraryManagerConfig, BlockLibraryManagerState, BlockSchemaVersion, ContentTypeSchemaVersion, SchemaChange, CompatibilityCheckResult, ContentTypeListResponse, SchemaValidationRequest, SchemaValidationResponse, SchemaPreviewRequest, SchemaPreviewResponse, ContentTypeBuilderState, ContentTypeEditorConfig, FieldTypePickerConfig, FieldConfigFormConfig, SchemaPreviewConfig, ContentTypeBuilderEvent, } from './types';
export { ContentTypeAPIClient, ContentTypeAPIError, fieldsToSchema, schemaToFields, generateFieldId } from './api-client';
export { FieldTypePicker, FIELD_TYPES, FIELD_CATEGORIES, getFieldTypeMetadata, getFieldTypesByCategory } from './field-type-picker';
export { FieldConfigForm } from './field-config-form';
export { LayoutEditor } from './layout-editor';
export type { LayoutEditorConfig } from './layout-editor';
export { ContentTypeEditor } from './content-type-editor';
export { BlockLibraryManager, initBlockLibraryManagers } from './block-library-manager';
/**
 * Initialize content type editors on elements matching [data-content-type-editor]
 */
export declare function initContentTypeEditors(scope?: ParentNode): void;
//# sourceMappingURL=index.d.ts.map
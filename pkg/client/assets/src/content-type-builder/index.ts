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
export { ContentTypeEditor } from './content-type-editor';

// Re-export block library manager
export { BlockLibraryManager, initBlockLibraryManagers } from './block-library-manager';

// =============================================================================
// Auto-initialization
// =============================================================================

import { ContentTypeEditor } from './content-type-editor';

/**
 * Initialize content type editors on elements matching [data-content-type-editor]
 */
export function initContentTypeEditors(scope: ParentNode = document): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-content-type-editor-root]'));

  roots.forEach((root) => {
    // Skip if already initialized
    if (root.dataset.initialized === 'true') return;

    const config = parseConfig(root);
    if (!config.apiBasePath) {
      console.warn('Content type editor missing apiBasePath', root);
      return;
    }

    const editor = new ContentTypeEditor(root, config);
    editor.init();

    root.dataset.initialized = 'true';
  });
}

function parseConfig(root: HTMLElement): {
  apiBasePath: string;
  contentTypeId?: string;
  locale?: string;
} {
  const configAttr = root.getAttribute('data-content-type-editor-config');
  if (configAttr) {
    try {
      return JSON.parse(configAttr);
    } catch {
      // Fall through to data attributes
    }
  }

  return {
    apiBasePath: root.dataset.apiBasePath ?? '/admin',
    contentTypeId: root.dataset.contentTypeId,
    locale: root.dataset.locale,
  };
}

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// Auto-initialize on DOM ready
onReady(() => initContentTypeEditors());

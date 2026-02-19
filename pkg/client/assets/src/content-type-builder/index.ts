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

// Re-export block library IDE
export { BlockLibraryIDE, initBlockLibraryIDE } from './block-library-ide';

// Re-export block editor panel
export { BlockEditorPanel } from './block-editor-panel';

// Re-export field palette panel (Phase 9)
export { FieldPalettePanel, PALETTE_DRAG_MIME } from './field-palette-panel';

// Re-export icon picker (shared)
export { registerIconTab, unregisterIconTab, getIconTabs, resolveIcon } from './shared/icon-picker';
export type { IconTab, IconEntry, IconPickerConfig } from './shared/icon-picker';

// =============================================================================
// Auto-initialization
// =============================================================================

import { ContentTypeEditor } from './content-type-editor';
import { initBlockLibraryIDE } from './block-library-ide';
import type { ContentTypeEditorConfig } from './types';
import { deriveAdminBasePath, resolveApiBasePath } from './shared/api-paths';

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

    const basePath = config.basePath ?? deriveAdminBasePath(config.apiBasePath);
    const activeEnvironment = String(config.environment ?? '').trim().toLowerCase();
    const envQuery = activeEnvironment && activeEnvironment !== 'default'
      ? `env=${encodeURIComponent(activeEnvironment)}`
      : '';

    // Wire default onCancel: navigate back to the content types list
    if (!config.onCancel) {
      config.onCancel = () => {
        const target = `${basePath}/content/types`;
        window.location.href = envQuery ? `${target}?${envQuery}` : target;
      };
    }

    // Wire default onSave: navigate to the saved content type's slug
    if (!config.onSave) {
      config.onSave = (saved) => {
        const slug = saved.slug ?? saved.id;
        if (slug) {
          const params = [`slug=${encodeURIComponent(slug)}`];
          if (envQuery) {
            params.push(envQuery);
          }
          window.location.href = `${basePath}/content/types?${params.join('&')}`;
        }
      };
    }

    try {
      const editor = new ContentTypeEditor(root, config);
      editor.init();
      root.dataset.initialized = 'true';
    } catch (error) {
      console.error('Content type editor failed to initialize:', error);
      root.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${error instanceof Error ? error.message : 'An unexpected error occurred while initializing the editor.'}
          </p>
          <button
            type="button"
            onclick="window.location.reload()"
            class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            Reload page
          </button>
        </div>
      `;
    }
  });
}

function parseConfig(root: HTMLElement): ContentTypeEditorConfig {
  let config: Partial<ContentTypeEditorConfig> = {};
  const configAttr = root.getAttribute('data-content-type-editor-config');
  if (configAttr) {
    try {
      config = JSON.parse(configAttr) as Partial<ContentTypeEditorConfig>;
    } catch {
      // Fall through to data attributes
    }
  }

  const apiBasePath = resolveApiBasePath(config.apiBasePath, root.dataset.apiBasePath, root.dataset.basePath);
  const basePath = config.basePath ?? deriveAdminBasePath(apiBasePath, root.dataset.basePath);

  return {
    ...config,
    apiBasePath,
    basePath,
    contentTypeId: config.contentTypeId ?? root.dataset.contentTypeId,
    environment: config.environment ?? root.dataset.environment,
    locale: config.locale ?? root.dataset.locale,
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
onReady(() => {
  initContentTypeEditors();
  initBlockLibraryIDE();
});

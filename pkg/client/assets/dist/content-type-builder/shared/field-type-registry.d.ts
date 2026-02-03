/**
 * Unified Field Type Registry
 *
 * Single source of truth for field type metadata across all surfaces
 * (Content Modeling, Block Library IDE, Field Palette).
 *
 * Loading strategy:
 *   1. Try backend grouped endpoint (categories with field types)
 *   2. Try backend flat endpoint (field type array)
 *   3. Fall back to merged local registry
 *
 * The static registry in field-type-picker.ts still owns SVG icons and
 * the canonical FIELD_TYPES array. This module wraps it with backend
 * loading and a unified async loader.
 */
import type { FieldTypeMetadata, FieldTypeCategory } from '../types';
import type { ContentTypeAPIClient } from '../api-client';
import { getFieldTypeMetadata, normalizeFieldType, getFieldTypesByCategory } from '../field-type-picker';
export interface FieldTypeRegistryCategory {
    id: FieldTypeCategory;
    label: string;
    icon: string;
    collapsed?: boolean;
}
export interface FieldTypeRegistrySource {
    categories: FieldTypeRegistryCategory[];
    fieldTypes: FieldTypeMetadata[];
}
export { getFieldTypeMetadata, normalizeFieldType, getFieldTypesByCategory };
export declare const FIELD_TYPE_REGISTRY_FALLBACK: FieldTypeRegistrySource;
/**
 * Load the field type registry from the backend with graceful fallback.
 *
 * Load strategy:
 *   1. Try grouped categories (BackendFieldTypeCategoryGroup[])
 *   2. If empty or fails, try flat array (FieldTypeMetadata[])
 *   3. Fall back to merged local registry (FIELD_TYPE_REGISTRY_FALLBACK)
 */
export declare function loadFieldTypeRegistry(api: ContentTypeAPIClient): Promise<FieldTypeRegistrySource>;
//# sourceMappingURL=field-type-registry.d.ts.map
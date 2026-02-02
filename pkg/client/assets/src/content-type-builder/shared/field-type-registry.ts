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
import { FIELD_TYPES, FIELD_CATEGORIES, getFieldTypeMetadata, normalizeFieldType, getFieldTypesByCategory } from '../field-type-picker';
import { BLOCK_FIELD_TYPE_REGISTRY_FALLBACK, buildRegistryFromGroups } from '../block-field-type-registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Re-exports (canonical lookup functions live in field-type-picker.ts)
// ---------------------------------------------------------------------------

export { getFieldTypeMetadata, normalizeFieldType, getFieldTypesByCategory };

// ---------------------------------------------------------------------------
// Merged Fallback Registry
// ---------------------------------------------------------------------------

/**
 * Merge the static FIELD_TYPES (33 types with SVG icons) and the
 * BLOCK_FIELD_TYPE_REGISTRY_FALLBACK (23 types from backend format)
 * into a single canonical fallback.
 *
 * Strategy: static FIELD_TYPES wins for overlapping type keys (it has icons).
 * Any types only in the block registry are appended.
 */
function buildMergedFallback(): FieldTypeRegistrySource {
  const staticTypes = new Map<string, FieldTypeMetadata>();
  for (const ft of FIELD_TYPES) {
    staticTypes.set(ft.type, ft);
  }

  // Add any block-registry-only types that the static registry doesn't cover
  for (const ft of BLOCK_FIELD_TYPE_REGISTRY_FALLBACK.fieldTypes) {
    if (!staticTypes.has(ft.type)) {
      staticTypes.set(ft.type, ft);
    }
  }

  // Use static categories as the base (they have richer labels)
  const categories: FieldTypeRegistryCategory[] = FIELD_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
  }));

  return {
    categories,
    fieldTypes: Array.from(staticTypes.values()),
  };
}

export const FIELD_TYPE_REGISTRY_FALLBACK: FieldTypeRegistrySource = buildMergedFallback();

// ---------------------------------------------------------------------------
// Async Loader
// ---------------------------------------------------------------------------

/**
 * Load the field type registry from the backend with graceful fallback.
 *
 * Load strategy:
 *   1. Try grouped categories (BackendFieldTypeCategoryGroup[])
 *   2. If empty or fails, try flat array (FieldTypeMetadata[])
 *   3. Fall back to merged local registry (FIELD_TYPE_REGISTRY_FALLBACK)
 */
export async function loadFieldTypeRegistry(api: ContentTypeAPIClient): Promise<FieldTypeRegistrySource> {
  // Try grouped format first
  try {
    const groups = await api.getBlockFieldTypeGroups();
    if (groups && groups.length > 0) {
      const registry = buildRegistryFromGroups(groups);
      return {
        categories: registry.categories,
        fieldTypes: registry.fieldTypes,
      };
    }
  } catch {
    // Ignore and try flat format next
  }

  // Try flat format
  try {
    const apiTypes = await api.getFieldTypes();
    if (apiTypes && apiTypes.length > 0) {
      return {
        categories: [...FIELD_TYPE_REGISTRY_FALLBACK.categories],
        fieldTypes: apiTypes,
      };
    }
  } catch {
    // Fall through to local fallback
  }

  return {
    categories: [...FIELD_TYPE_REGISTRY_FALLBACK.categories],
    fieldTypes: [...FIELD_TYPE_REGISTRY_FALLBACK.fieldTypes],
  };
}

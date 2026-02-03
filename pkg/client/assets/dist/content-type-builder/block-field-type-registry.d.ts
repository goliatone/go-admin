/**
 * Block Field Type Registry
 *
 * Maps backend block field type registry payloads to the frontend field metadata
 * used by the Block Library IDE.
 */
import type { FieldTypeCategory, FieldTypeMetadata } from './types';
export interface BackendFieldTypeDefinition {
    type: string;
    label?: string;
    description?: string;
    category?: string;
    icon?: string;
    defaults?: Record<string, unknown>;
    order?: number;
}
export interface BackendFieldTypeCategory {
    id?: string;
    label?: string;
    icon?: string;
    order?: number;
    collapsed?: boolean;
}
export interface BackendFieldTypeCategoryGroup {
    category?: BackendFieldTypeCategory;
    field_types?: BackendFieldTypeDefinition[];
}
export interface BlockFieldTypeCategory {
    id: FieldTypeCategory;
    label: string;
    icon: string;
    collapsed?: boolean;
}
export interface BlockFieldTypeRegistry {
    categories: BlockFieldTypeCategory[];
    fieldTypes: FieldTypeMetadata[];
}
export declare function buildRegistryFromGroups(groups: BackendFieldTypeCategoryGroup[]): BlockFieldTypeRegistry;
export declare const BLOCK_FIELD_TYPE_REGISTRY_FALLBACK: BlockFieldTypeRegistry;
//# sourceMappingURL=block-field-type-registry.d.ts.map
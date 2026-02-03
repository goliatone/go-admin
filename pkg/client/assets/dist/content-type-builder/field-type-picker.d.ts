/**
 * Field Type Picker
 *
 * Modal/drawer UI for selecting a field type when adding new fields.
 */
import type { FieldType, FieldTypeMetadata, FieldTypeCategory, FieldTypePickerConfig } from './types';
import { Modal } from '../shared/modal';
export declare function iconForKey(key: string): string;
export declare function normalizeFieldType(type: string): FieldType;
export declare const FIELD_TYPES: FieldTypeMetadata[];
export declare const FIELD_CATEGORIES: {
    id: FieldTypeCategory;
    label: string;
    icon: string;
}[];
export declare function getFieldTypeMetadata(type: FieldType): FieldTypeMetadata | undefined;
export declare function getFieldTypesByCategory(category: FieldTypeCategory): FieldTypeMetadata[];
export declare class FieldTypePicker extends Modal {
    private config;
    private selectedCategory;
    private searchQuery;
    constructor(config: FieldTypePickerConfig);
    protected onBeforeHide(): boolean;
    protected renderContent(): string;
    private renderCategories;
    private renderFieldTypes;
    private renderFieldTypeCard;
    protected bindContentEvents(): void;
    private updateView;
}
//# sourceMappingURL=field-type-picker.d.ts.map
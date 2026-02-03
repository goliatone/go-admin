type BlockEditorConfig = {
    sortable?: boolean;
    addLabel?: string;
    emptyLabel?: string;
    allowDrag?: boolean;
    dragFromHeader?: boolean;
    enableTouch?: boolean;
    enableAnimations?: boolean;
    enableCrossEditor?: boolean;
    schemaVersionPattern?: string;
    requiredFields?: Record<string, string[]>;
    validateOnInput?: boolean;
    legacyBlocks?: any[];
    showConflicts?: boolean;
};
export type BlockLibraryPickerConfig = BlockEditorConfig & {
    apiBase?: string;
    allowedBlocks?: string[];
    maxBlocks?: number;
    groupByCategory?: boolean;
    searchable?: boolean;
    lazyLoad?: boolean;
    includeInactive?: boolean;
};
export type BlockDefinitionMeta = {
    slug: string;
    label: string;
    icon?: string;
    category?: string;
    description?: string;
    schema_version?: string;
    required_fields?: string[];
    status?: string;
    disabled?: boolean;
};
export declare function initBlockLibraryPickers(scope?: ParentNode): Promise<void>;
export {};
//# sourceMappingURL=block_library_picker.d.ts.map
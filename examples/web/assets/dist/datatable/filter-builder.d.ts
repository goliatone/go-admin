/**
 * FilterBuilder Component
 *
 * Manages complex filter groups with AND/OR logic between conditions and groups.
 * Renders a UI similar to query builders with drag-and-drop reordering.
 */
import type { FilterStructure } from './behaviors/types.js';
import type { ToastNotifier } from '../toast/types.js';
export interface FieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    operators?: string[];
    options?: {
        label: string;
        value: string;
    }[];
}
export interface FilterBuilderConfig {
    fields: FieldDefinition[];
    onApply: (structure: FilterStructure) => void;
    onClear: () => void;
    notifier?: ToastNotifier;
}
export declare class FilterBuilder {
    private config;
    private structure;
    private panel;
    private container;
    private previewElement;
    private sqlPreviewElement;
    private overlay;
    private notifier;
    constructor(config: FilterBuilderConfig);
    private init;
    private buildPanelStructure;
    private bindActions;
    private addGroup;
    private createEmptyCondition;
    private render;
    private createGroupElement;
    private createConditionElement;
    private renderValueInput;
    private createConditionConnector;
    private createGroupConnector;
    private bindGroupEvents;
    private addCondition;
    private removeCondition;
    private removeGroup;
    private getOperatorsForField;
    private updatePreview;
    private hasActiveFilters;
    private generateSQLPreview;
    private generateTextPreview;
    private applyFilters;
    private clearAll;
    private clearFilters;
    private saveFilter;
    private getSavedFilters;
    private toggle;
    private open;
    private close;
    private restoreFromURL;
    private convertLegacyFilters;
    getStructure(): FilterStructure;
    setStructure(structure: FilterStructure): void;
}
//# sourceMappingURL=filter-builder.d.ts.map
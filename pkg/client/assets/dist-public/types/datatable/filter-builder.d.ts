/**
 * FilterBuilder Component
 *
 * Manages the shared two-level filter structure in either the legacy overlay
 * or a caller-owned compact host. Overlay mode remains the default.
 */
import type { FilterStructure } from './behaviors/types.js';
import type { ToastNotifier } from '../toast/types.js';
export type FilterBuilderMode = 'overlay' | 'compact';
export type FilterBuilderElementTarget = string | HTMLElement;
export interface FilterBuilderOperatorOption {
    label: string;
    value: string;
}
export interface FilterBuilderFieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    operators?: Array<string | FilterBuilderOperatorOption>;
    options?: {
        label: string;
        value: string;
    }[];
    group?: string;
    disabled?: boolean;
    disabledReason?: string;
}
export interface FilterBuilderChromeConfig {
    header?: boolean;
    title?: string;
    savedFilters?: boolean;
    sqlPreview?: boolean;
}
export interface FilterBuilderActionsConfig {
    apply?: boolean;
    clear?: boolean;
    save?: boolean;
}
export interface FilterBuilderConfig {
    fields: FilterBuilderFieldDefinition[];
    onApply?: (structure: FilterStructure) => void;
    onClear?: () => void;
    onChange?: (structure: FilterStructure) => void;
    notifier?: ToastNotifier;
    mode?: FilterBuilderMode;
    host?: FilterBuilderElementTarget;
    toggleButton?: FilterBuilderElementTarget;
    overlay?: FilterBuilderElementTarget;
    previewElement?: FilterBuilderElementTarget;
    initialStructure?: FilterStructure;
    chrome?: boolean | FilterBuilderChromeConfig;
    actions?: boolean | FilterBuilderActionsConfig;
    restoreFromURL?: boolean;
}
export declare class FilterBuilder {
    private readonly config;
    private readonly mode;
    private readonly chrome;
    private readonly actions;
    private readonly instanceID;
    private readonly notifier;
    private readonly cleanupListeners;
    private structure;
    private panel;
    private root;
    private container;
    private previewElement;
    private sqlPreviewElement;
    private overlay;
    private toggleButton;
    private appliedPreviewContainer;
    private ownsPanelID;
    private previousPanelInstance;
    private previousToggleAriaControls;
    private previousToggleAriaExpanded;
    private destroyed;
    constructor(config: FilterBuilderConfig);
    private resolveChrome;
    private resolveActions;
    private init;
    private buildPanelStructure;
    private bindOwnedListeners;
    private listen;
    private handleClick;
    private handleChange;
    private handleInput;
    private createDefaultStructure;
    private normalizeStructure;
    private createEmptyCondition;
    private render;
    private renderGroup;
    private renderCondition;
    private renderFieldOptions;
    private renderValueInput;
    private renderGroupConnector;
    private addGroup;
    private addCondition;
    private setGroupLogicAndAddCondition;
    private removeCondition;
    private removeGroup;
    private setGroupConnector;
    private focusConditionPart;
    private getField;
    private getOperatorsForField;
    private updatePreview;
    private hasActiveFilters;
    private generateSQLPreview;
    private generateTextPreview;
    private joinGroups;
    private emitChange;
    private applyFilters;
    private clearAll;
    private clearFilters;
    private saveFilter;
    private getSavedFilters;
    private toggle;
    open(): void;
    close(returnFocus?: boolean): void;
    private restoreFromURL;
    private convertLegacyFilters;
    getStructure(): FilterStructure;
    setStructure(structure: FilterStructure, notify?: boolean): void;
    destroy(): void;
}
//# sourceMappingURL=filter-builder.d.ts.map
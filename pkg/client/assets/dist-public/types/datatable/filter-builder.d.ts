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
export interface FilterBuilderLimitsConfig {
    maxGroups?: number;
    maxConditionsPerGroup?: number;
    maxTotalConditions?: number;
}
export interface FilterBuilderMessages {
    filtersTitle: string;
    savedFilters: string;
    editAsSQL: string;
    previewLabel: string;
    noFiltersApplied: string;
    filterName: string;
    filterNamePlaceholder: string;
    saveFilter: string;
    clearAll: string;
    applyFilter: string;
    addFilterGroup: string;
    removeGroup: string;
    dragToReorder: string;
    selectValue: string;
    enterValue: string;
    unavailable: string;
    and: string;
    or: string;
    operatorContains: string;
    operatorIs: string;
    operatorIsNot: string;
    operatorEquals: string;
    operatorNotEquals: string;
    operatorGreaterThan: string;
    operatorLessThan: string;
    operatorGreaterThanOrEqual: string;
    operatorLessThanOrEqual: string;
    operatorBefore: string;
    operatorAfter: string;
    removeGroupLabel: (group: number) => string;
    addConditionLabel: (logic: string, group: number) => string;
    unavailableOperatorOption: (operator: string) => string;
    missingFieldReason: (field: string) => string;
    disabledFieldReason: (field: string) => string;
    missingOperatorReason: (operator: string, field: string) => string;
    missingValueReason: (value: string, field: string) => string;
    fieldControlLabel: (group: number, condition: number) => string;
    operatorControlLabel: (group: number, condition: number) => string;
    valueControlLabel: (group: number, condition: number) => string;
    removeConditionLabel: (condition: number) => string;
    addLogicConditionLabel: (logic: string) => string;
    unavailableFieldOption: (field: string) => string;
    disabledFieldOption: (field: string, reason: string) => string;
    unavailableValueOption: (value: string) => string;
    groupConnectorLabel: (leftGroup: number, rightGroup: number) => string;
    unavailableFieldPreview: (field: string) => string;
    unavailableValuePreview: (value: string) => string;
    saveNameRequired: string;
    filterSaved: (name: string) => string;
    groupLimitReached: (limit: number) => string;
    conditionsPerGroupLimitReached: (limit: number) => string;
    totalConditionsLimitReached: (limit: number) => string;
    structureExceedsLimits: (reasons: string[]) => string;
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
    messages?: Partial<FilterBuilderMessages>;
    limits?: FilterBuilderLimitsConfig;
    restoreFromURL?: boolean;
}
export declare class FilterBuilder {
    private readonly config;
    private readonly mode;
    private readonly chrome;
    private readonly actions;
    private readonly messages;
    private readonly limits;
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
    private resolveLimits;
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
    private totalConditions;
    private addGroupLimitReason;
    private addConditionLimitReason;
    private structureLimitReasons;
    private updateLimitState;
    private render;
    private renderGroup;
    private renderCondition;
    private renderFieldOptions;
    private renderValueInput;
    private isValueAvailable;
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
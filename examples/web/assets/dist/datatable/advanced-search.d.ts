/**
 * Advanced Search Component
 * Provides a query builder UI for complex search queries
 */
export interface SearchCriterion {
    field: string;
    operator: string;
    value: string | number;
    logic?: 'and' | 'or';
}
export interface AdvancedSearchConfig {
    fields: FieldDefinition[];
    onSearch: (criteria: SearchCriterion[]) => void;
    onClear: () => void;
}
export interface FieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date';
    operators?: string[];
    options?: {
        label: string;
        value: string;
    }[];
}
export declare class AdvancedSearch {
    private config;
    private criteria;
    private modal;
    private container;
    private searchInput;
    private clearBtn;
    constructor(config: AdvancedSearchConfig);
    init(): void;
    /**
     * Restore advanced search criteria from URL
     */
    private restoreCriteriaFromURL;
    /**
     * Push criteria to URL
     */
    private pushCriteriaToURL;
    private bindEvents;
    private bindClearButton;
    open(): void;
    close(): void;
    addCriterion(criterion?: Partial<SearchCriterion>): void;
    removeCriterion(index: number): void;
    private renderCriteria;
    private createCriterionRow;
    private createValueInput;
    private createLogicConnector;
    private updateCriterion;
    private getOperatorsForField;
    private applySearch;
    private savePreset;
    private loadPreset;
    private loadPresetsFromStorage;
    getCriteria(): SearchCriterion[];
    setCriteria(criteria: SearchCriterion[]): void;
    /**
     * Render filter chips in the search input
     */
    renderChips(): void;
    /**
     * Create a single filter chip
     */
    private createChip;
    /**
     * Remove a chip and update filters
     */
    private removeChip;
    /**
     * Clear all chips
     */
    clearAllChips(): void;
}
//# sourceMappingURL=advanced-search.d.ts.map
/**
 * Translation Panel Controller
 *
 * Controls a collapsible translation toolbar panel with persisted state and
 * grouped controls visibility synchronized to the current view mode.
 */
export type TranslationPanelViewMode = 'flat' | 'grouped' | 'matrix';
export interface TranslationPanelConfig {
    /** Toggle button element id */
    toggleButtonId: string;
    /** Panel container id */
    panelId: string;
    /** Expand-all button id */
    expandAllBtnId?: string;
    /** Collapse-all button id */
    collapseAllBtnId?: string;
    /** Group controls wrapper id */
    groupControlsId?: string;
    /** Selector for view mode buttons */
    viewModeSelector: string;
    /** localStorage key for expanded state */
    storageKey?: string;
}
export declare class TranslationPanel {
    private config;
    private toggleButton;
    private panelElement;
    private expandAllButton;
    private collapseAllButton;
    private groupControls;
    private viewModeButtons;
    private expanded;
    private boundToggleHandler;
    constructor(config: TranslationPanelConfig);
    init(): void;
    toggle(): void;
    expand(): void;
    collapse(): void;
    isExpanded(): boolean;
    onViewModeChange(mode: TranslationPanelViewMode): void;
    destroy(): void;
    private setExpanded;
    private getPersistedExpandedState;
    private persistExpandedState;
    private dispatchToggleEvent;
    private dispatchViewModeEvent;
}
export declare function createTranslationPanel(config: TranslationPanelConfig): TranslationPanel;
//# sourceMappingURL=translation-panel.d.ts.map
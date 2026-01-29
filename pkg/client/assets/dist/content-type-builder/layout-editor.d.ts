/**
 * Layout Editor
 *
 * Modal/drawer UI for configuring content type layout with tabs/sections and grid settings.
 */
import type { UILayoutConfig, FieldDefinition } from './types';
export interface LayoutEditorConfig {
    layout: UILayoutConfig;
    fields: FieldDefinition[];
    onSave: (layout: UILayoutConfig) => void;
    onCancel: () => void;
}
export declare class LayoutEditor {
    private config;
    private container;
    private backdrop;
    private layout;
    private dragState;
    constructor(config: LayoutEditorConfig);
    /**
     * Show the layout editor modal
     */
    show(): void;
    /**
     * Hide the layout editor modal
     */
    hide(): void;
    private render;
    private renderLayoutTypeSection;
    private renderGridSection;
    private renderTabsSection;
    private renderTabRow;
    private renderFieldAssignment;
    private bindEvents;
    private bindTabEvents;
    private addTab;
    private removeTab;
    private moveTab;
    private updateTabsFromForm;
    private updateView;
    private handleSave;
}
//# sourceMappingURL=layout-editor.d.ts.map
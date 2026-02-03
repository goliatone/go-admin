/**
 * Layout Editor
 *
 * Modal/drawer UI for configuring content type layout with tabs/sections and grid settings.
 */
import type { UILayoutConfig, FieldDefinition } from './types';
import { Modal } from '../shared/modal';
export interface LayoutEditorConfig {
    layout: UILayoutConfig;
    fields: FieldDefinition[];
    onSave: (layout: UILayoutConfig) => void;
    onCancel: () => void;
}
export declare class LayoutEditor extends Modal {
    private config;
    private layout;
    private dragState;
    constructor(config: LayoutEditorConfig);
    protected onBeforeHide(): boolean;
    protected renderContent(): string;
    private renderLayoutTypeSection;
    private renderGridSection;
    private renderTabsSection;
    private renderTabRow;
    private renderFieldAssignment;
    protected bindContentEvents(): void;
    private bindTabEvents;
    private addTab;
    private removeTab;
    private moveTab;
    private updateTabsFromForm;
    private updateView;
    private handleSave;
    private showLayoutError;
}
//# sourceMappingURL=layout-editor.d.ts.map
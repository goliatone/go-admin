/**
 * Action System for DataGrid
 * Provides extensible row and bulk action capabilities
 */
export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
export interface ActionButton {
    label: string;
    icon?: string;
    action: (record: any) => void | Promise<void>;
    condition?: (record: any) => boolean;
    variant?: ActionVariant;
    className?: string;
}
export interface BulkActionConfig {
    id: string;
    label: string;
    icon?: string;
    endpoint: string;
    method?: 'POST' | 'PUT' | 'DELETE';
    confirm?: string;
    guard?: (selectedIds: string[]) => boolean;
    onSuccess?: (response: any) => void;
    onError?: (error: Error) => void;
}
export declare class ActionRenderer {
    private actionBasePath;
    constructor(actionBasePath?: string);
    /**
     * Render row actions as HTML
     */
    renderRowActions(record: any, actions: ActionButton[]): string;
    /**
     * Render default actions (view, edit, delete)
     */
    renderDefaultActions(record: any, basePath: string): string;
    /**
     * Attach event listeners for row actions
     */
    attachRowActionListeners(container: HTMLElement, actions: ActionButton[], records: Record<string, any>): void;
    /**
     * Render bulk actions toolbar
     */
    renderBulkActionsToolbar(bulkActions: BulkActionConfig[]): HTMLElement;
    /**
     * Execute bulk action
     */
    executeBulkAction(config: BulkActionConfig, selectedIds: string[]): Promise<void>;
    private getVariantClass;
    private renderIcon;
    private sanitize;
}
//# sourceMappingURL=actions.d.ts.map
/**
 * Action System for DataGrid
 * Provides extensible row and bulk action capabilities
 */
import type { ToastNotifier } from '../toast/types.js';
export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
export type ActionRenderMode = 'inline' | 'dropdown';
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
    payload?: Record<string, unknown>;
    payloadRequired?: string[];
    payloadSchema?: Record<string, unknown>;
}
export interface ActionRendererConfig {
    mode?: ActionRenderMode;
    actionBasePath?: string;
    notifier?: ToastNotifier;
}
export declare class ActionRenderer {
    private actionBasePath;
    private mode;
    private notifier;
    constructor(config?: ActionRendererConfig);
    /**
     * Render row actions as HTML
     */
    renderRowActions(record: any, actions: ActionButton[]): string;
    /**
     * Render row actions as dropdown menu
     */
    private renderRowActionsDropdown;
    /**
     * Build dropdown menu items HTML
     */
    private buildDropdownItems;
    /**
     * Determine if divider should be shown before action
     */
    private shouldShowDivider;
    /**
     * Render three-dot vertical icon
     */
    private renderDotsIcon;
    /**
     * Render default actions (view, edit, delete)
     * NOTE: This method is deprecated - default actions are now handled in core.ts
     * Kept for backward compatibility
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
    private resolveBulkActionPayload;
    private collectRequiredFields;
    private normalizePayloadSchema;
    private requestRequiredFields;
    private buildSchemaOptions;
    private stringifyPromptDefault;
    private coercePromptValue;
    private isEmptyPayloadValue;
    private buildBulkSuccessMessage;
    private getVariantClass;
    private renderIcon;
    private sanitize;
    private escapeHtml;
}
//# sourceMappingURL=actions.d.ts.map
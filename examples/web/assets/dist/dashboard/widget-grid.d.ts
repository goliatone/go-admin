/**
 * WidgetGrid - Main component for dashboard widget management
 * Supports drag & drop, resize, visibility toggle, and layout persistence
 */
import type { WidgetGridConfig } from './types.js';
export declare class WidgetGrid {
    private config;
    private behaviors;
    private container;
    private saveTimer;
    private statusElement;
    constructor(config: WidgetGridConfig);
    init(serverState?: any): Promise<void>;
    private validateHydration;
    private initializeDragDrop;
    private attachEventListeners;
    private saveLayout;
    private serializeLayout;
    private serializeRows;
    private updateStatus;
    destroy(): void;
}
//# sourceMappingURL=widget-grid.d.ts.map
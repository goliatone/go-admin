/**
 * Block Library Manager
 *
 * UI component for managing block definitions (CRUD operations).
 * Supports both management mode (full CRUD) and picker mode (selection only).
 */
import type { BlockLibraryManagerConfig } from './types';
import { Modal } from '../shared/modal.js';
export declare class BlockLibraryManager extends Modal {
    private config;
    private api;
    private state;
    private categories;
    constructor(config: BlockLibraryManagerConfig);
    protected onBeforeHide(): boolean;
    protected onAfterShow(): Promise<void>;
    protected renderContent(): string;
    protected bindContentEvents(): void;
    private loadBlocks;
    private loadCategories;
    private refreshCategoriesFromBlocks;
    private renderCategoryOptions;
    private renderBlockList;
    private renderBlockCard;
    private getStatusBadge;
    private getFilteredBlocks;
    private blockKey;
    private blockInList;
    private isBlockAllowed;
    private showBlockEditor;
    private confirmDeleteBlock;
    private cloneBlock;
    private publishBlock;
    private showVersionHistory;
    private showError;
}
export declare function initBlockLibraryManagers(scope?: ParentNode): void;
//# sourceMappingURL=block-library-manager.d.ts.map
/**
 * Block Library Manager
 *
 * UI component for managing block definitions (CRUD operations).
 * Supports both management mode (full CRUD) and picker mode (selection only).
 */
import type { BlockLibraryManagerConfig } from './types';
export declare class BlockLibraryManager {
    private config;
    private api;
    private state;
    private container;
    private backdrop;
    private categories;
    constructor(config: BlockLibraryManagerConfig);
    /**
     * Show the block library manager
     */
    show(): Promise<void>;
    /**
     * Hide the block library manager
     */
    hide(): void;
    private render;
    private bindEvents;
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
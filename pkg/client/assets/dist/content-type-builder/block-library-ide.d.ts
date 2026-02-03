/**
 * Block Library IDE
 *
 * Full-page Block Library IDE controller for the three-column layout.
 * Phase 7: Block List Panel (left column)
 * Phase 8: Block Editor Panel (center column) — metadata, field cards, sections
 */
import type { BlockDefinition } from './types';
export declare class BlockLibraryIDE {
    private root;
    private api;
    private state;
    private listEl;
    private searchInput;
    private categorySelect;
    private countEl;
    private createBtn;
    private editorEl;
    private paletteEl;
    private activeMenu;
    private editorPanel;
    private palettePanel;
    private autosaveTimers;
    private static readonly AUTOSAVE_DELAY;
    private boundVisibilityChange;
    private boundBeforeUnload;
    private sidebarEl;
    private paletteAsideEl;
    private sidebarToggleBtn;
    private gridEl;
    private addFieldBar;
    private paletteTriggerBtn;
    private sidebarCollapsed;
    private mediaQueryLg;
    private popoverPalettePanel;
    private envSelectEl;
    private currentEnvironment;
    constructor(root: HTMLElement);
    init(): Promise<void>;
    /** Initialize the field palette panel (Phase 9) */
    private initPalette;
    /** Set up global listeners for autosave: Ctrl+S, visibility change, beforeunload */
    private bindAutosaveListeners;
    /** Persist a dirty block to the backend */
    saveBlock(blockId: string): Promise<boolean>;
    /** Schedule an autosave after the debounce delay */
    private scheduleSave;
    /** Cancel a pending autosave for a block */
    private cancelScheduledSave;
    /** Save the currently selected block immediately */
    private saveCurrentBlock;
    /** Save all dirty blocks (used on visibility change) */
    private saveAllDirty;
    /** Notify the editor panel of a save state change */
    private notifySaveState;
    /** Handle status changes from the editor dropdown (publish/deprecate flow) */
    private handleEditorStatusChange;
    /** Set up media query listeners and responsive behaviors */
    private bindResponsive;
    /** React to viewport breakpoint changes */
    private handleBreakpointChange;
    /** Toggle the left sidebar collapsed state */
    private toggleSidebar;
    /** Open the field palette as a popover overlay (< lg screens) */
    private openPalettePopover;
    /** Close the palette popover if open */
    private closePalettePopover;
    /** Show or hide the "Add Field" bar based on whether a block is selected */
    private updateAddFieldBar;
    /** Initialize environment from URL param and session, bind selector */
    private initEnvironment;
    /** Change the active environment and reload data */
    private setEnvironment;
    /** Update the ?env= query parameter in the URL without a page reload */
    private updateUrlEnvironment;
    /** Ensure the environment select contains a specific option */
    private ensureEnvironmentOption;
    private promptForEnvironment;
    getSelectedBlock(): BlockDefinition | null;
    selectBlock(blockId: string | null): void;
    markDirty(blockId: string): void;
    markClean(blockId: string): void;
    markSaving(blockId: string): void;
    markSaveError(blockId: string, error: string): void;
    refreshBlocks(): Promise<void>;
    private bindDOM;
    private bindEvents;
    private loadBlocks;
    private loadCategories;
    private refreshCategoriesFromBlocks;
    private normalizeCategory;
    private mergeCategories;
    private loadUserCategories;
    private persistUserCategories;
    private addCategory;
    private updateCreateCategorySelect;
    private promptForCategory;
    private renderBlockList;
    private renderBlockItem;
    private renderCreateForm;
    private renderContextMenu;
    private closeContextMenu;
    private renderCategoryOptions;
    private updateCount;
    private updateBlockIndicator;
    private renderEditor;
    private handleEditorMetadataChange;
    private handleEditorSchemaChange;
    /** Handle adding a field from the palette (Phase 9 — click or drop) */
    private handlePaletteAddField;
    private getFilteredBlocks;
    private handleListClick;
    private handleAction;
    private showCreateForm;
    private cancelCreate;
    private handleCreateSave;
    private showCreateError;
    private startRename;
    private commitRename;
    private cancelRename;
    private duplicateBlock;
    private publishBlock;
    private deprecateBlock;
    private deleteBlock;
    /** Update a single block item in the sidebar DOM without re-rendering the entire list */
    private updateBlockItemDOM;
    private updateBlockInState;
    private normalizeBlockDefinition;
    private mergeBlockDefinition;
    private mergeSchemaExtras;
    private showToast;
}
export declare function initBlockLibraryIDE(scope?: ParentNode): void;
//# sourceMappingURL=block-library-ide.d.ts.map
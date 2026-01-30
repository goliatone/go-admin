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
    constructor(root: HTMLElement);
    init(): Promise<void>;
    /** Initialize the field palette panel (Phase 9) */
    private initPalette;
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
    private updateBlockInState;
    private showToast;
}
export declare function initBlockLibraryIDE(scope?: ParentNode): void;
//# sourceMappingURL=block-library-ide.d.ts.map
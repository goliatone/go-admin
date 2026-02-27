import { MenuBuilderStore } from './store.js';
import type { EntryNavigationConfig, EntryNavigationState } from './types.js';
interface MenuBuilderUIConfig {
    basePath: string;
    apiBasePath: string;
    initialMenuID?: string;
}
export declare class MenuBuilderUI {
    private readonly root;
    private readonly config;
    private readonly store;
    private state;
    private dragItemID;
    constructor(root: HTMLElement, config: MenuBuilderUIConfig);
    init(): Promise<void>;
    destroy(): void;
    private readonly onClick;
    private readonly onChange;
    private readonly onDragStart;
    private readonly onDragOver;
    private readonly onDragLeave;
    private readonly onDrop;
    private readonly onDragEnd;
    private render;
    private renderMenuCard;
    private renderTree;
    private renderTreeNode;
    private renderTargetFields;
    private renderBindingList;
    private findItemByID;
    private syncSelectedProfile;
    private showError;
    private formatError;
}
export declare class EntryNavigationOverrideUI {
    private readonly root;
    private readonly store;
    private readonly contentType;
    private readonly recordID;
    private readonly config;
    private state;
    constructor(root: HTMLElement, store: MenuBuilderStore, contentType: string, recordID: string, config: EntryNavigationConfig, state: EntryNavigationState);
    init(): void;
    destroy(): void;
    private readonly onChange;
    private readonly onClick;
    private saveOverrides;
    private render;
}
export declare function initMenuBuilder(root: HTMLElement): Promise<MenuBuilderUI>;
export declare function initEntryNavigationOverrides(root: HTMLElement): Promise<EntryNavigationOverrideUI | null>;
export {};
//# sourceMappingURL=editor.d.ts.map
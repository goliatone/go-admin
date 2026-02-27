import { MenuBuilderAPIClient, type MenuPreviewRequest } from './api-client.js';
import type { MenuBindingRecord, MenuBuilderState, MenuItemNode, MenuRecord, MenuViewProfileRecord, NavigationOverrideValue } from './types.js';
export declare class MenuBuilderStore extends EventTarget {
    private readonly client;
    private state;
    constructor(client: MenuBuilderAPIClient);
    snapshot(): MenuBuilderState;
    initialize(): Promise<void>;
    refreshMenus(): Promise<void>;
    selectMenu(menuID: string): Promise<void>;
    createMenu(input: Partial<MenuRecord>): Promise<void>;
    updateMenu(input: Partial<MenuRecord>): Promise<void>;
    setPublishState(publish: boolean): Promise<void>;
    cloneSelectedMenu(nextCode: string): Promise<void>;
    archiveSelectedMenu(archived: boolean): Promise<void>;
    setDraftItems(items: MenuItemNode[]): void;
    addRootItem(): void;
    updateItem(itemID: string, update: Partial<MenuItemNode>): void;
    removeItem(itemID: string): void;
    addChild(parentID: string): void;
    moveItem(itemID: string, targetID: string, mode: 'before' | 'after' | 'inside'): void;
    saveItems(): Promise<void>;
    refreshBindings(): Promise<void>;
    upsertBinding(location: string, input: Partial<MenuBindingRecord>): Promise<void>;
    refreshProfiles(): Promise<void>;
    createProfile(input: Partial<MenuViewProfileRecord>): Promise<void>;
    updateProfile(code: string, input: Partial<MenuViewProfileRecord>): Promise<void>;
    deleteProfile(code: string): Promise<void>;
    publishProfile(code: string, publish: boolean): Promise<void>;
    preview(input: MenuPreviewRequest): Promise<void>;
    patchEntryNavigation(contentType: string, recordID: string, overrides: Record<string, NavigationOverrideValue>, allowedLocations: string[]): Promise<{
        overrides: Record<string, NavigationOverrideValue>;
        effective_visibility: Record<string, boolean>;
    }>;
    resolveTarget(item: MenuItemNode): {
        url: string;
        valid: boolean;
        message: string;
    };
    private mapItems;
    private validateItems;
    private setState;
}
//# sourceMappingURL=store.d.ts.map
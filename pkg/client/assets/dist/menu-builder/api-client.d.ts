import type { MenuBindingRecord, MenuBuilderContracts, MenuItemNode, MenuPreviewResult, MenuRecord, MenuViewProfileRecord, NavigationOverrideValue } from './types.js';
export declare class MenuBuilderAPIError extends Error {
    readonly status: number;
    readonly textCode: string;
    readonly metadata: Record<string, unknown>;
    constructor(message: string, status?: number, textCode?: string, metadata?: Record<string, unknown>);
}
export interface MenuBuilderAPIClientConfig {
    basePath: string;
    contractsPath?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
}
export interface MenuPreviewRequest {
    menuId: string;
    location?: string;
    locale?: string;
    view_profile?: string;
    include_drafts?: boolean;
    preview_token?: string;
}
export declare class MenuBuilderAPIClient {
    private readonly config;
    private contracts;
    constructor(config: MenuBuilderAPIClientConfig);
    loadContracts(force?: boolean): Promise<MenuBuilderContracts>;
    listMenus(): Promise<MenuRecord[]>;
    getMenu(id: string): Promise<{
        menu: MenuRecord;
        items: MenuItemNode[];
    }>;
    createMenu(input: Partial<MenuRecord>): Promise<MenuRecord>;
    updateMenu(id: string, input: Partial<MenuRecord>): Promise<MenuRecord>;
    publishMenu(id: string, publish: boolean): Promise<MenuRecord>;
    cloneMenu(id: string, code: string): Promise<MenuRecord>;
    archiveMenu(id: string, archived: boolean): Promise<MenuRecord>;
    upsertMenuItems(id: string, items: MenuItemNode[]): Promise<MenuItemNode[]>;
    previewMenu(input: MenuPreviewRequest): Promise<MenuPreviewResult>;
    listBindings(): Promise<MenuBindingRecord[]>;
    upsertBinding(location: string, input: Partial<MenuBindingRecord>): Promise<MenuBindingRecord>;
    listProfiles(): Promise<MenuViewProfileRecord[]>;
    createProfile(input: Partial<MenuViewProfileRecord>): Promise<MenuViewProfileRecord>;
    updateProfile(code: string, input: Partial<MenuViewProfileRecord>): Promise<MenuViewProfileRecord>;
    deleteProfile(code: string): Promise<void>;
    publishProfile(code: string, publish: boolean): Promise<MenuViewProfileRecord>;
    patchEntryNavigation(contentType: string, recordID: string, overrides: Record<string, NavigationOverrideValue>, allowedLocations?: string[]): Promise<{
        overrides: Record<string, NavigationOverrideValue>;
        effective_visibility: Record<string, boolean>;
    }>;
    private fetchFromEndpoint;
    private fetchJSON;
}
//# sourceMappingURL=api-client.d.ts.map
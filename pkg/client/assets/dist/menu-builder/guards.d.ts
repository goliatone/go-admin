import type { ContentNavigationContracts, MenuBindingRecord, MenuBuilderContracts, MenuItemNode, MenuItemTarget, MenuPreviewResult, MenuRecord, MenuViewProfileRecord, NavigationOverrideValue } from './types.js';
export declare function parseMenuContracts(raw: unknown): MenuBuilderContracts;
export declare function parseContentNavigationContracts(raw: unknown): ContentNavigationContracts | undefined;
export declare function parseMenuRecord(raw: unknown): MenuRecord;
export declare function parseMenuBindingRecord(raw: unknown): MenuBindingRecord;
export declare function parseMenuViewProfileRecord(raw: unknown): MenuViewProfileRecord;
export declare function parseMenuItemTarget(raw: unknown): MenuItemTarget | undefined;
export declare function parseMenuItemNode(raw: unknown, context?: string): MenuItemNode;
export declare function parseMenuPreviewResult(raw: unknown): MenuPreviewResult;
export declare function parseNavigationOverrides(raw: unknown, allowedLocations?: string[]): Record<string, NavigationOverrideValue>;
//# sourceMappingURL=guards.d.ts.map
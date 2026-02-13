import type { PermissionsSnapshot, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the permissions panel
 */
export type PermissionsPanelOptions = PanelOptions & {
    /** Whether to show the raw JSON section. Defaults to true. */
    showRawJSON?: boolean;
    /** Whether to show the collapsible details. Defaults to true. */
    showCollapsible?: boolean;
};
/**
 * Render the permissions panel
 *
 * @param data - Permissions snapshot data
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the permissions panel
 */
export declare function renderPermissionsPanel(data: PermissionsSnapshot, styles: StyleConfig, options?: PermissionsPanelOptions): string;
/**
 * Render a compact version for toolbar
 */
export declare function renderPermissionsPanelCompact(data: PermissionsSnapshot, styles: StyleConfig): string;
//# sourceMappingURL=permissions.d.ts.map
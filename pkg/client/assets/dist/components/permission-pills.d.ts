type ActionConfig = {
    initial: string;
    bg: string;
    text: string;
    border: string;
};
type PermissionPillsOptions = {
    maxVisible?: number;
};
export declare const actionConfig: Record<string, ActionConfig>;
export declare function togglePermissions(containerId: string): void;
declare global {
    interface Window {
        togglePermissions?: (containerId: string) => void;
    }
}
export declare function permissionPillsRenderer(value: unknown, options?: PermissionPillsOptions): string;
export declare function permissionPills(options?: PermissionPillsOptions): (value: unknown) => string;
export default permissionPillsRenderer;
//# sourceMappingURL=permission-pills.d.ts.map
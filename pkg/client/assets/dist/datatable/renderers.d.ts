/**
 * Cell Renderers for DataGrid
 * Provides extensible cell rendering capabilities
 */
export type CellRenderer = (value: any, record: any, column: string) => string;
export declare class CellRendererRegistry {
    private renderers;
    constructor();
    /**
     * Register a custom renderer for a column
     */
    register(column: string, renderer: CellRenderer): void;
    /**
     * Get renderer for a column (fallback to default)
     */
    get(column: string): CellRenderer;
    /**
     * Check if a custom renderer exists
     */
    has(column: string): boolean;
    /**
     * Default renderer - just returns the value as string
     */
    private defaultRenderer;
    /**
     * Register built-in renderers
     */
    private registerDefaultRenderers;
}
/**
 * Pre-built cell renderers for common use cases
 */
export declare const CommonRenderers: {
    /**
     * Status badge renderer with custom colors
     */
    statusBadge: (_colorMap?: Record<string, string>) => CellRenderer;
    /**
     * Role badge renderer with color mapping
     */
    roleBadge: (_colorMap?: Record<string, string>) => CellRenderer;
    /**
     * Combined name+email renderer
     */
    userInfo: (value: any, record: any) => string;
    /**
     * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
     */
    booleanChip: (options?: {
        trueLabel?: string;
        falseLabel?: string;
    }) => CellRenderer;
    /**
     * Relative time renderer (e.g., "2 hours ago")
     */
    relativeTime: (value: any) => string;
    /**
     * Locale badge renderer - shows current locale with fallback indicator
     */
    localeBadge: (value: unknown, record: Record<string, unknown>, column: string) => string;
    /**
     * Translation status renderer - shows locale + available locales
     */
    translationStatus: (value: unknown, record: Record<string, unknown>, column: string) => string;
    /**
     * Compact translation status for smaller cells
     */
    translationStatusCompact: (value: unknown, record: Record<string, unknown>, column: string) => string;
};
//# sourceMappingURL=renderers.d.ts.map
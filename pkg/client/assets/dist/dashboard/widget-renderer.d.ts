/**
 * Widget Renderer - Client-side widget rendering for admin dashboard
 */
import type { Widget, AdminDashboardConfig } from './types.js';
/**
 * Renders dashboard widgets to HTML strings
 */
export declare class WidgetRenderer {
    private activityActionLabels;
    constructor(config: AdminDashboardConfig);
    /**
     * Render a complete widget with wrapper and toolbar
     */
    render(widget: Widget, areaCode: string): string;
    /**
     * Render widget content based on definition type
     */
    renderContent(widget: Widget): string;
    /**
     * Get display title for widget definition
     */
    private getTitle;
    /**
     * Format number with locale
     */
    private formatNumber;
    private formatStatusLabel;
    private normalizeSpan;
}
//# sourceMappingURL=widget-renderer.d.ts.map
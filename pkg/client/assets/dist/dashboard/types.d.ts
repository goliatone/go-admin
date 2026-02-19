/**
 * Core types for dashboard widget system
 */
export interface Widget {
    id: string;
    definition: string;
    area: string;
    span: number;
    hidden?: boolean;
    resizable?: boolean;
    metadata?: Record<string, any>;
    data?: Record<string, any>;
    config?: Record<string, any>;
}
export interface LegacyChartSampleWidgetData {
    disabled: boolean;
}
export interface UserStatsWidgetData {
    type: 'stat_card';
    stat_type: 'users';
    total: number;
    active: number;
    new_today: number;
    trend?: string;
    trend_up?: boolean;
}
export interface ContentStatsWidgetData {
    type: 'stat_card';
    stat_type: 'content';
    published: number;
    draft: number;
    scheduled: number;
}
export interface StorageStatsWidgetData {
    type: 'stat_card';
    stat_type: 'storage';
    used: string;
    total: string;
    percentage: number;
}
export interface ChartWidgetData {
    chart_type: 'bar' | 'line' | 'pie' | 'gauge' | 'scatter';
    title: string;
    subtitle?: string;
    theme: string;
    chart_assets_host: string;
    chart_options: Record<string, any>;
    footer_note?: string;
}
export interface WidgetArea {
    code: string;
    label?: string;
    resizable: boolean;
    widgets: Widget[];
}
export interface WidgetLayoutRow {
    widgets: WidgetSlot[];
}
export interface WidgetSlot {
    id: string;
    width: number;
}
export interface LayoutPreferences {
    area_order: Record<string, string[]>;
    hidden_widget_ids: string[];
    layout_rows: Record<string, WidgetLayoutRow[]>;
}
export interface WidgetGridSelectors {
    areas?: string;
    widgets?: string;
    toolbar?: string;
    hideBtn?: string;
    resizeBtn?: string;
}
export interface WidgetGridConfig {
    apiEndpoint: string;
    preferencesEndpoint?: string;
    areas?: string[];
    defaultSpan?: number;
    maxColumns?: number;
    behaviors?: WidgetGridBehaviors;
    selectors?: WidgetGridSelectors;
    onSave?: (layout: LayoutPreferences) => void;
    onError?: (error: Error) => void;
    saveDelay?: number;
}
export interface WidgetGridBehaviors {
    dragDrop?: DragDropBehavior;
    resize?: ResizeBehavior;
    visibility?: VisibilityBehavior;
    persistence?: PersistenceBehavior;
}
export interface DragDropBehavior {
    enable(container: HTMLElement, onDrop: () => void): void;
    disable(): void;
}
export interface ResizeBehavior {
    toggleWidth(widget: HTMLElement, currentSpan: number, maxColumns: number): number;
    applyWidth(widget: HTMLElement, span: number): void;
}
export interface VisibilityBehavior {
    toggle(widget: HTMLElement): boolean;
    applyVisibility(widget: HTMLElement, hidden: boolean): void;
}
export interface PersistenceBehavior {
    save(endpoint: string, layout: LayoutPreferences): Promise<void>;
    load(endpoint: string): Promise<LayoutPreferences | null>;
}
/**
 * Configuration for admin dashboard client-side rendering
 */
export interface AdminDashboardConfig {
    basePath: string;
    apiBasePath: string;
    activityActionLabels: Record<string, string>;
}
/**
 * Dashboard API response structure
 */
export interface DashboardResponse {
    widgets: Widget[];
}
/**
 * Widget definition to title mapping
 */
export type WidgetTitleMap = Record<string, string>;
//# sourceMappingURL=types.d.ts.map
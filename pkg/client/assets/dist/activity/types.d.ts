/**
 * Activity Feed Types
 */
export interface ActivityEntry {
    id: string;
    actor: string;
    action: string;
    object: string;
    channel?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}
export interface ActivityPayload {
    entries: ActivityEntry[];
    total?: number;
    has_more?: boolean;
    next_offset?: number;
}
export interface ActivityConfig {
    apiPath: string;
    basePath: string;
    actionLabels?: Record<string, string>;
}
export interface ActivitySelectors {
    form: string;
    tableBody: string;
    emptyState: string;
    disabledState: string;
    errorState: string;
    countEl: string;
    prevBtn: string;
    nextBtn: string;
    refreshBtn: string;
    clearBtn: string;
    limitInput: string;
}
export interface ActivityState {
    limit: number;
    offset: number;
    total: number;
    nextOffset: number;
    hasMore: boolean;
    extraParams: Record<string, string>;
}
export type ActionCategory = 'created' | 'updated' | 'deleted' | 'auth' | 'viewed' | 'system';
export interface ParsedObject {
    type: string;
    id: string;
}
export interface ToastNotifier {
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
}
/**
 * View modes for activity display
 */
export type ActivityViewMode = 'table' | 'timeline';
/**
 * Extended configuration with view and timeline options
 */
export interface ActivityConfigExtended extends ActivityConfig {
    /** Default view mode */
    defaultView?: ActivityViewMode;
    /** Custom relative time formatter */
    relativeTimeFormatter?: (dateString: string) => string;
}
/**
 * Date group for timeline view
 */
export interface TimelineDateGroup {
    /** Date object for the group (start of day) */
    date: Date;
    /** Display label ("Today", "Yesterday", or formatted date) */
    label: string;
    /** Entries belonging to this date group */
    entries: ActivityEntry[];
    /** Whether this group is collapsed */
    collapsed: boolean;
}
/**
 * Timeline state management
 */
export interface TimelineState {
    /** Current view mode */
    view: ActivityViewMode;
    /** Collapsed date groups (date strings) */
    collapsedGroups: Set<string>;
    /** Whether infinite scroll is loading */
    isLoadingMore: boolean;
    /** Whether all entries have been loaded */
    allLoaded: boolean;
}
/**
 * View switcher selectors
 */
export interface ViewSwitcherSelectors {
    container: string;
    tableTab: string;
    timelineTab: string;
    tableView: string;
    timelineView: string;
    paginationContainer: string;
}
//# sourceMappingURL=types.d.ts.map
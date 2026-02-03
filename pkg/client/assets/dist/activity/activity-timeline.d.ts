/**
 * Activity Timeline Renderer
 * Renders activity entries in a vertical timeline format with date grouping
 */
import type { ActivityEntry, TimelineDateGroup, TimelineSessionGroup } from './types.js';
/**
 * Group activity entries by date
 */
export declare function groupEntriesByDate(entries: ActivityEntry[]): TimelineDateGroup[];
/**
 * Group entries by session ID within a date group
 */
export declare function groupEntriesBySession(entries: ActivityEntry[]): TimelineSessionGroup[];
/**
 * Merge new entries into existing date groups (for infinite scroll)
 */
export declare function mergeEntriesIntoGroups(existingGroups: TimelineDateGroup[], newEntries: ActivityEntry[]): TimelineDateGroup[];
/**
 * Render a single timeline entry
 */
export declare function renderTimelineEntry(entry: ActivityEntry, actionLabels?: Record<string, string>, options?: {
    showDebugInfo?: boolean;
}): HTMLElement;
/**
 * Render a session group header (within a date group)
 */
export declare function renderSessionGroupHeader(sessionGroup: TimelineSessionGroup, dateKey: string, onToggle?: (sessionKey: string, collapsed: boolean) => void): HTMLElement;
/**
 * Render a date group header
 */
export declare function renderDateGroupHeader(group: TimelineDateGroup, onToggle?: (dateKey: string, collapsed: boolean) => void): HTMLElement;
/**
 * Render a date group with its entries (optionally grouped by session)
 */
export declare function renderDateGroup(group: TimelineDateGroup, actionLabels?: Record<string, string>, onToggle?: (dateKey: string, collapsed: boolean) => void, options?: {
    groupBySession?: boolean;
    showDebugInfo?: boolean;
    onSessionToggle?: (sessionKey: string, collapsed: boolean) => void;
    collapsedSessions?: Set<string>;
}): HTMLElement;
/**
 * Timeline renderer options
 */
export interface TimelineRendererOptions {
    /** Whether to group entries by session within date groups */
    groupBySession?: boolean;
    /** Whether to show enrichment debug info */
    showDebugInfo?: boolean;
}
/**
 * Timeline renderer class
 */
export declare class TimelineRenderer {
    private container;
    private actionLabels?;
    private collapsedGroups;
    private collapsedSessions;
    private groups;
    private options;
    constructor(container: HTMLElement, actionLabels?: Record<string, string>, options?: TimelineRendererOptions);
    /**
     * Update renderer options
     */
    setOptions(options: Partial<TimelineRendererOptions>): void;
    /**
     * Render the full timeline
     */
    render(entries: ActivityEntry[]): void;
    /**
     * Append more entries (for infinite scroll)
     */
    appendEntries(newEntries: ActivityEntry[]): void;
    /**
     * Clear the timeline
     */
    clear(): void;
    /**
     * Get current groups
     */
    getGroups(): TimelineDateGroup[];
    private renderEmptyState;
    private handleGroupToggle;
    private handleSessionToggle;
    private wireMetadataToggles;
}
/**
 * Create loading indicator for infinite scroll
 */
export declare function createLoadingIndicator(): HTMLElement;
/**
 * Create end-of-timeline indicator
 */
export declare function createEndIndicator(): HTMLElement;
/**
 * Create infinite scroll sentinel element
 */
export declare function createScrollSentinel(): HTMLElement;
//# sourceMappingURL=activity-timeline.d.ts.map
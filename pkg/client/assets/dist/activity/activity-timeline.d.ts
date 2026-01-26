/**
 * Activity Timeline Renderer
 * Renders activity entries in a vertical timeline format with date grouping
 */
import type { ActivityEntry, TimelineDateGroup } from './types.js';
/**
 * Group activity entries by date
 */
export declare function groupEntriesByDate(entries: ActivityEntry[]): TimelineDateGroup[];
/**
 * Merge new entries into existing date groups (for infinite scroll)
 */
export declare function mergeEntriesIntoGroups(existingGroups: TimelineDateGroup[], newEntries: ActivityEntry[]): TimelineDateGroup[];
/**
 * Render a single timeline entry
 */
export declare function renderTimelineEntry(entry: ActivityEntry, actionLabels?: Record<string, string>): HTMLElement;
/**
 * Render a date group header
 */
export declare function renderDateGroupHeader(group: TimelineDateGroup, onToggle?: (dateKey: string, collapsed: boolean) => void): HTMLElement;
/**
 * Render a date group with its entries
 */
export declare function renderDateGroup(group: TimelineDateGroup, actionLabels?: Record<string, string>, onToggle?: (dateKey: string, collapsed: boolean) => void): HTMLElement;
/**
 * Timeline renderer class
 */
export declare class TimelineRenderer {
    private container;
    private actionLabels?;
    private collapsedGroups;
    private groups;
    constructor(container: HTMLElement, actionLabels?: Record<string, string>);
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
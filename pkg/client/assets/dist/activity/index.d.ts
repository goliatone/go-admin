/**
 * Activity Feed Module
 * Enhanced activity log with color coding, human sentences, expandable metadata,
 * and timeline view with infinite scroll and session grouping
 */
export { ActivityManager } from './activity-manager.js';
export { ActivityViewSwitcher } from './activity-view-switcher.js';
export { TimelineRenderer, groupEntriesByDate, groupEntriesBySession, mergeEntriesIntoGroups, renderTimelineEntry, renderSessionGroupHeader, renderDateGroupHeader, renderDateGroup, createLoadingIndicator, createEndIndicator, createScrollSentinel, } from './activity-timeline.js';
export type { TimelineRendererOptions } from './activity-timeline.js';
export * from './types.js';
export * from './formatters.js';
//# sourceMappingURL=index.d.ts.map
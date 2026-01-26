/**
 * Activity Feed Module
 * Enhanced activity log with color coding, human sentences, expandable metadata,
 * and timeline view with infinite scroll
 */

export { ActivityManager } from './activity-manager.js';
export { ActivityViewSwitcher } from './activity-view-switcher.js';
export {
  TimelineRenderer,
  groupEntriesByDate,
  mergeEntriesIntoGroups,
  renderTimelineEntry,
  renderDateGroupHeader,
  renderDateGroup,
  createLoadingIndicator,
  createEndIndicator,
  createScrollSentinel,
} from './activity-timeline.js';
export * from './types.js';
export * from './formatters.js';

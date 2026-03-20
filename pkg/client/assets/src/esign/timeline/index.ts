/**
 * Timeline Module
 *
 * Re-exports all timeline-related functionality for the agreement detail page.
 *
 * @module esign/timeline
 */

// Event Registry
export {
  TIMELINE_COLOR_CLASSES,
  DEFAULT_EVENT_CONFIG,
  EVENT_REGISTRY,
  EVENT_TYPE_ALIASES,
  CONDENSED_MODE_PRIORITY_THRESHOLD,
  resolveEventTypeKey,
  getEventConfig,
  generateFallbackLabel,
  getColorClasses,
  isVisibleInCondensedMode,
  isGroupableEvent,
  getEventTypesByCategory,
} from './event-registry.js';

// Event Resolver
export {
  looksLikeUUID,
  buildActorKey,
  humanizeActorRole,
  getActorColor,
  getActorInitials,
  createResolverContext,
  findParticipantById,
  findFieldDefinitionById,
  resolveActor,
  resolveMetadata,
  resolveFieldLabel,
  resolveParticipantName,
  type EventResolverContext,
} from './event-resolver.js';

// Event Grouper
export {
  MAX_GROUP_WINDOW_MS,
  MAX_GROUP_SIZE,
  sortEventsByTimestamp,
  canGroupEvents,
  isEventVisibleInMode,
  processEventsForDisplay,
  groupItemsByDate,
  countHiddenEvents,
  getGroupEvents,
  toggleGroupExpansion,
  getDateLabel,
  type ProcessedTimelineItem,
  type DateGroup,
  type FilterStats,
} from './event-grouper.js';

// Timeline Renderer
export {
  formatTimestamp,
  formatRelativeTime,
  renderTimelineEntry,
  renderGroupHeader,
  renderTimelineItem,
  renderDateGroup,
  renderEmptyState,
  renderFilteredState,
  renderLoadingState,
  renderHiddenEventsNotice,
  renderViewModeToggle,
  renderTimeline,
  wireMetadataToggles,
  wireGroupToggles,
} from './timeline-renderer.js';

// Timeline Controller
export {
  TimelineController,
  createTimelineController,
  parseTimelineBootstrap,
  parseMergedTimelineBootstrap,
  mergeReviewDataIntoTimeline,
  mergeReviewBootstrapIntoTimeline,
} from './timeline-controller.js';

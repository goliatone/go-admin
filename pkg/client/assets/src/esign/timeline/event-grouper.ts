/**
 * Timeline Event Grouper
 *
 * Handles grouping consecutive similar events for condensed view display.
 *
 * Grouping rules:
 * - Only group consecutive events of the same canonical event type
 * - Only group events marked as groupable
 * - Only group events at or below the condensed threshold priority
 * - Maximum grouping window: 5 minutes between adjacent events
 * - Maximum group size: 20 events
 *
 * @module esign/timeline/event-grouper
 */

import type {
  TimelineEvent,
  TimelineEventConfig,
  TimelineEventGroup,
  TimelineViewMode,
} from '../types.js';

import {
  getEventConfig,
  resolveEventTypeKey,
  CONDENSED_MODE_PRIORITY_THRESHOLD,
} from './event-registry.js';

/**
 * Maximum time window in milliseconds for grouping events (5 minutes)
 */
export const MAX_GROUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Maximum number of events in a single group
 */
export const MAX_GROUP_SIZE = 20;

/**
 * Result of processing events for display
 */
export interface ProcessedTimelineItem {
  type: 'event' | 'group';
  event?: TimelineEvent;
  group?: TimelineEventGroup;
  config: TimelineEventConfig;
}

/**
 * Statistics about filtered/hidden events
 */
export interface FilterStats {
  totalEvents: number;
  visibleEvents: number;
  hiddenEvents: number;
  groupCount: number;
  groupedEventCount: number;
}

/**
 * Sort events by timestamp (newest first by default)
 */
export function sortEventsByTimestamp(
  events: TimelineEvent[],
  ascending = false
): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Check if two events can be grouped together
 */
export function canGroupEvents(
  event1: TimelineEvent,
  event2: TimelineEvent
): boolean {
  // Must be same event type
  const type1 = resolveEventTypeKey(event1.event_type);
  const type2 = resolveEventTypeKey(event2.event_type);
  if (type1 !== type2) {
    return false;
  }

  // Event type must be groupable
  const config = getEventConfig(type1);
  if (!config.groupable) {
    return false;
  }

  // Must be within time window
  const time1 = new Date(event1.created_at || 0).getTime();
  const time2 = new Date(event2.created_at || 0).getTime();
  const timeDiff = Math.abs(time1 - time2);
  if (timeDiff > MAX_GROUP_WINDOW_MS) {
    return false;
  }

  return true;
}

/**
 * Check if an event should be visible in the given view mode
 */
export function isEventVisibleInMode(
  event: TimelineEvent,
  mode: TimelineViewMode
): boolean {
  if (mode === 'all') {
    return true;
  }

  const config = getEventConfig(event.event_type);
  return config.priority <= CONDENSED_MODE_PRIORITY_THRESHOLD;
}

/**
 * Group consecutive similar events
 */
function createGroups(
  events: TimelineEvent[],
  mode: TimelineViewMode
): ProcessedTimelineItem[] {
  const result: ProcessedTimelineItem[] = [];
  let currentGroup: TimelineEvent[] = [];
  let currentGroupType = '';

  const flushGroup = () => {
    if (currentGroup.length === 0) {
      return;
    }

    if (currentGroup.length === 1) {
      // Single event, don't group
      const event = currentGroup[0];
      result.push({
        type: 'event',
        event,
        config: getEventConfig(event.event_type),
      });
    } else {
      // Multiple events, create group
      const config = getEventConfig(currentGroupType);
      const group: TimelineEventGroup = {
        events: [...currentGroup],
        config,
        eventType: currentGroupType,
        startTime: currentGroup[currentGroup.length - 1].created_at,
        endTime: currentGroup[0].created_at,
        isExpanded: false,
      };
      result.push({
        type: 'group',
        group,
        config,
      });
    }

    currentGroup = [];
    currentGroupType = '';
  };

  for (const event of events) {
    // Check visibility
    if (!isEventVisibleInMode(event, mode)) {
      continue;
    }

    const eventType = resolveEventTypeKey(event.event_type);
    const config = getEventConfig(eventType);

    // If not groupable, flush current group and add as single event
    if (!config.groupable) {
      flushGroup();
      result.push({
        type: 'event',
        event,
        config,
      });
      continue;
    }

    // In condensed mode, only group low-priority events
    if (mode === 'condensed' && config.priority < CONDENSED_MODE_PRIORITY_THRESHOLD) {
      // High priority events shouldn't be grouped in condensed mode
      flushGroup();
      result.push({
        type: 'event',
        event,
        config,
      });
      continue;
    }

    // Check if can add to current group
    if (currentGroup.length === 0) {
      // Start new group
      currentGroup.push(event);
      currentGroupType = eventType;
    } else if (
      currentGroupType === eventType &&
      currentGroup.length < MAX_GROUP_SIZE &&
      canGroupEvents(currentGroup[currentGroup.length - 1], event)
    ) {
      // Add to current group
      currentGroup.push(event);
    } else {
      // Flush and start new group
      flushGroup();
      currentGroup.push(event);
      currentGroupType = eventType;
    }
  }

  // Flush any remaining group
  flushGroup();

  return result;
}

/**
 * Process events for display with grouping and filtering
 */
export function processEventsForDisplay(
  events: TimelineEvent[],
  mode: TimelineViewMode
): { items: ProcessedTimelineItem[]; stats: FilterStats } {
  // Sort events by timestamp (newest first)
  const sortedEvents = sortEventsByTimestamp(events, false);

  // Create groups
  const items = createGroups(sortedEvents, mode);

  // Calculate stats
  let visibleEvents = 0;
  let groupCount = 0;
  let groupedEventCount = 0;

  for (const item of items) {
    if (item.type === 'event') {
      visibleEvents++;
    } else if (item.type === 'group' && item.group) {
      groupCount++;
      groupedEventCount += item.group.events.length;
      visibleEvents += item.group.events.length;
    }
  }

  const hiddenEvents = sortedEvents.length - visibleEvents;

  return {
    items,
    stats: {
      totalEvents: events.length,
      visibleEvents,
      hiddenEvents,
      groupCount,
      groupedEventCount,
    },
  };
}

/**
 * Group events by date for display (returns date labels and their events)
 */
export interface DateGroup {
  dateKey: string;
  dateLabel: string;
  items: ProcessedTimelineItem[];
}

/**
 * Get a human-readable date label
 */
export function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Group processed items by date
 */
export function groupItemsByDate(items: ProcessedTimelineItem[]): DateGroup[] {
  const groups: Map<string, DateGroup> = new Map();

  for (const item of items) {
    // Get the timestamp for this item
    let timestamp: string;
    if (item.type === 'event' && item.event) {
      timestamp = item.event.created_at;
    } else if (item.type === 'group' && item.group) {
      timestamp = item.group.endTime; // Use most recent event time
    } else {
      continue;
    }

    const date = new Date(timestamp);
    const dateKey = date.toLocaleDateString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: getDateLabel(date),
        items: [],
      });
    }

    groups.get(dateKey)!.items.push(item);
  }

  // Convert to array (already sorted by recency due to input order)
  return Array.from(groups.values());
}

/**
 * Count hidden events (for displaying "N system events hidden" message)
 */
export function countHiddenEvents(events: TimelineEvent[]): number {
  return events.filter((event) => {
    const config = getEventConfig(event.event_type);
    return config.priority > CONDENSED_MODE_PRIORITY_THRESHOLD;
  }).length;
}

/**
 * Get events in a group (for expansion)
 */
export function getGroupEvents(group: TimelineEventGroup): TimelineEvent[] {
  return group.events || [];
}

/**
 * Toggle group expansion state
 */
export function toggleGroupExpansion(group: TimelineEventGroup): TimelineEventGroup {
  return {
    ...group,
    isExpanded: !group.isExpanded,
  };
}

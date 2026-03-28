/**
 * Timeline Renderer
 *
 * Handles DOM rendering of timeline events, groups, and empty states.
 *
 * @module esign/timeline/timeline-renderer
 */

import type {
  TimelineEvent,
  TimelineEventGroup,
  TimelineViewMode,
  ResolvedActorInfo,
  ResolvedMetadataField,
} from '../types.js';

import { getColorClasses, getEventConfig } from './event-registry.js';
import type { ProcessedTimelineItem, DateGroup, FilterStats } from './event-grouper.js';
import { EventResolverContext, resolveActor, resolveMetadata } from './event-resolver.js';
import { formatTimestamp, formatRelativeTime } from './formatters.js';
import { escapeHTML as escapeHtml } from '../../shared/html.js';
import { renderPanelLoadingState, renderPanelState } from '../../services/ui-states.js';

/**
 * Escape HTML for safe rendering
 */

/**
 * Render a metadata field as HTML
 */
function renderMetadataField(field: ResolvedMetadataField): string {
  const key = escapeHtml(field.displayKey);
  const value = escapeHtml(field.displayValue);

  if (field.isBadge) {
    return `
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500">${key}:</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">${value}</span>
      </div>
    `;
  }

  return `
    <div>
      <span class="text-gray-500">${key}:</span>
      <span class="font-medium">${value}</span>
    </div>
  `;
}

/**
 * Render metadata section for an event
 */
function renderMetadata(
  event: TimelineEvent,
  ctx: EventResolverContext
): string {
  const metadata = resolveMetadata(ctx, event);
  if (metadata.length === 0) {
    return '';
  }

  const eventId = escapeHtml(event.id);
  const metadataItems = metadata.map(renderMetadataField).join('');

  return `
    <button type="button" class="timeline-meta-toggle mt-2 text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            aria-expanded="false" data-event-id="${eventId}">
      <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      Details
    </button>
    <div class="timeline-meta-content hidden mt-2 text-xs bg-gray-50 rounded p-2 space-y-1" data-event-content="${eventId}">
      ${metadataItems}
    </div>
  `;
}

/**
 * Render a single timeline event entry
 */
export function renderTimelineEntry(
  event: TimelineEvent,
  ctx: EventResolverContext,
  isLastInGroup = false
): string {
  const config = getEventConfig(event.event_type);
  const colors = getColorClasses(config.color);
  const actor = resolveActor(ctx, event);
  const timestamp = formatRelativeTime(event.created_at);
  const fullTimestamp = formatTimestamp(event.created_at);
  const metadataHtml = renderMetadata(event, ctx);

  const eventId = escapeHtml(event.id);
  const actorName = escapeHtml(actor.name);
  const label = escapeHtml(config.label);

  return `
    <div class="timeline-entry relative pl-8 pb-6 ${isLastInGroup ? 'last:pb-0' : ''}" role="listitem" data-event-id="${eventId}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${colors.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 ${isLastInGroup ? 'hidden' : ''}" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}">
                ${label}
              </span>
            </div>
            <div class="text-sm text-gray-700">
              <span class="font-medium">${actorName}</span>
            </div>
            ${metadataHtml}
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${escapeHtml(fullTimestamp)}">${escapeHtml(timestamp)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a group header (collapsed view)
 */
export function renderGroupHeader(
  group: TimelineEventGroup,
  ctx: EventResolverContext
): string {
  const config = group.config;
  const colors = getColorClasses(config.color);
  const count = group.events.length;
  const timestamp = formatRelativeTime(group.endTime);
  const fullTimestamp = formatTimestamp(group.endTime);
  const label = escapeHtml(config.label);
  const groupId = `group-${group.events[0]?.id || Date.now()}`;

  return `
    <div class="timeline-group relative pl-8 pb-6" role="listitem" data-group-id="${groupId}">
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full ${colors.dot} ring-4 ring-white" aria-hidden="true"></div>
      <div class="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200" aria-hidden="true"></div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}">
                ${label}
              </span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                ${count} events
              </span>
            </div>
            <button type="button" class="timeline-group-toggle text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mt-1"
                    aria-expanded="false" data-group-id="${groupId}">
              <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
              Show details
            </button>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-xs text-gray-500" title="${escapeHtml(fullTimestamp)}">${escapeHtml(timestamp)}</div>
          </div>
        </div>
        <div class="timeline-group-content hidden mt-3 pt-3 border-t border-gray-100" data-group-content="${groupId}">
          <!-- Group events will be rendered here when expanded -->
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a processed timeline item (event or group)
 */
export function renderTimelineItem(
  item: ProcessedTimelineItem,
  ctx: EventResolverContext,
  isLast = false
): string {
  if (item.type === 'event' && item.event) {
    return renderTimelineEntry(item.event, ctx, isLast);
  } else if (item.type === 'group' && item.group) {
    return renderGroupHeader(item.group, ctx);
  }
  return '';
}

/**
 * Render a date group
 */
export function renderDateGroup(
  dateGroup: DateGroup,
  ctx: EventResolverContext
): string {
  const itemsHtml = dateGroup.items
    .map((item, idx) => renderTimelineItem(item, ctx, idx === dateGroup.items.length - 1))
    .join('');

  return `
    <div class="mb-6">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-8">${escapeHtml(dateGroup.dateLabel)}</div>
      ${itemsHtml}
    </div>
  `;
}

/**
 * Render the empty state
 */
export function renderEmptyState(): string {
  return renderPanelState({
    containerClass: 'text-gray-500 py-8',
    bodyClass: 'flex flex-col items-center text-center',
    contentClass: '',
    iconHtml: `
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `,
    title: 'No activity yet',
    titleClass: 'font-medium',
    message: 'Timeline events will appear here as the agreement progresses.',
    messageClass: 'text-sm',
  });
}

/**
 * Render the filtered state shown when condensed mode hides all events.
 */
export function renderFilteredState(hiddenCount: number): string {
  const label = hiddenCount === 1 ? 'event is' : 'events are';
  return `
    <div class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <p class="font-medium">All current activity is hidden in condensed view.</p>
      <p class="text-sm">${hiddenCount} ${label} available in all activity.</p>
    </div>
  `;
}

/**
 * Render loading state
 */
export function renderLoadingState(): string {
  return renderPanelLoadingState({
    containerClass: 'timeline-loading text-gray-500',
    bodyClass: 'flex items-center justify-center gap-3 py-8',
    spinnerClass: 'w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin',
    text: 'Loading timeline...',
    textClass: '',
  });
}

/**
 * Render hidden events notice
 */
export function renderHiddenEventsNotice(
  hiddenCount: number,
  mode: TimelineViewMode
): string {
  if (hiddenCount <= 0 || mode === 'all') {
    return '';
  }

  const label = hiddenCount === 1 ? 'event' : 'events';
  return `
    <div class="timeline-hidden-notice text-center py-3 text-sm text-gray-500 border-t border-gray-100 mt-4">
      <span>${hiddenCount} system ${label} hidden.</span>
      <button type="button" class="timeline-show-all-btn ml-1 text-blue-600 hover:text-blue-800 font-medium">
        Show all activity
      </button>
    </div>
  `;
}

/**
 * Render view mode toggle
 */
export function renderViewModeToggle(mode: TimelineViewMode): string {
  const isCondensed = mode === 'condensed';
  return `
    <div class="timeline-view-toggle flex items-center gap-2 text-sm">
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${isCondensed ? 'bg-gray-100 font-medium' : 'text-gray-500 hover:text-gray-700'}" data-mode="condensed">
        Condensed
      </button>
      <button type="button" class="timeline-mode-btn px-2 py-1 rounded ${!isCondensed ? 'bg-gray-100 font-medium' : 'text-gray-500 hover:text-gray-700'}" data-mode="all">
        All Activity
      </button>
    </div>
  `;
}

/**
 * Render the complete timeline
 */
export function renderTimeline(
  dateGroups: DateGroup[],
  ctx: EventResolverContext,
  stats: FilterStats,
  mode: TimelineViewMode
): string {
  if (stats.totalEvents === 0) {
    return renderEmptyState();
  }

  if (stats.visibleEvents === 0) {
    if (stats.hiddenEvents > 0 && mode === 'condensed') {
      return `
        ${renderFilteredState(stats.hiddenEvents)}
        ${renderHiddenEventsNotice(stats.hiddenEvents, mode)}
      `;
    }
    return renderEmptyState();
  }

  const groupsHtml = dateGroups.map((group) => renderDateGroup(group, ctx)).join('');
  const hiddenNotice = renderHiddenEventsNotice(stats.hiddenEvents, mode);

  return `
    <div class="relative">
      ${groupsHtml}
    </div>
    ${hiddenNotice}
  `;
}

/**
 * Wire up metadata toggle interactions
 */
export function wireMetadataToggles(container: HTMLElement): void {
  container.querySelectorAll('.timeline-meta-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const eventId = btn.getAttribute('data-event-id');
      if (!eventId) return;

      const content = container.querySelector(`[data-event-content="${eventId}"]`);
      if (!content) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));
      content.classList.toggle('hidden', isExpanded);

      const svg = btn.querySelector('svg');
      if (svg) {
        svg.style.transform = isExpanded ? '' : 'rotate(180deg)';
      }
    });
  });
}

/**
 * Wire up group toggle interactions
 */
export function wireGroupToggles(
  container: HTMLElement,
  ctx: EventResolverContext,
  getGroup: (groupId: string) => TimelineEventGroup | undefined
): void {
  container.querySelectorAll('.timeline-group-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const groupId = btn.getAttribute('data-group-id');
      if (!groupId) return;

      const content = container.querySelector(`[data-group-content="${groupId}"]`);
      if (!content) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));
      content.classList.toggle('hidden', isExpanded);

      const svg = btn.querySelector('svg');
      if (svg) {
        svg.style.transform = isExpanded ? '' : 'rotate(180deg)';
      }

      // Update button text
      btn.innerHTML = `
        <svg class="w-3 h-3 transition-transform" style="transform: ${isExpanded ? '' : 'rotate(180deg)'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        ${isExpanded ? 'Show details' : 'Hide details'}
      `;

      // Render group events if expanding and not already rendered
      if (!isExpanded && content.children.length === 0) {
        const group = getGroup(groupId);
        if (group) {
          const eventsHtml = group.events
            .map((event, idx) => renderTimelineEntry(event, ctx, idx === group.events.length - 1))
            .join('');
          content.innerHTML = eventsHtml;
          wireMetadataToggles(content as HTMLElement);
        }
      }
    });
  });
}

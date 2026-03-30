/**
 * Timeline Controller
 *
 * Main controller that orchestrates timeline rendering, refresh, and interactions.
 *
 * @module esign/timeline/timeline-controller
 */

import type {
  TimelineEvent,
  TimelineEventGroup,
  TimelineViewMode,
  TimelineControllerConfig,
  AgreementTimelineBootstrap,
  TimelineActor,
} from '../types.js';

import { createResolverContext, EventResolverContext } from './event-resolver.js';
import {
  processEventsForDisplay,
  groupItemsByDate,
  ProcessedTimelineItem,
  DateGroup,
  FilterStats,
} from './event-grouper.js';
import {
  renderTimeline,
  renderLoadingState,
  renderEmptyState,
  renderViewModeToggle,
  wireMetadataToggles,
  wireGroupToggles,
} from './timeline-renderer.js';
import { readJSONScriptValue, readJSONSelectorValue } from '../../shared/json-parse.js';

/**
 * Timeline controller class
 */
export class TimelineController {
  private readonly config: TimelineControllerConfig;
  private container: HTMLElement | null = null;
  private refreshBtn: HTMLElement | null = null;
  private viewToggle: HTMLElement | null = null;

  private bootstrap: AgreementTimelineBootstrap;
  private resolverContext: EventResolverContext;
  private viewMode: TimelineViewMode = 'condensed';
  private processedItems: ProcessedTimelineItem[] = [];
  private dateGroups: DateGroup[] = [];
  private stats: FilterStats = {
    totalEvents: 0,
    visibleEvents: 0,
    hiddenEvents: 0,
    groupCount: 0,
    groupedEventCount: 0,
  };

  // Map group IDs to groups for expansion
  private groupMap: Map<string, TimelineEventGroup> = new Map();

  constructor(config: TimelineControllerConfig) {
    this.config = config;
    this.bootstrap = config.bootstrap;
    this.resolverContext = createResolverContext(this.bootstrap);
  }

  /**
   * Initialize the timeline controller
   */
  init(): void {
    // Get DOM references
    this.container = document.getElementById(this.config.containerId);
    if (this.config.refreshButtonId) {
      this.refreshBtn = document.getElementById(this.config.refreshButtonId);
    }
    if (this.config.viewToggleId) {
      this.viewToggle = document.getElementById(this.config.viewToggleId);
    }

    if (!this.container) {
      console.warn(`Timeline container #${this.config.containerId} not found`);
      return;
    }

    // Wire up refresh button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.refresh());
    }

    // Initial render
    this.render();
  }

  /**
   * Update bootstrap data and re-render
   */
  updateBootstrap(bootstrap: AgreementTimelineBootstrap): void {
    this.bootstrap = bootstrap;
    this.resolverContext = createResolverContext(bootstrap);
    this.render();
  }

  /**
   * Set view mode and re-render
   */
  setViewMode(mode: TimelineViewMode): void {
    if (this.viewMode === mode) {
      return;
    }
    this.viewMode = mode;
    this.render();
  }

  /**
   * Toggle view mode
   */
  toggleViewMode(): void {
    this.setViewMode(this.viewMode === 'condensed' ? 'all' : 'condensed');
  }

  /**
   * Get current view mode
   */
  getViewMode(): TimelineViewMode {
    return this.viewMode;
  }

  /**
   * Get current stats
   */
  getStats(): FilterStats {
    return { ...this.stats };
  }

  /**
   * Render the timeline
   */
  render(): void {
    if (!this.container) {
      return;
    }

    // Process events
    const events = this.bootstrap.events || [];
    const { items, stats } = processEventsForDisplay(events, this.viewMode);
    this.processedItems = items;
    this.stats = stats;

    // Group by date
    this.dateGroups = groupItemsByDate(items);

    // Build group map for expansion
    this.groupMap.clear();
    for (const item of items) {
      if (item.type === 'group' && item.group) {
        const groupId = `group-${item.group.events[0]?.id || Date.now()}`;
        this.groupMap.set(groupId, item.group);
      }
    }

    // Render
    const html = renderTimeline(this.dateGroups, this.resolverContext, stats, this.viewMode);
    this.container.innerHTML = html;

    // Wire up interactions
    wireMetadataToggles(this.container);
    wireGroupToggles(this.container, this.resolverContext, (groupId) =>
      this.groupMap.get(groupId)
    );

    // Wire up "show all" button if present
    const showAllBtn = this.container.querySelector('.timeline-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => this.setViewMode('all'));
    }

    // Render view toggle if container exists
    if (this.viewToggle) {
      this.viewToggle.innerHTML = renderViewModeToggle(this.viewMode);
      this.wireViewToggle();
    }
  }

  /**
   * Wire up view mode toggle buttons
   */
  private wireViewToggle(): void {
    if (!this.viewToggle) {
      return;
    }

    this.viewToggle.querySelectorAll('.timeline-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') as TimelineViewMode;
        if (mode === 'condensed' || mode === 'all') {
          this.setViewMode(mode);
        }
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    if (!this.container) {
      return;
    }
    this.container.innerHTML = renderLoadingState();
  }

  /**
   * Refresh timeline data
   *
   * This fetches the current page, extracts the timeline bootstrap, and re-renders.
   */
  async refresh(): Promise<void> {
    if (!this.container) {
      return;
    }

    this.showLoading();

    try {
      // Fetch current page
      const response = await fetch(window.location.href, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh: HTTP ${response.status}`);
      }

      const html = await response.text();

      // Parse the HTML and extract timeline bootstrap
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bootstrapScript = doc.getElementById('agreement-timeline-bootstrap');

      if (bootstrapScript?.textContent) {
        try {
          const newBootstrap = parseMergedTimelineBootstrap(
            'agreement-timeline-bootstrap',
            'agreement-review-bootstrap',
            {
              agreement_id: this.config.agreementId,
              current_user_id: this.bootstrap.current_user_id,
            },
            doc
          );
          this.updateBootstrap(newBootstrap);
          return;
        } catch (parseErr) {
          console.warn('Failed to parse timeline bootstrap:', parseErr);
        }
      }

      // Fallback: try to extract from legacy inline format
      const legacyBootstrap = this.extractLegacyBootstrap(doc);
      if (legacyBootstrap) {
        this.updateBootstrap(legacyBootstrap);
        return;
      }

      // No new data found, just re-render with existing data
      this.render();
    } catch (err) {
      console.error('Timeline refresh failed:', err);
      // Re-render with existing data
      this.render();
    }
  }

  /**
   * Extract timeline data from legacy inline format (for backwards compatibility)
   */
  private extractLegacyBootstrap(doc: Document): AgreementTimelineBootstrap | null {
    // Try to find timeline events from various sources
    const reviewData = readJSONScriptValue<Record<string, unknown>>(
      'agreement-review-bootstrap',
      null,
      { root: doc }
    );
    let actorMap: Record<string, any> = {};
    let participants: any[] = [];

    if (reviewData) {
      actorMap = reviewData.actor_map && typeof reviewData.actor_map === 'object'
        ? reviewData.actor_map as Record<string, any>
        : {};
      participants = Array.isArray(reviewData.participants) ? reviewData.participants : [];
    }

    // Return minimal bootstrap if we found any data
    if (Object.keys(actorMap).length > 0 || participants.length > 0) {
      return {
        agreement_id: this.config.agreementId,
        events: this.bootstrap.events || [],
        actors: actorMap,
        participants,
        field_definitions: this.bootstrap.field_definitions || [],
      };
    }

    return null;
  }

  /**
   * Get the group for a given ID
   */
  getGroup(groupId: string): TimelineEventGroup | undefined {
    return this.groupMap.get(groupId);
  }

  /**
   * Dispose of the controller
   */
  dispose(): void {
    this.container = null;
    this.refreshBtn = null;
    this.viewToggle = null;
    this.groupMap.clear();
  }
}

/**
 * Create and initialize a timeline controller
 */
export function createTimelineController(
  config: TimelineControllerConfig
): TimelineController {
  const controller = new TimelineController(config);
  controller.init();
  return controller;
}

function normalizeTimelineBootstrapPayload(
  parsed: Record<string, unknown> | null,
  fallback: AgreementTimelineBootstrap
): AgreementTimelineBootstrap {
  if (!parsed || typeof parsed !== 'object') {
    return fallback;
  }
  return {
    agreement_id: String(parsed.agreement_id || fallback.agreement_id || '').trim(),
    events: Array.isArray(parsed.events) ? parsed.events : fallback.events,
    actors: parsed.actors && typeof parsed.actors === 'object'
      ? parsed.actors as Record<string, TimelineActor>
      : fallback.actors,
    participants: Array.isArray(parsed.participants) ? parsed.participants : fallback.participants,
    field_definitions: Array.isArray(parsed.field_definitions) ? parsed.field_definitions : fallback.field_definitions,
    current_user_id: String(parsed.current_user_id || fallback.current_user_id || '').trim() || fallback.current_user_id,
  };
}

/**
 * Parse timeline bootstrap from a script element
 */
export function parseTimelineBootstrap(
  scriptId: string,
  fallback?: Partial<AgreementTimelineBootstrap>
): AgreementTimelineBootstrap {
  const defaultBootstrap: AgreementTimelineBootstrap = {
    agreement_id: fallback?.agreement_id || '',
    events: fallback?.events || [],
    actors: fallback?.actors || {},
    participants: fallback?.participants || [],
    field_definitions: fallback?.field_definitions || [],
    current_user_id: fallback?.current_user_id,
  };
  const parsed = readJSONScriptValue<Record<string, unknown>>(scriptId, null, {
    onError: (error) => {
      console.warn(`Failed to parse ${scriptId}:`, error);
    },
  });
  return normalizeTimelineBootstrapPayload(parsed, defaultBootstrap);
}

/**
 * Merge parsed review bootstrap data into timeline bootstrap.
 */
export function mergeReviewDataIntoTimeline(
  timelineBootstrap: AgreementTimelineBootstrap,
  reviewData: any
): AgreementTimelineBootstrap {
  if (!reviewData || typeof reviewData !== 'object') {
    return timelineBootstrap;
  }

  const mergedActors = {
    ...(reviewData.actor_map && typeof reviewData.actor_map === 'object'
      ? reviewData.actor_map
      : {}),
    ...timelineBootstrap.actors,
  };

  const existingIds = new Set(
    timelineBootstrap.participants
      .map((participant) => String(participant.id || '').trim())
      .filter(Boolean)
  );
  const newParticipants = Array.isArray(reviewData.participants)
    ? reviewData.participants.filter((participant: any) => {
      const participantId = String(participant?.id || '').trim();
      return participantId && !existingIds.has(participantId);
    })
    : [];

  return {
    ...timelineBootstrap,
    actors: mergedActors,
    participants: [...timelineBootstrap.participants, ...newParticipants],
  };
}

/**
 * Merge review bootstrap data into timeline bootstrap
 * (For backwards compatibility when both bootstrap nodes exist)
 */
export function mergeReviewBootstrapIntoTimeline(
  timelineBootstrap: AgreementTimelineBootstrap,
  reviewBootstrapId: string,
  root: Document | HTMLElement = document
): AgreementTimelineBootstrap {
  const reviewData = readJSONSelectorValue<Record<string, unknown>>(
    `#${reviewBootstrapId}`,
    null,
    {
      root,
      onError: (error) => {
        console.warn(`Failed to parse ${reviewBootstrapId}:`, error);
      },
    }
  );
  return mergeReviewDataIntoTimeline(timelineBootstrap, reviewData);
}

/**
 * Parse timeline bootstrap from a root node and merge review bootstrap if present.
 */
export function parseMergedTimelineBootstrap(
  timelineBootstrapId: string,
  reviewBootstrapId: string,
  fallback?: Partial<AgreementTimelineBootstrap>,
  root: Document | HTMLElement = document
): AgreementTimelineBootstrap {
  const defaultBootstrap: AgreementTimelineBootstrap = {
    agreement_id: fallback?.agreement_id || '',
    events: fallback?.events || [],
    actors: fallback?.actors || {},
    participants: fallback?.participants || [],
    field_definitions: fallback?.field_definitions || [],
    current_user_id: fallback?.current_user_id,
  };
  const parsed = readJSONSelectorValue<Record<string, unknown>>(
    `#${timelineBootstrapId}`,
    null,
    {
      root,
      onError: (error) => {
        console.warn(`Failed to parse ${timelineBootstrapId}:`, error);
      },
    }
  );
  const timelineBootstrap = normalizeTimelineBootstrapPayload(parsed, defaultBootstrap);
  return mergeReviewBootstrapIntoTimeline(timelineBootstrap, reviewBootstrapId, root);
}

/**
 * Activity Timeline Renderer
 * Renders activity entries in a vertical timeline format with date grouping
 */

import type { ActivityEntry, TimelineDateGroup, TimelineSessionGroup, ActionCategory } from './types.js';
import {
  parseActionString,
  formatActivitySentence,
  formatRelativeTimeIntl,
  getMetadataSummary,
  formatMetadataExpanded,
  formatEnrichmentDebugInfo,
  escapeHtml,
  getDateGroupLabel,
  getStartOfDay,
  getDateKey,
  getSessionId,
  getSessionGroupLabel,
  getActorType,
  getActorTypeIconHtml,
} from './formatters.js';

/**
 * Color configuration for action categories
 */
const CATEGORY_COLORS: Record<ActionCategory, { bg: string; color: string; border: string }> = {
  created: { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
  updated: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  deleted: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
  auth: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
  viewed: { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
  system: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};

/**
 * Group activity entries by date
 */
export function groupEntriesByDate(entries: ActivityEntry[]): TimelineDateGroup[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  const groupMap = new Map<string, TimelineDateGroup>();

  entries.forEach((entry) => {
    const date = new Date(entry.created_at);
    if (Number.isNaN(date.getTime())) return;

    const dateKey = getDateKey(date);
    const startOfDay = getStartOfDay(date);

    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, {
        date: startOfDay,
        label: getDateGroupLabel(date),
        entries: [],
        collapsed: false,
      });
    }

    groupMap.get(dateKey)!.entries.push(entry);
  });

  // Sort groups by date (newest first)
  return Array.from(groupMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

/**
 * Group entries by session ID within a date group
 */
export function groupEntriesBySession(entries: ActivityEntry[]): TimelineSessionGroup[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  const groupMap = new Map<string, TimelineSessionGroup>();

  entries.forEach((entry) => {
    const sessionId = getSessionId(entry) || '';
    const groupKey = sessionId || '__no_session__';

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        sessionId,
        label: getSessionGroupLabel(sessionId),
        entries: [],
        collapsed: false,
      });
    }

    groupMap.get(groupKey)!.entries.push(entry);
  });

  // Sort groups: sessions with IDs first (newest entry first), then "No session" at the end
  const groups = Array.from(groupMap.values());

  // Sort entries within each group by time (newest first)
  groups.forEach((group) => {
    group.entries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  // Sort groups: "No session" last, others by their first entry time
  return groups.sort((a, b) => {
    if (!a.sessionId && b.sessionId) return 1;
    if (a.sessionId && !b.sessionId) return -1;
    // Sort by first entry time (newest first)
    const aTime = a.entries[0] ? new Date(a.entries[0].created_at).getTime() : 0;
    const bTime = b.entries[0] ? new Date(b.entries[0].created_at).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Merge new entries into existing date groups (for infinite scroll)
 */
export function mergeEntriesIntoGroups(
  existingGroups: TimelineDateGroup[],
  newEntries: ActivityEntry[]
): TimelineDateGroup[] {
  if (!newEntries || newEntries.length === 0) {
    return existingGroups;
  }

  // Create a map of existing groups
  const groupMap = new Map<string, TimelineDateGroup>();
  existingGroups.forEach((group) => {
    groupMap.set(getDateKey(group.date), { ...group, entries: [...group.entries] });
  });

  // Add new entries to appropriate groups
  newEntries.forEach((entry) => {
    const date = new Date(entry.created_at);
    if (Number.isNaN(date.getTime())) return;

    const dateKey = getDateKey(date);
    const startOfDay = getStartOfDay(date);

    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, {
        date: startOfDay,
        label: getDateGroupLabel(date),
        entries: [],
        collapsed: false,
      });
    }

    // Check if entry already exists (by ID)
    const group = groupMap.get(dateKey)!;
    if (!group.entries.some((e) => e.id === entry.id)) {
      group.entries.push(entry);
    }
  });

  // Sort groups by date (newest first) and entries within each group (newest first)
  const result = Array.from(groupMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  result.forEach((group) => {
    group.entries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return result;
}

/**
 * Get actor initials for avatar display
 */
function getActorInitials(actor: string): string {
  if (!actor) return '?';

  // If it looks like a UUID, use first 2 chars
  const clean = actor.replace(/-/g, '');
  if (/^[0-9a-f]{32}$/i.test(clean)) {
    return actor.substring(0, 2).toUpperCase();
  }

  // Get initials from name/username
  const parts = actor.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return actor.substring(0, 2).toUpperCase();
}

/**
 * Render a single timeline entry
 */
export function renderTimelineEntry(
  entry: ActivityEntry,
  actionLabels?: Record<string, string>,
  options?: { showDebugInfo?: boolean }
): HTMLElement {
  const { showDebugInfo = false } = options || {};
  const parsedAction = parseActionString(entry.action, actionLabels);
  const sentence = formatActivitySentence(entry, actionLabels);
  const relativeTime = formatRelativeTimeIntl(entry.created_at);
  const metadataSummary = getMetadataSummary(entry.metadata);
  const metadataContent = formatMetadataExpanded(entry.metadata);
  const enrichmentDebug = showDebugInfo ? formatEnrichmentDebugInfo(entry) : '';
  const colors = CATEGORY_COLORS[parsedAction.category] || CATEGORY_COLORS.system;
  const initials = getActorInitials(entry.actor);

  // Get actor type for icon display
  const actorType = getActorType(entry);
  const actorTypeIcon = actorType !== 'user' && actorType !== 'unknown'
    ? getActorTypeIconHtml(actorType, { badge: true, size: 'sm' })
    : '';

  const entryEl = document.createElement('div');
  entryEl.className = `timeline-entry timeline-entry--${parsedAction.category}`;
  entryEl.dataset.entryId = entry.id;

  // Build metadata section if present
  let metadataHtml = '';
  if (metadataSummary === 'hidden') {
    // Hidden metadata (support role scenario)
    metadataHtml = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle timeline-metadata-toggle--hidden"
                aria-expanded="false"
                data-timeline-metadata="${entry.id}">
          <i class="iconoir-eye-off" style="font-size: 12px;"></i>
          <span>Hidden</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${entry.id}">
          <div class="timeline-metadata-grid">
            ${metadataContent}
          </div>
          ${enrichmentDebug}
        </div>
      </div>
    `;
  } else if (metadataSummary) {
    metadataHtml = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle"
                aria-expanded="false"
                data-timeline-metadata="${entry.id}">
          <span>${metadataSummary}</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${entry.id}">
          <div class="timeline-metadata-grid">
            ${metadataContent}
          </div>
          ${enrichmentDebug}
        </div>
      </div>
    `;
  } else if (enrichmentDebug) {
    // Show debug info even without other metadata
    metadataHtml = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle timeline-metadata-toggle--debug"
                aria-expanded="false"
                data-timeline-metadata="${entry.id}">
          <i class="iconoir-info-circle" style="font-size: 12px;"></i>
          <span>Debug</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${entry.id}">
          ${enrichmentDebug}
        </div>
      </div>
    `;
  }

  // Build actor type indicator if not a regular user
  const actorTypeIndicator = actorTypeIcon
    ? `<div class="timeline-entry-actor-type">${actorTypeIcon}</div>`
    : '';

  entryEl.innerHTML = `
    <div class="timeline-entry-connector">
      <div class="timeline-entry-dot" style="background-color: ${colors.color}; border-color: ${colors.border};"></div>
    </div>
    <div class="timeline-entry-card">
      <div class="timeline-entry-header">
        <div class="timeline-entry-avatar" style="background-color: ${colors.bg}; color: ${colors.color};">
          ${escapeHtml(initials)}
          ${actorTypeIndicator}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${colors.bg}; color: ${colors.color}; border-color: ${colors.border};">
              <i class="iconoir-${parsedAction.icon}"></i>
              <span>${escapeHtml(parsedAction.action || entry.action)}</span>
            </span>
          </div>
          <div class="timeline-entry-sentence">${sentence}</div>
          <div class="timeline-entry-time">${escapeHtml(relativeTime)}</div>
        </div>
      </div>
      ${metadataHtml}
    </div>
  `;

  return entryEl;
}

/**
 * Render a session group header (within a date group)
 */
export function renderSessionGroupHeader(
  sessionGroup: TimelineSessionGroup,
  dateKey: string,
  onToggle?: (sessionKey: string, collapsed: boolean) => void
): HTMLElement {
  const sessionKey = `${dateKey}__${sessionGroup.sessionId || 'no-session'}`;

  const headerEl = document.createElement('div');
  headerEl.className = 'timeline-session-header';
  headerEl.dataset.sessionGroup = sessionKey;

  const entryCount = sessionGroup.entries.length;
  const countText = entryCount === 1 ? '1 entry' : `${entryCount} entries`;

  headerEl.innerHTML = `
    <button type="button" class="timeline-session-toggle" aria-expanded="${!sessionGroup.collapsed}">
      <i class="iconoir-link" style="font-size: 12px; color: #9ca3af;"></i>
      <span class="timeline-session-label">${escapeHtml(sessionGroup.label)}</span>
      <span class="timeline-session-count">${countText}</span>
      <svg class="timeline-session-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;

  const toggleBtn = headerEl.querySelector('.timeline-session-toggle');
  if (toggleBtn && onToggle) {
    toggleBtn.addEventListener('click', () => {
      const newCollapsed = !sessionGroup.collapsed;
      sessionGroup.collapsed = newCollapsed;
      toggleBtn.setAttribute('aria-expanded', (!newCollapsed).toString());
      onToggle(sessionKey, newCollapsed);
    });
  }

  return headerEl;
}

/**
 * Render a date group header
 */
export function renderDateGroupHeader(
  group: TimelineDateGroup,
  onToggle?: (dateKey: string, collapsed: boolean) => void
): HTMLElement {
  const dateKey = getDateKey(group.date);

  const headerEl = document.createElement('div');
  headerEl.className = 'timeline-date-header';
  headerEl.dataset.dateGroup = dateKey;

  headerEl.innerHTML = `
    <button type="button" class="timeline-date-toggle" aria-expanded="${!group.collapsed}">
      <span class="timeline-date-label">${escapeHtml(group.label)}</span>
      <span class="timeline-date-count">${group.entries.length} ${group.entries.length === 1 ? 'entry' : 'entries'}</span>
      <svg class="timeline-date-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;

  const toggleBtn = headerEl.querySelector('.timeline-date-toggle');
  if (toggleBtn && onToggle) {
    toggleBtn.addEventListener('click', () => {
      const newCollapsed = !group.collapsed;
      group.collapsed = newCollapsed;
      toggleBtn.setAttribute('aria-expanded', (!newCollapsed).toString());
      onToggle(dateKey, newCollapsed);
    });
  }

  return headerEl;
}

/**
 * Render a date group with its entries (optionally grouped by session)
 */
export function renderDateGroup(
  group: TimelineDateGroup,
  actionLabels?: Record<string, string>,
  onToggle?: (dateKey: string, collapsed: boolean) => void,
  options?: {
    groupBySession?: boolean;
    showDebugInfo?: boolean;
    onSessionToggle?: (sessionKey: string, collapsed: boolean) => void;
    collapsedSessions?: Set<string>;
  }
): HTMLElement {
  const {
    groupBySession = true,
    showDebugInfo = false,
    onSessionToggle,
    collapsedSessions = new Set(),
  } = options || {};

  const dateKey = getDateKey(group.date);
  const groupEl = document.createElement('div');
  groupEl.className = 'timeline-group';
  groupEl.dataset.dateGroup = dateKey;

  // Render header
  const headerEl = renderDateGroupHeader(group, onToggle);
  groupEl.appendChild(headerEl);

  // Render entries container
  const entriesEl = document.createElement('div');
  entriesEl.className = 'timeline-entries';
  if (group.collapsed) {
    entriesEl.classList.add('collapsed');
  }

  if (groupBySession) {
    // Group entries by session
    const sessionGroups = groupEntriesBySession(group.entries);

    // Only show session headers if there are multiple sessions or a non-empty session
    const showSessionHeaders = sessionGroups.length > 1 ||
      (sessionGroups.length === 1 && sessionGroups[0].sessionId);

    sessionGroups.forEach((sessionGroup) => {
      const sessionKey = `${dateKey}__${sessionGroup.sessionId || 'no-session'}`;

      // Restore collapsed state
      sessionGroup.collapsed = collapsedSessions.has(sessionKey);

      if (showSessionHeaders) {
        // Render session header
        const sessionHeaderEl = renderSessionGroupHeader(sessionGroup, dateKey, onSessionToggle);
        entriesEl.appendChild(sessionHeaderEl);

        // Render session entries container
        const sessionEntriesEl = document.createElement('div');
        sessionEntriesEl.className = 'timeline-session-entries';
        sessionEntriesEl.dataset.sessionEntries = sessionKey;
        if (sessionGroup.collapsed) {
          sessionEntriesEl.classList.add('collapsed');
        }

        sessionGroup.entries.forEach((entry) => {
          const entryEl = renderTimelineEntry(entry, actionLabels, { showDebugInfo });
          sessionEntriesEl.appendChild(entryEl);
        });

        entriesEl.appendChild(sessionEntriesEl);
      } else {
        // No session headers - render entries directly
        sessionGroup.entries.forEach((entry) => {
          const entryEl = renderTimelineEntry(entry, actionLabels, { showDebugInfo });
          entriesEl.appendChild(entryEl);
        });
      }
    });
  } else {
    // No session grouping - render entries directly
    group.entries.forEach((entry) => {
      const entryEl = renderTimelineEntry(entry, actionLabels, { showDebugInfo });
      entriesEl.appendChild(entryEl);
    });
  }

  groupEl.appendChild(entriesEl);

  return groupEl;
}

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
export class TimelineRenderer {
  private container: HTMLElement;
  private actionLabels?: Record<string, string>;
  private collapsedGroups: Set<string> = new Set();
  private collapsedSessions: Set<string> = new Set();
  private groups: TimelineDateGroup[] = [];
  private options: TimelineRendererOptions;

  constructor(
    container: HTMLElement,
    actionLabels?: Record<string, string>,
    options?: TimelineRendererOptions
  ) {
    this.container = container;
    this.actionLabels = actionLabels;
    this.options = {
      groupBySession: true,
      showDebugInfo: false,
      ...options,
    };
  }

  /**
   * Update renderer options
   */
  setOptions(options: Partial<TimelineRendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Render the full timeline
   */
  render(entries: ActivityEntry[]): void {
    this.groups = groupEntriesByDate(entries);
    this.container.innerHTML = '';

    if (this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Create timeline container
    const timelineEl = document.createElement('div');
    timelineEl.className = 'timeline';

    this.groups.forEach((group) => {
      // Restore collapsed state
      const dateKey = getDateKey(group.date);
      group.collapsed = this.collapsedGroups.has(dateKey);

      const groupEl = renderDateGroup(
        group,
        this.actionLabels,
        (key, collapsed) => {
          this.handleGroupToggle(key, collapsed);
        },
        {
          groupBySession: this.options.groupBySession,
          showDebugInfo: this.options.showDebugInfo,
          onSessionToggle: (sessionKey, collapsed) => {
            this.handleSessionToggle(sessionKey, collapsed);
          },
          collapsedSessions: this.collapsedSessions,
        }
      );
      timelineEl.appendChild(groupEl);
    });

    this.container.appendChild(timelineEl);
    this.wireMetadataToggles();
  }

  /**
   * Append more entries (for infinite scroll)
   */
  appendEntries(newEntries: ActivityEntry[]): void {
    this.groups = mergeEntriesIntoGroups(this.groups, newEntries);

    // Re-render (could be optimized to only update affected groups)
    const entries = this.groups.flatMap((g) => g.entries);
    this.render(entries);
  }

  /**
   * Clear the timeline
   */
  clear(): void {
    this.container.innerHTML = '';
    this.groups = [];
  }

  /**
   * Get current groups
   */
  getGroups(): TimelineDateGroup[] {
    return this.groups;
  }

  private renderEmptyState(): void {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'timeline-empty';
    emptyEl.innerHTML = `
      <div class="timeline-empty-icon">
        <i class="iconoir-clipboard-check"></i>
      </div>
      <p class="timeline-empty-title">No activity found</p>
      <p class="timeline-empty-subtitle">Activity entries will appear here when actions are logged.</p>
    `;
    this.container.appendChild(emptyEl);
  }

  private handleGroupToggle(dateKey: string, collapsed: boolean): void {
    if (collapsed) {
      this.collapsedGroups.add(dateKey);
    } else {
      this.collapsedGroups.delete(dateKey);
    }

    // Toggle entries visibility
    const groupEl = this.container.querySelector(`[data-date-group="${dateKey}"]`);
    const entriesEl = groupEl?.querySelector('.timeline-entries');
    if (entriesEl) {
      entriesEl.classList.toggle('collapsed', collapsed);
    }
  }

  private handleSessionToggle(sessionKey: string, collapsed: boolean): void {
    if (collapsed) {
      this.collapsedSessions.add(sessionKey);
    } else {
      this.collapsedSessions.delete(sessionKey);
    }

    // Toggle session entries visibility
    const sessionEntriesEl = this.container.querySelector<HTMLElement>(
      `[data-session-entries="${sessionKey}"]`
    );
    if (sessionEntriesEl) {
      sessionEntriesEl.classList.toggle('collapsed', collapsed);
    }
  }

  private wireMetadataToggles(): void {
    const toggles = this.container.querySelectorAll<HTMLButtonElement>('[data-timeline-metadata]');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const entryId = toggle.dataset.timelineMetadata;
        const contentEl = this.container.querySelector<HTMLElement>(
          `[data-timeline-metadata-content="${entryId}"]`
        );

        if (!contentEl) return;

        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        toggle.setAttribute('aria-expanded', newExpanded.toString());
        contentEl.classList.toggle('expanded', newExpanded);

        // Rotate chevron
        const chevron = toggle.querySelector<SVGElement>('.timeline-metadata-chevron');
        if (chevron) {
          chevron.style.transform = newExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    });
  }
}

/**
 * Create loading indicator for infinite scroll
 */
export function createLoadingIndicator(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'timeline-loading';
  el.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `;
  return el;
}

/**
 * Create end-of-timeline indicator
 */
export function createEndIndicator(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'timeline-end';
  el.innerHTML = `
    <span>No more entries</span>
  `;
  return el;
}

/**
 * Create infinite scroll sentinel element
 */
export function createScrollSentinel(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'timeline-sentinel';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

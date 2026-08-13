/**
 * Activity Manager
 * Manages activity feed display with enhanced formatting and view switching
 */

import { createLogger } from '../shared/logger.js';

import type {
  ActivityEntry,
  ActivityPayload,
  ActivityFilterOption,
  ActivityFilterOptionsPayload,
  ActivityConfig,
  ActivitySelectors,
  ActivityState,
  ActivityViewMode,
  ToastNotifier,
} from './types.js';

import {
  parseActionString,
  formatActivitySentence,
  formatTimestamp,
  formatRelativeTime,
  getMetadataSummary,
  formatMetadataExpanded,
  formatEnrichmentDebugInfo,
  escapeHtml,
  formatChannel,
  shortenId,
  getSessionId,
} from './formatters.js';
import { renderIcon } from '../shared/icon-renderer.js';

import { ActivityViewSwitcher } from './activity-view-switcher.js';
import { TimelineRenderer, createLoadingIndicator, createEndIndicator } from './activity-timeline.js';

const logger = createLogger("Activity");

const DEFAULT_SELECTORS: ActivitySelectors = {
  form: '#activity-filters',
  tableBody: '#activity-table-body',
  emptyState: '#activity-empty',
  disabledState: '#activity-disabled',
  errorState: '#activity-error',
  countEl: '#activity-count',
  prevBtn: '#activity-prev',
  nextBtn: '#activity-next',
  refreshBtn: '#activity-refresh',
  clearBtn: '#activity-clear',
  limitInput: '#filter-limit',
};

const TIMELINE_SELECTORS = {
  container: '#activity-timeline',
  sentinel: '#activity-timeline-sentinel',
};

const SCALAR_FIELD_IDS = ['q', 'object_type', 'object_id'];
const MULTI_FIELD_IDS = ['verb', 'channels'];
const DATE_FIELDS = ['since', 'until'];
const PASSTHROUGH_FIELDS = ['user_id', 'actor_id'];
const RAW_OPTION_MAX_BYTES = 256;
const RAW_MULTI_OPTION_MAX_VALUES = 500;

type ActivityAPIError = {
  textCode: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseActivityAPIError(payload: unknown): ActivityAPIError {
  if (!isRecord(payload)) {
    return { textCode: '', message: '' };
  }

  const envelope = isRecord(payload.error) ? payload.error : payload;
  const textCode = typeof envelope.text_code === 'string' ? envelope.text_code.trim() : '';
  const message = typeof envelope.message === 'string' ? envelope.message.trim() : '';

  return { textCode, message };
}

export class ActivityManager {
  private config: ActivityConfig;
  private selectors: ActivitySelectors;
  private toast: ToastNotifier | null;

  private form: HTMLFormElement | null = null;
  private tableBody: HTMLTableSectionElement | null = null;
  private emptyState: HTMLElement | null = null;
  private disabledState: HTMLElement | null = null;
  private errorState: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private limitInput: HTMLSelectElement | null = null;
  private filterOptionsAbortController: AbortController | null = null;
  private filterOptionsRequestGeneration = 0;
  private activityAbortController: AbortController | null = null;
  private activityPaginationAbortController: AbortController | null = null;
  private activityRequestGeneration = 0;

  // Timeline-related properties
  private viewSwitcher: ActivityViewSwitcher | null = null;
  private timelineRenderer: TimelineRenderer | null = null;
  private timelineContainer: HTMLElement | null = null;
  private timelineSentinel: HTMLElement | null = null;
  private infiniteScrollObserver: IntersectionObserver | null = null;
  private isLoadingMore: boolean = false;
  private allEntriesLoaded: boolean = false;

  // Cache entries for view switching
  private cachedEntries: ActivityEntry[] = [];

  private state: ActivityState = {
    limit: 50,
    offset: 0,
    total: 0,
    nextOffset: 0,
    hasMore: false,
    extraParams: {},
  };

  constructor(
    config: ActivityConfig,
    selectors: Partial<ActivitySelectors> = {},
    toast?: ToastNotifier
  ) {
    this.config = config;
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.toast = toast || (window as any).toastManager || null;
  }

  /**
   * Initialize the activity manager
   */
  init(): void {
    this.cacheElements();
    this.initViewSwitcher();
    this.initTimeline();
    this.bindEvents();
    this.syncFromQuery();
    void this.loadFilterOptions();
    this.loadActivity();
  }

  /**
   * Initialize the view switcher
   */
  private initViewSwitcher(): void {
    this.viewSwitcher = new ActivityViewSwitcher(
      {
        container: '#activity-view-switcher',
        tableTab: '[data-view-tab="table"]',
        timelineTab: '[data-view-tab="timeline"]',
        tableView: '#activity-table-container',
        timelineView: '#activity-timeline-container',
        paginationContainer: '#activity-pagination',
      },
      (view) => this.handleViewChange(view)
    );
    this.viewSwitcher.init();
  }

  /**
   * Initialize the timeline renderer
   */
  private initTimeline(): void {
    this.timelineContainer = document.querySelector<HTMLElement>(TIMELINE_SELECTORS.container);
    this.timelineSentinel = document.querySelector<HTMLElement>(TIMELINE_SELECTORS.sentinel);

    if (this.timelineContainer) {
      this.timelineRenderer = new TimelineRenderer(
        this.timelineContainer,
        this.config.actionLabels
      );
    }

    // Set up infinite scroll observer
    this.setupInfiniteScroll();
  }

  /**
   * Handle view change from switcher
   */
  private handleViewChange(view: ActivityViewMode): void {
    if (view === 'timeline') {
      // Reset infinite scroll state when switching to timeline
      this.allEntriesLoaded = false;
      this.isLoadingMore = false;

      // Reset offset to load fresh data from the beginning
      this.state.offset = 0;

      // Fetch fresh data when switching to timeline
      this.loadActivity();

      // Enable infinite scroll observer
      this.enableInfiniteScroll();
    } else {
      // Disable infinite scroll when switching to table view
      this.disableInfiniteScroll();

      // Reset offset and fetch fresh data when switching to table view
      this.state.offset = 0;
      this.loadActivity();
    }
  }

  /**
   * Set up infinite scroll for timeline view
   */
  private setupInfiniteScroll(): void {
    if (!this.timelineSentinel) return;

    this.infiniteScrollObserver = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && !this.isLoadingMore && !this.allEntriesLoaded) {
          this.loadMoreEntries();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0,
      }
    );
  }

  /**
   * Enable infinite scroll observation
   */
  private enableInfiniteScroll(): void {
    if (this.infiniteScrollObserver && this.timelineSentinel) {
      this.infiniteScrollObserver.observe(this.timelineSentinel);
    }
  }

  /**
   * Disable infinite scroll observation
   */
  private disableInfiniteScroll(): void {
    if (this.infiniteScrollObserver && this.timelineSentinel) {
      this.infiniteScrollObserver.unobserve(this.timelineSentinel);
    }
  }

  /**
   * Load more entries for infinite scroll
   */
  private async loadMoreEntries(): Promise<void> {
    if (
      this.isLoadingMore
      || this.activityAbortController !== null
      || this.allEntriesLoaded
      || !this.state.hasMore
    ) {
      return;
    }

    const generation = this.activityRequestGeneration;
    const requestedOffset = this.state.nextOffset;
    const controller = new AbortController();
    this.activityPaginationAbortController = controller;
    this.isLoadingMore = true;

    // Show loading indicator
    const loadingIndicator = createLoadingIndicator();
    this.timelineSentinel?.parentElement?.insertBefore(loadingIndicator, this.timelineSentinel);

    try {
      const params = this.buildParams();
      params.set('offset', String(requestedOffset));

      const url = `${this.config.apiPath}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (generation !== this.activityRequestGeneration || controller.signal.aborted) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to load more entries (${response.status})`);
      }

      const payload: ActivityPayload = await response.json();
      if (generation !== this.activityRequestGeneration || controller.signal.aborted) {
        return;
      }
      const entries = Array.isArray(payload.entries) ? payload.entries : [];

      // Update state
      this.state.hasMore = Boolean(payload.has_more);
      this.state.nextOffset =
        typeof payload.next_offset === 'number'
          ? payload.next_offset
          : requestedOffset + entries.length;

      if (entries.length === 0) {
        this.allEntriesLoaded = true;
      } else {
        // Add to cached entries
        this.cachedEntries = [...this.cachedEntries, ...entries];

        // Append to timeline
        if (this.timelineRenderer) {
          this.timelineRenderer.appendEntries(entries);
        }
      }

      // Check if all entries loaded
      if (!this.state.hasMore) {
        this.allEntriesLoaded = true;
        const endIndicator = createEndIndicator();
        this.timelineSentinel?.parentElement?.insertBefore(endIndicator, this.timelineSentinel);
      }
    } catch (err) {
      if (generation === this.activityRequestGeneration && !controller.signal.aborted) {
        logger.error('Failed to load more entries:', err);
      }
    } finally {
      // Remove loading indicator
      loadingIndicator.remove();
      if (this.activityPaginationAbortController === controller) {
        this.activityPaginationAbortController = null;
        this.isLoadingMore = false;
      }
    }
  }

  private cacheElements(): void {
    this.form = document.querySelector<HTMLFormElement>(this.selectors.form);
    this.tableBody = document.querySelector<HTMLTableSectionElement>(this.selectors.tableBody);
    this.emptyState = document.querySelector<HTMLElement>(this.selectors.emptyState);
    this.disabledState = document.querySelector<HTMLElement>(this.selectors.disabledState);
    this.errorState = document.querySelector<HTMLElement>(this.selectors.errorState);
    this.countEl = document.querySelector<HTMLElement>(this.selectors.countEl);
    this.prevBtn = document.querySelector<HTMLButtonElement>(this.selectors.prevBtn);
    this.nextBtn = document.querySelector<HTMLButtonElement>(this.selectors.nextBtn);
    this.refreshBtn = document.querySelector<HTMLButtonElement>(this.selectors.refreshBtn);
    this.clearBtn = document.querySelector<HTMLButtonElement>(this.selectors.clearBtn);
    this.limitInput = document.querySelector<HTMLSelectElement>(this.selectors.limitInput);
  }

  private bindEvents(): void {
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.state.limit = parseInt(this.limitInput?.value || '50', 10) || 50;
      this.state.offset = 0;
      this.loadActivity();
    });

    this.clearBtn?.addEventListener('click', () => {
      SCALAR_FIELD_IDS.forEach((name) => this.setInputValue(name, ''));
      MULTI_FIELD_IDS.forEach((name) => this.setInputValues(name, []));
      DATE_FIELDS.forEach((name) => this.setInputValue(name, ''));
      this.state.offset = 0;
      this.loadActivity();
    });

    this.prevBtn?.addEventListener('click', () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit);
      this.loadActivity();
    });

    this.nextBtn?.addEventListener('click', () => {
      if (!this.state.hasMore) return;
      this.state.offset = this.state.nextOffset;
      this.loadActivity();
    });

    this.refreshBtn?.addEventListener('click', () => {
      void this.loadFilterOptions();
      this.loadActivity();
    });
  }

  private getInputValue(name: string): string {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!input) return '';
    return String((input as HTMLInputElement).value || '').trim();
  }

  private setInputValue(name: string, value: string): void {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!input) return;
    if (input instanceof HTMLSelectElement && value && !this.selectHasValue(input, value)) {
      input.add(new Option(value, value));
    }
    (input as HTMLInputElement | HTMLSelectElement).value = value || '';
  }

  private getInputValues(name: string): string[] {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!(input instanceof HTMLSelectElement)) return [];
    return Array.from(input.selectedOptions)
      .map((option) => option.value.trim())
      .filter((value) => value !== '');
  }

  private setInputValues(name: string, values: string[]): void {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!(input instanceof HTMLSelectElement)) return;
    const normalized = this.normalizeRawValues(values);
    normalized.forEach((value) => {
      if (!this.selectHasValue(input, value)) {
        input.add(new Option(value, value));
      }
    });
    const selected = new Set(normalized);
    Array.from(input.options).forEach((option) => {
      option.selected = option.value === '' ? selected.size === 0 : selected.has(option.value);
    });
  }

  private selectHasValue(select: HTMLSelectElement, value: string): boolean {
    return Array.from(select.options).some((option) => option.value === value);
  }

  private normalizeRawValues(values: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of values) {
      for (const part of raw.split(',')) {
        const value = part.trim();
        if (!value || seen.has(value) || new TextEncoder().encode(value).length > RAW_OPTION_MAX_BYTES) {
          continue;
        }
        seen.add(value);
        normalized.push(value);
        if (normalized.length === RAW_MULTI_OPTION_MAX_VALUES) {
          return normalized;
        }
      }
    }
    return normalized;
  }

  private toLocalInput(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const offset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
  }

  private toRFC3339(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  }

  private syncFromQuery(): void {
    const params = new URLSearchParams(window.location.search);
    const limit = parseInt(params.get('limit') || '', 10);
    const offset = parseInt(params.get('offset') || '', 10);

    if (!Number.isNaN(limit) && limit > 0) {
      this.state.limit = limit;
    }
    if (!Number.isNaN(offset) && offset >= 0) {
      this.state.offset = offset;
    }

    if (this.limitInput) {
      this.limitInput.value = String(this.state.limit);
    }

    SCALAR_FIELD_IDS.forEach((name) => this.setInputValue(name, params.get(name) || ''));
    MULTI_FIELD_IDS.forEach((name) => this.setInputValues(name, this.normalizeRawValues(params.getAll(name))));
    DATE_FIELDS.forEach((name) => this.setInputValue(name, this.toLocalInput(params.get(name) || '')));
    PASSTHROUGH_FIELDS.forEach((name) => {
      const val = params.get(name);
      if (val) {
        this.state.extraParams[name] = val;
      }
    });

    // View param is handled by ActivityViewSwitcher
  }

  private buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    params.set('limit', String(this.state.limit));
    params.set('offset', String(this.state.offset));

    SCALAR_FIELD_IDS.forEach((name) => {
      const value = this.getInputValue(name);
      if (value) params.set(name, value);
    });

    MULTI_FIELD_IDS.forEach((name) => {
      this.getInputValues(name).forEach((value) => params.append(name, value));
    });

    DATE_FIELDS.forEach((name) => {
      const value = this.toRFC3339(this.getInputValue(name));
      if (value) params.set(name, value);
    });

    Object.entries(this.state.extraParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return params;
  }

  private buildFilterOptionsParams(): URLSearchParams {
    const params = new URLSearchParams();
    MULTI_FIELD_IDS.forEach((name) => {
      this.getInputValues(name).forEach((value) => params.append(name, value));
    });
    const objectType = this.getInputValue('object_type');
    if (objectType) {
      params.set('object_type', objectType);
    }
    return params;
  }

  private filterOptionsURL(params: URLSearchParams): string {
    const path = this.config.filterOptionsPath || `${this.config.apiPath}/filter-options`;
    const query = params.toString();
    if (!query) return path;
    return `${path}${path.includes('?') ? '&' : '?'}${query}`;
  }

  private async loadFilterOptions(): Promise<void> {
    const generation = ++this.filterOptionsRequestGeneration;
    this.filterOptionsAbortController?.abort();
    const controller = new AbortController();
    this.filterOptionsAbortController = controller;

    try {
      const response = await fetch(this.filterOptionsURL(this.buildFilterOptionsParams()), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load activity filter options (${response.status})`);
      }
      const payload: unknown = await response.json();
      if (generation !== this.filterOptionsRequestGeneration || controller.signal.aborted) {
        return;
      }
      const options = this.parseFilterOptionsPayload(payload);
      this.replaceFilterOptions('verb', options.verbs, 'All verbs');
      this.replaceFilterOptions('channels', options.channels, 'All channels');
      this.replaceFilterOptions('object_type', options.object_types, 'All object types');
    } catch (err) {
      if (!controller.signal.aborted && generation === this.filterOptionsRequestGeneration) {
        logger.warn('Failed to refresh activity filter options:', err);
      }
    } finally {
      if (generation === this.filterOptionsRequestGeneration) {
        this.filterOptionsAbortController = null;
      }
    }
  }

  private parseFilterOptionsPayload(payload: unknown): ActivityFilterOptionsPayload {
    if (!isRecord(payload)
      || !Array.isArray(payload.verbs)
      || !Array.isArray(payload.channels)
      || !Array.isArray(payload.object_types)) {
      throw new Error('Invalid activity filter options response');
    }
    const record = payload;
    return {
      verbs: this.parseFilterOptionList(record.verbs),
      channels: this.parseFilterOptionList(record.channels),
      object_types: this.parseFilterOptionList(record.object_types),
      revision: typeof record.revision === 'string' ? record.revision : undefined,
    };
  }

  private parseFilterOptionList(value: unknown): ActivityFilterOption[] {
    if (!Array.isArray(value)) return [];
    const options: ActivityFilterOption[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      if (!isRecord(item) || typeof item.value !== 'string' || typeof item.label !== 'string') {
        continue;
      }
      const optionValue = item.value.trim();
      const label = item.label.trim() || optionValue;
      if (!optionValue || seen.has(optionValue)) continue;
      seen.add(optionValue);
      options.push({ value: optionValue, label });
    }
    return options;
  }

  private replaceFilterOptions(name: string, options: ActivityFilterOption[], emptyLabel: string): void {
    const control = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!(control instanceof HTMLSelectElement)) return;
    const selected = name === 'object_type' ? this.normalizeRawValues([control.value]).slice(0, 1) : this.getInputValues(name);
    control.replaceChildren(new Option(emptyLabel, ''));
    options.forEach((option) => control.add(new Option(option.label, option.value)));
    if (name === 'object_type') {
      this.setInputValue(name, selected[0] || '');
    } else {
      this.setInputValues(name, selected);
    }
  }

  private syncUrl(params: URLSearchParams): void {
    // Preserve view param
    if (this.viewSwitcher) {
      ActivityViewSwitcher.addViewToParams(params, this.viewSwitcher.getView());
    }

    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', next);
  }

  private resetStates(): void {
    this.disabledState?.classList.add('hidden');
    this.errorState?.classList.add('hidden');
  }

  private showError(message: string): void {
    if (this.errorState) {
      this.errorState.textContent = message;
      this.errorState.classList.remove('hidden');
    }
  }

  private showDisabled(message: string): void {
    if (this.disabledState) {
      this.disabledState.textContent = message;
      this.disabledState.classList.remove('hidden');
    }
  }

  async loadActivity(): Promise<void> {
    const generation = ++this.activityRequestGeneration;
    this.activityAbortController?.abort();
    this.activityPaginationAbortController?.abort();
    this.activityPaginationAbortController = null;
    this.isLoadingMore = false;
    const controller = new AbortController();
    this.activityAbortController = controller;
    this.resetStates();
    const params = this.buildParams();
    this.syncUrl(params);

    const url = `${this.config.apiPath}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (generation !== this.activityRequestGeneration || controller.signal.aborted) {
        return;
      }
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        if (generation !== this.activityRequestGeneration || controller.signal.aborted) {
          return;
        }
        const apiError = parseActivityAPIError(payload);

        if (response.status === 404 && apiError.textCode === 'FEATURE_DISABLED') {
          this.showDisabled(apiError.message || 'Activity feature disabled.');
          this.renderRows([]);
          this.updatePagination(0);
          return;
        }

        this.showError(apiError.message || `Failed to load activity (${response.status})`);
        return;
      }

      const payload: ActivityPayload = await response.json();
      if (generation !== this.activityRequestGeneration || controller.signal.aborted) {
        return;
      }
      const entries = Array.isArray(payload.entries) ? payload.entries : [];

      this.state.total = typeof payload.total === 'number' ? payload.total : entries.length;
      this.state.hasMore = Boolean(payload.has_more);
      this.state.nextOffset =
        typeof payload.next_offset === 'number'
          ? payload.next_offset
          : this.state.offset + entries.length;

      // Cache entries for view switching
      this.cachedEntries = entries;

      // Reset infinite scroll state
      this.allEntriesLoaded = !this.state.hasMore;
      this.isLoadingMore = false;

      // Render based on current view
      const currentView = this.viewSwitcher?.getView() || 'table';
      if (currentView === 'timeline') {
        this.renderTimeline(entries);
      } else {
        this.renderRows(entries);
      }
      this.updatePagination(entries.length);
    } catch (_err) {
      if (!controller.signal.aborted && generation === this.activityRequestGeneration) {
        this.showError('Failed to load activity.');
      }
    } finally {
      if (generation === this.activityRequestGeneration) {
        this.activityAbortController = null;
      }
    }
  }

  /**
   * Render entries in timeline view
   */
  private renderTimeline(entries: ActivityEntry[]): void {
    if (!this.timelineRenderer) return;

    // Clear any existing end indicators
    const existingEnd = this.timelineContainer?.parentElement?.querySelector('.timeline-end');
    existingEnd?.remove();

    this.timelineRenderer.render(entries);

    // Enable infinite scroll
    this.enableInfiniteScroll();
  }

  private renderRows(entries: ActivityEntry[]): void {
    if (!this.tableBody) return;

    this.tableBody.innerHTML = '';

    if (!entries || entries.length === 0) {
      this.emptyState?.classList.remove('hidden');
      return;
    }

    this.emptyState?.classList.add('hidden');

    let lastSessionId = '';
    entries.forEach((entry) => {
      const sessionId = getSessionId(entry);
      if (sessionId && sessionId !== lastSessionId) {
        this.tableBody!.appendChild(this.createSessionRow(sessionId));
        lastSessionId = sessionId;
      } else if (!sessionId) {
        lastSessionId = '';
      }
      const { mainRow, detailsRow } = this.createRowPair(entry);
      this.tableBody!.appendChild(mainRow);
      if (detailsRow) {
        this.tableBody!.appendChild(detailsRow);
      }
    });

    // Wire up metadata toggles
    this.wireMetadataToggles();
  }

  private createRowPair(entry: ActivityEntry): { mainRow: HTMLTableRowElement; detailsRow: HTMLTableRowElement | null } {
    const actionLabels = this.config.actionLabels || {};
    const parsedAction = parseActionString(entry.action, actionLabels);
    // Use showActorTypeBadge option to embed actor type badge in sentence
    const sentence = formatActivitySentence(entry, actionLabels, { showActorTypeBadge: true });
    const timestamp = formatTimestamp(entry.created_at);
    const relativeTime = formatRelativeTime(entry.created_at);
    const metadataSummary = getMetadataSummary(entry.metadata);
    const metadataContent = formatMetadataExpanded(entry.metadata);
    const enrichmentDebug = formatEnrichmentDebugInfo(entry);
    const shortChannel = formatChannel(entry.channel);

    // Determine if we should show a details row:
    // - metadataSummary is non-empty (includes 'hidden' for hidden metadata)
    // - OR enrichmentDebug is non-empty
    const hasMetadata = Boolean(metadataSummary);
    const hasDebugInfo = Boolean(enrichmentDebug);
    const showDetailsRow = hasMetadata || hasDebugInfo;

    // Color scheme for action categories
    const categoryColors: Record<string, { bg: string; color: string; border: string }> = {
      created: { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
      updated: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
      deleted: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
      auth: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
      viewed: { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
      system: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
    };
    const colors = categoryColors[parsedAction.category] || categoryColors.system;

    const mainRow = document.createElement('tr');
    mainRow.className = `activity-row activity-row--${parsedAction.category}`;

    // Build action cell with namespace icon and action badge
    let actionCellHtml = '';
    if (parsedAction.namespace) {
      // Dotted action like "debug.repl.close" - show namespace icon + action badge
      actionCellHtml = `
        <div class="activity-action-cell">
          <span class="activity-namespace-icon" title="${escapeHtml(parsedAction.namespace)}">
            ${renderIcon(`iconoir:${parsedAction.icon}`, { size: '14px' })}
          </span>
          <span class="activity-action-badge activity-action-badge--${parsedAction.category}"
                title="${escapeHtml(parsedAction.action)}">
            <span class="activity-action-label">${escapeHtml(parsedAction.action)}</span>
          </span>
        </div>
      `;
    } else {
      // Simple action - show as colored badge with icon
      actionCellHtml = `
        <span class="activity-action-badge activity-action-badge--${parsedAction.category}"
              title="${escapeHtml(parsedAction.action || '-')}">
          <span class="activity-action-badge-icon">${renderIcon(`iconoir:${parsedAction.icon}`, { size: '14px' })}</span>
          <span class="activity-action-label">${escapeHtml(parsedAction.action || '-')}</span>
        </span>
      `;
    }

    // Build channel cell with shortened ID and copy tooltip
    let channelHtml = '';
    if (entry.channel) {
      channelHtml = `
        <span class="activity-channel" title="${escapeHtml(entry.channel)}">
          ${escapeHtml(shortChannel)}
        </span>
      `;
    } else {
      channelHtml = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    }

    // Build metadata toggle button
    let metadataCellHtml = '';
    if (showDetailsRow) {
      // Determine button label and style
      let buttonLabel = metadataSummary || '';
      let buttonClass = 'activity-metadata-toggle';
      let buttonIcon = '';

      // Handle hidden metadata case (support role scenario)
      if (metadataSummary === 'hidden') {
        buttonLabel = 'Hidden';
        buttonClass += ' activity-metadata-toggle--hidden';
        buttonIcon = '<i class="iconoir-eye-off activity-metadata-icon"></i>';
      } else if (!hasMetadata && hasDebugInfo) {
        // Only debug info, no metadata
        buttonLabel = 'Debug';
        buttonClass += ' activity-metadata-toggle--debug';
        buttonIcon = '<i class="iconoir-info-circle activity-metadata-icon"></i>';
      }

      metadataCellHtml = `
        <button type="button"
                class="${buttonClass}"
                aria-expanded="false"
                data-metadata-toggle="${entry.id}">
          ${buttonIcon}
          <span class="activity-metadata-toggle-label">${buttonLabel}</span>
          <svg class="activity-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      `;
    } else {
      metadataCellHtml = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    }

    mainRow.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${colors.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${timestamp}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${relativeTime}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${actionCellHtml}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${sentence}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${channelHtml}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${metadataCellHtml}</td>
    `;

    // Create details row (hidden by default) if there's metadata or debug info
    let detailsRow: HTMLTableRowElement | null = null;
    if (showDetailsRow) {
      detailsRow = document.createElement('tr');
      detailsRow.className = 'activity-details-row';
      detailsRow.style.display = 'none';
      detailsRow.dataset.metadataContent = entry.id;

      // Build content: metadata grid (if any) + debug info (if any)
      let detailsContent = '';
      if (hasMetadata) {
        detailsContent += `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
            ${metadataContent}
          </div>
        `;
      }
      if (hasDebugInfo) {
        detailsContent += enrichmentDebug;
      }

      detailsRow.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${colors.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            ${detailsContent}
          </div>
        </td>
      `;
    }

    return { mainRow, detailsRow };
  }

  private createSessionRow(sessionId: string): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'activity-session-row';

    const shortSessionId = shortenId(sessionId, 10);
    row.innerHTML = `
      <td colspan="5" style="padding: 8px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">
          <span>Session</span>
          <span style="font-family: ui-monospace, monospace; font-weight: 600; color: #374151;" title="${escapeHtml(sessionId)}">${escapeHtml(shortSessionId)}</span>
        </div>
      </td>
    `;

    return row;
  }

  private wireMetadataToggles(): void {
    const toggles = document.querySelectorAll<HTMLButtonElement>('[data-metadata-toggle]');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const entryId = toggle.dataset.metadataToggle;
        // Find the details row (separate tr element)
        const detailsRow = document.querySelector<HTMLTableRowElement>(`tr[data-metadata-content="${entryId}"]`);

        if (!detailsRow) return;

        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        // Toggle the details row visibility
        detailsRow.style.display = newExpanded ? 'table-row' : 'none';
        toggle.setAttribute('aria-expanded', newExpanded ? 'true' : 'false');
      });
    });
  }

  private updatePagination(count: number): void {
    const total = Number.isFinite(this.state.total) ? this.state.total : 0;
    const start = count > 0 ? this.state.offset + 1 : 0;
    const end = this.state.offset + count;

    if (this.countEl) {
      if (total > 0) {
        this.countEl.textContent = `Showing ${start}-${end} of ${total}`;
      } else if (count > 0) {
        this.countEl.textContent = `Showing ${start}-${end}`;
      } else {
        this.countEl.textContent = 'No activity entries';
      }
    }

    if (this.prevBtn) {
      this.prevBtn.disabled = this.state.offset <= 0;
    }

    if (this.nextBtn) {
      this.nextBtn.disabled = !this.state.hasMore;
    }
  }
}

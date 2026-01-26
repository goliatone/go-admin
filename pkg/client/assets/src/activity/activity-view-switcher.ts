/**
 * Activity View Switcher
 * Manages switching between table and timeline views with state persistence
 */

import type { ActivityViewMode, ViewSwitcherSelectors } from './types.js';

const DEFAULT_SELECTORS: ViewSwitcherSelectors = {
  container: '#activity-view-switcher',
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: '#activity-table-container',
  timelineView: '#activity-timeline-container',
  paginationContainer: '#activity-pagination',
};

const STORAGE_KEY = 'activity-view-preference';
const URL_PARAM = 'view';

export class ActivityViewSwitcher {
  private selectors: ViewSwitcherSelectors;
  private currentView: ActivityViewMode = 'table';
  private onViewChange?: (view: ActivityViewMode) => void;

  private container: HTMLElement | null = null;
  private tableTab: HTMLElement | null = null;
  private timelineTab: HTMLElement | null = null;
  private tableView: HTMLElement | null = null;
  private timelineView: HTMLElement | null = null;
  private paginationContainer: HTMLElement | null = null;

  constructor(
    selectors: Partial<ViewSwitcherSelectors> = {},
    onViewChange?: (view: ActivityViewMode) => void
  ) {
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.onViewChange = onViewChange;
  }

  /**
   * Initialize the view switcher
   */
  init(): void {
    this.cacheElements();
    this.bindEvents();
    this.restoreView();
  }

  /**
   * Get the current view mode
   */
  getView(): ActivityViewMode {
    return this.currentView;
  }

  /**
   * Set the view mode programmatically
   */
  setView(view: ActivityViewMode, options: { persist?: boolean; updateUrl?: boolean } = {}): void {
    const { persist = true, updateUrl = true } = options;

    if (view !== 'table' && view !== 'timeline') {
      view = 'table';
    }

    this.currentView = view;
    this.updateUI();

    if (persist) {
      this.persistView();
    }

    if (updateUrl) {
      this.updateUrlParam();
    }

    // Emit view change event
    this.emitViewChange();
  }

  /**
   * Destroy the view switcher and clean up event listeners
   */
  destroy(): void {
    this.tableTab?.removeEventListener('click', this.handleTableClick);
    this.timelineTab?.removeEventListener('click', this.handleTimelineClick);
  }

  private cacheElements(): void {
    this.container = document.querySelector<HTMLElement>(this.selectors.container);
    this.tableTab = document.querySelector<HTMLElement>(this.selectors.tableTab);
    this.timelineTab = document.querySelector<HTMLElement>(this.selectors.timelineTab);
    this.tableView = document.querySelector<HTMLElement>(this.selectors.tableView);
    this.timelineView = document.querySelector<HTMLElement>(this.selectors.timelineView);
    this.paginationContainer = document.querySelector<HTMLElement>(this.selectors.paginationContainer);
  }

  private handleTableClick = (): void => {
    this.setView('table');
  };

  private handleTimelineClick = (): void => {
    this.setView('timeline');
  };

  private bindEvents(): void {
    this.tableTab?.addEventListener('click', this.handleTableClick);
    this.timelineTab?.addEventListener('click', this.handleTimelineClick);
  }

  /**
   * Restore view from URL param or localStorage
   */
  private restoreView(): void {
    // URL param takes precedence
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get(URL_PARAM) as ActivityViewMode | null;

    if (urlView === 'table' || urlView === 'timeline') {
      this.setView(urlView, { persist: true, updateUrl: false });
      return;
    }

    // Fall back to localStorage
    const storedView = localStorage.getItem(STORAGE_KEY) as ActivityViewMode | null;
    if (storedView === 'table' || storedView === 'timeline') {
      this.setView(storedView, { persist: false, updateUrl: true });
      return;
    }

    // Default to table view
    this.setView('table', { persist: false, updateUrl: false });
  }

  /**
   * Update UI elements to reflect current view
   */
  private updateUI(): void {
    const isTable = this.currentView === 'table';

    // Update tab states
    if (this.tableTab) {
      this.tableTab.setAttribute('aria-selected', isTable ? 'true' : 'false');
      this.tableTab.classList.toggle('active', isTable);
    }
    if (this.timelineTab) {
      this.timelineTab.setAttribute('aria-selected', !isTable ? 'true' : 'false');
      this.timelineTab.classList.toggle('active', !isTable);
    }

    // Show/hide views
    if (this.tableView) {
      this.tableView.classList.toggle('hidden', !isTable);
    }
    if (this.timelineView) {
      this.timelineView.classList.toggle('hidden', isTable);
    }

    // Show/hide pagination (only visible in table view)
    if (this.paginationContainer) {
      this.paginationContainer.classList.toggle('hidden', !isTable);
    }
  }

  /**
   * Persist view preference to localStorage
   */
  private persistView(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.currentView);
    } catch {
      // localStorage not available, ignore
    }
  }

  /**
   * Update URL parameter without page reload
   */
  private updateUrlParam(): void {
    const params = new URLSearchParams(window.location.search);

    if (this.currentView === 'table') {
      // Remove view param when table (default)
      params.delete(URL_PARAM);
    } else {
      params.set(URL_PARAM, this.currentView);
    }

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Emit view change event
   */
  private emitViewChange(): void {
    if (this.onViewChange) {
      this.onViewChange(this.currentView);
    }

    // Also dispatch custom event for other components
    const event = new CustomEvent('activity:viewchange', {
      bubbles: true,
      detail: { view: this.currentView },
    });
    document.dispatchEvent(event);
  }

  /**
   * Get view param for inclusion in API requests
   */
  static getViewFromUrl(): ActivityViewMode {
    const params = new URLSearchParams(window.location.search);
    const view = params.get(URL_PARAM);
    return view === 'timeline' ? 'timeline' : 'table';
  }

  /**
   * Add view param to existing URLSearchParams (for query sync)
   */
  static addViewToParams(params: URLSearchParams, view: ActivityViewMode): void {
    if (view === 'timeline') {
      params.set(URL_PARAM, view);
    } else {
      params.delete(URL_PARAM);
    }
  }
}

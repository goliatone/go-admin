/**
 * TabsController - Manages tab navigation and content loading for resource detail views
 */

import type { TabLink, TabPanelContainer, TabControllerOptions } from './types';
import { hydrateTimeElements } from './formatters';
import { renderClientTab } from './renderers';

export class TabsController {
  private tabsNav: HTMLElement;
  private panelContainer: TabPanelContainer;
  private tabLinks: TabLink[];
  private basePath: string;
  private apiBasePath: string;
  private panelName: string;
  private recordId: string;
  private options: TabControllerOptions;

  constructor(
    tabsNav: HTMLElement,
    panelContainer: TabPanelContainer,
    options: TabControllerOptions = {}
  ) {
    this.tabsNav = tabsNav;
    this.panelContainer = panelContainer;
    this.tabLinks = Array.from(tabsNav.querySelectorAll('[data-tab-id]')) as TabLink[];
    this.basePath = (panelContainer.dataset.basePath || '').replace(/\/$/, '');
    this.apiBasePath = (panelContainer.dataset.apiBasePath || '').replace(/\/$/, '');
    this.panelName = panelContainer.dataset.panel || '';
    this.recordId = panelContainer.dataset.recordId || '';
    this.options = options;

    this.init();
  }

  private init(): void {
    // Bind click handler
    this.tabsNav.addEventListener('click', this.handleTabClick.bind(this));

    // Hydrate any existing time elements
    hydrateTimeElements(this.panelContainer);

    // Load active client tab if needed
    const activeLink = this.tabsNav.querySelector('.panel-tab-active') as TabLink | null;
    if (activeLink?.dataset.renderMode === 'client') {
      this.loadTab(activeLink, { silent: true });
    }
  }

  private buildEndpoint(kind: 'html' | 'json', tabId: string): string {
    if (!this.basePath || !this.panelName || !this.recordId || !tabId) {
      return '';
    }

    const safeTab = encodeURIComponent(tabId);
    const safeRecord = encodeURIComponent(this.recordId);

    if (kind === 'json') {
      const apiRoot = this.apiBasePath || `${this.basePath}/api`;
      return `${apiRoot}/${this.panelName}/${safeRecord}/tabs/${safeTab}`;
    }

    return `${this.basePath}/${this.panelName}/${safeRecord}/tabs/${safeTab}`;
  }

  private setActiveTab(tabId: string): void {
    this.tabLinks.forEach((link) => {
      const isActive = link.dataset.tabId === tabId;
      link.classList.toggle('panel-tab-active', isActive);
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    this.panelContainer.dataset.activeTab = tabId || '';

    this.options.onTabChange?.(tabId);
  }

  private updateUrl(href: string): void {
    if (!href) return;
    try {
      window.history.pushState({ tab: href }, '', href);
    } catch (err) {
      console.warn('[TabsController] Unable to update URL', err);
    }
  }

  private handleTabClick(event: Event): void {
    const link = (event.target as Element).closest('[data-tab-id]') as TabLink | null;
    if (!link) return;

    const mode = link.dataset.renderMode || '';
    if (mode !== 'hybrid' && mode !== 'client') return;

    event.preventDefault();
    this.loadTab(link);
  }

  async loadTab(link: TabLink, options?: { silent?: boolean }): Promise<boolean> {
    const mode = link.dataset.renderMode || '';
    const tabId = link.dataset.tabId || '';

    if (!mode || !tabId) return false;

    const href = link.getAttribute('href') || '';
    this.setActiveTab(tabId);

    if (!options?.silent) {
      this.updateUrl(href);
    }

    this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';

    try {
      if (mode === 'hybrid') {
        const endpoint = this.buildEndpoint('html', tabId);
        if (!endpoint) throw new Error('missing html endpoint');

        const response = await fetch(endpoint, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });

        if (!response.ok) throw new Error(`tab html ${response.status}`);

        this.panelContainer.innerHTML = await response.text();
        hydrateTimeElements(this.panelContainer);
        return true;
      }

      if (mode === 'client') {
        const endpoint = this.buildEndpoint('json', tabId);
        if (!endpoint) throw new Error('missing json endpoint');

        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error(`tab json ${response.status}`);

        const payload = await response.json();
        this.panelContainer.innerHTML = renderClientTab(payload);
        hydrateTimeElements(this.panelContainer);
        return true;
      }
    } catch (err) {
      console.warn('[TabsController] Failed to load tab', err);
      this.options.onError?.(err as Error);

      if (href) {
        window.location.href = href;
      }
    }

    return false;
  }

  /**
   * Get the currently active tab ID
   */
  getActiveTabId(): string {
    return this.panelContainer.dataset.activeTab || '';
  }

  /**
   * Programmatically switch to a tab by ID
   */
  switchToTab(tabId: string): void {
    const link = this.tabLinks.find((l) => l.dataset.tabId === tabId);
    if (link) {
      this.loadTab(link);
    }
  }
}

/**
 * Initialize tabs controller for a page
 * Returns the controller instance or null if required elements are not found
 */
export function initTabsController(options?: TabControllerOptions): TabsController | null {
  const tabsNav = document.querySelector('.panel-tabs') as HTMLElement | null;
  const panelContainer = document.querySelector('[data-tab-panel-container]') as TabPanelContainer | null;

  if (!tabsNav || !panelContainer) {
    return null;
  }

  return new TabsController(tabsNav, panelContainer, options);
}

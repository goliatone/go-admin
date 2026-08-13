// Debug Manager
// Coordinates the FAB and Toolbar components, sharing WebSocket connection and state

import { DebugFab } from './debug-fab.js';
import type { DebugToolbar } from './debug-toolbar.js';
import { loadDebugToolbar } from './toolbar-loader.js';
import { normalizeDebugBasePath } from '../shared/path-helpers.js';

export interface DebugManagerOptions {
  basePath?: string;
  debugPath?: string;
  liveTransportEnabled?: boolean;
  panels?: string[];
  slowThresholdMs?: number;
  container?: HTMLElement;
}

export class DebugManager {
  private fab: DebugFab | null = null;
  private toolbar: DebugToolbar | null = null;
  private options: DebugManagerOptions;
  private initialized = false;
  private expanded = false;
  private toolbarMountGeneration = 0;

  constructor(options: DebugManagerOptions = {}) {
    this.options = {
      panels: ['requests', 'sql', 'logs', 'routes', 'config'],
      slowThresholdMs: 50,
      container: document.body,
      ...options,
    };

    const normalizedBasePath = normalizeDebugBasePath(this.options.basePath);
    if (normalizedBasePath) {
      this.options.basePath = normalizedBasePath;
    }
    if (!this.options.debugPath && normalizedBasePath) {
      this.options.debugPath = `${normalizedBasePath}/debug`;
    }
  }

  /**
   * Initialize the debug UI with FAB and Toolbar
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.createFab();
    this.wireFabEvents();
    if (this.shouldRestoreExpanded()) this.expand();
  }

  /**
   * Destroy the debug UI
   */
  public destroy(): void {
    this.toolbarMountGeneration += 1;
    if (this.fab) {
      this.fab.remove();
      this.fab = null;
    }
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
    this.initialized = false;
    this.expanded = false;
  }

  /**
   * Expand the toolbar programmatically
   */
  public expand(): void {
    if (!this.fab) return;
    this.expanded = true;
    this.fab.setToolbarLoadError(false);
    this.fab.setToolbarLoading(true);
    this.fab.setToolbarExpanded(true);
    void this.ensureToolbar();
  }

  /**
   * Collapse the toolbar programmatically
   */
  public collapse(): void {
    if (!this.fab) return;
    this.expanded = false;
    this.fab.setToolbarLoading(false);
    this.fab.setToolbarExpanded(false);
    this.toolbar?.setExpanded(false);
  }

  /**
   * Toggle the toolbar state
   */
  public toggle(): void {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private createFab(): void {
    this.fab = document.createElement('debug-fab') as DebugFab;
    if (this.options.debugPath) {
      this.fab.setAttribute('debug-path', this.options.debugPath);
    }
    if (this.options.basePath) {
      this.fab.setAttribute('base-path', this.options.basePath);
    }
    if (typeof this.options.liveTransportEnabled === 'boolean') {
      this.fab.setAttribute('live-transport', this.options.liveTransportEnabled ? 'true' : 'false');
    }
    if (this.options.panels) {
      this.fab.setAttribute('panels', this.options.panels.join(','));
    }
    this.options.container?.appendChild(this.fab);
  }

  private createToolbar(Toolbar: typeof DebugToolbar): DebugToolbar {
    this.toolbar = new Toolbar();
    if (this.options.debugPath) {
      this.toolbar.setAttribute('debug-path', this.options.debugPath);
    }
    if (this.options.basePath) {
      this.toolbar.setAttribute('base-path', this.options.basePath);
    }
    if (typeof this.options.liveTransportEnabled === 'boolean') {
      this.toolbar.setAttribute('live-transport', this.options.liveTransportEnabled ? 'true' : 'false');
    }
    this.toolbar.setAttribute('use-fab', 'true');
    if (this.options.panels) {
      this.toolbar.setAttribute('panels', this.options.panels.join(','));
    }
    if (this.options.slowThresholdMs) {
      this.toolbar.setAttribute('slow-threshold-ms', String(this.options.slowThresholdMs));
    }
    this.options.container?.appendChild(this.toolbar);
    return this.toolbar;
  }

  private wireFabEvents(): void {
    if (!this.fab) return;

    // FAB dispatches expand event when clicked
    this.fab.addEventListener('debug-expand', ((e: CustomEvent) => {
      if (e.detail?.expanded) this.expand();
    }) as EventListener);

    // FAB dispatches status changes
    this.fab.addEventListener('debug-status-change', ((e: CustomEvent) => {
      if (this.toolbar && e.detail?.status) {
        this.toolbar.setConnectionStatus(e.detail.status);
      }
    }) as EventListener);

    // FAB dispatches snapshot updates
    this.fab.addEventListener('debug-snapshot', ((e: CustomEvent) => {
      if (this.toolbar && e.detail?.snapshot) {
        this.toolbar.setSnapshot(e.detail.snapshot);
      }
    }) as EventListener);

  }

  private wireToolbarEvents(toolbar: DebugToolbar): void {
    toolbar.addEventListener('debug-expand', ((e: CustomEvent) => {
      if (!e.detail?.expanded && this.fab) {
        this.expanded = false;
        this.fab.setToolbarExpanded(false);
      }
    }) as EventListener);
    toolbar.addEventListener('debug-toolbar-ready', (() => {
      const stream = this.fab?.getStream();
      if (stream) {
        toolbar.setStream(stream);
        stream.requestSnapshot();
      }
      const snapshot = this.fab?.getSnapshot();
      if (snapshot) toolbar.setSnapshot(snapshot);
      const status = this.fab?.getConnectionStatus();
      if (status) toolbar.setConnectionStatus(status);
    }) as EventListener);
  }

  private async ensureToolbar(): Promise<void> {
    if (this.toolbar) {
      if (this.expanded) {
        this.fab?.setToolbarLoading(false);
        this.toolbar.setExpanded(true);
      }
      return;
    }
    const generation = ++this.toolbarMountGeneration;
    try {
      const { DebugToolbar: Toolbar } = await loadDebugToolbar();
      if (!this.initialized || !this.expanded || generation !== this.toolbarMountGeneration) return;
      const toolbar = this.createToolbar(Toolbar);
      this.wireToolbarEvents(toolbar);
      const stream = this.fab?.getStream();
      if (stream) toolbar.setStream(stream);
      const snapshot = this.fab?.getSnapshot();
      if (snapshot) toolbar.setSnapshot(snapshot);
      const status = this.fab?.getConnectionStatus();
      if (status) toolbar.setConnectionStatus(status);
      this.fab?.setToolbarLoading(false);
      toolbar.setExpanded(true);
    } catch {
      if (!this.initialized || generation !== this.toolbarMountGeneration) return;
      this.expanded = false;
      this.fab?.setToolbarLoadError(true);
      this.fab?.setToolbarExpanded(false);
      this.fab?.dispatchEvent(new CustomEvent('debug-toolbar-load-error', {
        detail: { retryable: true }, bubbles: true, composed: true,
      }));
    }
  }

  private shouldRestoreExpanded(): boolean {
    try {
      return localStorage.getItem('debug-toolbar-expanded') === 'true';
    } catch {
      return false;
    }
  }
}

/**
 * Initialize debug UI from window config or data attributes
 */
export function initDebugManager(): DebugManager | null {
  // Check for window config
  const windowConfig = (window as any).DEBUG_CONFIG;

  // Check for existing debug element with config
  const existingElement = document.querySelector('[data-debug-path]');

  let options: DebugManagerOptions = {};

  if (windowConfig) {
    options = {
      basePath: windowConfig.basePath,
      debugPath: windowConfig.debugPath,
      liveTransportEnabled: typeof windowConfig.liveTransportEnabled === 'boolean'
        ? windowConfig.liveTransportEnabled
        : undefined,
      panels: windowConfig.panels,
      slowThresholdMs: windowConfig.slowThresholdMs,
    };
  } else if (existingElement) {
    options = {
      basePath: existingElement.getAttribute('data-base-path') || undefined,
      debugPath: existingElement.getAttribute('data-debug-path') || undefined,
      panels: existingElement.getAttribute('data-panels')?.split(','),
      slowThresholdMs: parseInt(existingElement.getAttribute('data-slow-threshold-ms') || '50', 10),
    };
  }

  // Only initialize if we have a debug path configured
  if (!options.debugPath && !options.basePath && !windowConfig && !existingElement) {
    return null;
  }

  const manager = new DebugManager(options);
  manager.init();
  return manager;
}

// Export for global access
(window as any).DebugManager = DebugManager;
(window as any).initDebugManager = initDebugManager;

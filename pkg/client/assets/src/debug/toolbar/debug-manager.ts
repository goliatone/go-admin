// Debug Manager
// Coordinates the FAB and Toolbar components, sharing WebSocket connection and state

import { DebugFab } from './debug-fab.js';
import { DebugToolbar } from './debug-toolbar.js';
import type { DebugSnapshot } from './panel-renderers.js';

export interface DebugManagerOptions {
  debugPath?: string;
  panels?: string[];
  slowThresholdMs?: number;
  container?: HTMLElement;
}

export class DebugManager {
  private fab: DebugFab | null = null;
  private toolbar: DebugToolbar | null = null;
  private options: DebugManagerOptions;
  private initialized = false;

  constructor(options: DebugManagerOptions = {}) {
    this.options = {
      debugPath: '/admin/debug',
      panels: ['requests', 'sql', 'logs', 'routes', 'config'],
      slowThresholdMs: 50,
      container: document.body,
      ...options,
    };
  }

  /**
   * Initialize the debug UI with FAB and Toolbar
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.createFab();
    this.createToolbar();
    this.wireEvents();
  }

  /**
   * Destroy the debug UI
   */
  public destroy(): void {
    if (this.fab) {
      this.fab.remove();
      this.fab = null;
    }
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
    this.initialized = false;
  }

  /**
   * Expand the toolbar programmatically
   */
  public expand(): void {
    if (!this.toolbar || !this.fab) return;
    this.fab.setToolbarExpanded(true);
    this.toolbar.setExpanded(true);
  }

  /**
   * Collapse the toolbar programmatically
   */
  public collapse(): void {
    if (!this.toolbar || !this.fab) return;
    this.fab.setToolbarExpanded(false);
    this.toolbar.setExpanded(false);
  }

  /**
   * Toggle the toolbar state
   */
  public toggle(): void {
    if (!this.toolbar) return;
    if (this.toolbar.isExpanded()) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private createFab(): void {
    this.fab = document.createElement('debug-fab') as DebugFab;
    this.fab.setAttribute('debug-path', this.options.debugPath || '/admin/debug');
    if (this.options.panels) {
      this.fab.setAttribute('panels', this.options.panels.join(','));
    }
    this.options.container?.appendChild(this.fab);
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('debug-toolbar') as DebugToolbar;
    this.toolbar.setAttribute('debug-path', this.options.debugPath || '/admin/debug');
    this.toolbar.setAttribute('use-fab', 'true');
    if (this.options.panels) {
      this.toolbar.setAttribute('panels', this.options.panels.join(','));
    }
    if (this.options.slowThresholdMs) {
      this.toolbar.setAttribute('slow-threshold-ms', String(this.options.slowThresholdMs));
    }
    this.options.container?.appendChild(this.toolbar);
  }

  private wireEvents(): void {
    if (!this.fab || !this.toolbar) return;

    // FAB dispatches expand event when clicked
    this.fab.addEventListener('debug-expand', ((e: CustomEvent) => {
      if (e.detail?.expanded && this.toolbar) {
        // Share the FAB's stream with the toolbar
        const stream = this.fab?.getStream();
        if (stream) {
          this.toolbar.setStream(stream);
        }
        // Share the snapshot
        const snapshot = this.fab?.getSnapshot();
        if (snapshot) {
          this.toolbar.setSnapshot(snapshot);
        }
        // Share the connection status
        const status = this.fab?.getConnectionStatus();
        if (status) {
          this.toolbar.setConnectionStatus(status);
        }
        this.toolbar.setExpanded(true);
      }
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

    // Toolbar dispatches collapse event
    this.toolbar.addEventListener('debug-expand', ((e: CustomEvent) => {
      if (!e.detail?.expanded && this.fab) {
        this.fab.setToolbarExpanded(false);
      }
    }) as EventListener);
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
      debugPath: windowConfig.basePath || windowConfig.debugPath,
      panels: windowConfig.panels,
      slowThresholdMs: windowConfig.slowThresholdMs,
    };
  } else if (existingElement) {
    options = {
      debugPath: existingElement.getAttribute('data-debug-path') || undefined,
      panels: existingElement.getAttribute('data-panels')?.split(','),
      slowThresholdMs: parseInt(existingElement.getAttribute('data-slow-threshold-ms') || '50', 10),
    };
  }

  // Only initialize if we have a debug path configured
  if (!options.debugPath && !windowConfig && !existingElement) {
    return null;
  }

  const manager = new DebugManager(options);
  manager.init();
  return manager;
}

// Export for global access
(window as any).DebugManager = DebugManager;
(window as any).initDebugManager = initDebugManager;

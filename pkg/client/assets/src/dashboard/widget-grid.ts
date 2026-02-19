/**
 * WidgetGrid - Main component for dashboard widget management
 * Supports drag & drop, resize, visibility toggle, and layout persistence
 */

import type {
  WidgetGridConfig,
  LayoutPreferences,
  Widget,
  WidgetLayoutRow,
  WidgetGridBehaviors,
} from './types.js';

import { DefaultDragDropBehavior } from './behaviors/drag-drop.js';
import { DefaultResizeBehavior } from './behaviors/resize.js';
import { DefaultVisibilityBehavior } from './behaviors/visibility.js';
import { DefaultPersistenceBehavior } from './behaviors/persistence.js';

export class WidgetGrid {
  private config: Required<WidgetGridConfig>;
  private behaviors: Required<WidgetGridBehaviors>;
  private container: HTMLElement | null = null;
  private saveTimer: number | null = null;
  private statusElement: HTMLElement | null = null;
  private panelSchema: Record<string, any> | null = null;
  private panelTabs: any[] = [];

  constructor(config: WidgetGridConfig) {
    this.config = {
      apiEndpoint: config.apiEndpoint,
      preferencesEndpoint: config.preferencesEndpoint || `${config.apiEndpoint}/preferences`,
      areas: config.areas || [],
      defaultSpan: config.defaultSpan ?? 12,
      maxColumns: config.maxColumns ?? 12,
      saveDelay: config.saveDelay ?? 200,
      selectors: {
        areas: '[data-widgets-grid]',
        widgets: '[data-widget]',
        toolbar: '[data-widget-toolbar]',
        hideBtn: '[data-action="toggle-hide"]',
        resizeBtn: '[data-action="toggle-width"]',
        ...config.selectors,
      },
      behaviors: config.behaviors || {},
      onSave: config.onSave || (() => {}),
      onError: config.onError || ((error) => console.error('WidgetGrid error:', error)),
    };

    this.behaviors = {
      dragDrop: config.behaviors?.dragDrop || new DefaultDragDropBehavior(),
      resize: config.behaviors?.resize || new DefaultResizeBehavior(),
      visibility: config.behaviors?.visibility || new DefaultVisibilityBehavior(),
      persistence: config.behaviors?.persistence || new DefaultPersistenceBehavior(),
    };
  }

  async init(serverState?: any): Promise<void> {
    this.container = document.querySelector('[data-widget-grid]');
    this.statusElement = document.getElementById('save-status');

    if (!this.container) {
      throw new Error('Widget grid container not found');
    }

    const resolvedState = this.normalizePanelDetailState(serverState);
    if (resolvedState.schema) {
      this.panelSchema = resolvedState.schema;
      this.panelTabs = resolvedState.schema.tabs || [];
    }

    // Hydration mode: widgets already rendered by server
    // Just attach behaviors to existing DOM elements
    this.normalizeRenderedWidgetSpans();
    this.attachEventListeners();
    this.initializeDragDrop();

    // If server state provided, validate it matches DOM (optional)
    if (resolvedState.data) {
      this.validateHydration(resolvedState.data);
    }
  }

  private validateHydration(serverState: any): void {
    if (!Array.isArray(serverState?.areas) || !this.container) {
      return;
    }

    // Compare area grid containers only; widgets may also carry area metadata.
    const renderedAreaCodes = Array.from(
      this.container.querySelectorAll<HTMLElement>('[data-widgets-grid][data-area-grid]')
    )
      .map((node) => node.dataset.areaGrid || node.dataset.areaCode || '')
      .filter((code): code is string => Boolean(code));

    if (renderedAreaCodes.length === 0) {
      return;
    }

    const serverAreaCodes = new Set(
      serverState.areas
        .map((area: any) => area?.code || area?.area_code || area?.id || '')
        .filter((code: unknown): code is string => typeof code === 'string' && code.length > 0)
    );

    const missingFromServer = renderedAreaCodes.filter((code) => !serverAreaCodes.has(code));
    if (missingFromServer.length > 0) {
      console.warn('Hydration mismatch: rendered area(s) missing from server state', {
        missing: missingFromServer,
        server: Array.from(serverAreaCodes),
        dom: renderedAreaCodes,
      });
    }
  }

  getSchema(): Record<string, any> | null {
    return this.panelSchema;
  }

  getTabs(): any[] {
    return this.panelTabs;
  }

  private normalizePanelDetailState(payload: any): { data?: any; schema?: Record<string, any> } {
    if (!payload) {
      return {};
    }
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const detail = payload as { data?: any; schema?: Record<string, any> };
      return {
        data: detail.data,
        schema: detail.schema,
      };
    }
    return { data: payload };
  }

  private initializeDragDrop(): void {
    if (!this.container) return;

    this.behaviors.dragDrop.enable(this.container, () => {
      this.saveLayout();
    });
  }

  private normalizeRenderedWidgetSpans(): void {
    if (!this.container) return;

    this.container.querySelectorAll<HTMLElement>('[data-widget]').forEach((widget) => {
      const span = this.normalizeSpan(widget.dataset.span);
      widget.dataset.span = span.toString();
      widget.style.setProperty('--span', span.toString());
    });
  }

  private normalizeSpan(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    const fallback = Math.min(Math.max(this.config.defaultSpan, 1), this.config.maxColumns);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > this.config.maxColumns) {
      return fallback;
    }
    return parsed;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Hide/show toggle buttons
    this.container.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      const hideBtn = target.closest<HTMLElement>(this.config.selectors.hideBtn!);

      if (hideBtn) {
        const widget = hideBtn.closest<HTMLElement>('[data-widget]');
        if (widget) {
          this.behaviors.visibility.toggle(widget);
          this.saveLayout();
        }
      }
    });

    // Resize toggle buttons
    this.container.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      const resizeBtn = target.closest<HTMLElement>(this.config.selectors.resizeBtn!);

      if (resizeBtn) {
        const widget = resizeBtn.closest<HTMLElement>('[data-widget]');
        if (widget) {
          const currentSpan = this.normalizeSpan(widget.dataset.span);
          const newSpan = this.behaviors.resize.toggleWidth(widget, currentSpan, this.config.maxColumns);

          // Update button text
          const btnText = newSpan === this.config.maxColumns ? 'Half Width' : 'Full Width';
          const textNode = Array.from(resizeBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
          if (textNode) {
            textNode.textContent = btnText;
          }

          this.saveLayout();
        }
      }
    });

    // Initialize resize button labels
    this.container.querySelectorAll<HTMLElement>(this.config.selectors.resizeBtn!).forEach(btn => {
      const widget = btn.closest<HTMLElement>('[data-widget]');
      if (widget) {
        const span = this.normalizeSpan(widget.dataset.span);
        const btnText = span === this.config.maxColumns ? 'Half Width' : 'Full Width';
        const textNode = Array.from(btn.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = btnText;
        }
      }
    });
  }

  private saveLayout(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }

    this.updateStatus('Saving layout…');

    this.saveTimer = window.setTimeout(async () => {
      try {
        const layout = this.serializeLayout();
        await this.behaviors.persistence.save(this.config.preferencesEndpoint, layout);
        this.updateStatus('Layout saved');
        this.config.onSave(layout);
      } catch (error) {
        this.updateStatus('Save failed');
        this.config.onError(error as Error);
      }
    }, this.config.saveDelay);
  }

  private serializeLayout(): LayoutPreferences {
    const layout: LayoutPreferences = {
      area_order: {},
      hidden_widget_ids: [],
      layout_rows: {},
    };

    if (!this.container) return layout;

    // Collect widget order and layout for each area
    const areas = this.container.querySelectorAll<HTMLElement>(this.config.selectors.areas!);

    areas.forEach(area => {
      const areaCode = area.dataset.areaGrid || area.dataset.areaCode;
      if (!areaCode) return;

      const visibleWidgets = Array.from(
        area.querySelectorAll<HTMLElement>('[data-widget]:not([data-hidden="true"])')
      );

      layout.area_order[areaCode] = visibleWidgets.map(w => w.dataset.widget!);
      layout.layout_rows[areaCode] = this.serializeRows(visibleWidgets);
    });

    // Collect hidden widgets
    const hiddenWidgets = this.container.querySelectorAll<HTMLElement>('[data-widget][data-hidden="true"]');
    layout.hidden_widget_ids = Array.from(hiddenWidgets).map(w => w.dataset.widget!);

    return layout;
  }

  private serializeRows(widgets: HTMLElement[]): WidgetLayoutRow[] {
    const rows: WidgetLayoutRow[] = [];
    let currentRow: { id: string; width: number }[] = [];
    let currentRowWidth = 0;

    widgets.forEach(widget => {
      const widgetId = widget.dataset.widget!;
      const span = this.normalizeSpan(widget.dataset.span);

      if (currentRowWidth + span > this.config.maxColumns && currentRowWidth > 0) {
        rows.push({ widgets: currentRow });
        currentRow = [];
        currentRowWidth = 0;
      }

      currentRow.push({ id: widgetId, width: span });
      currentRowWidth += span;

      if (currentRowWidth >= this.config.maxColumns) {
        rows.push({ widgets: currentRow });
        currentRow = [];
        currentRowWidth = 0;
      }
    });

    if (currentRow.length > 0) {
      rows.push({ widgets: currentRow });
    }

    return rows;
  }

  private updateStatus(message: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  destroy(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }
    this.behaviors.dragDrop.disable();
  }
}

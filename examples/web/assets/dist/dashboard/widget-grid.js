/**
 * WidgetGrid - Main component for dashboard widget management
 * Supports drag & drop, resize, visibility toggle, and layout persistence
 */
import { DefaultDragDropBehavior } from './behaviors/drag-drop.js';
import { DefaultResizeBehavior } from './behaviors/resize.js';
import { DefaultVisibilityBehavior } from './behaviors/visibility.js';
import { DefaultPersistenceBehavior } from './behaviors/persistence.js';
export class WidgetGrid {
    constructor(config) {
        this.container = null;
        this.saveTimer = null;
        this.statusElement = null;
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
            onSave: config.onSave || (() => { }),
            onError: config.onError || ((error) => console.error('WidgetGrid error:', error)),
        };
        this.behaviors = {
            dragDrop: config.behaviors?.dragDrop || new DefaultDragDropBehavior(),
            resize: config.behaviors?.resize || new DefaultResizeBehavior(),
            visibility: config.behaviors?.visibility || new DefaultVisibilityBehavior(),
            persistence: config.behaviors?.persistence || new DefaultPersistenceBehavior(),
        };
    }
    async init(serverState) {
        this.container = document.querySelector('[data-widget-grid]');
        this.statusElement = document.getElementById('save-status');
        if (!this.container) {
            throw new Error('Widget grid container not found');
        }
        // Hydration mode: widgets already rendered by server
        // Just attach behaviors to existing DOM elements
        this.attachEventListeners();
        this.initializeDragDrop();
        // If server state provided, validate it matches DOM (optional)
        if (serverState) {
            this.validateHydration(serverState);
        }
    }
    validateHydration(serverState) {
        // Optional: Verify server-rendered state matches expected layout
        // This helps detect hydration mismatches during development
        if (serverState.areas) {
            const renderedAreas = this.container?.querySelectorAll('[data-area-code]');
            if (renderedAreas && renderedAreas.length !== serverState.areas.length) {
                console.warn('Hydration mismatch: area count does not match', {
                    server: serverState.areas.length,
                    dom: renderedAreas.length,
                });
            }
        }
    }
    initializeDragDrop() {
        if (!this.container)
            return;
        this.behaviors.dragDrop.enable(this.container, () => {
            this.saveLayout();
        });
    }
    attachEventListeners() {
        if (!this.container)
            return;
        // Hide/show toggle buttons
        this.container.addEventListener('click', (event) => {
            const target = event.target;
            const hideBtn = target.closest(this.config.selectors.hideBtn);
            if (hideBtn) {
                const widget = hideBtn.closest('[data-widget]');
                if (widget) {
                    this.behaviors.visibility.toggle(widget);
                    this.saveLayout();
                }
            }
        });
        // Resize toggle buttons
        this.container.addEventListener('click', (event) => {
            const target = event.target;
            const resizeBtn = target.closest(this.config.selectors.resizeBtn);
            if (resizeBtn) {
                const widget = resizeBtn.closest('[data-widget]');
                if (widget) {
                    const currentSpan = parseInt(widget.dataset.span || `${this.config.defaultSpan}`, 10);
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
        this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach(btn => {
            const widget = btn.closest('[data-widget]');
            if (widget) {
                const span = parseInt(widget.dataset.span || `${this.config.defaultSpan}`, 10);
                const btnText = span === this.config.maxColumns ? 'Half Width' : 'Full Width';
                const textNode = Array.from(btn.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = btnText;
                }
            }
        });
    }
    saveLayout() {
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
            }
            catch (error) {
                this.updateStatus('Save failed');
                this.config.onError(error);
            }
        }, this.config.saveDelay);
    }
    serializeLayout() {
        const layout = {
            area_order: {},
            hidden_widget_ids: [],
            layout_rows: {},
        };
        if (!this.container)
            return layout;
        // Collect widget order and layout for each area
        const areas = this.container.querySelectorAll(this.config.selectors.areas);
        areas.forEach(area => {
            const areaCode = area.dataset.areaGrid || area.dataset.areaCode;
            if (!areaCode)
                return;
            const visibleWidgets = Array.from(area.querySelectorAll('[data-widget]:not([data-hidden="true"])'));
            layout.area_order[areaCode] = visibleWidgets.map(w => w.dataset.widget);
            layout.layout_rows[areaCode] = this.serializeRows(visibleWidgets);
        });
        // Collect hidden widgets
        const hiddenWidgets = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
        layout.hidden_widget_ids = Array.from(hiddenWidgets).map(w => w.dataset.widget);
        return layout;
    }
    serializeRows(widgets) {
        const rows = [];
        let currentRow = [];
        let currentRowWidth = 0;
        widgets.forEach(widget => {
            const widgetId = widget.dataset.widget;
            const span = parseInt(widget.dataset.span || `${this.config.defaultSpan}`, 10);
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
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }
    destroy() {
        if (this.saveTimer !== null) {
            clearTimeout(this.saveTimer);
        }
        this.behaviors.dragDrop.disable();
    }
}
//# sourceMappingURL=widget-grid.js.map
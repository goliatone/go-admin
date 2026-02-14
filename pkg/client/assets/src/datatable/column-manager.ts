import Sortable from 'sortablejs';
import type { DataGrid } from './core.js';

/**
 * Configuration for the ColumnManager component
 */
export interface ColumnManagerConfig {
  container: HTMLElement;
  grid: DataGrid;
  onReorder?: (order: string[]) => void;
  onToggle?: (field: string, visible: boolean) => void;
  onReset?: () => void;
}

/**
 * ColumnManager - Manages column visibility and ordering with drag-and-drop support
 *
 * Renders a list of columns with:
 * - Search/filter field to find columns quickly
 * - Item count badge showing visible/total columns
 * - Scroll shadows to indicate content above/below fold
 * - Drag handles for reordering
 * - iOS-style switches for visibility toggle
 *
 * Uses safe DOM construction (textContent) to prevent XSS when labels come from server metadata.
 */
export class ColumnManager {
  private container: HTMLElement;
  private grid: DataGrid;
  private sortable: Sortable | null = null;
  private onReorder?: (order: string[]) => void;
  private onToggle?: (field: string, visible: boolean) => void;
  private onReset?: () => void;
  private searchInput: HTMLInputElement | null = null;
  private columnListEl: HTMLElement | null = null;
  private countBadgeEl: HTMLElement | null = null;

  constructor(config: ColumnManagerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.onReorder = config.onReorder;
    this.onToggle = config.onToggle;
    this.onReset = config.onReset;
    this.initialize();
  }

  private initialize(): void {
    // Render column items with switches and drag handles
    this.render();

    // Setup SortableJS for drag-and-drop
    this.setupDragAndDrop();

    // Bind switch toggle events
    this.bindSwitchToggles();

    // Setup scroll shadow detection
    this.setupScrollShadows();
  }

  /**
   * Render column items using safe DOM construction
   * Uses textContent for labels to prevent XSS
   */
  private render(): void {
    const columns = this.grid.config.columns;
    const hiddenSet = this.grid.state.hiddenColumns;

    // Clear container
    this.container.innerHTML = '';

    // Create header with search and count badge
    const header = this.createHeader(columns.length, columns.length - hiddenSet.size);
    this.container.appendChild(header);

    // Create column list wrapper for SortableJS
    const columnList = document.createElement('div');
    columnList.className = 'column-list';
    columnList.setAttribute('role', 'list');
    columnList.setAttribute('aria-label', 'Column visibility and order');
    this.columnListEl = columnList;

    // Build each column item using DOM APIs (safe from XSS)
    columns.forEach(col => {
      const item = this.createColumnItem(col.field, col.label || col.field, !hiddenSet.has(col.field));
      columnList.appendChild(item);
    });

    this.container.appendChild(columnList);

    // Add Reset to Default button at the bottom
    const footer = this.createFooter();
    this.container.appendChild(footer);
  }

  /**
   * Create header with search input and count badge
   */
  private createHeader(totalCount: number, visibleCount: number): HTMLElement {
    const header = document.createElement('div');
    header.className = 'column-manager-header';

    // Search input container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'column-search-container';

    const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    searchIcon.setAttribute('class', 'column-search-icon');
    searchIcon.setAttribute('viewBox', '0 0 24 24');
    searchIcon.setAttribute('fill', 'none');
    searchIcon.setAttribute('stroke', 'currentColor');
    searchIcon.setAttribute('stroke-width', '2');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm21 21-4.3-4.3');
    searchIcon.appendChild(circle);
    searchIcon.appendChild(path);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'column-search-input';
    searchInput.placeholder = 'Filter columns...';
    searchInput.setAttribute('aria-label', 'Filter columns');
    this.searchInput = searchInput;

    // Bind search input
    searchInput.addEventListener('input', () => {
      this.filterColumns(searchInput.value);
    });

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);

    // Count badge
    const countBadge = document.createElement('span');
    countBadge.className = 'column-count-badge';
    countBadge.textContent = `${visibleCount} of ${totalCount}`;
    countBadge.setAttribute('aria-live', 'polite');
    this.countBadgeEl = countBadge;

    header.appendChild(searchContainer);
    header.appendChild(countBadge);

    return header;
  }

  /**
   * Filter columns by search term
   */
  private filterColumns(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    const items = this.container.querySelectorAll('.column-item');

    items.forEach((item) => {
      const label = item.querySelector('.column-label')?.textContent?.toLowerCase() || '';
      const matches = term === '' || label.includes(term);
      (item as HTMLElement).style.display = matches ? '' : 'none';
    });

    // Update scroll shadows after filtering
    this.updateScrollShadows();
  }

  /**
   * Update the count badge
   */
  private updateCountBadge(): void {
    if (!this.countBadgeEl) return;

    const columns = this.grid.config.columns;
    const hiddenSet = this.grid.state.hiddenColumns;
    const visibleCount = columns.length - hiddenSet.size;

    this.countBadgeEl.textContent = `${visibleCount} of ${columns.length}`;
  }

  /**
   * Setup scroll shadow detection on the column list
   */
  private setupScrollShadows(): void {
    if (!this.columnListEl) return;

    // Initial check
    this.updateScrollShadows();

    // Update on scroll
    this.columnListEl.addEventListener('scroll', () => {
      this.updateScrollShadows();
    });

    // Update on resize (debounced)
    const resizeObserver = new ResizeObserver(() => {
      this.updateScrollShadows();
    });
    resizeObserver.observe(this.columnListEl);
  }

  /**
   * Update scroll shadow classes based on scroll position
   */
  private updateScrollShadows(): void {
    if (!this.columnListEl) return;

    const el = this.columnListEl;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

    // Check if content is scrollable
    const isScrollable = scrollHeight > clientHeight;

    // Determine shadow states
    const hasTopShadow = isScrollable && scrollTop > 0;
    const hasBottomShadow = isScrollable && (scrollTop + clientHeight) < (scrollHeight - 1);

    // Apply classes
    el.classList.toggle('column-list--shadow-top', hasTopShadow);
    el.classList.toggle('column-list--shadow-bottom', hasBottomShadow);
  }

  /**
   * Create footer with Reset to Default button
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'column-manager-footer';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'column-reset-btn';
    resetBtn.setAttribute('aria-label', 'Reset columns to default');

    // Reset icon (SVG)
    const resetIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resetIcon.setAttribute('class', 'column-reset-icon');
    resetIcon.setAttribute('viewBox', '0 0 24 24');
    resetIcon.setAttribute('fill', 'none');
    resetIcon.setAttribute('stroke', 'currentColor');
    resetIcon.setAttribute('stroke-width', '2');
    resetIcon.setAttribute('stroke-linecap', 'round');
    resetIcon.setAttribute('stroke-linejoin', 'round');

    // Rotate CCW icon path
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M3 3v5h5');
    resetIcon.appendChild(path1);
    resetIcon.appendChild(path2);

    const resetText = document.createElement('span');
    resetText.textContent = 'Reset to Default';

    resetBtn.appendChild(resetIcon);
    resetBtn.appendChild(resetText);

    // Bind reset click handler
    resetBtn.addEventListener('click', () => {
      this.handleReset();
    });

    footer.appendChild(resetBtn);
    return footer;
  }

  /**
   * Handle reset button click
   */
  private handleReset(): void {
    this.grid.resetColumnsToDefault();
    this.onReset?.();

    // Clear search and update UI
    if (this.searchInput) {
      this.searchInput.value = '';
      this.filterColumns('');
    }
    this.updateCountBadge();
  }

  /**
   * Create a single column item element
   * Uses DOM APIs with textContent for safe label rendering
   * Includes full ARIA support for accessibility
   */
  private createColumnItem(field: string, label: string, isVisible: boolean): HTMLElement {
    const itemId = `column-item-${field}`;
    const switchId = `column-switch-${field}`;

    const item = document.createElement('div');
    item.className = 'column-item';
    item.id = itemId;
    item.dataset.column = field;
    item.setAttribute('role', 'listitem');

    // Content wrapper (drag handle + label)
    const content = document.createElement('div');
    content.className = 'column-item-content';

    // Drag handle SVG with accessibility
    const dragHandle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dragHandle.setAttribute('class', 'drag-handle');
    dragHandle.setAttribute('viewBox', '0 0 20 20');
    dragHandle.setAttribute('fill', 'currentColor');
    dragHandle.setAttribute('aria-hidden', 'true');  // Decorative, hidden from screen readers
    dragHandle.setAttribute('focusable', 'false');

    // Create 6 dots for drag handle (2x3 grid)
    const dotPositions = [
      [5, 4], [5, 10], [5, 16],
      [11, 4], [11, 10], [11, 16]
    ];
    dotPositions.forEach(([cx, cy]) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '1.5');
      dragHandle.appendChild(circle);
    });

    // Label (uses textContent for XSS safety)
    const labelSpan = document.createElement('span');
    labelSpan.className = 'column-label';
    labelSpan.id = `${itemId}-label`;
    labelSpan.textContent = label;

    content.appendChild(dragHandle);
    content.appendChild(labelSpan);

    // Switch toggle with full accessibility
    const switchLabel = document.createElement('label');
    switchLabel.className = 'column-switch';
    switchLabel.htmlFor = switchId;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = switchId;
    checkbox.dataset.column = field;
    checkbox.checked = isVisible;
    checkbox.setAttribute('role', 'switch');
    checkbox.setAttribute('aria-checked', String(isVisible));
    checkbox.setAttribute('aria-labelledby', `${itemId}-label`);
    checkbox.setAttribute('aria-describedby', `${itemId}-desc`);

    // Hidden description for screen readers
    const description = document.createElement('span');
    description.id = `${itemId}-desc`;
    description.className = 'sr-only';
    description.textContent = `Press Space or Enter to toggle ${label} column visibility. Currently ${isVisible ? 'visible' : 'hidden'}.`;

    const slider = document.createElement('span');
    slider.className = 'column-switch-slider';
    slider.setAttribute('aria-hidden', 'true');  // Visual-only element

    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(slider);

    item.appendChild(content);
    item.appendChild(switchLabel);
    item.appendChild(description);

    return item;
  }

  /**
   * Setup SortableJS for drag-and-drop reordering
   */
  private setupDragAndDrop(): void {
    // SortableJS should be attached to the column-list wrapper, not the container
    const columnList = this.container.querySelector('.column-list') || this.container;

    this.sortable = Sortable.create(columnList as HTMLElement, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'column-item-ghost',
      dragClass: 'column-item-drag',
      chosenClass: 'column-item-chosen',
      // Touch handling for mobile
      touchStartThreshold: 3,
      delay: 100,
      delayOnTouchOnly: true,
      onEnd: () => {
        // Get current column order from DOM
        const items = columnList.querySelectorAll('.column-item');
        const newOrder = Array.from(items).map(item =>
          (item as HTMLElement).dataset.column!
        );

        // Notify via callback if provided
        if (this.onReorder) {
          this.onReorder(newOrder);
        }

        // Apply to grid (Phase FE2)
        this.grid.reorderColumns(newOrder);

        // Also persist via behavior layer
        this.grid.config.behaviors?.columnVisibility?.reorderColumns?.(newOrder, this.grid);
      }
    });
  }

  /**
   * Bind change events for visibility switches
   * Includes ARIA state updates for accessibility
   */
  private bindSwitchToggles(): void {
    const switches = this.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    switches.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const field = checkbox.dataset.column;
        if (!field) return;

        const isVisible = checkbox.checked;

        // Update ARIA attributes
        checkbox.setAttribute('aria-checked', String(isVisible));

        // Update description text
        const descId = `column-item-${field}-desc`;
        const description = this.container.querySelector(`#${descId}`);
        if (description) {
          const label = this.container.querySelector(`#column-item-${field}-label`)?.textContent || field;
          description.textContent = `Press Space or Enter to toggle ${label} column visibility. Currently ${isVisible ? 'visible' : 'hidden'}.`;
        }

        // Notify via callback if provided
        if (this.onToggle) {
          this.onToggle(field, isVisible);
        }

        // Use behavior layer for toggle
        if (this.grid.config.behaviors?.columnVisibility) {
          this.grid.config.behaviors.columnVisibility.toggleColumn(field, this.grid);
        }

        // Update count badge
        this.updateCountBadge();
      });
    });
  }

  /**
   * Update the switch state for a specific column
   * Called when visibility changes externally (e.g., URL restore)
   * Also updates ARIA attributes for accessibility
   */
  updateSwitchState(field: string, isVisible: boolean): void {
    const checkbox = this.container.querySelector<HTMLInputElement>(
      `input[type="checkbox"][data-column="${field}"]`
    );
    if (checkbox) {
      checkbox.checked = isVisible;
      checkbox.setAttribute('aria-checked', String(isVisible));
    }
  }

  /**
   * Sync all switch states with current grid state
   */
  syncWithGridState(): void {
    const hiddenSet = this.grid.state.hiddenColumns;
    this.grid.config.columns.forEach(col => {
      this.updateSwitchState(col.field, !hiddenSet.has(col.field));
    });
    this.updateCountBadge();
  }

  /**
   * Get the current column order from the DOM
   */
  getColumnOrder(): string[] {
    const items = this.container.querySelectorAll('.column-item');
    return Array.from(items).map(item => (item as HTMLElement).dataset.column!);
  }

  /**
   * Re-render the column list (e.g., after columns change)
   */
  refresh(): void {
    // Re-render replaces the `.column-list` node, so Sortable must be re-initialized.
    this.destroy();
    this.render();
    this.setupDragAndDrop();
    this.bindSwitchToggles();
    this.setupScrollShadows();
  }

  /**
   * Cleanup - destroy SortableJS instance
   */
  destroy(): void {
    if (this.sortable) {
      this.sortable.destroy();
      this.sortable = null;
    }
  }
}

// Export for module usage
export default ColumnManager;

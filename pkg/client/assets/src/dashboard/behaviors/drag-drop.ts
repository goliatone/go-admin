/**
 * Default drag and drop behavior for widgets using SortableJS
 */

import Sortable from 'sortablejs';
import type { DragDropBehavior } from '../types.js';

export class DefaultDragDropBehavior implements DragDropBehavior {
  private sortableInstances: Sortable[] = [];

  enable(container: HTMLElement, onDrop: () => void): void {
    const areas = container.querySelectorAll<HTMLElement>('[data-widgets-grid]');

    areas.forEach(area => {
      const sortable = Sortable.create(area, {
        handle: '.widget-drag-handle',
        draggable: '[data-widget]',
        animation: 150,
        ghostClass: 'widget--ghost',
        chosenClass: 'widget--chosen',
        dragClass: 'widget--drag',
        group: 'dashboard-widgets',
        onEnd: () => {
          onDrop();
        },
      });

      this.sortableInstances.push(sortable);
    });
  }

  disable(): void {
    this.sortableInstances.forEach(sortable => {
      sortable.destroy();
    });
    this.sortableInstances = [];
  }
}

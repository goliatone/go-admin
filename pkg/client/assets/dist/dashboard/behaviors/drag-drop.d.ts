/**
 * Default drag and drop behavior for widgets using SortableJS
 */
import type { DragDropBehavior } from '../types.js';
export declare class DefaultDragDropBehavior implements DragDropBehavior {
    private sortableInstances;
    enable(container: HTMLElement, onDrop: () => void): void;
    disable(): void;
}
//# sourceMappingURL=drag-drop.d.ts.map
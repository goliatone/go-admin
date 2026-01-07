/**
 * Default drag and drop behavior for widgets
 */
import type { DragDropBehavior } from '../types.js';
export declare class DefaultDragDropBehavior implements DragDropBehavior {
    private draggedElement;
    private cleanupFunctions;
    enable(container: HTMLElement, onDrop: () => void): void;
    disable(): void;
    private getDragAfterElement;
}
//# sourceMappingURL=drag-drop.d.ts.map
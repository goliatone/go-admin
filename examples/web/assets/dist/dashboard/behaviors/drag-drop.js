/**
 * Default drag and drop behavior for widgets
 */
export class DefaultDragDropBehavior {
    constructor() {
        this.draggedElement = null;
        this.cleanupFunctions = [];
    }
    enable(container, onDrop) {
        const widgets = container.querySelectorAll('[data-widget]');
        widgets.forEach(widget => {
            widget.draggable = true;
            const dragStartHandler = () => {
                this.draggedElement = widget;
                widget.classList.add('dragging');
            };
            const dragEndHandler = () => {
                widget.classList.remove('dragging');
                this.draggedElement = null;
            };
            widget.addEventListener('dragstart', dragStartHandler);
            widget.addEventListener('dragend', dragEndHandler);
            this.cleanupFunctions.push(() => {
                widget.removeEventListener('dragstart', dragStartHandler);
                widget.removeEventListener('dragend', dragEndHandler);
            });
        });
        const areas = container.querySelectorAll('[data-widgets-grid]');
        areas.forEach(area => {
            const dragOverHandler = (event) => {
                event.preventDefault();
                if (!this.draggedElement)
                    return;
                const afterElement = this.getDragAfterElement(area, event.clientY);
                if (afterElement == null) {
                    area.appendChild(this.draggedElement);
                }
                else if (afterElement !== this.draggedElement) {
                    area.insertBefore(this.draggedElement, afterElement);
                }
            };
            const dropHandler = (event) => {
                event.preventDefault();
                onDrop();
            };
            area.addEventListener('dragover', dragOverHandler);
            area.addEventListener('drop', dropHandler);
            this.cleanupFunctions.push(() => {
                area.removeEventListener('dragover', dragOverHandler);
                area.removeEventListener('drop', dropHandler);
            });
        });
    }
    disable() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        this.draggedElement = null;
    }
    getDragAfterElement(container, y) {
        const draggableElements = Array.from(container.querySelectorAll('[data-widget]:not(.dragging)'));
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }
}
//# sourceMappingURL=drag-drop.js.map
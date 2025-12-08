/**
 * Default resize behavior for widgets
 */
export class DefaultResizeBehavior {
    toggleWidth(widget, currentSpan, maxColumns) {
        // Toggle between half-width and full-width
        const newSpan = currentSpan === maxColumns ? maxColumns / 2 : maxColumns;
        this.applyWidth(widget, newSpan);
        return newSpan;
    }
    applyWidth(widget, span) {
        widget.dataset.span = span.toString();
        widget.style.setProperty('--span', span.toString());
    }
}
//# sourceMappingURL=resize.js.map
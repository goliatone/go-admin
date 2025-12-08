/**
 * Default visibility behavior for widgets
 */
export class DefaultVisibilityBehavior {
    toggle(widget) {
        const isHidden = widget.dataset.hidden === 'true';
        const newState = !isHidden;
        this.applyVisibility(widget, newState);
        return newState;
    }
    applyVisibility(widget, hidden) {
        if (hidden) {
            widget.dataset.hidden = 'true';
            widget.classList.add('is-hidden');
        }
        else {
            delete widget.dataset.hidden;
            widget.classList.remove('is-hidden');
        }
    }
}
//# sourceMappingURL=visibility.js.map
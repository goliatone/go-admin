/**
 * Default visibility behavior for widgets
 */

import type { VisibilityBehavior } from '../types.js';

export class DefaultVisibilityBehavior implements VisibilityBehavior {
  toggle(widget: HTMLElement): boolean {
    const isHidden = widget.dataset.hidden === 'true';
    const newState = !isHidden;
    this.applyVisibility(widget, newState);
    return newState;
  }

  applyVisibility(widget: HTMLElement, hidden: boolean): void {
    if (hidden) {
      widget.dataset.hidden = 'true';
      widget.classList.add('is-hidden');
    } else {
      delete widget.dataset.hidden;
      widget.classList.remove('is-hidden');
    }
  }
}

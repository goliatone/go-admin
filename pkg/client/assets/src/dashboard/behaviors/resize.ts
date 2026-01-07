/**
 * Default resize behavior for widgets
 */

import type { ResizeBehavior } from '../types.js';

export class DefaultResizeBehavior implements ResizeBehavior {
  toggleWidth(widget: HTMLElement, currentSpan: number, maxColumns: number): number {
    // Toggle between half-width and full-width
    const newSpan = currentSpan === maxColumns ? maxColumns / 2 : maxColumns;
    this.applyWidth(widget, newSpan);
    return newSpan;
  }

  applyWidth(widget: HTMLElement, span: number): void {
    widget.dataset.span = span.toString();
    widget.style.setProperty('--span', span.toString());
  }
}

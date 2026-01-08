/**
 * Default resize behavior for widgets
 */
import type { ResizeBehavior } from '../types.js';
export declare class DefaultResizeBehavior implements ResizeBehavior {
    toggleWidth(widget: HTMLElement, currentSpan: number, maxColumns: number): number;
    applyWidth(widget: HTMLElement, span: number): void;
}
//# sourceMappingURL=resize.d.ts.map
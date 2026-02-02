/**
 * Shared Field Card
 *
 * Renders a consistent field card for both the Block Editor Panel
 * (compact, accordion-style) and Content Type Editor (standard,
 * modal-editing). Supports drag-and-drop, expand/collapse,
 * reorder buttons, and custom action slots.
 *
 * Layout variants:
 *   compact (Block Editor):  smaller padding, xs icon/text sizes, accordion
 *   standard (Content Type): larger padding, standard icon/text sizes
 */
import type { FieldDefinition } from '../types';
export interface FieldCardConfig {
    /** The field definition to render */
    field: FieldDefinition;
    /** Card is expanded (accordion body visible) */
    isExpanded?: boolean;
    /** Card is selected (highlighted border) */
    isSelected?: boolean;
    /** Card is a drop target for drag-and-drop */
    isDropTarget?: boolean;
    /** Card has validation errors */
    hasErrors?: boolean;
    /** Error messages shown below the metadata line */
    errorMessages?: string[];
    /** Show up/down reorder buttons */
    showReorderButtons?: boolean;
    /** First in group — disables "move up" */
    isFirst?: boolean;
    /** Last in group — disables "move down" */
    isLast?: boolean;
    /** Compact mode: xs sizes, tighter padding (block editor) */
    compact?: boolean;
    /** Slot: render expanded accordion content. If provided, expand toggle is shown */
    renderExpandedContent?: () => string;
    /** Slot: pre-rendered HTML for surface-specific actions (menus, buttons) */
    actionsHtml?: string;
    /** Optional constraint summary badges (e.g. "min: 5", "pattern") */
    constraintBadges?: string[];
    /** Section name for data-field-section attribute */
    sectionName?: string;
    /** Index for data-field-index attribute */
    index?: number;
}
/**
 * Render a shared field card.
 *
 * In **compact** mode (Block Editor):
 *   Smaller padding (px-2 py-2), xs icon (w-7 h-7), xs text,
 *   monospace metadata line, accordion expansion.
 *
 * In **standard** mode (Content Type Editor):
 *   Standard padding (p-3), sm icon (w-8 h-8), standard text,
 *   richer metadata (type label, section, gridSpan).
 */
export declare function renderFieldCard(config: FieldCardConfig): string;
//# sourceMappingURL=field-card.d.ts.map
/**
 * Shared Field Card
 *
 * Renders a consistent field card for both the Block Editor Panel
 * and Content Type Editor. Supports drag-and-drop, expand/collapse,
 * reorder buttons, and custom action slots.
 *
 * Both surfaces use the same standard sizing by default (compact=false).
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
 * Both surfaces use the standard sizing by default.
 * Set `compact: true` for a denser layout (smaller padding, xs text).
 */
export declare function renderFieldCard(config: FieldCardConfig): string;
/**
 * Render a kebab (⋮) action button for a field card.
 * Both surfaces use this to trigger contextual menus.
 */
export declare function renderFieldKebab(fieldId: string): string;
export interface DropZoneConfig {
    /** Whether the zone is currently highlighted (drag hover) */
    highlight?: boolean;
    /** Helper text shown inside the zone */
    text?: string;
}
/**
 * Render a shared field drop zone used at the bottom of field lists.
 * Both the Block Editor and Content Type Editor use this.
 */
export declare function renderDropZone(config?: DropZoneConfig): string;
//# sourceMappingURL=field-card.d.ts.map
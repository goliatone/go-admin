/**
 * Shared Entity Header
 *
 * Renders a consistent header bar for both the Block Editor Panel
 * and Content Type Editor. Supports save state indicators, status
 * badges, version labels, and action button slots.
 *
 * Layout variants:
 *   compact (Block Editor):  name + subtitle left, save indicator + status right
 *   standard (Content Type): title + status + version left, actions right
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export interface EntityHeaderConfig {
    /** Primary name/title displayed in the header */
    name: string;
    /** Secondary line (slug, description, editing target) */
    subtitle?: string;
    /** Render subtitle in monospace font (true for slugs/types) */
    subtitleMono?: boolean;
    /** Status badge value (draft, published, etc.) */
    status?: string;
    /** Version label (displayed as "vX.Y") */
    version?: string;
    /** Current save state */
    saveState?: SaveState;
    /** Error message for save failures (shown as tooltip) */
    saveMessage?: string;
    /** Pre-rendered HTML for action buttons/dropdowns */
    actions?: string;
    /** Compact mode: smaller padding, h2 title (block editor vs content type) */
    compact?: boolean;
}
/**
 * Render a save state indicator pill.
 *
 * Returns empty string for 'idle' state. Exported standalone so
 * callers can update the indicator in-place without a full re-render.
 */
export declare function renderSaveIndicator(state: SaveState, message?: string): string;
/**
 * Render a shared entity header bar.
 *
 * In **compact** mode (Block Editor):
 *   Left:  h2 name + mono subtitle
 *   Right: save indicator → status badge
 *
 * In **standard** mode (Content Type Editor):
 *   Left:  h1 name + status badge + version (row), subtitle below
 *   Right: save indicator + actions slot
 */
export declare function renderEntityHeader(config: EntityHeaderConfig): string;
//# sourceMappingURL=entity-header.d.ts.map
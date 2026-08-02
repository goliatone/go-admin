/**
 * Shared Icon Renderer Utility
 *
 * Centralizes icon HTML generation across the admin UI for dynamic JS surfaces.
 * Parses qualified icon references (iconoir:, lucide:, emoji:, svg:, url:) and
 * generates safe HTML output.
 *
 * Usage patterns:
 *   renderIcon('home')                    -> <i class="iconoir-home flex-shrink-0" ...></i>
 *   renderIcon('iconoir:home')            -> <i class="iconoir-home flex-shrink-0" ...></i>
 *   renderIcon('lucide:home')             -> <i class="lucide-home flex-shrink-0" ...></i>
 *   renderIcon('emoji:rocket')            -> <span ...>rocket</span>
 *   renderIcon('url:https://...')         -> <img src="https://..." ...>
 *
 * Security considerations:
 *   - All CSS class names are escaped to prevent injection
 *   - SVG content from svg: prefix is sanitized
 *   - URLs are validated (only https: and data: with allowed MIME types)
 *   - data: URIs are validated for MIME type and size
 */
export type IconType = 'emoji' | 'library' | 'svg' | 'url';
export interface IconReference {
    type: IconType;
    library?: string;
    value: string;
    raw: string;
}
export interface IconRenderOptions {
    /** Custom CSS classes to add */
    extraClass?: string;
    /** Icon size style (e.g., '20px') */
    size?: string;
    /** Whether the icon source is trusted (allows SVG/URL) */
    trusted?: boolean;
}
/**
 * Parses an icon reference string into its components.
 *
 * Parsing precedence:
 *   1. Empty string -> empty reference
 *   2. emoji:<value> -> emoji type
 *   3. svg:<content> -> svg type
 *   4. url:<value> -> url type
 *   5. Raw <svg...> -> svg type
 *   6. Raw http(s):// or data: -> url type
 *   7. Qualified library:name -> library type
 *   8. Legacy iconoir-name -> library iconoir
 *   9. SVG field type key mapping
 *   10. Bare name -> default library (iconoir)
 */
export declare function parseIconReference(ref: string): IconReference;
/**
 * Renders an icon reference to safe HTML.
 *
 *   renderIcon('home')                  -> <i class="iconoir-home ...">
 *   renderIcon('lucide:home')           -> <i class="lucide-home ...">
 *   renderIcon('emoji:rocket')          -> <span ...>rocket</span>
 *   renderIcon('url:https://...')       -> <img src="https://..." ...>
 */
export declare function renderIcon(ref: string, opts?: IconRenderOptions): string;
/**
 * Renders a pre-parsed icon reference to HTML.
 */
export declare function renderParsedIcon(ref: IconReference, opts?: IconRenderOptions): string;
//# sourceMappingURL=icon-renderer.d.ts.map
/**
 * Simple Renderer
 * Basic renderer for search results with label and optional description
 */
import type { SearchResult, ResultRenderer, SimpleRendererConfig } from '../types.js';
export declare class SimpleRenderer<T = unknown> implements ResultRenderer<T> {
    protected config: SimpleRendererConfig;
    constructor(config?: Partial<SimpleRendererConfig>);
    render(result: SearchResult<T>, isSelected: boolean): string;
    protected renderIcon(icon: string): string;
    protected escapeHtml(text: string): string;
}
//# sourceMappingURL=simple-renderer.d.ts.map
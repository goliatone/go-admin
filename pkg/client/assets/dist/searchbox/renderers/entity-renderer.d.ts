/**
 * Entity Renderer
 * Specialized renderer for generic entity results with badges and metadata pills
 */
import type { SearchResult, ResultRenderer, EntityRendererConfig } from '../types.js';
export declare class EntityRenderer<T = unknown> implements ResultRenderer<T> {
    protected config: EntityRendererConfig;
    constructor(config?: Partial<EntityRendererConfig>);
    render(result: SearchResult<T>, isSelected: boolean): string;
    protected renderIcon(icon: string | undefined, label: string): string;
    protected renderBadge(value: string): string;
    protected renderMetadataPills(metadata: Record<string, unknown>): string;
    protected getColorForLabel(label: string): string;
    protected getMetadataValue(metadata: Record<string, unknown>, field: string): string | undefined;
    protected escapeHtml(text: string): string;
}
//# sourceMappingURL=entity-renderer.d.ts.map
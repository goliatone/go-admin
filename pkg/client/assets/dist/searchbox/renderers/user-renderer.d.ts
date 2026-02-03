/**
 * User Renderer
 * Specialized renderer for user search results with avatar, name, email, and role
 */
import type { SearchResult, ResultRenderer, UserRendererConfig } from '../types.js';
export declare class UserRenderer<T = unknown> implements ResultRenderer<T> {
    protected config: UserRendererConfig;
    constructor(config?: Partial<UserRendererConfig>);
    render(result: SearchResult<T>, isSelected: boolean): string;
    protected renderAvatar(avatar: string | undefined, name: string): string;
    protected renderRole(role: string): string;
    protected getInitials(name: string): string;
    protected getColorForName(name: string): string;
    protected getMetadataValue(metadata: Record<string, unknown>, field: string): string | undefined;
    protected escapeHtml(text: string): string;
}
//# sourceMappingURL=user-renderer.d.ts.map
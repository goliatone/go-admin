/**
 * Providers Catalog Page
 * Displays available service providers with capability summaries and connect actions
 */
import type { Provider, ScopeType } from '../types.js';
import type { ToastNotifier } from '../../toast/types.js';
export interface ProvidersPageConfig {
    /** Container element or selector */
    container: string | HTMLElement;
    /** API base path (default: /admin/api/services) */
    apiBasePath?: string;
    /** Toast notifier for messages */
    notifier?: ToastNotifier;
    /** Callback when connect is initiated */
    onConnect?: (provider: Provider, scope: ScopeType) => void;
    /** Callback when provider is selected for details */
    onSelect?: (provider: Provider) => void;
    /** Custom provider icon resolver */
    getProviderIcon?: (providerId: string) => string;
    /** Custom provider display name resolver */
    getProviderName?: (providerId: string) => string;
}
export interface ProviderCardData {
    provider: Provider;
    displayName: string;
    icon: string;
    description: string;
    capabilityCount: number;
    canConnect: boolean;
}
export declare class ProvidersCatalogManager {
    private config;
    private container;
    private providers;
    private loading;
    private error;
    constructor(config: ProvidersPageConfig);
    /**
     * Initialize the providers catalog
     */
    init(): Promise<void>;
    /**
     * Refresh the providers list
     */
    refresh(): Promise<void>;
    /**
     * Get the loaded providers
     */
    getProviders(): Provider[];
    /**
     * Get a provider by ID
     */
    getProvider(id: string): Provider | undefined;
    private loadProviders;
    private renderLoading;
    private renderError;
    private renderForbidden;
    private renderProviders;
    private renderEmpty;
    private buildProviderCard;
    private buildCapabilitySummary;
    private buildScopeBadges;
    private getProviderCardData;
    private formatProviderId;
    private bindCardEvents;
    private escapeHtml;
}
/**
 * Create and initialize a providers catalog
 */
export declare function createProvidersCatalog(config: ProvidersPageConfig): Promise<ProvidersCatalogManager>;
//# sourceMappingURL=providers-catalog.d.ts.map
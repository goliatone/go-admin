import type { ServicesAPIClient } from '../api-client.js';
import type { QueryStateManager } from '../query-state.js';
import type { Provider } from '../types.js';
import type { ToastNotifier } from '../../toast/types.js';
export type ProviderNameResolver = ((providerId: string) => string) | undefined;
export interface LoadProvidersOptions {
    notifier?: ToastNotifier;
    signal?: AbortSignal;
    onError?: (error: Error) => void;
}
export interface PopulateProviderFilterOptionsConfig {
    container: ParentNode | null | undefined;
    providers: Provider[];
    selectedProviderId?: string;
    getProviderName?: ProviderNameResolver;
    selectSelector?: string;
    emptyLabel?: string;
}
export interface RelativeTimeOptions {
    allowFuture?: boolean;
    pastImmediateLabel?: string;
    futureImmediateLabel?: string;
}
export interface LoadAndPopulateProvidersOptions extends LoadProvidersOptions {
    container: ParentNode | null | undefined;
    selectedProviderId?: string;
    getProviderName?: ProviderNameResolver;
    selectSelector?: string;
    emptyLabel?: string;
}
export declare function formatProviderId(id: string): string;
export declare function resolveProviderDisplayName(id: string, getProviderName?: ProviderNameResolver): string;
export declare function formatServiceLabel(value: string): string;
export declare function truncateId(id: string, maxLen?: number): string;
export declare function formatDateTime(dateStr: string): string;
export declare function formatRelativeTime(dateStr: string, options?: RelativeTimeOptions): string;
export declare function loadProviders(client: ServicesAPIClient, options?: LoadProvidersOptions): Promise<Provider[]>;
export declare function loadAndPopulateProviders(client: ServicesAPIClient, options: LoadAndPopulateProvidersOptions): Promise<Provider[]>;
export declare function populateProviderFilterOptions(config: PopulateProviderFilterOptionsConfig): void;
export declare function bindNoResultsResetAction(container: Element, onReset: () => void): void;
export declare function destroyAbortableQueryPage<F extends Record<string, string>>(abortController: AbortController | null, queryState: QueryStateManager<F>): null;
//# sourceMappingURL=formatters.d.ts.map
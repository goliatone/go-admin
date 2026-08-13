import type { FilterBuilder, FilterBuilderConfig, FilterBuilderElementTarget } from './filter-builder.js';
export interface FilterBuilderModule {
    FilterBuilder: new (config: FilterBuilderConfig) => FilterBuilder;
}
export interface FilterBuilderModuleLoader {
    load(): Promise<FilterBuilderModule>;
    reset(): void;
}
export interface FilterBuilderInteractionMount {
    load(options?: {
        open?: boolean;
    }): Promise<FilterBuilder | null>;
    getInstance(): FilterBuilder | null;
    destroy(): void;
}
export interface FilterBuilderInteractionOptions {
    loader?: FilterBuilderModuleLoader;
    toggleButton?: FilterBuilderElementTarget;
    loadErrorMessage?: string;
}
export declare function createFilterBuilderModuleLoader(importer?: () => Promise<FilterBuilderModule>): FilterBuilderModuleLoader;
/**
 * Mount a FilterBuilder only when its overlay toggle is first activated.
 *
 * The initiating activation is replayed through `open()` after construction,
 * failed imports can be retried, and destroy prevents late async attachment.
 */
export declare function mountFilterBuilderOnInteraction(config: FilterBuilderConfig, options?: FilterBuilderInteractionOptions): FilterBuilderInteractionMount;
//# sourceMappingURL=filter-builder-loader.d.ts.map
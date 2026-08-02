export interface NormalizeAPIBasePathOptions {
    ensureAPISuffix?: boolean;
}
export declare function trimTrailingSlash(value: string): string;
export declare function normalizeBasePath(basePath?: string): string;
export declare function normalizeAPIBasePath(apiBasePath?: string, options?: NormalizeAPIBasePathOptions): string;
export declare function deriveBasePathFromAPIEndpoint(endpoint: string): string;
//# sourceMappingURL=path-normalization.d.ts.map
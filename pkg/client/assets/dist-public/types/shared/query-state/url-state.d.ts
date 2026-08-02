export declare function buildURL(pathname: string, params: URLSearchParams): string;
export declare function buildEndpointURL(endpoint: string, params: URLSearchParams, options?: {
    preserveAbsolute?: boolean;
}): string;
export declare function deleteSearchParams(params: URLSearchParams, keys: string[]): void;
export declare function setSearchParam(params: URLSearchParams, key: string, value: unknown): void;
export declare function setNumberSearchParam(params: URLSearchParams, key: string, value: unknown, options?: {
    min?: number;
}): void;
export declare function setJoinedSearchParam(params: URLSearchParams, key: string, values: unknown, separator?: string): void;
export declare function getNumberSearchParam(params: URLSearchParams, key: string): number | undefined;
export declare function getStringSearchParam(params: URLSearchParams, key: string): string | undefined;
export declare function readLocationSearchParams(locationLike?: {
    search?: string | null;
} | null | undefined): URLSearchParams | null;
export declare function parseJSONParam<T>(raw: string | null, fallback: T): T;
//# sourceMappingURL=url-state.d.ts.map
export interface ByteSizeFormatOptions {
    emptyFallback?: string;
    zeroFallback?: string;
    invalidFallback?: string;
    unitLabels?: readonly string[];
    precisionByUnit?: readonly number[];
    trimTrailingZeros?: boolean;
}
export declare function formatByteSize(value: number | string | undefined | null, options?: ByteSizeFormatOptions): string | undefined;
//# sourceMappingURL=size-formatters.d.ts.map
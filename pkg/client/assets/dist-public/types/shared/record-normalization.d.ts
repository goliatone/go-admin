interface NormalizeRecordOptions {
    trimKeys?: boolean;
    omitBlankKeys?: boolean;
}
export interface NormalizeStringRecordOptions extends NormalizeRecordOptions {
    omitEmptyValues?: boolean;
}
export interface NormalizeNumberRecordOptions extends NormalizeRecordOptions {
    fallback?: number;
}
export declare function normalizeStringRecord(value: unknown, options?: NormalizeStringRecordOptions): Record<string, string>;
export declare function normalizeNumberRecord(value: unknown, options?: NormalizeNumberRecordOptions): Record<string, number>;
export {};
//# sourceMappingURL=record-normalization.d.ts.map
/**
 * Shared Field Input Classes
 *
 * Centralizes CSS class strings for form inputs across the Content Type Builder.
 * All helpers include full dark mode support.
 *
 * Size variants:
 *   'sm' (default) — standard form inputs (px-3 py-2)
 *   'xs'           — compact inputs for inline editors (px-2 py-1)
 */
export declare function inputClasses(size?: 'sm' | 'xs'): string;
export declare function selectClasses(size?: 'sm' | 'xs'): string;
type TextareaResize = 'none' | 'x' | 'y' | 'both';
interface TextareaClassOptions {
    size?: 'sm' | 'xs';
    /** Resize behavior (default: vertical) */
    resize?: TextareaResize;
}
export declare function textareaClasses(options?: TextareaClassOptions): string;
export declare function checkboxClasses(): string;
export declare function labelClasses(size?: 'sm' | 'xs'): string;
export declare function dragHandleIcon(size?: 'sm' | 'xs'): string;
export {};
//# sourceMappingURL=field-input-classes.d.ts.map
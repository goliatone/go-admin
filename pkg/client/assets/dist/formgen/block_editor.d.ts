export declare function initBlockEditor(root: HTMLElement): void;
/**
 * Dynamically register a block template on a block editor root element.
 * Call this before `initBlockEditor(root)` to make the template available,
 * or after if `collectTemplates` is re-invoked (it always queries live DOM).
 */
export declare function registerBlockTemplate(root: HTMLElement, meta: {
    type: string;
    label: string;
    icon?: string;
    schemaVersion?: string;
    requiredFields?: string[];
    html: string;
}): void;
export declare function initBlockEditors(scope?: ParentNode): void;
//# sourceMappingURL=block_editor.d.ts.map
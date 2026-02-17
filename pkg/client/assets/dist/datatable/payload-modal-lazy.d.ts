/**
 * Lazy payload modal proxy.
 *
 * Keeps payload modal code out of the main datatable chunk while exposing
 * a stable PayloadInputModal API for callers that patch prompt() in tests.
 */
export declare const PayloadInputModal: {
    prompt(config: import("./payload-modal.js").PayloadModalConfig): Promise<Record<string, string> | null>;
};
//# sourceMappingURL=payload-modal-lazy.d.ts.map
export declare const ENHANCED_ACTION_HEADER = "X-Enhanced-Action";
export declare const ENHANCED_ACTION_ACCEPT = "application/vnd.admin.enhanced+json";
export declare const ENHANCED_ACTION_HEADER_VALUE = "1";
export type EnhancedFragmentMode = 'replace';
export type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | string;
export interface EnhancedActionToast {
    type?: EnhancedToastType;
    message?: string;
}
export interface EnhancedActionFragment {
    selector?: string;
    mode?: EnhancedFragmentMode | string;
    html?: string;
}
export interface EnhancedActionError {
    message?: string;
    fields?: Record<string, string>;
}
export interface EnhancedActionEnvelope {
    version?: number;
    ok?: boolean;
    toast?: EnhancedActionToast;
    toasts?: EnhancedActionToast[];
    fragments?: EnhancedActionFragment[];
    focus?: string;
    redirect?: string;
    error?: EnhancedActionError;
}
export interface EnhancedActionRuntimeOptions {
    fetch?: typeof fetch;
    document?: Document;
    toast?: EnhancedToastSink;
    navigate?: (url: string) => void;
    requestHeader?: string;
    requestHeaderValue?: string;
    request_header?: string;
    request_header_value?: string;
    accept?: string;
    onFragmentsApplied?: (fragments: EnhancedActionFragment[]) => void | Promise<void>;
}
export interface EnhancedActionController {
    destroy(): void;
}
export interface EnhancedToastSink {
    success?: (message: string) => void;
    error?: (message: string) => void;
    warning?: (message: string) => void;
    info?: (message: string) => void;
    show?: (message: string, type?: string) => void;
}
export declare function initEnhancedActions(root?: Document | HTMLElement, options?: EnhancedActionRuntimeOptions): EnhancedActionController;
export declare function submitEnhancedForm(form: HTMLFormElement, submitter: HTMLElement | null, options?: EnhancedActionRuntimeOptions): Promise<EnhancedActionEnvelope | null>;
export declare function applyEnhancedEnvelope(envelope: EnhancedActionEnvelope, options?: EnhancedActionRuntimeOptions): Promise<void>;
export declare function applyEnhancedFragment(doc: Document, fragment: EnhancedActionFragment): boolean;
//# sourceMappingURL=enhanced-action.d.ts.map
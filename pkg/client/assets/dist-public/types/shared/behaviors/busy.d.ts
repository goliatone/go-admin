export declare const BUSY_ACTIVE_VALUE = "true";
export type BusyControl = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type BusyRoot = HTMLElement | HTMLFormElement;
export interface BusyOptions {
    controls?: Array<Element | null | undefined>;
    includeDescendantControls?: boolean;
    submitter?: Element | null;
    label?: string;
    generateSpinner?: boolean;
    compatibilitySubmitLoading?: boolean;
}
export interface BusyController {
    readonly root: BusyRoot;
    reset(): void;
}
export declare function isBusy(root: BusyRoot | null | undefined): boolean;
export declare function setBusy(root: BusyRoot, options?: BusyOptions): BusyController;
export declare function resetBusy(root: BusyRoot | null | undefined): void;
export declare function resetBusyWithin(root?: Document | HTMLElement): void;
export declare function submitterSkipsValidation(form: HTMLFormElement, submitter: Element | null): boolean;
export declare function submitsOutsideCurrentContext(form: HTMLFormElement, submitter: Element | null): boolean;
export declare function targetsOutsideCurrentContext(doc: Document, explicitTarget: string | null | undefined): boolean;
//# sourceMappingURL=busy.d.ts.map
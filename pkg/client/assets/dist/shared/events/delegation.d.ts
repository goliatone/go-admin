export type DelegatedEventHandler = (event: Event, matched: HTMLElement) => void;
export declare function addDelegatedEventListener(root: Document | HTMLElement, eventName: string, selector: string, handler: DelegatedEventHandler, options?: AddEventListenerOptions): () => void;
//# sourceMappingURL=delegation.d.ts.map
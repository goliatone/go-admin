import type { ToastNotifier } from '../toast/types.js';
import type { ActionButton } from './actions.js';
export interface DetailActionsMountConfig {
    mount: HTMLElement;
    notifier?: ToastNotifier;
    fetchImpl?: typeof fetch;
}
export declare function renderDetailActions(actions: ActionButton[]): string;
export declare class DetailActionsController {
    private readonly mount;
    private readonly notifier;
    private readonly fetchImpl;
    private actions;
    private record;
    private documentClickHandler;
    private documentKeydownHandler;
    constructor(config: DetailActionsMountConfig);
    init(): Promise<void>;
    refresh(): Promise<void>;
    private fetchDetailPayload;
    private attachListeners;
    private cleanupDocumentListeners;
    private attachDropdownListeners;
    private openDropdown;
    private closeDropdown;
    private detailEndpoint;
    private apiBasePath;
    private panelBasePath;
    private backHref;
    private panelName;
    private recordID;
}
export declare function initPanelDetailActions(root?: ParentNode): Promise<DetailActionsController[]>;
//# sourceMappingURL=detail-actions.d.ts.map
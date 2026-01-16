import { type DebugReplKind } from './repl-terminal.js';
type DebugReplPanelOptions = {
    kind: DebugReplKind;
    debugPath: string;
};
export declare class DebugReplPanel {
    private options;
    private root;
    private statusEl;
    private statusTextEl;
    private terminalEl;
    private actionsEl;
    private terminal;
    constructor(options: DebugReplPanelOptions);
    attach(container: HTMLElement): void;
    private bindActions;
    private updateStatus;
    private requireElement;
}
export {};
//# sourceMappingURL=repl-panel.d.ts.map
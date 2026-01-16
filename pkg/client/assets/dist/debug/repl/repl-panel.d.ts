import { type DebugReplKind } from './repl-terminal.js';
type DebugReplPanelOptions = {
    kind: DebugReplKind;
    debugPath: string;
    commands?: DebugReplCommand[];
};
export type DebugReplCommand = {
    command: string;
    description?: string;
    tags?: string[];
    mutates?: boolean;
    aliases?: string[];
};
export declare class DebugReplPanel {
    private options;
    private root;
    private statusEl;
    private statusTextEl;
    private terminalEl;
    private actionsEl;
    private terminal;
    private commands;
    private commandsEl;
    constructor(options: DebugReplPanelOptions);
    attach(container: HTMLElement): void;
    private bindActions;
    private bindCommandActions;
    private updateStatus;
    private renderCommands;
    private requireElement;
}
export {};
//# sourceMappingURL=repl-panel.d.ts.map
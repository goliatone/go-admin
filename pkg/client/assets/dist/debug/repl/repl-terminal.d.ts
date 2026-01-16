export type DebugReplKind = 'shell' | 'console';
export type DebugReplStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type DebugReplTerminalOptions = {
    kind: DebugReplKind;
    debugPath: string;
    container: HTMLElement;
    onStatusChange?: (status: DebugReplStatus) => void;
};
export declare class DebugReplTerminal {
    private options;
    private terminal;
    private fitAddon;
    private socket;
    private status;
    private reconnectAttempts;
    private reconnectTimer;
    private manualClose;
    private resizeObserver;
    private lineBuffer;
    private skipEscape;
    private prompt;
    private awaitingPrompt;
    constructor(options: DebugReplTerminalOptions);
    connect(): void;
    reconnect(): void;
    disconnect(): void;
    kill(): void;
    clear(): void;
    refresh(): void;
    focus(): void;
    paste(value: string): void;
    private bindTerminal;
    private handleKeyEvent;
    private handlePaste;
    private handleConsoleInput;
    private submitLine;
    private handleMessage;
    private handleShellEvent;
    private handleConsoleEvent;
    private writeLine;
    private writePrompt;
    private sendResize;
    private sendCommand;
    private setStatus;
    private scheduleReconnect;
    private observeResize;
}
export {};
//# sourceMappingURL=repl-terminal.d.ts.map
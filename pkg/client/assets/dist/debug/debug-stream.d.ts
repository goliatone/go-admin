export type DebugEvent = {
    type: string;
    payload: any;
    timestamp: string;
};
export type DebugCommand = {
    type: string;
    panels?: string[];
};
export type DebugStreamStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';
export type DebugStreamOptions = {
    basePath: string;
    maxReconnectAttempts?: number;
    reconnectDelayMs?: number;
    maxReconnectDelayMs?: number;
    onEvent?: (event: DebugEvent) => void;
    onStatusChange?: (status: DebugStreamStatus) => void;
    onError?: (event: Event) => void;
};
export declare class DebugStream {
    private options;
    private ws;
    private reconnectTimer;
    private reconnectAttempts;
    private manualClose;
    private pendingCommands;
    private status;
    constructor(options: DebugStreamOptions);
    connect(): void;
    close(): void;
    sendCommand(cmd: DebugCommand): void;
    subscribe(panels: string[]): void;
    unsubscribe(panels: string[]): void;
    requestSnapshot(): void;
    clear(panels?: string[]): void;
    getStatus(): DebugStreamStatus;
    private setStatus;
    private flushPending;
    private scheduleReconnect;
}
//# sourceMappingURL=debug-stream.d.ts.map
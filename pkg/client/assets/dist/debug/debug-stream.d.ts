export type DebugEvent = {
    type: string;
    payload: any;
    timestamp: string;
    app_id?: string;
    protocol_version?: string;
};
export type DebugCommand = {
    type: string;
    panels?: string[];
};
export type DebugStreamStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';
export type DebugStreamOptions = {
    basePath?: string;
    url?: string;
    maxReconnectAttempts?: number;
    reconnectDelayMs?: number;
    maxReconnectDelayMs?: number;
    onEvent?: (event: DebugEvent) => void;
    onStatusChange?: (status: DebugStreamStatus) => void;
    onError?: (event: Event) => void;
};
export type RemoteDebugToken = {
    token: string;
    expires_at?: string;
    expiresAt?: string | number;
    expiresInMs?: number;
};
export type RemoteDebugStreamOptions = Omit<DebugStreamOptions, 'basePath' | 'url'> & {
    url: string;
    authToken?: string;
    tokenProvider?: () => Promise<RemoteDebugToken>;
    tokenRefreshBufferMs?: number;
    tokenParam?: string;
    appId?: string;
};
export declare class DebugStream {
    protected options: DebugStreamOptions;
    protected ws: WebSocket | null;
    protected reconnectTimer: number | null;
    protected reconnectAttempts: number;
    protected manualClose: boolean;
    protected pendingCommands: DebugCommand[];
    protected status: DebugStreamStatus;
    constructor(options: DebugStreamOptions);
    protected getWebSocketURL(): string;
    connect(): void;
    close(): void;
    sendCommand(cmd: DebugCommand): void;
    subscribe(panels: string[]): void;
    unsubscribe(panels: string[]): void;
    requestSnapshot(): void;
    clear(panels?: string[]): void;
    getStatus(): DebugStreamStatus;
    protected setStatus(status: DebugStreamStatus): void;
    protected flushPending(): void;
    protected scheduleReconnect(): void;
}
export declare class RemoteDebugStream extends DebugStream {
    private baseUrl;
    private authToken;
    private tokenProvider?;
    private tokenRefreshBufferMs;
    private tokenRefreshTimer;
    private tokenParam;
    private tokenExpiresAt;
    constructor(options: RemoteDebugStreamOptions);
    protected getWebSocketURL(): string;
    connect(): void;
    close(): void;
    private clearTokenRefresh;
    private scheduleTokenRefresh;
    private setToken;
    private tokenNeedsRefresh;
    private ensureToken;
    private refreshToken;
}
//# sourceMappingURL=debug-stream.d.ts.map
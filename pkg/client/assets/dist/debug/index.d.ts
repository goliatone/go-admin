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
  constructor(options: DebugStreamOptions);
  connect(): void;
  close(): void;
  sendCommand(cmd: DebugCommand): void;
  subscribe(panels: string[]): void;
  unsubscribe(panels: string[]): void;
  requestSnapshot(): void;
  clear(panels?: string[]): void;
  getStatus(): DebugStreamStatus;
}

export declare class DebugPanel {
  constructor(container: HTMLElement);
}

export declare const initDebugPanel: (container?: HTMLElement | null) => DebugPanel | null;

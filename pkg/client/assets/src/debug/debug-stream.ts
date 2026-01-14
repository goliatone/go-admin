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

const defaultReconnectDelayMs = 1000;
const defaultMaxReconnectDelayMs = 12000;
const defaultMaxReconnectAttempts = 8;

const normalizeBasePath = (basePath: string): string => {
  const trimmed = (basePath || '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '');
  }
  return `/${trimmed.replace(/\/+$/, '')}`;
};

const buildWebSocketURL = (basePath: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalized = normalizeBasePath(basePath);
  return `${protocol}//${window.location.host}${normalized}/ws`;
};

export class DebugStream {
  private options: DebugStreamOptions;
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private manualClose = false;
  private pendingCommands: DebugCommand[] = [];
  private status: DebugStreamStatus = 'disconnected';

  constructor(options: DebugStreamOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manualClose = false;
    const url = buildWebSocketURL(this.options.basePath);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.flushPending();
    };

    this.ws.onmessage = (event) => {
      if (!event || typeof event.data !== 'string') {
        return;
      }
      try {
        const parsed = JSON.parse(event.data) as DebugEvent;
        this.options.onEvent?.(parsed);
      } catch {
        // ignore malformed payloads
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.manualClose) {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      this.options.onError?.(event);
      this.setStatus('error');
    };
  }

  close(): void {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  sendCommand(cmd: DebugCommand): void {
    if (!cmd || !cmd.type) {
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
      return;
    }
    this.pendingCommands.push(cmd);
  }

  subscribe(panels: string[]): void {
    this.sendCommand({ type: 'subscribe', panels });
  }

  unsubscribe(panels: string[]): void {
    this.sendCommand({ type: 'unsubscribe', panels });
  }

  requestSnapshot(): void {
    this.sendCommand({ type: 'snapshot' });
  }

  clear(panels?: string[]): void {
    this.sendCommand({ type: 'clear', panels });
  }

  getStatus(): DebugStreamStatus {
    return this.status;
  }

  private setStatus(status: DebugStreamStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  private flushPending(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (this.pendingCommands.length === 0) {
      return;
    }
    const pending = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const cmd of pending) {
      this.ws.send(JSON.stringify(cmd));
    }
  }

  private scheduleReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? defaultMaxReconnectAttempts;
    const baseDelay = this.options.reconnectDelayMs ?? defaultReconnectDelayMs;
    const maxDelay = this.options.maxReconnectDelayMs ?? defaultMaxReconnectDelayMs;
    if (this.reconnectAttempts >= maxAttempts) {
      this.setStatus('disconnected');
      return;
    }
    const attempt = this.reconnectAttempts;
    const backoff = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = backoff * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, backoff + jitter);
  }
}

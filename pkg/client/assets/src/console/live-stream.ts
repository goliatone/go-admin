// Reconnecting WebSocket transport shared by console hosts. Hosts decide what
// messages mean; this class only owns connection lifetime, bounded retries,
// queued commands and status changes.

export type ConsoleLiveStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export type ConsoleLiveCommand = {
  type: string;
  [key: string]: unknown;
};

export type ConsoleLiveStreamOptions = {
  /** Absolute ws(s) URL or a same-origin path resolved against the page origin. */
  url?: string;
  maxReconnectAttempts?: number;
  maxInitialReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  reconnectStabilityMs?: number;
  /** Parsed JSON message. Malformed frames are ignored. */
  onMessage?: (message: unknown) => void;
  onStatusChange?: (status: ConsoleLiveStatus) => void;
  onError?: (event: Event) => void;
  /** Called for every socket close that was not requested by close(). */
  onClose?: (event: CloseEvent) => void;
  /** Return false to stop reconnecting after a close (for example a policy close). */
  shouldReconnect?: (event: CloseEvent) => boolean;
};

const defaultReconnectDelayMs = 1000;
const defaultMaxReconnectDelayMs = 12000;
const defaultMaxReconnectAttempts = 8;
const defaultMaxInitialReconnectAttempts = 1;
const defaultReconnectStabilityMs = 10000;

/**
 * Resolve a live route to a WebSocket URL. Absolute ws(s) URLs are kept;
 * http(s) URLs and paths map to the matching ws(s) scheme on that origin.
 */
export function resolveLiveURL(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }
  try {
    const url = new URL(trimmed, window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return url.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export class ConsoleLiveStream {
  protected options: ConsoleLiveStreamOptions;
  protected ws: WebSocket | null = null;
  protected reconnectTimer: number | null = null;
  protected reconnectStabilityTimer: number | null = null;
  protected reconnectAttempts = 0;
  protected manualClose = false;
  protected pendingCommands: ConsoleLiveCommand[] = [];
  protected status: ConsoleLiveStatus = 'disconnected';
  protected hasConnected = false;

  constructor(options: ConsoleLiveStreamOptions) {
    this.options = options;
  }

  protected getWebSocketURL(): string {
    return resolveLiveURL(this.options.url || '');
  }

  /** Handle one parsed message. Subclasses add protocol semantics. */
  protected handleMessage(message: unknown): void {
    this.options.onMessage?.(message);
  }

  /** Reset protocol state when the active socket closes. */
  protected handleSocketClosed(): void {}

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.manualClose = false;
    const url = this.getWebSocketURL();
    if (!url) {
      this.setStatus('error');
      return;
    }
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) {
        return;
      }
      this.hasConnected = true;
      this.scheduleReconnectBudgetReset(socket);
      this.setStatus('connected');
      this.flushPending();
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) {
        return;
      }
      if (!event || typeof event.data !== 'string') {
        return;
      }
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch {
        // ignore malformed payloads
      }
    };

    socket.onclose = (event) => {
      if (this.ws !== socket) {
        return;
      }
      this.clearReconnectStabilityTimer();
      this.handleSocketClosed();
      this.ws = null;
      if (this.manualClose) {
        this.setStatus('disconnected');
        return;
      }
      this.options.onClose?.(event);
      if (this.options.shouldReconnect && !this.options.shouldReconnect(event)) {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };

    socket.onerror = (event) => {
      if (this.ws !== socket) {
        return;
      }
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
    this.clearReconnectStabilityTimer();
    if (this.ws) {
      this.ws.close();
    }
  }

  sendCommand(cmd: ConsoleLiveCommand): void {
    if (!cmd || !cmd.type) {
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
      return;
    }
    this.pendingCommands.push(cmd);
  }

  /** Drop queued commands, for example after the identity loses access. */
  clearPendingCommands(): void {
    this.pendingCommands = [];
  }

  getStatus(): ConsoleLiveStatus {
    return this.status;
  }

  protected setStatus(status: ConsoleLiveStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  protected flushPending(): void {
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

  protected clearReconnectStabilityTimer(): void {
    if (this.reconnectStabilityTimer !== null) {
      window.clearTimeout(this.reconnectStabilityTimer);
      this.reconnectStabilityTimer = null;
    }
  }

  protected scheduleReconnectBudgetReset(socket: WebSocket): void {
    this.clearReconnectStabilityTimer();
    const stabilityMs = Math.max(this.options.reconnectStabilityMs ?? defaultReconnectStabilityMs, 0);
    this.reconnectStabilityTimer = window.setTimeout(() => {
      this.reconnectStabilityTimer = null;
      if (this.ws === socket && socket.readyState === WebSocket.OPEN) {
        this.reconnectAttempts = 0;
      }
    }, stabilityMs);
  }

  protected scheduleReconnect(): void {
    const maxAttempts = this.hasConnected
      ? (this.options.maxReconnectAttempts ?? defaultMaxReconnectAttempts)
      : (this.options.maxInitialReconnectAttempts ?? defaultMaxInitialReconnectAttempts);
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
      this.reconnectTimer = null;
      this.connect();
    }, backoff + jitter);
  }
}

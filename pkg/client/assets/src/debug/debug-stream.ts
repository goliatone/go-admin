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

const defaultReconnectDelayMs = 1000;
const defaultMaxReconnectDelayMs = 12000;
const defaultMaxReconnectAttempts = 8;
const defaultTokenRefreshBufferMs = 30000;

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

const appendQueryParam = (url: string, key: string, value: string): string => {
  const trimmed = url.trim();
  if (!trimmed || !key || !value) {
    return url;
  }
  const [base, hash] = trimmed.split('#');
  const sep = base.includes('?') ? '&' : '?';
  const next = `${base}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return hash ? `${next}#${hash}` : next;
};

const decodeBase64 = (value: string): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4 || 4)) % 4, '=');
  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(padded);
    }
  } catch {
    return null;
  }
  return null;
};

const parseJWTExpiryMs = (token: string): number | null => {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  const decoded = decodeBase64(parts[1]);
  if (!decoded) {
    return null;
  }
  try {
    const payload = JSON.parse(decoded) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch {
    return null;
  }
  return null;
};

const resolveTokenExpiryMs = (token: string, meta?: RemoteDebugToken): number | null => {
  if (meta) {
    if (typeof meta.expiresInMs === 'number' && meta.expiresInMs > 0) {
      return Date.now() + meta.expiresInMs;
    }
    const rawExpiry = meta.expiresAt ?? meta.expires_at;
    if (typeof rawExpiry === 'number') {
      return rawExpiry;
    }
    if (typeof rawExpiry === 'string') {
      const parsed = new Date(rawExpiry);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
  }
  return parseJWTExpiryMs(token);
};

export class DebugStream {
  protected options: DebugStreamOptions;
  protected ws: WebSocket | null = null;
  protected reconnectTimer: number | null = null;
  protected reconnectAttempts = 0;
  protected manualClose = false;
  protected pendingCommands: DebugCommand[] = [];
  protected status: DebugStreamStatus = 'disconnected';

  constructor(options: DebugStreamOptions) {
    this.options = options;
  }

  protected getWebSocketURL(): string {
    if (this.options.url) {
      return this.options.url;
    }
    return buildWebSocketURL(this.options.basePath || '');
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manualClose = false;
    const url = this.getWebSocketURL();
    if (!url) {
      this.setStatus('error');
      return;
    }
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

  protected setStatus(status: DebugStreamStatus): void {
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

  protected scheduleReconnect(): void {
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

export class RemoteDebugStream extends DebugStream {
  private baseUrl: string;
  private authToken: string | null = null;
  private tokenProvider?: () => Promise<RemoteDebugToken>;
  private tokenRefreshBufferMs: number;
  private tokenRefreshTimer: number | null = null;
  private tokenParam: string;
  private tokenExpiresAt: number | null = null;

  constructor(options: RemoteDebugStreamOptions) {
    const {
      url,
      authToken,
      tokenProvider,
      tokenRefreshBufferMs,
      tokenParam,
      appId,
      onEvent,
      ...rest
    } = options;

    const wrappedOnEvent = (event: DebugEvent) => {
      if (appId && event && !event.app_id) {
        onEvent?.({ ...event, app_id: appId });
        return;
      }
      onEvent?.(event);
    };

    super({
      ...rest,
      url,
      onEvent: wrappedOnEvent,
    });

    this.baseUrl = url;
    this.tokenProvider = tokenProvider;
    this.tokenRefreshBufferMs = tokenRefreshBufferMs ?? defaultTokenRefreshBufferMs;
    this.tokenParam = tokenParam || 'token';

    if (authToken) {
      this.setToken(authToken);
    }
  }

  protected getWebSocketURL(): string {
    if (this.authToken) {
      return appendQueryParam(this.baseUrl, this.tokenParam, this.authToken);
    }
    return this.baseUrl;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    void this.ensureToken().then((ok) => {
      if (!ok) {
        return;
      }
      super.connect();
    });
  }

  close(): void {
    this.clearTokenRefresh();
    super.close();
  }

  private clearTokenRefresh(): void {
    if (this.tokenRefreshTimer !== null) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  private scheduleTokenRefresh(): void {
    if (!this.tokenExpiresAt || !this.tokenProvider) {
      return;
    }
    const delay = Math.max(this.tokenExpiresAt - Date.now() - this.tokenRefreshBufferMs, 0);
    this.clearTokenRefresh();
    this.tokenRefreshTimer = setTimeout(() => {
      void this.refreshToken();
    }, delay) as unknown as number;
  }

  private setToken(token: string, meta?: RemoteDebugToken): void {
    this.authToken = token;
    this.tokenExpiresAt = resolveTokenExpiryMs(token, meta);
    this.scheduleTokenRefresh();
  }

  private tokenNeedsRefresh(): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }
    return Date.now() + this.tokenRefreshBufferMs >= this.tokenExpiresAt;
  }

  private async ensureToken(): Promise<boolean> {
    if (!this.tokenProvider) {
      return this.authToken != null;
    }
    if (this.authToken && !this.tokenNeedsRefresh()) {
      return true;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.tokenProvider) {
      return this.authToken != null;
    }
    try {
      const result = await this.tokenProvider();
      if (!result || !result.token) {
        this.setStatus('error');
        return false;
      }
      this.setToken(result.token, result);
      this.reconnectAttempts = 0;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      return true;
    } catch {
      this.setStatus('error');
      return false;
    }
  }
}

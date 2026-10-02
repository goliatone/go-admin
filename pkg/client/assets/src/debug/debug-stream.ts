import { ConsoleLiveStream } from '../console/live-stream.js';
import { normalizeDebugBasePath } from './shared/path-helpers.js';

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

export const debugSnapshotInvalidatedEvent = 'snapshot_invalidated';

export type DebugStreamOptions = {
  basePath?: string;
  url?: string;
  maxReconnectAttempts?: number;
  maxInitialReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  reconnectStabilityMs?: number;
  onEvent?: (event: DebugEvent) => void;
  onStatusChange?: (status: DebugStreamStatus) => void;
  onSnapshotInvalidated?: () => void;
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

const defaultTokenRefreshBufferMs = 30000;

const buildWebSocketURL = (basePath: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalized = normalizeDebugBasePath(basePath);
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

export class DebugStream extends ConsoleLiveStream {
  protected declare options: DebugStreamOptions;
  protected snapshotRecoveryPending = false;

  constructor(options: DebugStreamOptions) {
    super(options);
  }

  protected getWebSocketURL(): string {
    if (this.options.url) {
      return this.options.url;
    }
    return buildWebSocketURL(this.options.basePath || '');
  }

  protected handleMessage(message: unknown): void {
    const parsed = message as DebugEvent;
    if (parsed?.type === debugSnapshotInvalidatedEvent) {
      if (!this.snapshotRecoveryPending) {
        this.snapshotRecoveryPending = true;
        this.requestSnapshot();
      }
      this.options.onSnapshotInvalidated?.();
      return;
    }
    if (parsed?.type === 'snapshot') {
      this.snapshotRecoveryPending = false;
    }
    this.options.onEvent?.(parsed);
  }

  protected handleSocketClosed(): void {
    this.snapshotRecoveryPending = false;
  }

  sendCommand(cmd: DebugCommand): void {
    super.sendCommand(cmd);
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
    return super.getStatus();
  }

  protected setStatus(status: DebugStreamStatus): void {
    super.setStatus(status);
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

const defaultReconnectDelayMs = 1000;
const defaultMaxReconnectDelayMs = 12000;
const defaultMaxReconnectAttempts = 8;
const normalizeBasePath = (basePath) => {
  const trimmed = (basePath || '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/+$/, '');
  }
  return `/${trimmed.replace(/\/+$/, '')}`;
};
const buildWebSocketURL = (basePath) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalized = normalizeBasePath(basePath);
  return `${protocol}//${window.location.host}${normalized}/ws`;
};
class DebugStream {
  constructor(options) {
    this.options = options;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.manualClose = false;
    this.pendingCommands = [];
    this.status = 'disconnected';
  }
  connect() {
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
        const parsed = JSON.parse(event.data);
        this.options.onEvent?.(parsed);
      } catch {
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
  close() {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
    }
  }
  sendCommand(cmd) {
    if (!cmd || !cmd.type) {
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
      return;
    }
    this.pendingCommands.push(cmd);
  }
  subscribe(panels) {
    this.sendCommand({ type: 'subscribe', panels });
  }
  unsubscribe(panels) {
    this.sendCommand({ type: 'unsubscribe', panels });
  }
  requestSnapshot() {
    this.sendCommand({ type: 'snapshot' });
  }
  clear(panels) {
    this.sendCommand({ type: 'clear', panels });
  }
  getStatus() {
    return this.status;
  }
  setStatus(status) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.options.onStatusChange?.(status);
  }
  flushPending() {
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
  scheduleReconnect() {
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
export {
  DebugStream
};

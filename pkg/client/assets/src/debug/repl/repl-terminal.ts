import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import xtermCss from 'xterm/css/xterm.css?inline';

export type DebugReplKind = 'shell' | 'console';
export type DebugReplStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

type DebugReplTerminalOptions = {
  kind: DebugReplKind;
  debugPath: string;
  container: HTMLElement;
  onStatusChange?: (status: DebugReplStatus) => void;
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

const replSocketSuffix = (kind: DebugReplKind): string => {
  return kind === 'shell' ? 'repl/shell/ws' : 'repl/app/ws';
};

const buildWebSocketURL = (basePath: string, kind: DebugReplKind): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalized = normalizeBasePath(basePath);
  const suffix = replSocketSuffix(kind);
  return `${protocol}//${window.location.host}${normalized}/${suffix}`;
};

const ensureXtermStyles = (() => {
  let injected = false;
  return () => {
    if (injected) {
      return;
    }
    const style = document.createElement('style');
    style.setAttribute('data-debug-repl-xterm', 'true');
    style.textContent = xtermCss;
    document.head.appendChild(style);
    injected = true;
  };
})();

export class DebugReplTerminal {
  private options: DebugReplTerminalOptions;
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private socket: WebSocket | null = null;
  private status: DebugReplStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private manualClose = false;
  private resizeObserver: ResizeObserver | null = null;
  private lineBuffer = '';
  private skipEscape = false;
  private prompt = '>>> ';
  private awaitingPrompt = true;

  constructor(options: DebugReplTerminalOptions) {
    this.options = options;
    ensureXtermStyles();

    this.terminal = new Terminal({
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      convertEol: true,
      cursorBlink: true,
      scrollback: 2000,
      theme: {
        background: '#181825',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: 'rgba(137, 180, 250, 0.35)',
      },
    });
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(options.container);
    this.fitAddon.fit();
    this.terminal.focus();
    this.bindTerminal();
    this.observeResize(options.container);
    this.connect();
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manualClose = false;
    this.setStatus('connecting');
    const url = buildWebSocketURL(this.options.debugPath, this.options.kind);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.awaitingPrompt = true;
      if (this.options.kind === 'console') {
        this.writePrompt();
      }
      this.sendResize();
    };

    this.socket.onmessage = (event) => {
      if (!event || typeof event.data !== 'string') {
        return;
      }
      this.handleMessage(event.data);
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (this.manualClose) {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.setStatus('error');
    };
  }

  reconnect(): void {
    this.manualClose = true;
    if (this.socket) {
      this.socket.close();
    }
    this.manualClose = false;
    this.reconnectAttempts = 0;
    this.connect();
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
    }
  }

  kill(): void {
    this.sendCommand({ type: 'close' });
    this.disconnect();
  }

  clear(): void {
    this.terminal.clear();
    if (this.options.kind === 'console') {
      this.lineBuffer = '';
      this.writePrompt(true);
    }
  }

  refresh(): void {
    this.fitAddon.fit();
    this.sendResize();
  }

  focus(): void {
    this.terminal.focus();
  }

  paste(value: string): void {
    if (!value) {
      return;
    }
    this.handlePaste(value);
    this.terminal.focus();
  }

  private bindTerminal(): void {
    this.terminal.attachCustomKeyEventHandler((event) => this.handleKeyEvent(event));
    if (this.options.kind === 'shell') {
      this.terminal.onData((data) => {
        this.sendCommand({ type: 'input', data });
      });
      return;
    }
    this.terminal.onData((data) => this.handleConsoleInput(data));
  }

  private handleKeyEvent(event: KeyboardEvent): boolean {
    if (!event) {
      return true;
    }
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.shiftKey && event.code === 'KeyC') {
      const selection = this.terminal.getSelection();
      if (!selection) {
        return true;
      }
      navigator.clipboard?.writeText(selection).catch(() => null);
      return false;
    }
    if (meta && event.shiftKey && event.code === 'KeyV') {
      navigator.clipboard
        ?.readText()
        .then((text) => {
          if (text) {
            this.handlePaste(text);
          }
        })
        .catch(() => null);
      return false;
    }
    return true;
  }

  private handlePaste(text: string): void {
    if (!text) {
      return;
    }
    if (this.options.kind === 'shell') {
      this.sendCommand({ type: 'input', data: text });
      return;
    }
    this.handleConsoleInput(text);
  }

  private handleConsoleInput(data: string): void {
    if (!data) {
      return;
    }
    const normalized = data.replace(/\r\n/g, '\n');
    for (const char of normalized) {
      if (this.skipEscape) {
        if (char >= '@' && char <= '~') {
          this.skipEscape = false;
        }
        continue;
      }
      if (char === '\n' || char === '\r') {
        this.submitLine();
        continue;
      }
      if (char === '\u0003') {
        this.terminal.write('^C\r\n');
        this.lineBuffer = '';
        this.writePrompt(true);
        continue;
      }
      if (char === '\u007f' || char === '\b') {
        if (this.lineBuffer.length > 0) {
          this.lineBuffer = this.lineBuffer.slice(0, -1);
          this.terminal.write('\b \b');
        }
        continue;
      }
      if (char === '\u001b') {
        this.skipEscape = true;
        continue;
      }
      this.lineBuffer += char;
      this.terminal.write(char);
    }
  }

  private submitLine(): void {
    const code = this.lineBuffer.trim();
    this.lineBuffer = '';
    this.terminal.write('\r\n');
    if (!code) {
      this.writePrompt(true);
      return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.terminal.write('[disconnected]\r\n');
      this.writePrompt(true);
      return;
    }
    this.sendCommand({ type: 'eval', code });
    this.awaitingPrompt = true;
  }

  private handleMessage(raw: string): void {
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || !payload.type) {
      return;
    }
    if (this.options.kind === 'shell') {
      this.handleShellEvent(payload);
    } else {
      this.handleConsoleEvent(payload);
    }
  }

  private handleShellEvent(payload: any): void {
    if (payload.type === 'output' && typeof payload.data === 'string') {
      this.terminal.write(payload.data);
      return;
    }
    if (payload.type === 'exit') {
      const code = Number(payload.code ?? 0);
      this.terminal.write(`\r\n[session closed: ${code}]\r\n`);
    }
  }

  private handleConsoleEvent(payload: any): void {
    if (payload.type === 'result') {
      const output = typeof payload.output === 'string' ? payload.output : String(payload.output ?? '');
      if (output) {
        this.writeLine(output);
      }
      this.writePrompt();
      return;
    }
    if (payload.type === 'error') {
      const output = typeof payload.output === 'string' ? payload.output : String(payload.output ?? '');
      if (output) {
        this.terminal.write(`\x1b[31m${output}\x1b[0m\r\n`);
      }
      this.writePrompt();
    }
  }

  private writeLine(value: string): void {
    const normalized = value.replace(/\r?\n/g, '\r\n');
    this.terminal.write(`${normalized}\r\n`);
  }

  private writePrompt(force = false): void {
    if (this.options.kind !== 'console') {
      return;
    }
    if (!force && !this.awaitingPrompt) {
      return;
    }
    this.awaitingPrompt = false;
    this.terminal.write(this.prompt);
  }

  private sendResize(): void {
    if (this.options.kind !== 'shell') {
      return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (!this.terminal.cols || !this.terminal.rows) {
      return;
    }
    this.sendCommand({ type: 'resize', cols: this.terminal.cols, rows: this.terminal.rows });
  }

  private sendCommand(payload: Record<string, any>): void {
    if (!payload || !payload.type) {
      return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  private setStatus(status: DebugReplStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  private scheduleReconnect(): void {
    if (this.manualClose) {
      return;
    }
    if (this.reconnectAttempts >= defaultMaxReconnectAttempts) {
      this.setStatus('disconnected');
      return;
    }
    const attempt = this.reconnectAttempts;
    const backoff = Math.min(defaultReconnectDelayMs * Math.pow(2, attempt), defaultMaxReconnectDelayMs);
    const jitter = backoff * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, backoff + jitter);
  }

  private observeResize(container: HTMLElement): void {
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit();
      this.sendResize();
    });
    this.resizeObserver.observe(container);
  }
}

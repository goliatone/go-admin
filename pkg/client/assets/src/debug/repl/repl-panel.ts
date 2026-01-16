import { DebugReplTerminal, type DebugReplKind, type DebugReplStatus } from './repl-terminal.js';

type DebugReplPanelOptions = {
  kind: DebugReplKind;
  debugPath: string;
  commands?: DebugReplCommand[];
};

export type DebugReplCommand = {
  command: string;
  description?: string;
  tags?: string[];
  mutates?: boolean;
  aliases?: string[];
};

const replTitles: Record<DebugReplKind, string> = {
  shell: 'Shell Console',
  console: 'App Console',
};

const replHints: Record<DebugReplKind, string> = {
  shell: 'Copy with Ctrl+Shift+C. Paste with Ctrl+Shift+V.',
  console: 'Copy with Ctrl+Shift+C. Paste with Ctrl+Shift+V. Enter submits. Click a command to insert.',
};

const replStatusLabels: Record<DebugReplStatus, string> = {
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'reconnecting',
  error: 'error',
};

const escapeHTML = (value: any): string => {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export class DebugReplPanel {
  private options: DebugReplPanelOptions;
  private root: HTMLElement;
  private statusEl: HTMLElement;
  private statusTextEl: HTMLElement;
  private terminalEl: HTMLElement;
  private actionsEl: HTMLElement;
  private terminal: DebugReplTerminal;
  private commands: DebugReplCommand[];
  private commandsEl: HTMLElement | null = null;

  constructor(options: DebugReplPanelOptions) {
    this.options = options;
    this.commands = Array.isArray(options.commands) ? options.commands : [];
    this.root = document.createElement('section');
    this.root.className = 'debug-repl';
    this.root.dataset.replKind = options.kind;
    const commandsMarkup =
      options.kind === 'console' ? this.renderCommands() : '';
    this.root.innerHTML = `
      <div class="debug-repl__header">
        <div class="debug-repl__title">
          <span class="debug-repl__label">${replTitles[options.kind]}</span>
          <div class="debug-repl__status" data-repl-status="disconnected">
            <span class="debug-repl__dot"></span>
            <span data-repl-status-text>disconnected</span>
          </div>
        </div>
        <div class="debug-repl__actions">
          <button class="debug-btn" data-repl-action="reconnect"><i class="iconoir-refresh"></i> Reconnect</button>
          <button class="debug-btn" data-repl-action="clear"><i class="iconoir-erase"></i> Clear</button>
          <button class="debug-btn debug-btn--danger" data-repl-action="kill"><i class="iconoir-trash"></i> Kill</button>
        </div>
      </div>
      <div class="debug-repl__body">
        <div class="debug-repl__terminal" data-repl-terminal></div>
        ${commandsMarkup}
      </div>
      <div class="debug-repl__footer">
        <span class="debug-repl__hint">${replHints[options.kind]}</span>
      </div>
    `;

    this.statusEl = this.requireElement('[data-repl-status]', this.root);
    this.statusTextEl = this.requireElement('[data-repl-status-text]', this.root);
    this.terminalEl = this.requireElement('[data-repl-terminal]', this.root);
    this.actionsEl = this.requireElement('.debug-repl__actions', this.root);
    this.commandsEl = this.root.querySelector('[data-repl-commands]');

    this.terminal = new DebugReplTerminal({
      kind: options.kind,
      debugPath: options.debugPath,
      container: this.terminalEl,
      onStatusChange: (status) => this.updateStatus(status),
    });

    this.bindActions();
    this.bindCommandActions();
  }

  attach(container: HTMLElement): void {
    if (!container) {
      return;
    }
    container.innerHTML = '';
    container.appendChild(this.root);
    this.terminal.refresh();
    this.terminal.focus();
  }

  private bindActions(): void {
    this.actionsEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const button = target.closest<HTMLButtonElement>('[data-repl-action]');
      if (!button) {
        return;
      }
      const action = button.dataset.replAction || '';
      switch (action) {
        case 'reconnect':
          this.terminal.reconnect();
          break;
        case 'clear':
          this.terminal.clear();
          break;
        case 'kill':
          this.terminal.kill();
          break;
        default:
          break;
      }
    });
  }

  private bindCommandActions(): void {
    if (!this.commandsEl || this.options.kind !== 'console') {
      return;
    }
    this.commandsEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const button = target.closest<HTMLButtonElement>('[data-repl-command]');
      if (!button) {
        return;
      }
      const command = button.dataset.replCommand || '';
      if (!command) {
        return;
      }
      this.terminal.paste(`${command} `);
      this.terminal.focus();
    });
  }

  private updateStatus(status: DebugReplStatus): void {
    const label = replStatusLabels[status] || status;
    this.statusEl.dataset.replStatus = status;
    this.statusTextEl.textContent = label;
  }

  private renderCommands(): string {
    if (this.options.kind !== 'console') {
      return '';
    }
    const commands = this.commands;
    const count = commands.length;
    const items = commands
      .map((cmd) => {
        const title = escapeHTML(cmd.command);
        const description = cmd.description ? `<div class="debug-repl__command-desc">${escapeHTML(cmd.description)}</div>` : '';
        const tags = Array.isArray(cmd.tags) && cmd.tags.length > 0
          ? `<div class="debug-repl__command-tags">${cmd.tags
              .map((tag) => `<span class="debug-repl__command-tag">${escapeHTML(tag)}</span>`)
              .join('')}</div>`
          : '';
        const badgeClass = cmd.mutates ? 'debug-repl__command-badge--exec' : '';
        const badgeLabel = cmd.mutates ? 'exec' : 'read-only';
        return `
          <button class="debug-repl__command" type="button" data-repl-command="${title}">
            <div class="debug-repl__command-title">
              <span class="debug-repl__command-name">${title}</span>
              <span class="debug-repl__command-badge ${badgeClass}">${badgeLabel}</span>
            </div>
            ${description}
            ${tags}
          </button>
        `;
      })
      .join('');
    const body = count > 0 ? items : '<div class="debug-repl__commands-empty">No exposed commands.</div>';
    return `
      <aside class="debug-repl__commands" data-repl-commands>
        <div class="debug-repl__commands-header">
          <span>Commands</span>
          <span class="debug-repl__commands-count">${count}</span>
        </div>
        <div class="debug-repl__commands-list">
          ${body}
        </div>
      </aside>
    `;
  }

  private requireElement(selector: string, parent: ParentNode): HTMLElement {
    const el = parent.querySelector(selector);
    if (!el) {
      throw new Error(`Missing debug repl element: ${selector}`);
    }
    return el as HTMLElement;
  }
}

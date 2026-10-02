// Structured action confirmation (ADR-0003/0004) on the shared admin Modal:
// stacking, Escape, focus containment/restoration and reduced motion come from
// the admin modal coordinator. Content is server-declared and escaped; the
// before/after rows show exactly what the frozen payload confirms.

import { Modal } from '../shared/modal.js';
import { escapeAttribute, escapeHTML } from './format.js';
import { normalizeTone } from './schema/rich.js';
import type { PanelUIActionConfirmation } from './types.js';

let confirmSequence = 0;

export type ConsoleConfirmRequest = {
  title: string;
  message: string;
  changes?: PanelUIActionConfirmation['changes'];
  note?: string;
  confirmLabel?: string;
  tone?: string;
};

function text(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function renderChangeValue(value: unknown, format: string): string {
  const raw = text(value);
  if (!raw) return '<span class="console-muted">—</span>';
  return format === 'mono' || format === 'copy'
    ? `<code class="console-kv__mono">${escapeHTML(raw)}</code>`
    : escapeHTML(raw);
}

class ConsoleConfirmModal extends Modal {
  private readonly request: ConsoleConfirmRequest;
  private readonly resolve: (confirmed: boolean) => void;
  private readonly titleID: string;
  private readonly messageID: string;
  private settled = false;

  constructor(request: ConsoleConfirmRequest, resolve: (confirmed: boolean) => void) {
    const sequence = (confirmSequence += 1);
    const titleID = `console-confirm-${sequence}-title`;
    const messageID = `console-confirm-${sequence}-message`;
    super({
      size: 'md',
      flexColumn: true,
      dismissOnBackdropClick: true,
      dismissOnEscape: true,
      lockBodyScroll: true,
      initialFocus: '[data-modal-cancel]',
      labelledBy: titleID,
      describedBy: messageID,
      containerClass: 'console-modal',
      backdropDataAttr: 'data-console-modal',
    });
    this.request = request;
    this.resolve = resolve;
    this.titleID = titleID;
    this.messageID = messageID;
  }

  protected renderContent(): string {
    const { title, message, note } = this.request;
    const tone = normalizeTone(this.request.tone) || 'warning';
    const changes = (Array.isArray(this.request.changes) ? this.request.changes : [])
      .map((change) => ({
        label: text(change?.label),
        before: change?.before,
        after: change?.after,
        format: text(change?.format).toLowerCase(),
      }))
      .filter((change) => change.label)
      .slice(0, 12);
    const table = changes.length === 0
      ? ''
      : `<table class="console-modal__changes"><thead><tr><th scope="col">Value</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${changes.map((change) => `<tr><th scope="row">${escapeHTML(change.label)}</th><td>${renderChangeValue(change.before, change.format)}</td><td>${renderChangeValue(change.after, change.format)}</td></tr>`).join('')}</tbody></table>`;
    return `
      <div class="go-admin-modal__header console-modal__header">
        <h2 class="console-modal__title" id="${escapeAttribute(this.titleID)}">${escapeHTML(title)}</h2>
      </div>
      <div class="go-admin-modal__body console-modal__body">
        <div class="console-callout" data-tone="${tone}"><p id="${escapeAttribute(this.messageID)}">${escapeHTML(message)}</p></div>
        ${table}
        ${note ? `<p class="console-modal__note">${escapeHTML(note)}</p>` : ''}
      </div>
      <div class="go-admin-modal__footer console-modal__footer">
        <button type="button" class="console-btn" data-modal-cancel>Cancel</button>
        <button type="button" class="console-btn console-btn--primary${tone === 'error' ? ' console-btn--danger' : ''}" data-modal-confirm>${escapeHTML(this.request.confirmLabel || 'Confirm')}</button>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-modal-cancel]')?.addEventListener('click', () => this.finish(false));
    this.container?.querySelector('[data-modal-confirm]')?.addEventListener('click', () => this.finish(true));
  }

  protected onBeforeHide(): boolean {
    if (!this.settled) {
      this.settled = true;
      this.resolve(false);
    }
    return true;
  }

  private finish(confirmed: boolean): void {
    if (this.settled) return;
    this.settled = true;
    this.resolve(confirmed);
    this.hide();
  }
}

/** Ask for structured confirmation. Resolves false on cancel, Escape or backdrop. */
export function confirmConsoleAction(request: ConsoleConfirmRequest): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const modal = new ConsoleConfirmModal(request, resolve);
    modal.show().catch(() => resolve(false));
  });
}

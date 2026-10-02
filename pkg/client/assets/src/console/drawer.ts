// In-root action drawer (ADR-0004). The drawer is a modal layer of the shared
// admin coordinator (Escape, Tab containment, stacking, scroll lock); it lives
// inside its console root so the console's scoped styles and listeners apply,
// and focus returns to the invoking control, or a safe fallback when a
// rerender replaced it.

import { getModalFocusableElements, registerModalLayer, type ModalLayerHandle } from '../shared/modal-coordinator.js';
import { escapeAttribute, escapeHTML } from './format.js';

export type ConsoleDrawerOptions = {
  /** Console root that owns the drawer. */
  root: HTMLElement;
  /** Unique ID prefix within the document. */
  id: string;
  panelID: string;
  actionID: string;
  title: string;
  eyebrow?: string;
  /** Trusted markup produced by the schema renderers (already escaped). */
  body: string;
  /** Control that opened the drawer. */
  invoker: HTMLElement | null;
  /** Focus target used when the invoker no longer exists. */
  fallbackFocus: () => HTMLElement | null;
  /** Called once after the drawer was removed. */
  onClose?: () => void;
};

const OPEN_FRAME_MS = 16;

export class ConsoleDrawer {
  readonly panelID: string;
  readonly actionID: string;
  readonly element: HTMLElement;
  readonly dialog: HTMLElement;

  private readonly options: ConsoleDrawerOptions;
  private layer: ModalLayerHandle | null = null;
  private closed = false;
  private readonly releaseListeners: Array<() => void> = [];

  constructor(options: ConsoleDrawerOptions) {
    this.options = options;
    this.panelID = options.panelID;
    this.actionID = options.actionID;
    const doc = options.root.ownerDocument;
    const titleID = `${options.id}-title`;
    const layer = doc.createElement('div');
    layer.className = 'console-drawer-layer';
    layer.setAttribute('data-console-drawer-layer', '');
    layer.dataset.state = 'opening';
    layer.innerHTML = `
      <div class="console-drawer__backdrop" data-drawer-backdrop></div>
      <aside class="console-drawer" role="dialog" aria-modal="true" aria-labelledby="${escapeAttribute(titleID)}" data-console-drawer data-panel-id="${escapeAttribute(options.panelID)}" data-action-id="${escapeAttribute(options.actionID)}">
        <header class="console-drawer__header">
          <div class="console-drawer__heading">
            ${options.eyebrow ? `<p class="console-drawer__eyebrow">${escapeHTML(options.eyebrow)}</p>` : ''}
            <h2 class="console-drawer__title" id="${escapeAttribute(titleID)}">${escapeHTML(options.title)}</h2>
          </div>
          <button type="button" class="console-btn console-btn--ghost console-btn--icon" data-drawer-close aria-label="Close"><span aria-hidden="true">×</span></button>
        </header>
        ${options.body}
      </aside>
    `;
    this.element = layer;
    this.dialog = layer.querySelector<HTMLElement>('[data-console-drawer]')!;
    options.root.appendChild(layer);
    this.layer = registerModalLayer({
      container: this.dialog,
      zIndexTarget: layer,
      initialFocus: null,
      returnFocus: null,
      dismissOnEscape: true,
      onEscape: () => this.close(),
      lockBodyScroll: true,
    });
    // Tab moves through every drawer control in order. The coordinator wraps at
    // the edges; between them some browsers (WebKit by default) skip buttons
    // and would leave the dialog.
    this.listen(this.dialog, 'keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key !== 'Tab' || key.defaultPrevented || key.altKey || key.ctrlKey || key.metaKey) return;
      const focusable = getModalFocusableElements(this.dialog);
      if (focusable.length === 0) return;
      const index = focusable.indexOf(doc.activeElement as HTMLElement);
      const last = focusable.length - 1;
      const next = key.shiftKey ? (index <= 0 ? last : index - 1) : (index < 0 || index === last ? 0 : index + 1);
      key.preventDefault();
      focusable[next].focus();
    });
    this.listen(layer, 'click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-drawer-close], [data-drawer-cancel]') || target?.hasAttribute('data-drawer-backdrop')) {
        event.preventDefault();
        this.close();
      }
    });
    const reveal = (): void => {
      if (!this.closed) layer.dataset.state = 'open';
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal);
    else setTimeout(reveal, OPEN_FRAME_MS);
    this.focusInitial();
  }

  isOpen(): boolean {
    return !this.closed;
  }

  /** Focus the first editable control, else the first control. */
  focusInitial(): void {
    const preferred = this.dialog.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-submitter="primary"]:not([disabled])',
    );
    this.layer?.focusInitial(preferred || undefined);
  }

  /** Remove the drawer and restore focus to the invoker or the fallback. */
  close(restoreFocus = true): void {
    if (this.closed) return;
    this.closed = true;
    this.releaseListeners.splice(0).forEach((release) => release());
    const layer = this.layer;
    this.layer = null;
    layer?.release({ restoreFocus: false });
    this.element.remove();
    if (restoreFocus) {
      const doc = this.options.root.ownerDocument;
      const active = doc.activeElement;
      const lost = !active || active === doc.body || !active.isConnected;
      if (lost) {
        const invoker = this.options.invoker;
        const target = invoker && invoker.isConnected && !invoker.closest('[hidden]') ? invoker : this.options.fallbackFocus();
        target?.focus({ preventScroll: false });
      }
    }
    this.options.onClose?.();
  }

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler);
    this.releaseListeners.push(() => target.removeEventListener(type, handler));
  }
}

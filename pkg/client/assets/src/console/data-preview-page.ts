// Application preview page: enhances the chrome the Data module wraps around a
// host's application view on a preview session page. The server renders the
// complete page (flags, pinned identity, expiry, Return link); this script
// adds Close, shows the expiry in local time with the remaining minutes and
// keeps both truthful on the server's clock. It never extends a session and
// never reads the application view. Without it the Return link still works
// and the session still expires on the server.

import { parseSelection, type ExploreSelection } from './data-explorer/contract.js';
import { previewID, previewPath } from './data-preview/contract.js';
import { createHTTPPreviewTransport, type PreviewFailureKind, type PreviewTransport } from './data-preview/transport.js';

const PAGE_SELECTOR = '[data-preview-page]';
/** How often the remaining time is refreshed. */
const TICK_MS = 30 * 1000;

export type PreviewPageOptions = {
  transport?: PreviewTransport;
  /** This page's clock (ms). */
  now?: () => number;
  /** Navigation seam (tests). */
  navigate?: (url: string) => void;
};

/** What the server rendered into the page root. */
export type PreviewPageConfig = {
  sessionId: string;
  surfaceId: string;
  selection: ExploreSelection;
  sessionURL: string;
  closeURL: string;
  returnURL: string;
  expiresAt: number;
  /** Server clock minus this page's clock when the page loaded (ms). */
  skew: number;
};

const CLOSE_MESSAGES: Partial<Record<PreviewFailureKind, string>> = {
  gone: 'This preview has already ended.',
  denied: 'Your access changed, so this preview has ended.',
  stale: 'The prepared data changed, so this preview has ended.',
  expired: 'Your session expired. Reload the page to continue.',
  invalid: 'This preview could not be closed. Reload the page and try again.',
};

/** Close answers that mean the session no longer grants anything. */
const ENDED: ReadonlySet<PreviewFailureKind> = new Set(['gone', 'denied', 'stale']);

/** The page configuration, or null when the server rendered an incomplete one. */
export function readPreviewPageConfig(root: HTMLElement, now: number): PreviewPageConfig | null {
  const data = root.dataset;
  let selection: ExploreSelection | null = null;
  try {
    selection = parseSelection(JSON.parse(data.previewSelection || ''));
  } catch {
    selection = null;
  }
  const sessionURL = previewPath(data.previewSessionUrl);
  const closeURL = previewPath(data.previewCloseUrl);
  const returnURL = previewPath(data.previewReturnUrl);
  const surfaceId = previewID(data.previewSurface);
  const expiresAt = Date.parse(data.previewExpires || '');
  const serverNow = Date.parse(data.previewServerNow || '');
  const sessionId = previewID(data.previewSession);
  if (!selection || selection.context !== 'prepared' || !sessionURL || !closeURL || !returnURL || !surfaceId || !sessionId || !Number.isFinite(expiresAt)) {
    return null;
  }
  const skew = Number.isFinite(serverNow) && Math.abs(serverNow - now) <= 24 * 60 * 60 * 1000 ? serverNow - now : 0;
  return { sessionId, surfaceId, selection, sessionURL, closeURL, returnURL, expiresAt, skew };
}

function remainingText(ms: number): string {
  if (ms <= 0) return '(expired)';
  const minutes = Math.ceil(ms / 60000);
  return minutes === 1 ? '(in 1 minute)' : `(in ${minutes} minutes)`;
}

export class PreviewPage {
  readonly root: HTMLElement;
  readonly config: PreviewPageConfig;
  private readonly transport: PreviewTransport;
  private readonly now: () => number;
  private readonly navigate: (url: string) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private closing = false;
  private disposed = false;
  private readonly onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest('[data-preview-close]') : null;
    if (!target || !this.root.contains(target)) return;
    event.preventDefault();
    void this.close();
  };

  constructor(root: HTMLElement, config: PreviewPageConfig, options: PreviewPageOptions = {}) {
    this.root = root;
    this.config = config;
    this.now = options.now || Date.now;
    this.navigate = options.navigate || ((url) => window.location.assign(url));
    // The page carries filled locators: no template placeholder is left to fill.
    this.transport = options.transport || createHTTPPreviewTransport({ capabilities: '', open: '', session: config.sessionURL, close: config.closeURL });
  }

  mount(): void {
    const close = this.closeButton();
    if (close) close.hidden = false;
    this.root.addEventListener('click', this.onClick);
    this.localizeExpiry();
    this.tick();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeEventListener('click', this.onClick);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** This page's clock corrected by the server's. */
  serverNow(): number {
    return this.now() + this.config.skew;
  }

  private closeButton(): HTMLButtonElement | null {
    return this.root.querySelector<HTMLButtonElement>('[data-preview-close]');
  }

  private status(message: string): void {
    const status = this.root.querySelector<HTMLElement>('[data-preview-status]');
    if (status) status.textContent = message;
  }

  private localizeExpiry(): void {
    const time = this.root.querySelector<HTMLElement>('[data-preview-expiry]');
    if (!time) return;
    const at = new Date(this.config.expiresAt);
    time.textContent = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    time.title = at.toLocaleString();
  }

  /** Refresh the remaining time. */
  tick(): void {
    if (this.disposed) return;
    const remaining = this.root.querySelector<HTMLElement>('[data-preview-remaining]');
    if (remaining) remaining.textContent = remainingText(this.config.expiresAt - this.serverNow());
  }

  /** Close the session, then return to the exact Data details. */
  async close(): Promise<void> {
    const button = this.closeButton();
    if (this.closing || this.disposed) return;
    this.closing = true;
    if (button) {
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Closing…';
    }
    this.status('Closing the preview…');
    const controller = new AbortController();
    const result = await this.transport.close({ sessionId: this.config.sessionId, selection: this.config.selection, surfaceId: this.config.surfaceId }, controller.signal);
    if (this.disposed) return;
    if (result.ok || ENDED.has(result.failure.kind)) {
      this.status(result.ok ? 'Preview closed. Returning to Data…' : `${CLOSE_MESSAGES[result.failure.kind]} Returning to Data…`);
      if (button) button.hidden = true;
      this.navigate(this.config.returnURL);
      return;
    }
    this.closing = false;
    if (button) {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
      button.textContent = 'Close preview';
    }
    this.status(CLOSE_MESSAGES[result.failure.kind] || 'Closing the preview failed. Try again.');
  }
}

const pages = new WeakMap<HTMLElement, PreviewPage>();

/** Enhance a preview page root; null when its configuration is incomplete. */
export function mountPreviewPage(root: HTMLElement, options: PreviewPageOptions = {}): PreviewPage | null {
  const existing = pages.get(root);
  if (existing) return existing;
  const config = readPreviewPageConfig(root, (options.now || Date.now)());
  if (!config) return null;
  const page = new PreviewPage(root, config, options);
  pages.set(root, page);
  page.mount();
  return page;
}

function start(): void {
  document.querySelectorAll<HTMLElement>(PAGE_SELECTOR).forEach((root) => {
    mountPreviewPage(root);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

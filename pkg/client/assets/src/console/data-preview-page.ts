// Application preview page: enhances the chrome the Data module wraps around a
// host's application view on a preview session page. The server renders the
// complete page (flags, pinned identity, expiry, Return link); this script
// adds Close, shows the expiry in local time with the remaining minutes and
// keeps both truthful on the server's clock. While the page is open it reads
// only the session's safe state (bounded: every 30 seconds, when the tab is
// shown again and at expiry); once the session ended, closed or lost the
// actor's access, the view's content is removed from the page and only a way
// back to Data remains. It never extends a session and never reads the
// application view. Without it the Return link still works and the server
// refuses every later read.

import { parseSelection, type ExploreSelection } from './data-explorer/contract.js';
import { previewID, previewPath } from './data-preview/contract.js';
import { createHTTPPreviewTransport, type PreviewFailureKind, type PreviewTransport } from './data-preview/transport.js';

const PAGE_SELECTOR = '[data-preview-page]';
/** How often the remaining time is refreshed. */
const TICK_MS = 30 * 1000;
/** How often the session's state is read while the page is open. */
const POLL_MS = 30 * 1000;
/** Fewest milliseconds between two state reads (tab shown again, expiry). */
const MIN_CHECK_GAP_MS = 5 * 1000;

/** Why the page stopped showing the view. */
export type PreviewEnd = 'closed' | 'expired' | 'unavailable' | 'signed-out';

const END_STATUS: Record<PreviewEnd, string> = {
  closed: 'Preview closed.',
  expired: 'Preview expired.',
  unavailable: 'Preview ended.',
  'signed-out': 'Signed out.',
};

const END_MESSAGES: Record<PreviewEnd, string> = {
  closed: 'This preview was closed. Nothing it showed is kept on this page.',
  expired: 'This preview expired. Start a new preview from Data to look again.',
  unavailable: 'This preview ended because the receipt, your access or the application runtime changed.',
  'signed-out': 'Your session expired. Sign in again, then start a new preview from Data.',
};

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

/** Minutes left, rounded: the page's server time has whole seconds, so a ceiling would over-count. */
function remainingText(ms: number): string {
  if (ms <= 0) return '(expired)';
  if (ms < 60000) return '(in less than a minute)';
  const minutes = Math.round(ms / 60000);
  return minutes === 1 ? '(in 1 minute)' : `(in ${minutes} minutes)`;
}

export class PreviewPage {
  readonly root: HTMLElement;
  readonly config: PreviewPageConfig;
  private readonly transport: PreviewTransport;
  private readonly now: () => number;
  private readonly navigate: (url: string) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private poller: ReturnType<typeof setInterval> | null = null;
  private expiry: ReturnType<typeof setTimeout> | null = null;
  private checking: AbortController | null = null;
  private lastCheck = 0;
  private closing = false;
  private ended: PreviewEnd | null = null;
  private disposed = false;
  private readonly onVisible = (): void => {
    if (document.visibilityState === 'visible') void this.check();
  };
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
    this.poller = setInterval(() => void this.check(), POLL_MS);
    document.addEventListener('visibilitychange', this.onVisible);
    // At expiry the view goes; a state read confirms why.
    const remaining = this.config.expiresAt - this.serverNow();
    this.expiry = setTimeout(() => {
      this.end('expired');
      void this.check(true);
    }, Math.min(Math.max(remaining, 0) + 50, 30 * 60 * 1000));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeEventListener('click', this.onClick);
    document.removeEventListener('visibilitychange', this.onVisible);
    this.stopTimers();
    this.checking?.abort();
    this.checking = null;
  }

  /** Why the view is no longer shown, or null while it is. */
  endedBy(): PreviewEnd | null {
    return this.ended;
  }

  private stopTimers(): void {
    if (this.timer !== null) clearInterval(this.timer);
    if (this.poller !== null) clearInterval(this.poller);
    if (this.expiry !== null) clearTimeout(this.expiry);
    this.timer = null;
    this.poller = null;
    this.expiry = null;
  }

  /**
   * Read the session's state. A session that is no longer ready, or that the
   * server no longer grants, ends the page; transient failures keep it.
   */
  async check(force = false): Promise<void> {
    if (this.disposed || this.checking || (this.ended && !force)) return;
    const now = this.now();
    if (!force && now - this.lastCheck < MIN_CHECK_GAP_MS) return;
    this.lastCheck = now;
    const controller = new AbortController();
    this.checking = controller;
    const result = await this.transport.session({ sessionId: this.config.sessionId, selection: this.config.selection, surfaceId: this.config.surfaceId }, controller.signal);
    if (this.checking !== controller) return;
    this.checking = null;
    if (this.disposed) return;
    if (result.ok) {
      if (result.value.state === 'ready') return;
      this.end(result.value.state === 'closed' ? 'closed' : result.value.state === 'expired' ? 'expired' : 'unavailable', true);
      return;
    }
    if (ENDED.has(result.failure.kind)) this.end('unavailable', true);
    else if (result.failure.kind === 'expired') this.end('signed-out', true);
  }

  /**
   * Remove the view's content and leave only the reason and a way back to
   * Data. A later state read may refine the reason in place, never restore
   * the view. Focus that was in the removed view, on a withdrawn control or
   * nowhere moves to the notice; focus elsewhere in the chrome stays.
   */
  end(reason: PreviewEnd, confirmed = false): void {
    if (this.disposed || (this.ended && !confirmed) || this.ended === reason) return;
    this.ended = reason;
    this.stopTimers();
    const losesFocus = this.focusWillBeLost();
    const notice = this.showEnded(reason);
    this.withdrawControls();
    if (notice && losesFocus && document.activeElement !== notice) notice.focus();
    const remaining = this.root.querySelector<HTMLElement>('[data-preview-remaining]');
    if (remaining && reason === 'expired') remaining.textContent = '(expired)';
    this.status(END_STATUS[reason]);
  }

  /** Focus in the view, on a control about to be withdrawn, or nowhere. */
  private focusWillBeLost(): boolean {
    const active = document.activeElement;
    if (!active || active === document.body) return true;
    const withdrawn = [this.root.querySelector('[data-preview-main]'), this.closeButton(), ...Array.from(this.root.querySelectorAll('.data-preview__views'))];
    return withdrawn.some((element) => Boolean(element?.contains(active)));
  }

  /** Replace the view with the ended notice, or update the notice in place with a refined reason. */
  private showEnded(reason: PreviewEnd): HTMLElement | null {
    const main = this.root.querySelector<HTMLElement>('[data-preview-main]');
    if (!main) return null;
    const existing = main.querySelector<HTMLElement>('[data-preview-ended]');
    if (existing) {
      existing.dataset.previewEnded = reason;
      const message = existing.querySelector('p');
      if (message) message.textContent = END_MESSAGES[reason];
      return existing;
    }
    const notice = document.createElement('div');
    notice.className = 'console-callout data-preview__ended';
    notice.dataset.tone = 'warning';
    notice.dataset.previewEnded = reason;
    notice.setAttribute('role', 'alert');
    notice.tabIndex = -1;
    const message = document.createElement('p');
    message.textContent = END_MESSAGES[reason];
    const back = document.createElement('a');
    back.className = 'console-btn console-btn--sm console-btn--primary';
    back.href = this.config.returnURL;
    back.textContent = 'Return to Data';
    notice.append(message, back);
    main.replaceChildren(notice);
    return notice;
  }

  /** Close and the view links act on a session that no longer grants anything. */
  private withdrawControls(): void {
    const close = this.closeButton();
    if (close) close.hidden = true;
    this.root.querySelectorAll<HTMLElement>('.data-preview__views').forEach((nav) => {
      nav.hidden = true;
    });
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
      this.end(result.ok ? 'closed' : 'unavailable', true);
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

export interface ActiveTabControllerOptions {
  channelName: string;
  onCoordinationAvailabilityChange?(available: boolean): void;
  onRemoteSync(draftId: string, revision: number): void;
  onRemoteDraftDisposed?(draftId: string, reason?: string): void;
  onVisibilityHidden(): void;
  onPageHide(): void;
  onBeforeUnload(): void;
  documentRef?: Document;
  windowRef?: Window;
  broadcastChannelFactory?: (name: string) => {
    postMessage(message: any): void;
    close?(): void;
    onmessage: ((event: MessageEvent) => void) | null;
  };
}

export class ActiveTabController {
  private readonly options: ActiveTabControllerOptions;
  private channel: {
    postMessage(message: any): void;
    close?(): void;
    onmessage: ((event: MessageEvent) => void) | null;
  } | null = null;
  private cleanupFns: Array<() => void> = [];
  private activeDraftId = '';
  private coordinationAvailable = false;

  constructor(options: ActiveTabControllerOptions) {
    this.options = options;
  }

  start(): void {
    this.initBroadcastChannel();
    this.initEventListeners();
    this.options.onCoordinationAvailabilityChange?.(this.coordinationAvailable);
  }

  stop(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    if (this.channel?.close) {
      this.channel.close();
    }
    this.channel = null;
    this.coordinationAvailable = false;
    this.activeDraftId = '';
  }

  setActiveDraft(draftId: string | null | undefined): void {
    this.activeDraftId = String(draftId || '').trim();
  }

  broadcastStateUpdate(_state: Record<string, any>): void {
    // Same-draft coordination now relies on resource events, not local state fan-out.
  }

  broadcastSyncCompleted(draftId: string, revision: number): void {
    const resolvedDraftID = String(draftId || '').trim();
    if (resolvedDraftID === '') {
      return;
    }
    this.broadcastMessage({
      type: 'sync_completed',
      tabId: this.getTabId(),
      draftId: resolvedDraftID,
      revision,
    });
  }

  broadcastDraftDisposed(draftId: string, reason = ''): void {
    const resolvedDraftID = String(draftId || '').trim();
    if (resolvedDraftID === '') {
      return;
    }
    this.broadcastMessage({
      type: 'draft_disposed',
      tabId: this.getTabId(),
      draftId: resolvedDraftID,
      reason: String(reason || '').trim(),
    });
  }

  private win(): Window | null {
    return this.options.windowRef || (typeof window === 'undefined' ? null : window);
  }

  private doc(): Document | null {
    return this.options.documentRef || (typeof document === 'undefined' ? null : document);
  }

  private initBroadcastChannel(): void {
    const factory = this.options.broadcastChannelFactory
      || ((name: string) => new BroadcastChannel(name));
    if (typeof BroadcastChannel === 'undefined' && !this.options.broadcastChannelFactory) {
      this.coordinationAvailable = false;
      return;
    }
    try {
      this.channel = factory(this.options.channelName);
      this.channel.onmessage = (event: MessageEvent) => this.handleChannelMessage(event.data);
      this.coordinationAvailable = true;
    } catch {
      this.channel = null;
      this.coordinationAvailable = false;
    }
  }

  private initEventListeners(): void {
    const doc = this.doc();
    const win = this.win();
    if (!doc || !win) return;

    const onVisibilityChange = () => {
      if (doc.visibilityState === 'hidden') {
        this.options.onVisibilityHidden();
      }
    };
    doc.addEventListener('visibilitychange', onVisibilityChange);
    this.cleanupFns.push(() => doc.removeEventListener('visibilitychange', onVisibilityChange));

    const onPageHide = () => {
      this.options.onPageHide();
    };
    win.addEventListener('pagehide', onPageHide);
    this.cleanupFns.push(() => win.removeEventListener('pagehide', onPageHide));

    const onBeforeUnload = () => {
      this.options.onBeforeUnload();
    };
    win.addEventListener('beforeunload', onBeforeUnload);
    this.cleanupFns.push(() => win.removeEventListener('beforeunload', onBeforeUnload));
  }

  private getTabId(): string {
    const win = this.win() as Window & { _wizardTabId?: string } | null;
    if (!win) return 'tab_missing_window';
    if (!win._wizardTabId) {
      win._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    return win._wizardTabId;
  }

  private broadcastMessage(message: any): void {
    this.channel?.postMessage(message);
  }

  private handleChannelMessage(data: any): void {
    if (!data || data.tabId === this.getTabId()) {
      return;
    }
    const draftId = String(data.draftId || '').trim();
    if (draftId === '' || draftId !== this.activeDraftId) {
      return;
    }

    switch (data.type) {
      case 'sync_completed':
        this.options.onRemoteSync(draftId, Number(data.revision || 0));
        break;
      case 'draft_disposed':
        this.options.onRemoteDraftDisposed?.(draftId, String(data.reason || '').trim());
        break;
    }
  }
}

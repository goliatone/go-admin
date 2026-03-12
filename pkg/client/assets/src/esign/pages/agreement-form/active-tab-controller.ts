export interface ActiveTabClaim {
  tabId: string;
  claimedAt: string;
  lastSeenAt: string;
}

export interface ActiveTabOwnershipState {
  isOwner: boolean;
  reason: string;
  claim: ActiveTabClaim | null;
  coordinationAvailable: boolean;
}

export interface ActiveTabControllerOptions {
  storageKey: string;
  channelName: string;
  heartbeatMs: number;
  staleMs: number;
  telemetry(eventName: string, fields?: Record<string, unknown>): void;
  onOwnershipChange(state: ActiveTabOwnershipState): void;
  onRemoteState(state: Record<string, any>): void;
  onRemoteSync(draftId: string, revision: number): void;
  onVisibilityHidden(): void;
  onPageHide(): void;
  onBeforeUnload(): void;
  documentRef?: Document;
  windowRef?: Window;
  localStorageRef?: Storage | null;
  broadcastChannelFactory?: (name: string) => { postMessage(message: any): void; close?(): void; onmessage: ((event: MessageEvent) => void) | null };
  now?(): string;
}

export class ActiveTabController {
  private readonly options: ActiveTabControllerOptions;
  private channel: { postMessage(message: any): void; close?(): void; onmessage: ((event: MessageEvent) => void) | null } | null = null;
  private heartbeatTimer: number | null = null;
  private cleanupFns: Array<() => void> = [];
  private activeTabCoordinationAvailable = false;
  private storageProbeValue: boolean | null = null;
  isOwner = false;
  currentClaim: ActiveTabClaim | null = null;
  lastBlockedReason = '';

  constructor(options: ActiveTabControllerOptions) {
    this.options = options;
    this.activeTabCoordinationAvailable = this.hasActiveTabStorage();
  }

  start(): void {
    this.initBroadcastChannel();
    this.initEventListeners();
    if (!this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(true, 'storage_unavailable', null);
      return;
    }
    this.evaluateOwnership('startup', { allowClaimIfAvailable: true });
  }

  stop(): void {
    if (this.activeTabCoordinationAvailable) {
      this.release('stop');
    } else {
      this.updateOwnershipState(false, 'stop', null);
    }
    this.stopHeartbeat();
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    if (this.channel?.close) {
      this.channel.close();
    }
    this.channel = null;
  }

  private now(): string {
    return this.options.now ? this.options.now() : new Date().toISOString();
  }

  private win(): Window | null {
    return this.options.windowRef || (typeof window === 'undefined' ? null : window);
  }

  private doc(): Document | null {
    return this.options.documentRef || (typeof document === 'undefined' ? null : document);
  }

  private storage(): Storage | null {
    if (this.options.localStorageRef !== undefined) return this.options.localStorageRef;
    const win = this.win();
    return win?.localStorage ?? null;
  }

  private hasActiveTabStorage(): boolean {
    if (this.storageProbeValue !== null) {
      return this.storageProbeValue;
    }
    const storage = this.storage();
    if (!storage) {
      this.storageProbeValue = false;
      return false;
    }
    try {
      const probeKey = `${this.options.storageKey}:probe`;
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      this.storageProbeValue = true;
    } catch {
      this.storageProbeValue = false;
    }
    return this.storageProbeValue;
  }

  private parseISOTimeToMillis(value: unknown): number {
    const parsed = Date.parse(String(value || '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private readActiveTabClaim(): ActiveTabClaim | null {
    const storage = this.storage();
    if (!this.hasActiveTabStorage() || !storage) return null;
    try {
      const raw = storage.getItem(this.options.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const tabId = String(parsed.tabId || '').trim();
      if (!tabId) return null;
      return {
        tabId,
        claimedAt: String(parsed.claimedAt || '').trim(),
        lastSeenAt: String(parsed.lastSeenAt || '').trim(),
      };
    } catch {
      return null;
    }
  }

  private isClaimFresh(claim: ActiveTabClaim | null, nowMs = Date.now()): boolean {
    if (!claim) return false;
    const lastSeenAtMs = this.parseISOTimeToMillis(claim.lastSeenAt || claim.claimedAt);
    if (lastSeenAtMs <= 0) return false;
    return (nowMs - lastSeenAtMs) < this.options.staleMs;
  }

  private writeActiveTabClaim(claim: ActiveTabClaim): boolean {
    const storage = this.storage();
    if (!this.hasActiveTabStorage() || !storage) return false;
    try {
      storage.setItem(this.options.storageKey, JSON.stringify(claim));
      return true;
    } catch {
      this.storageProbeValue = false;
      return false;
    }
  }

  private clearActiveTabClaim(expectedTabID = ''): boolean {
    const storage = this.storage();
    if (!this.hasActiveTabStorage() || !storage) return false;
    try {
      const current = this.readActiveTabClaim();
      if (expectedTabID && current?.tabId && current.tabId !== expectedTabID) {
        return false;
      }
      storage.removeItem(this.options.storageKey);
      return true;
    } catch {
      this.storageProbeValue = false;
      return false;
    }
  }

  private initBroadcastChannel(): void {
    const factory = this.options.broadcastChannelFactory
      || ((name: string) => new BroadcastChannel(name));
    if (typeof BroadcastChannel === 'undefined' && !this.options.broadcastChannelFactory) return;
    try {
      this.channel = factory(this.options.channelName);
      this.channel.onmessage = (event: MessageEvent) => this.handleChannelMessage(event.data);
    } catch {
      this.channel = null;
    }
  }

  private initEventListeners(): void {
    const doc = this.doc();
    const win = this.win();
    if (!doc || !win) return;

    const onVisibilityChange = () => {
      if (doc.visibilityState === 'hidden') {
        if (this.isOwner) {
          this.options.onVisibilityHidden();
        }
        return;
      }
      this.evaluateOwnership('visible', { allowClaimIfAvailable: true });
    };
    doc.addEventListener('visibilitychange', onVisibilityChange);
    this.cleanupFns.push(() => doc.removeEventListener('visibilitychange', onVisibilityChange));

    const onPageHide = () => {
      if (this.isOwner) {
        this.options.onPageHide();
      }
      this.release('pagehide');
    };
    win.addEventListener('pagehide', onPageHide);
    this.cleanupFns.push(() => win.removeEventListener('pagehide', onPageHide));

    const onBeforeUnload = () => {
      if (this.isOwner) {
        this.options.onBeforeUnload();
      }
      this.release('beforeunload');
    };
    win.addEventListener('beforeunload', onBeforeUnload);
    this.cleanupFns.push(() => win.removeEventListener('beforeunload', onBeforeUnload));

    const onStorage = (event: StorageEvent) => {
      if (!this.activeTabCoordinationAvailable || event.key !== this.options.storageKey) return;
      this.evaluateOwnership('storage', {
        allowClaimIfAvailable: doc.visibilityState !== 'hidden',
      });
    };
    win.addEventListener('storage', onStorage);
    this.cleanupFns.push(() => win.removeEventListener('storage', onStorage));
  }

  private getTabId(): string {
    const win = this.win() as Window & { _wizardTabId?: string } | null;
    if (!win) return 'tab_missing_window';
    if (!win._wizardTabId) {
      win._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return win._wizardTabId;
  }

  private isClaimOwnedByThisTab(claim: ActiveTabClaim | null): boolean {
    return String(claim?.tabId || '').trim() === this.getTabId();
  }

  private buildClaim(existingClaim: ActiveTabClaim | null = null): ActiveTabClaim {
    const now = this.now();
    return {
      tabId: this.getTabId(),
      claimedAt: this.isClaimOwnedByThisTab(existingClaim)
        ? (String(existingClaim?.claimedAt || now).trim() || now)
        : now,
      lastSeenAt: now,
    };
  }

  private startHeartbeat(): void {
    const win = this.win();
    this.stopHeartbeat();
    if (!win || !this.isOwner || !this.activeTabCoordinationAvailable) return;
    this.heartbeatTimer = win.setInterval(() => {
      this.refreshClaim('heartbeat');
    }, this.options.heartbeatMs);
  }

  private stopHeartbeat(): void {
    const win = this.win();
    if (!win || this.heartbeatTimer === null) return;
    win.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private updateOwnershipState(isOwner: boolean, reason = '', claim: ActiveTabClaim | null = null): void {
    this.isOwner = Boolean(isOwner);
    this.currentClaim = this.activeTabCoordinationAvailable ? (claim || null) : null;
    this.lastBlockedReason = this.isOwner
      ? ''
      : (String(reason || 'passive_tab').trim() || 'passive_tab');
    if (this.isOwner && this.activeTabCoordinationAvailable) {
      this.startHeartbeat();
    } else {
      this.stopHeartbeat();
    }
    this.options.onOwnershipChange({
      isOwner: this.isOwner,
      reason: this.lastBlockedReason,
      claim: this.currentClaim,
      coordinationAvailable: this.activeTabCoordinationAvailable,
    });
  }

  private enterDegradedMode(reason = 'storage_unavailable'): boolean {
    if (!this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(true, reason, null);
      return true;
    }
    this.activeTabCoordinationAvailable = false;
    this.options.telemetry('wizard_active_tab_coordination_degraded', { reason });
    this.updateOwnershipState(true, reason, null);
    return true;
  }

  refreshClaim(reason = 'heartbeat'): boolean {
    if (!this.activeTabCoordinationAvailable) return true;
    if (!this.isOwner) return false;
    const existingClaim = this.readActiveTabClaim();
    if (existingClaim && !this.isClaimOwnedByThisTab(existingClaim) && this.isClaimFresh(existingClaim)) {
      this.updateOwnershipState(false, 'passive_tab', existingClaim);
      return false;
    }
    const claim = this.buildClaim(existingClaim);
    if (!this.writeActiveTabClaim(claim)) {
      return this.enterDegradedMode('storage_unavailable');
    }
    this.currentClaim = claim;
    if (reason !== 'heartbeat') {
      this.broadcastMessage({
        type: 'active_tab_claimed',
        tabId: claim.tabId,
        claimedAt: claim.claimedAt,
        lastSeenAt: claim.lastSeenAt,
        reason,
      });
      this.options.onOwnershipChange({
        isOwner: true,
        reason,
        claim,
        coordinationAvailable: this.activeTabCoordinationAvailable,
      });
    }
    return true;
  }

  claim(reason = 'claim'): boolean {
    if (!this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(true, reason, null);
      return true;
    }
    const existingClaim = this.readActiveTabClaim();
    const hasFreshOtherOwner = existingClaim
      && !this.isClaimOwnedByThisTab(existingClaim)
      && this.isClaimFresh(existingClaim);
    if (hasFreshOtherOwner && reason !== 'take_control') {
      this.updateOwnershipState(false, 'passive_tab', existingClaim);
      return false;
    }
    const claim = this.buildClaim(reason === 'take_control' ? null : existingClaim);
    if (!this.writeActiveTabClaim(claim)) {
      return this.enterDegradedMode('storage_unavailable');
    }
    this.updateOwnershipState(true, reason, claim);
    this.broadcastMessage({
      type: 'active_tab_claimed',
      tabId: claim.tabId,
      claimedAt: claim.claimedAt,
      lastSeenAt: claim.lastSeenAt,
      reason,
    });
    return true;
  }

  release(reason = 'release'): void {
    if (!this.activeTabCoordinationAvailable) return;
    const currentClaim = this.readActiveTabClaim();
    if (this.isClaimOwnedByThisTab(currentClaim)) {
      this.clearActiveTabClaim(this.getTabId());
      this.broadcastMessage({
        type: 'active_tab_released',
        tabId: this.getTabId(),
        reason,
      });
    }
    this.updateOwnershipState(false, reason, null);
  }

  evaluateOwnership(reason = 'check', options: { allowClaimIfAvailable?: boolean } = {}): boolean {
    if (!this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(true, reason, null);
      return true;
    }
    const allowClaimIfAvailable = options.allowClaimIfAvailable === true;
    const doc = this.doc();
    const visible = !doc || doc.visibilityState !== 'hidden';
    const currentClaim = this.readActiveTabClaim();
    if (!currentClaim || !this.isClaimFresh(currentClaim)) {
      if (allowClaimIfAvailable && visible) {
        return this.claim(reason);
      }
      this.updateOwnershipState(false, 'no_active_tab', null);
      return false;
    }
    if (this.isClaimOwnedByThisTab(currentClaim)) {
      this.updateOwnershipState(true, reason, currentClaim);
      this.refreshClaim('heartbeat');
      return true;
    }
    this.updateOwnershipState(false, 'passive_tab', currentClaim);
    return false;
  }

  ensureOwnership(reason = 'sync', options: { allowClaimIfAvailable?: boolean } = {}): boolean {
    if (!this.activeTabCoordinationAvailable) return true;
    return this.evaluateOwnership(reason, {
      allowClaimIfAvailable: options.allowClaimIfAvailable !== false,
    });
  }

  takeControl(): boolean {
    if (!this.activeTabCoordinationAvailable) {
      this.updateOwnershipState(true, 'take_control', null);
      return true;
    }
    return this.claim('take_control');
  }

  broadcastStateUpdate(state: Record<string, any>): void {
    this.broadcastMessage({
      type: 'state_updated',
      tabId: this.getTabId(),
      state,
    });
  }

  broadcastSyncCompleted(draftId: string, revision: number): void {
    this.broadcastMessage({
      type: 'sync_completed',
      tabId: this.getTabId(),
      draftId,
      revision,
    });
  }

  private broadcastMessage(message: any): void {
    this.channel?.postMessage(message);
  }

  private handleChannelMessage(data: any): void {
    switch (data?.type) {
      case 'active_tab_claimed':
        if (data.tabId !== this.getTabId()) {
          this.evaluateOwnership('remote_claim', { allowClaimIfAvailable: false });
        }
        break;
      case 'active_tab_released':
        if (data.tabId !== this.getTabId()) {
          const doc = this.doc();
          this.evaluateOwnership('remote_release', {
            allowClaimIfAvailable: !doc || doc.visibilityState !== 'hidden',
          });
        }
        break;
      case 'state_updated':
        if (data.tabId !== this.getTabId() && data.state && typeof data.state === 'object') {
          this.options.onRemoteState(data.state);
        }
        break;
      case 'sync_completed':
        if (data.tabId !== this.getTabId() && data.draftId && data.revision) {
          this.options.onRemoteSync(String(data.draftId), Number(data.revision));
        }
        break;
    }
  }
}

/**
 * E-Sign Google Integration Page Controller
 * Handles Google Drive integration status, OAuth flow, and account management
 */

import type {
  GoogleIntegrationStatus,
  GoogleIntegrationPageConfig,
  GoogleOAuthCallbackData,
  GoogleOAuthState,
  GoogleAccountInfo,
} from '../types.js';
import { qs, show, hide, onReady, announce } from '../utils/dom-helpers.js';

type IntegrationState = 'loading' | 'disconnected' | 'connected' | 'error';

const GOOGLE_ACCOUNT_STORAGE_KEY = 'esign.google.account_id';

const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  'https://www.googleapis.com/auth/drive.readonly': {
    label: 'Drive (Read Only)',
    description: 'View files in your Google Drive',
  },
  openid: {
    label: 'OpenID',
    description: 'Verify your Google identity for account linking',
  },
  'https://www.googleapis.com/auth/userinfo.email': {
    label: 'Account Email',
    description: 'Read your Google account email address',
  },
  'https://www.googleapis.com/auth/drive.file': {
    label: 'Drive (App Files)',
    description: 'Access files opened with this app',
  },
  'drive.readonly': {
    label: 'Drive (Read Only)',
    description: 'View files in your Google Drive',
  },
  'userinfo.email': {
    label: 'Account Email',
    description: 'Read your Google account email address',
  },
  'drive.file': {
    label: 'Drive (App Files)',
    description: 'Access files opened with this app',
  },
};

/**
 * Google integration page controller
 * Manages OAuth flow, connection status, and account switching
 */
export class GoogleIntegrationController {
  private readonly config: GoogleIntegrationPageConfig;
  private readonly apiBase: string;
  private currentAccountId: string;
  private accounts: GoogleAccountInfo[] = [];
  private oauthWindow: Window | null = null;
  private oauthTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingOAuthAccountId: string | null = null;
  private pendingDisconnectAccountId: string | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  private readonly elements: {
    loadingState: HTMLElement | null;
    disconnectedState: HTMLElement | null;
    connectedState: HTMLElement | null;
    errorState: HTMLElement | null;
    statusBadge: HTMLElement | null;
    announcements: HTMLElement | null;
    accountIdInput: HTMLInputElement | null;
    connectBtn: HTMLElement | null;
    disconnectBtn: HTMLElement | null;
    refreshBtn: HTMLElement | null;
    retryBtn: HTMLElement | null;
    reauthBtn: HTMLElement | null;
    oauthModal: HTMLElement | null;
    oauthCancelBtn: HTMLElement | null;
    disconnectModal: HTMLElement | null;
    disconnectCancelBtn: HTMLElement | null;
    disconnectConfirmBtn: HTMLElement | null;
    connectedEmail: HTMLElement | null;
    connectedAccountId: HTMLElement | null;
    scopesList: HTMLElement | null;
    expiryInfo: HTMLElement | null;
    reauthWarning: HTMLElement | null;
    reauthReason: HTMLElement | null;
    errorMessage: HTMLElement | null;
    degradedWarning: HTMLElement | null;
    degradedReason: HTMLElement | null;
    importDriveLink: HTMLAnchorElement | null;
    integrationSettingsLink: HTMLAnchorElement | null;
    // Option A - Dropdown
    accountDropdown: HTMLSelectElement | null;
    // Option B - Cards Grid
    accountsSection: HTMLElement | null;
    accountsLoading: HTMLElement | null;
    accountsEmpty: HTMLElement | null;
    accountsGrid: HTMLElement | null;
    connectFirstBtn: HTMLElement | null;
  };

  constructor(config: GoogleIntegrationPageConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;
    this.currentAccountId = this.resolveInitialAccountId();

    this.elements = {
      loadingState: qs('#loading-state'),
      disconnectedState: qs('#disconnected-state'),
      connectedState: qs('#connected-state'),
      errorState: qs('#error-state'),
      statusBadge: qs('#status-badge'),
      announcements: qs('#integration-announcements'),
      accountIdInput: qs<HTMLInputElement>('#account-id-input'),
      connectBtn: qs('#connect-btn'),
      disconnectBtn: qs('#disconnect-btn'),
      refreshBtn: qs('#refresh-status-btn'),
      retryBtn: qs('#retry-btn'),
      reauthBtn: qs('#reauth-btn'),
      oauthModal: qs('#oauth-modal'),
      oauthCancelBtn: qs('#oauth-cancel-btn'),
      disconnectModal: qs('#disconnect-modal'),
      disconnectCancelBtn: qs('#disconnect-cancel-btn'),
      disconnectConfirmBtn: qs('#disconnect-confirm-btn'),
      connectedEmail: qs('#connected-email'),
      connectedAccountId: qs('#connected-account-id'),
      scopesList: qs('#scopes-list'),
      expiryInfo: qs('#expiry-info'),
      reauthWarning: qs('#reauth-warning'),
      reauthReason: qs('#reauth-reason'),
      errorMessage: qs('#error-message'),
      degradedWarning: qs('#degraded-warning'),
      degradedReason: qs('#degraded-reason'),
      importDriveLink: qs<HTMLAnchorElement>('#import-drive-link'),
      integrationSettingsLink: qs<HTMLAnchorElement>('#integration-settings-link'),
      // Option A - Dropdown
      accountDropdown: qs<HTMLSelectElement>('#account-dropdown'),
      // Option B - Cards Grid
      accountsSection: qs('#accounts-section'),
      accountsLoading: qs('#accounts-loading'),
      accountsEmpty: qs('#accounts-empty'),
      accountsGrid: qs('#accounts-grid'),
      connectFirstBtn: qs('#connect-first-btn'),
    };
  }

  /**
   * Initialize the integration page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    this.updateAccountScopeUI();
    await Promise.all([this.checkStatus(), this.loadAccounts()]);
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    const {
      connectBtn,
      disconnectBtn,
      refreshBtn,
      retryBtn,
      reauthBtn,
      oauthCancelBtn,
      disconnectCancelBtn,
      disconnectConfirmBtn,
      accountIdInput,
      oauthModal,
      disconnectModal,
    } = this.elements;

    // Connect button
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.startOAuthFlow());
    }

    // Re-auth button
    if (reauthBtn) {
      reauthBtn.addEventListener('click', () => this.startOAuthFlow());
    }

    // Disconnect button
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        this.pendingDisconnectAccountId = this.currentAccountId;
        if (disconnectModal) {
          show(disconnectModal);
        }
      });
    }

    // Disconnect modal buttons
    if (disconnectCancelBtn) {
      disconnectCancelBtn.addEventListener('click', () => {
        this.pendingDisconnectAccountId = null;
        if (disconnectModal) {
          hide(disconnectModal);
        }
      });
    }

    if (disconnectConfirmBtn) {
      disconnectConfirmBtn.addEventListener('click', () => this.disconnect());
    }

    // OAuth modal cancel
    if (oauthCancelBtn) {
      oauthCancelBtn.addEventListener('click', () => this.cancelOAuthFlow());
    }

    // Refresh and retry buttons
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.checkStatus());
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.checkStatus());
    }

    // Account ID input (fallback manual entry)
    if (accountIdInput) {
      accountIdInput.addEventListener('change', () => {
        this.setCurrentAccountId(accountIdInput.value, true);
      });

      accountIdInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.setCurrentAccountId(accountIdInput.value, true);
        }
      });
    }

    // Account dropdown (Option A)
    const { accountDropdown, connectFirstBtn } = this.elements;
    if (accountDropdown) {
      accountDropdown.addEventListener('change', () => {
        if (accountDropdown.value === '__new__') {
          // Reset to current and start OAuth
          accountDropdown.value = this.currentAccountId;
          this.startOAuthFlow('');
        } else {
          this.setCurrentAccountId(accountDropdown.value, true);
        }
      });
    }

    // Connect first button (Option B - empty state)
    if (connectFirstBtn) {
      connectFirstBtn.addEventListener('click', () => this.startOAuthFlow(''));
    }

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (oauthModal && !oauthModal.classList.contains('hidden')) {
          this.cancelOAuthFlow();
        }
        if (disconnectModal && !disconnectModal.classList.contains('hidden')) {
          this.pendingDisconnectAccountId = null;
          hide(disconnectModal);
        }
      }
    });

    // Close modals on backdrop click
    [oauthModal, disconnectModal].forEach((modal) => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target === modal || target.getAttribute('aria-hidden') === 'true') {
            hide(modal);
            if (modal === oauthModal) {
              this.cancelOAuthFlow();
            } else if (modal === disconnectModal) {
              this.pendingDisconnectAccountId = null;
            }
          }
        });
      }
    });
  }

  /**
   * Resolve initial account ID from various sources
   */
  private resolveInitialAccountId(): string {
    // 1. Check URL query params
    const params = new URLSearchParams(window.location.search);
    const fromQuery = this.normalizeAccountId(params.get('account_id'));
    if (fromQuery) {
      return fromQuery;
    }

    // 2. Check template config
    const fromTemplate = this.normalizeAccountId(this.config.googleAccountId);
    if (fromTemplate) {
      return fromTemplate;
    }

    // 3. Check localStorage
    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(GOOGLE_ACCOUNT_STORAGE_KEY)
      );
    } catch {
      return '';
    }
  }

  /**
   * Normalize account ID value
   */
  private normalizeAccountId(value: string | null | undefined): string {
    return (value || '').trim();
  }

  /**
   * Set current account ID and optionally refresh status
   */
  private setCurrentAccountId(value: string, refreshStatus = false): void {
    const normalized = this.normalizeAccountId(value);
    if (normalized === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }

    this.currentAccountId = normalized;
    this.updateAccountScopeUI();

    if (refreshStatus) {
      this.checkStatus();
    }
  }

  /**
   * Update UI elements related to account scope
   */
  private updateAccountScopeUI(): void {
    const { accountIdInput, connectedAccountId, importDriveLink, integrationSettingsLink } =
      this.elements;

    // Update input
    if (accountIdInput) {
      accountIdInput.value = this.currentAccountId;
    }

    // Update connected account display
    if (connectedAccountId) {
      connectedAccountId.textContent = this.currentAccountId
        ? `Account ID: ${this.currentAccountId}`
        : 'Account ID: default';
    }

    // Persist to storage
    this.persistAccountId();

    // Sync URL
    this.syncAccountIdInURL();

    // Update links
    this.updateScopedLinks([importDriveLink, integrationSettingsLink]);
    this.renderAccountDropdown();
    this.renderAccountsGrid();
  }

  /**
   * Persist account ID to localStorage
   */
  private persistAccountId(): void {
    try {
      if (this.currentAccountId) {
        window.localStorage.setItem(GOOGLE_ACCOUNT_STORAGE_KEY, this.currentAccountId);
      } else {
        window.localStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  }

  /**
   * Sync account ID to URL without navigation
   */
  private syncAccountIdInURL(): void {
    const url = new URL(window.location.href);
    if (this.currentAccountId) {
      url.searchParams.set('account_id', this.currentAccountId);
    } else {
      url.searchParams.delete('account_id');
    }
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Update scoped links with current account ID
   */
  private updateScopedLinks(links: (HTMLAnchorElement | null)[]): void {
    links.forEach((link) => {
      if (!link) return;
      const baseHref = link.dataset.baseHref || link.getAttribute('href');
      if (!baseHref) return;
      link.setAttribute('href', this.applyAccountIdToPath(baseHref));
    });
  }

  /**
   * Apply account ID to a path/URL
   */
  private applyAccountIdToPath(pathOrURL: string): string {
    const parsed = new URL(pathOrURL, window.location.origin);
    if (this.currentAccountId) {
      parsed.searchParams.set('account_id', this.currentAccountId);
    } else {
      parsed.searchParams.delete('account_id');
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  /**
   * Build API URL with user/account scope
   */
  private buildScopedAPIURL(path: string, accountId = this.currentAccountId): string {
    const url = new URL(`${this.apiBase}${path}`, window.location.origin);
    url.searchParams.set('user_id', this.config.userId || '');
    if (accountId) {
      url.searchParams.set('account_id', accountId);
    }
    return url.toString();
  }

  /**
   * Announce message to screen readers
   */
  private announce(message: string): void {
    const { announcements } = this.elements;
    if (announcements) {
      announcements.textContent = message;
    }
    announce(message);
  }

  /**
   * Show a specific state and hide others
   */
  private showState(state: IntegrationState): void {
    const { loadingState, disconnectedState, connectedState, errorState } = this.elements;

    hide(loadingState);
    hide(disconnectedState);
    hide(connectedState);
    hide(errorState);

    switch (state) {
      case 'loading':
        show(loadingState);
        break;
      case 'disconnected':
        show(disconnectedState);
        break;
      case 'connected':
        show(connectedState);
        break;
      case 'error':
        show(errorState);
        break;
    }
  }

  /**
   * Update status badge
   */
  private updateStatusBadge(
    connected: boolean,
    expiring = false,
    degraded = false
  ): void {
    const { statusBadge } = this.elements;
    if (!statusBadge) return;

    if (degraded) {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
      return;
    }

    if (connected) {
      if (expiring) {
        statusBadge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        `;
      } else {
        statusBadge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        `;
      }
    } else {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          <span class="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true"></span>
          Not Connected
        </span>
      `;
    }
  }

  /**
   * Check integration status from API
   */
  async checkStatus(): Promise<void> {
    this.showState('loading');

    try {
      const response = await fetch(
        this.buildScopedAPIURL('/esign/integrations/google/status'),
        {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Not connected
          this.showState('disconnected');
          this.updateStatusBadge(false);
          this.announce('Google Drive is not connected');
          return;
        }

        let message = `Failed to check status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Ignore parse errors
        }
        throw new Error(message);
      }

      const data = await response.json();
      const integration = this.normalizeIntegrationPayload(data.integration || {});

      // Update account ID if returned from API
      if (!this.currentAccountId && integration.account_id) {
        this.currentAccountId = integration.account_id;
        this.updateAccountScopeUI();
      }

      // Render degraded state
      const isDegraded = integration.degraded === true;
      this.renderDegradedState(isDegraded, integration.degraded_reason);

      if (integration.connected) {
        this.renderConnectedState(integration);
        this.showState('connected');
        this.updateStatusBadge(true, integration.needs_reauthorization, isDegraded);
        this.announce(
          isDegraded
            ? 'Google Drive connected with degraded provider health'
            : 'Google Drive is connected'
        );
      } else {
        this.showState('disconnected');
        this.updateStatusBadge(false, false, isDegraded);
        this.announce(
          isDegraded
            ? 'Google Drive integration is degraded'
            : 'Google Drive is not connected'
        );
      }
    } catch (error) {
      console.error('Error checking status:', error);
      const { errorMessage } = this.elements;
      if (errorMessage) {
        errorMessage.textContent =
          error instanceof Error
            ? error.message
            : 'An error occurred while checking the integration status.';
      }
      this.showState('error');
      this.renderDegradedState(false, '');
      this.updateStatusBadge(false);
      this.announce('Error checking Google Drive status');
    }
  }

  /**
   * Normalize integration payload from API (handles both camelCase and snake_case)
   */
  private normalizeIntegrationPayload(
    raw: Record<string, unknown>
  ): GoogleIntegrationStatus {
    const firstDefined = <T>(keys: string[], fallback: T): T => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== undefined && raw[key] !== null) {
          return raw[key] as T;
        }
      }
      return fallback;
    };

    const expiresAt = firstDefined<string>(['expires_at', 'ExpiresAt'], '');
    const scopes = firstDefined<string[]>(['scopes', 'Scopes'], []);
    const accountId = this.normalizeAccountId(
      firstDefined<string>(['account_id', 'AccountID'], '')
    );
    const connected = firstDefined<boolean>(['connected', 'Connected'], false);
    const degraded = firstDefined<boolean>(['degraded', 'Degraded'], false);
    const degradedReason = firstDefined<string>(['degraded_reason', 'DegradedReason'], '');
    const email = firstDefined<string>(
      ['email', 'user_email', 'account_email', 'AccountEmail'],
      ''
    );
    const canAutoRefresh = firstDefined<boolean>(
      ['can_auto_refresh', 'CanAutoRefresh'],
      false
    );
    const explicitNeedsReauth = firstDefined<boolean | undefined>(
      ['needs_reauthorization', 'NeedsReauthorization', 'NeedsReauth'],
      undefined
    );

    let isExpired = firstDefined<boolean | undefined>(['is_expired', 'IsExpired'], undefined);
    let isExpiringSoon = firstDefined<boolean | undefined>(
      ['is_expiring_soon', 'IsExpiringSoon'],
      undefined
    );

    // Compute expiry if not provided
    if (typeof isExpired !== 'boolean' || typeof isExpiringSoon !== 'boolean') {
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (!Number.isNaN(expiryDate.getTime())) {
          const deltaMs = expiryDate.getTime() - Date.now();
          const expiringSoonMs = 5 * 60 * 1000;
          isExpired = deltaMs <= 0;
          isExpiringSoon = deltaMs > 0 && deltaMs <= expiringSoonMs;
        }
      }
    }

    const needsReauthorization =
      typeof explicitNeedsReauth === 'boolean'
        ? explicitNeedsReauth
        : (isExpired === true || isExpiringSoon === true) && !canAutoRefresh;

    return {
      connected,
      account_id: accountId,
      email,
      scopes: Array.isArray(scopes) ? scopes : [],
      expires_at: expiresAt,
      is_expired: isExpired === true,
      is_expiring_soon: isExpiringSoon === true,
      can_auto_refresh: canAutoRefresh,
      needs_reauthorization: needsReauthorization,
      degraded,
      degraded_reason: degradedReason,
    };
  }

  /**
   * Render connected state details
   */
  private renderConnectedState(integration: GoogleIntegrationStatus): void {
    const { connectedEmail, connectedAccountId, scopesList, expiryInfo, reauthWarning, reauthReason } =
      this.elements;

    // Email
    if (connectedEmail) {
      connectedEmail.textContent = integration.email || 'Connected';
    }

    // Account ID
    if (connectedAccountId) {
      connectedAccountId.textContent =
        integration.account_id || this.currentAccountId
          ? `Account ID: ${integration.account_id || this.currentAccountId}`
          : 'Account ID: default';
    }

    // Scopes
    this.renderScopes(integration.scopes || []);

    // Expiry
    this.renderExpiry(
      integration.expires_at,
      integration.is_expired,
      integration.is_expiring_soon,
      integration.can_auto_refresh,
      integration.needs_reauthorization
    );
  }

  /**
   * Render scopes list
   */
  private renderScopes(scopes: string[]): void {
    const { scopesList } = this.elements;
    if (!scopesList) return;

    if (!scopes || scopes.length === 0) {
      scopesList.innerHTML =
        '<li class="text-sm text-gray-500">No specific scopes granted</li>';
      return;
    }

    scopesList.innerHTML = scopes
      .map((scope) => {
        const info = SCOPE_DESCRIPTIONS[scope] || { label: scope, description: '' };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${this.escapeHtml(info.label)}</span>
            ${info.description ? `<p class="text-xs text-gray-500">${this.escapeHtml(info.description)}</p>` : ''}
          </div>
        </li>
      `;
      })
      .join('');
  }

  /**
   * Render token expiry information
   */
  private renderExpiry(
    expiryTime: string | undefined,
    isExpired: boolean | undefined,
    isExpiringSoon: boolean | undefined,
    canAutoRefresh: boolean | undefined,
    needsReauthorization: boolean | undefined
  ): void {
    const { expiryInfo, reauthWarning, reauthReason } = this.elements;
    if (!expiryInfo) return;

    expiryInfo.classList.remove('text-red-600', 'text-amber-600');
    expiryInfo.classList.add('text-gray-500');

    if (!expiryTime) {
      expiryInfo.textContent = 'Access token status unknown';
      if (reauthWarning) hide(reauthWarning);
      return;
    }

    const expiryDate = new Date(expiryTime);
    const now = new Date();
    const minutesLeft = Math.max(
      1,
      Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60))
    );

    if (isExpired) {
      if (canAutoRefresh) {
        expiryInfo.textContent =
          'Access token expired, but refresh is available and will be applied automatically.';
        expiryInfo.classList.remove('text-gray-500');
        expiryInfo.classList.add('text-amber-600');
        if (reauthWarning) hide(reauthWarning);
      } else {
        expiryInfo.textContent = 'Access token has expired. Please re-authorize.';
        expiryInfo.classList.remove('text-gray-500');
        expiryInfo.classList.add('text-red-600');
        if (reauthWarning) show(reauthWarning);
        if (reauthReason) {
          reauthReason.textContent =
            'Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.';
        }
      }
    } else if (isExpiringSoon) {
      expiryInfo.classList.remove('text-gray-500');
      expiryInfo.classList.add('text-amber-600');
      if (canAutoRefresh) {
        expiryInfo.textContent = `Token expires in approximately ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Refresh is available automatically.`;
        if (reauthWarning) hide(reauthWarning);
      } else {
        expiryInfo.textContent = `Token expires in approximately ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`;
        if (reauthWarning) show(reauthWarning);
        if (reauthReason) {
          reauthReason.textContent = `Your access token will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`;
        }
      }
    } else {
      expiryInfo.textContent = `Token valid until ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`;
      if (reauthWarning) hide(reauthWarning);
    }

    if (!needsReauthorization && reauthWarning) {
      hide(reauthWarning);
    }
  }

  /**
   * Render degraded provider state
   */
  private renderDegradedState(isDegraded: boolean, reason?: string): void {
    const { degradedWarning, degradedReason } = this.elements;
    if (!degradedWarning) return;

    if (isDegraded) {
      show(degradedWarning);
      if (degradedReason) {
        degradedReason.textContent =
          reason ||
          'Google API health checks are failing. Import actions may be unavailable until provider recovery.';
      }
    } else {
      hide(degradedWarning);
    }
  }

  // Account Management Methods

  /**
   * Load all connected Google accounts
   */
  async loadAccounts(): Promise<void> {
    try {
      const url = this.buildScopedAPIURL('/esign/integrations/google/accounts');
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.warn('Failed to load accounts:', response.status);
        this.accounts = [];
        this.renderAccountDropdown();
        this.renderAccountsGrid();
        return;
      }

      const data = await response.json();
      this.accounts = data.accounts || [];
      if (
        this.currentAccountId &&
        !this.accounts.some(
          (account) => this.normalizeAccountId(account.account_id) === this.currentAccountId
        )
      ) {
        this.currentAccountId = '';
      }
      this.updateAccountScopeUI();
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.accounts = [];
      this.updateAccountScopeUI();
    }
  }

  /**
   * Render the account dropdown (Option A)
   */
  private renderAccountDropdown(): void {
    const { accountDropdown } = this.elements;
    if (!accountDropdown) return;

    accountDropdown.innerHTML = '';

    // Add default/placeholder option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default Account';
    if (!this.currentAccountId) {
      defaultOption.selected = true;
    }
    accountDropdown.appendChild(defaultOption);

    // Add connected accounts
    const seenAccountIDs = new Set<string>(['']);
    for (const account of this.accounts) {
      const accountID = this.normalizeAccountId(account.account_id);
      if (seenAccountIDs.has(accountID)) {
        continue;
      }
      seenAccountIDs.add(accountID);
      const option = document.createElement('option');
      option.value = accountID;
      const label = account.email || accountID || 'Default';
      const statusBadge = account.status !== 'connected' ? ` (${account.status})` : '';
      option.textContent = `${label}${statusBadge}`;
      if (accountID === this.currentAccountId) {
        option.selected = true;
      }
      accountDropdown.appendChild(option);
    }

    // Add "Connect new account" option
    const addNewOption = document.createElement('option');
    addNewOption.value = '__new__';
    addNewOption.textContent = '+ Connect New Account...';
    accountDropdown.appendChild(addNewOption);
  }

  /**
   * Render the accounts cards grid (Option B)
   */
  private renderAccountsGrid(): void {
    const { accountsLoading, accountsEmpty, accountsGrid } = this.elements;

    if (accountsLoading) hide(accountsLoading);

    if (this.accounts.length === 0) {
      if (accountsEmpty) show(accountsEmpty);
      if (accountsGrid) hide(accountsGrid);
      return;
    }

    if (accountsEmpty) hide(accountsEmpty);
    if (accountsGrid) {
      show(accountsGrid);
      accountsGrid.innerHTML =
        this.accounts.map((account) => this.renderAccountCard(account)).join('') +
        this.renderConnectNewCard();
      this.attachCardEventListeners();
    }
  }

  /**
   * Render a single account card
   */
  private renderAccountCard(account: GoogleAccountInfo): string {
    const isActive =
      account.account_id === this.currentAccountId ||
      (account.is_default && !this.currentAccountId);

    const statusClasses: Record<string, string> = {
      connected: 'bg-green-50 border-green-200',
      expired: 'bg-red-50 border-red-200',
      needs_reauth: 'bg-amber-50 border-amber-200',
      degraded: 'bg-gray-50 border-gray-200',
    };

    const statusBadgeClasses: Record<string, string> = {
      connected: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      needs_reauth: 'bg-amber-100 text-amber-700',
      degraded: 'bg-gray-100 text-gray-700',
    };

    const statusLabels: Record<string, string> = {
      connected: 'Connected',
      expired: 'Expired',
      needs_reauth: 'Re-auth needed',
      degraded: 'Degraded',
    };

    const borderClass = isActive ? 'ring-2 ring-blue-500' : '';
    const cardClass = statusClasses[account.status] || 'bg-white border-gray-200';
    const badgeClass = statusBadgeClasses[account.status] || 'bg-gray-100 text-gray-700';
    const statusLabel = statusLabels[account.status] || account.status;
    const accountLabel = account.account_id || 'default';
    const email = account.email || 'No email';

    const googleIcon = `<svg class="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>`;

    return `
      <div class="account-card ${cardClass} ${borderClass} border rounded-xl p-4 relative" data-account-id="${this.escapeHtml(account.account_id)}">
        ${isActive ? '<span class="absolute top-2 right-2 text-xs font-medium text-blue-600">Active</span>' : ''}
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${account.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center">
            ${googleIcon}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(email)}</p>
            <p class="text-xs text-gray-500">Account: ${this.escapeHtml(accountLabel)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${badgeClass}">
              ${statusLabel}
            </span>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          ${!isActive ? `<button type="button" class="select-account-btn flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Select</button>` : ''}
          ${account.status === 'needs_reauth' || account.status === 'expired' ? `<button type="button" class="reauth-account-btn flex-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Re-auth</button>` : ''}
          <button type="button" class="disconnect-account-btn text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Disconnect</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the "Connect New Account" card
   */
  private renderConnectNewCard(): string {
    return `
      <div class="account-card-new border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors min-h-[140px]" id="connect-new-card">
        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
          <svg class="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-700">Connect New Account</p>
        <p class="text-xs text-gray-500 mt-1">Link another Google account</p>
      </div>
    `;
  }

  /**
   * Attach event listeners to account cards
   */
  private attachCardEventListeners(): void {
    const { accountsGrid, disconnectModal } = this.elements;
    if (!accountsGrid) return;

    // Select account buttons
    accountsGrid.querySelectorAll('.select-account-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.account-card');
        const accountId = card?.getAttribute('data-account-id') || '';
        this.setCurrentAccountId(accountId, true);
      });
    });

    // Re-auth buttons
    accountsGrid.querySelectorAll('.reauth-account-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.account-card');
        const accountId = card?.getAttribute('data-account-id') || '';
        this.setCurrentAccountId(accountId, false);
        this.startOAuthFlow(accountId);
      });
    });

    // Disconnect buttons
    accountsGrid.querySelectorAll('.disconnect-account-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.account-card');
        const accountId = card?.getAttribute('data-account-id') || '';
        this.pendingDisconnectAccountId = accountId;
        if (disconnectModal) show(disconnectModal);
      });
    });

    // Connect new card
    const connectNewCard = accountsGrid.querySelector('#connect-new-card');
    if (connectNewCard) {
      connectNewCard.addEventListener('click', () => this.startOAuthFlow(''));
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // OAuth Flow Methods

  /**
   * Start OAuth flow
   */
  async startOAuthFlow(targetAccountId?: string): Promise<void> {
    const { oauthModal, errorMessage } = this.elements;

    // Show modal
    if (oauthModal) {
      show(oauthModal);
    }

    const redirectUri = this.resolveOAuthRedirectURI();
    const oauthAccountId =
      targetAccountId !== undefined
        ? this.normalizeAccountId(targetAccountId)
        : this.currentAccountId;
    this.pendingOAuthAccountId = oauthAccountId;
    const authUrl = this.buildGoogleOAuthUrl(redirectUri, oauthAccountId);

    if (!authUrl) {
      if (oauthModal) hide(oauthModal);
      if (errorMessage) {
        errorMessage.textContent = 'Google OAuth is not configured: missing client ID.';
      }
      this.pendingOAuthAccountId = null;
      this.showState('error');
      this.announce('Google OAuth is not configured');
      return;
    }

    // Open popup
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    this.oauthWindow = window.open(
      authUrl,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!this.oauthWindow) {
      if (oauthModal) hide(oauthModal);
      this.pendingOAuthAccountId = null;
      this.showToast('Popup blocked. Allow popups for this site and try again.', 'error');
      this.announce('Popup blocked');
      return;
    }

    // Listen for callback message
    this.messageHandler = (event: MessageEvent) => this.handleOAuthCallback(event);
    window.addEventListener('message', this.messageHandler);

    // Timeout
    this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow();
      if (oauthModal) hide(oauthModal);
      this.pendingOAuthAccountId = null;
      this.showToast('Google authorization timed out. Please try again.', 'error');
      this.announce('Authorization timed out');
    }, 120000);
  }

  /**
   * Resolve OAuth redirect URI
   */
  private resolveOAuthRedirectURI(): string {
    if (this.config.googleRedirectUri) {
      return this.config.googleRedirectUri;
    }
    return `${window.location.origin}${this.config.basePath}/esign/integrations/google/callback`;
  }

  /**
   * Build OAuth state parameter
   */
  private buildOAuthState(accountId: string): string {
    const state: GoogleOAuthState = {
      user_id: this.config.userId || '',
      account_id: accountId || '',
    };
    return JSON.stringify(state);
  }

  /**
   * Build Google OAuth URL
   */
  private buildGoogleOAuthUrl(redirectUri: string, accountId: string): string | null {
    const clientId = this.config.googleClientId;
    if (!clientId) {
      return null;
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: this.buildOAuthState(accountId),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback message
   */
  private async handleOAuthCallback(event: MessageEvent): Promise<void> {
    // Verify origin
    if (event.origin !== window.location.origin) return;

    const data = event.data as GoogleOAuthCallbackData;
    if (data.type !== 'google_oauth_callback') return;

    const { oauthModal } = this.elements;

    this.cleanupOAuthFlow();
    if (oauthModal) hide(oauthModal);
    this.closeOAuthWindow();

    if (data.error) {
      this.showToast(`OAuth failed: ${data.error}`, 'error');
      this.announce(`OAuth failed: ${data.error}`);
      this.pendingOAuthAccountId = null;
      return;
    }

    if (data.code) {
      try {
        const redirectUri = this.resolveOAuthRedirectURI();
        const callbackAccountId =
          typeof data.account_id === 'string'
            ? this.normalizeAccountId(data.account_id)
            : null;
        const accountIdForConnect =
          callbackAccountId ?? this.pendingOAuthAccountId ?? this.currentAccountId;

        if (accountIdForConnect !== this.currentAccountId) {
          this.setCurrentAccountId(accountIdForConnect, false);
        }

        const response = await fetch(
          this.buildScopedAPIURL('/esign/integrations/google/connect', accountIdForConnect),
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              auth_code: data.code,
              account_id: accountIdForConnect || undefined,
              redirect_uri: redirectUri,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to connect');
        }

        this.showToast('Google Drive connected successfully', 'success');
        this.announce('Google Drive connected successfully');
        await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (error) {
        console.error('Connect error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.showToast(`Failed to connect: ${message}`, 'error');
        this.announce(`Failed to connect: ${message}`);
      } finally {
        this.pendingOAuthAccountId = null;
      }
      return;
    }
    this.pendingOAuthAccountId = null;
  }

  /**
   * Cancel OAuth flow
   */
  private cancelOAuthFlow(): void {
    const { oauthModal } = this.elements;
    if (oauthModal) hide(oauthModal);
    this.pendingOAuthAccountId = null;
    this.closeOAuthWindow();
    this.cleanupOAuthFlow();
  }

  /**
   * Cleanup OAuth flow resources
   */
  private cleanupOAuthFlow(): void {
    if (this.oauthTimeout) {
      clearTimeout(this.oauthTimeout);
      this.oauthTimeout = null;
    }

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  /**
   * Close OAuth popup window
   */
  private closeOAuthWindow(): void {
    if (!this.oauthWindow) return;
    try {
      this.oauthWindow.close();
    } catch {
      // Ignore errors closing window
    }
    this.oauthWindow = null;
  }

  /**
   * Disconnect Google account
   */
  async disconnect(): Promise<void> {
    const { disconnectModal } = this.elements;
    if (disconnectModal) hide(disconnectModal);
    const accountIdToDisconnect = this.pendingDisconnectAccountId ?? this.currentAccountId;

    try {
      const response = await fetch(
        this.buildScopedAPIURL('/esign/integrations/google/disconnect', accountIdToDisconnect),
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to disconnect');
      }

      this.showToast('Google Drive disconnected', 'success');
      this.announce('Google Drive disconnected');
      if (accountIdToDisconnect === this.currentAccountId) {
        this.setCurrentAccountId('', false);
      }
      await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (error) {
      console.error('Disconnect error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to disconnect: ${message}`, 'error');
      this.announce(`Failed to disconnect: ${message}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    // Use global toast manager if available
    const win = window as unknown as Record<string, unknown>;
    const toastManager = win.toastManager as
      | { success: (msg: string) => void; error: (msg: string) => void }
      | undefined;

    if (toastManager) {
      if (type === 'success') {
        toastManager.success(message);
      } else {
        toastManager.error(message);
      }
    }
  }
}

/**
 * Initialize Google integration page from config
 */
export function initGoogleIntegration(
  config: GoogleIntegrationPageConfig
): GoogleIntegrationController {
  const controller = new GoogleIntegrationController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap Google integration page from template context
 */
export function bootstrapGoogleIntegration(config: {
  basePath: string;
  apiBasePath?: string;
  userId: string;
  googleAccountId?: string;
  googleRedirectUri?: string;
  googleClientId?: string;
  googleEnabled?: boolean;
}): void {
  const pageConfig: GoogleIntegrationPageConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
    userId: config.userId,
    googleAccountId: config.googleAccountId,
    googleRedirectUri: config.googleRedirectUri,
    googleClientId: config.googleClientId,
    googleEnabled: config.googleEnabled !== false,
  };

  const controller = new GoogleIntegrationController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignGoogleIntegrationController =
      controller;
  }
}

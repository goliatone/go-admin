/**
 * E-Sign Google Integration Page Controller
 * Handles Google Drive integration status, OAuth flow, and account management
 */
import type { GoogleIntegrationPageConfig } from '../types.js';
/**
 * Google integration page controller
 * Manages OAuth flow, connection status, and account switching
 */
export declare class GoogleIntegrationController {
    private readonly config;
    private readonly apiBase;
    private currentAccountId;
    private accounts;
    private oauthWindow;
    private oauthTimeout;
    private pendingOAuthAccountId;
    private pendingDisconnectAccountId;
    private messageHandler;
    private readonly elements;
    constructor(config: GoogleIntegrationPageConfig);
    /**
     * Initialize the integration page
     */
    init(): Promise<void>;
    /**
     * Setup all event listeners
     */
    private setupEventListeners;
    /**
     * Resolve initial account ID from various sources
     */
    private resolveInitialAccountId;
    /**
     * Normalize account ID value
     */
    private normalizeAccountId;
    /**
     * Set current account ID and optionally refresh status
     */
    private setCurrentAccountId;
    /**
     * Resolve account ID for "connect new account" flow
     */
    private resolveNewAccountId;
    /**
     * Start OAuth flow using a new/manual account ID
     */
    private startOAuthFlowForNewAccount;
    /**
     * Update UI elements related to account scope
     */
    private updateAccountScopeUI;
    /**
     * Persist account ID to localStorage
     */
    private persistAccountId;
    /**
     * Sync account ID to URL without navigation
     */
    private syncAccountIdInURL;
    /**
     * Update scoped links with current account ID
     */
    private updateScopedLinks;
    /**
     * Apply account ID to a path/URL
     */
    private applyAccountIdToPath;
    /**
     * Build API URL with user/account scope
     */
    private buildScopedAPIURL;
    /**
     * Announce message to screen readers
     */
    private announce;
    /**
     * Show a specific state and hide others
     */
    private showState;
    /**
     * Update status badge
     */
    private updateStatusBadge;
    /**
     * Check integration status from API
     */
    checkStatus(): Promise<void>;
    /**
     * Normalize integration payload from API (handles both camelCase and snake_case)
     */
    private normalizeIntegrationPayload;
    /**
     * Render connected state details
     */
    private renderConnectedState;
    /**
     * Render scopes list
     */
    private renderScopes;
    /**
     * Render token expiry information
     */
    private renderExpiry;
    /**
     * Render degraded provider state
     */
    private renderDegradedState;
    /**
     * Load all connected Google accounts
     */
    loadAccounts(): Promise<void>;
    /**
     * Render the account dropdown (Option A)
     */
    private renderAccountDropdown;
    /**
     * Render the accounts cards grid (Option B)
     */
    private renderAccountsGrid;
    /**
     * Render a single account card
     */
    private renderAccountCard;
    /**
     * Render the "Connect New Account" card
     */
    private renderConnectNewCard;
    /**
     * Attach event listeners to account cards
     */
    private attachCardEventListeners;
    /**
     * Escape HTML for safe rendering
     */
    private escapeHtml;
    /**
     * Start OAuth flow
     */
    startOAuthFlow(targetAccountId?: string): Promise<void>;
    /**
     * Resolve OAuth redirect URI
     */
    private resolveOAuthRedirectURI;
    /**
     * Build OAuth state parameter
     */
    private buildOAuthState;
    /**
     * Build Google OAuth URL
     */
    private buildGoogleOAuthUrl;
    /**
     * Handle OAuth callback message
     */
    private handleOAuthCallback;
    /**
     * Cancel OAuth flow
     */
    private cancelOAuthFlow;
    /**
     * Cleanup OAuth flow resources
     */
    private cleanupOAuthFlow;
    /**
     * Close OAuth popup window
     */
    private closeOAuthWindow;
    /**
     * Disconnect Google account
     */
    disconnect(): Promise<void>;
    /**
     * Show toast notification
     */
    private showToast;
}
/**
 * Initialize Google integration page from config
 */
export declare function initGoogleIntegration(config: GoogleIntegrationPageConfig): GoogleIntegrationController;
/**
 * Bootstrap Google integration page from template context
 */
export declare function bootstrapGoogleIntegration(config: {
    basePath: string;
    apiBasePath?: string;
    userId: string;
    googleAccountId?: string;
    googleRedirectUri?: string;
    googleClientId?: string;
    googleEnabled?: boolean;
}): void;
//# sourceMappingURL=google-integration.d.ts.map
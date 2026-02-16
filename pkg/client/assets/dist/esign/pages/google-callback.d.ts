/**
 * E-Sign Google OAuth Callback Page Controller
 * Handles OAuth redirect/callback flow from Google
 */
import type { ESignPageConfig } from '../types.js';
export interface GoogleCallbackConfig extends ESignPageConfig {
    /** If popup not opened, redirect to this path on close */
    fallbackRedirectPath?: string;
}
/**
 * Google OAuth callback page controller
 * Handles the OAuth redirect from Google and communicates back to the opener window
 */
export declare class GoogleCallbackController {
    private readonly config;
    private readonly elements;
    constructor(config: GoogleCallbackConfig);
    /**
     * Initialize the callback page
     */
    init(): void;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Process the OAuth callback parameters
     */
    private processCallback;
    /**
     * Parse OAuth state parameter
     */
    private parseOAuthState;
    /**
     * Show a specific state and hide others
     */
    private showState;
    /**
     * Send message to opener window
     */
    private sendToOpener;
    /**
     * Handle OAuth error
     */
    private handleError;
    /**
     * Handle OAuth success
     */
    private handleSuccess;
    /**
     * Setup close button behavior based on whether this is a popup
     */
    private setupCloseButton;
    /**
     * Handle close button click
     */
    private handleClose;
}
/**
 * Initialize Google callback page from config
 */
export declare function initGoogleCallback(config?: GoogleCallbackConfig): GoogleCallbackController;
/**
 * Bootstrap Google callback page (auto-init)
 */
export declare function bootstrapGoogleCallback(basePath: string): void;
//# sourceMappingURL=google-callback.d.ts.map
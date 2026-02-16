/**
 * E-Sign Google OAuth Callback Page Controller
 * Handles OAuth redirect/callback flow from Google
 */

import type { ESignPageConfig, GoogleOAuthCallbackData, GoogleOAuthState } from '../types.js';
import { qs, show, hide, onReady } from '../utils/dom-helpers.js';

export interface GoogleCallbackConfig extends ESignPageConfig {
  /** If popup not opened, redirect to this path on close */
  fallbackRedirectPath?: string;
}

type CallbackState = 'loading' | 'success' | 'error';

/**
 * Error messages for OAuth error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You denied access to your Google account.',
  invalid_request: 'The authorization request was invalid.',
  unauthorized_client: 'This application is not authorized.',
  unsupported_response_type: 'The response type is not supported.',
  invalid_scope: 'The requested scope is invalid.',
  server_error: 'Google encountered a server error.',
  temporarily_unavailable: 'Google is temporarily unavailable. Please try again.',
  unknown: 'Authorization failed.',
};

/**
 * Google OAuth callback page controller
 * Handles the OAuth redirect from Google and communicates back to the opener window
 */
export class GoogleCallbackController {
  private readonly config: GoogleCallbackConfig;
  private readonly elements: {
    loadingState: HTMLElement | null;
    successState: HTMLElement | null;
    errorState: HTMLElement | null;
    errorMessage: HTMLElement | null;
    errorDetail: HTMLElement | null;
    closeBtn: HTMLElement | null;
  };

  constructor(config: GoogleCallbackConfig) {
    this.config = config;
    this.elements = {
      loadingState: qs('#loading-state'),
      successState: qs('#success-state'),
      errorState: qs('#error-state'),
      errorMessage: qs('#error-message'),
      errorDetail: qs('#error-detail'),
      closeBtn: qs('#close-btn'),
    };
  }

  /**
   * Initialize the callback page
   */
  init(): void {
    this.setupEventListeners();
    this.processCallback();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const { closeBtn } = this.elements;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.handleClose());
    }
  }

  /**
   * Process the OAuth callback parameters
   */
  private processCallback(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');

    // Parse state to extract user_id and account_id
    const stateData = this.parseOAuthState(state);

    // Also check for account_id in query params (fallback)
    if (!stateData.account_id) {
      stateData.account_id = (params.get('account_id') || '').trim();
    }

    if (error) {
      this.handleError(error, errorDescription, stateData);
    } else if (code) {
      this.handleSuccess(code, stateData);
    } else {
      this.handleError('unknown', 'No authorization code was received from Google.', stateData);
    }
  }

  /**
   * Parse OAuth state parameter
   */
  private parseOAuthState(rawState: string | null): GoogleOAuthState {
    const result: GoogleOAuthState = {
      user_id: '',
      account_id: '',
    };

    if (!rawState) {
      return result;
    }

    try {
      const parsed = JSON.parse(rawState);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.user_id === 'string') {
          result.user_id = parsed.user_id.trim();
        }
        if (typeof parsed.account_id === 'string') {
          result.account_id = parsed.account_id.trim();
        }
        return result;
      }
    } catch {
      // Backward compatibility: older state payloads may contain only user ID
    }

    // Fallback: treat raw state as user_id
    result.user_id = String(rawState || '').trim();
    return result;
  }

  /**
   * Show a specific state and hide others
   */
  private showState(state: CallbackState): void {
    const { loadingState, successState, errorState } = this.elements;

    hide(loadingState);
    hide(successState);
    hide(errorState);

    switch (state) {
      case 'loading':
        show(loadingState);
        break;
      case 'success':
        show(successState);
        break;
      case 'error':
        show(errorState);
        break;
    }
  }

  /**
   * Send message to opener window
   */
  private sendToOpener(data: GoogleOAuthCallbackData): void {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(data, window.location.origin);
    }
  }

  /**
   * Handle OAuth error
   */
  private handleError(
    error: string,
    description: string | null,
    stateData: GoogleOAuthState
  ): void {
    this.showState('error');

    const { errorMessage, errorDetail, closeBtn } = this.elements;

    if (errorMessage) {
      errorMessage.textContent = ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown;
    }

    if (description && errorDetail) {
      errorDetail.textContent = description;
      show(errorDetail);
    }

    // Send error to opener
    this.sendToOpener({
      type: 'google_oauth_callback',
      error,
      error_description: description || undefined,
      account_id: stateData.account_id || undefined,
    });

    // If not a popup, change button to redirect
    this.setupCloseButton(stateData);
  }

  /**
   * Handle OAuth success
   */
  private handleSuccess(code: string, stateData: GoogleOAuthState): void {
    this.showState('success');

    // Send success to opener
    this.sendToOpener({
      type: 'google_oauth_callback',
      code,
      account_id: stateData.account_id || undefined,
    });

    // Auto-close after a short delay
    setTimeout(() => {
      window.close();
    }, 2000);

    // If not a popup, setup redirect
    this.setupCloseButton(stateData);
  }

  /**
   * Setup close button behavior based on whether this is a popup
   */
  private setupCloseButton(stateData: GoogleOAuthState): void {
    const { closeBtn } = this.elements;

    if (!window.opener && closeBtn) {
      closeBtn.textContent = 'Return to App';
    }
  }

  /**
   * Handle close button click
   */
  private handleClose(): void {
    if (window.opener) {
      window.close();
    } else {
      // Redirect back to integration page
      const basePath = this.config.basePath || '/admin';
      const redirectPath =
        this.config.fallbackRedirectPath || `${basePath}/esign/integrations/google`;

      const redirectURL = new URL(redirectPath, window.location.origin);

      // Get account_id from URL params if available
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state');
      const stateData = this.parseOAuthState(state);
      const accountId = stateData.account_id || params.get('account_id');

      if (accountId) {
        redirectURL.searchParams.set('account_id', accountId);
      }

      window.location.href = redirectURL.toString();
    }
  }
}

/**
 * Initialize Google callback page from config
 */
export function initGoogleCallback(config?: GoogleCallbackConfig): GoogleCallbackController {
  const pageConfig = config || {
    basePath: '/admin',
    apiBasePath: '/admin/api',
  };

  const controller = new GoogleCallbackController(pageConfig);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap Google callback page (auto-init)
 */
export function bootstrapGoogleCallback(basePath: string): void {
  const config: GoogleCallbackConfig = {
    basePath,
    apiBasePath: `${basePath}/api`,
  };

  const controller = new GoogleCallbackController(config);
  onReady(() => controller.init());
}

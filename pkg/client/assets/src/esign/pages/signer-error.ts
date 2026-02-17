/**
 * E-Sign Signer Error Page Controller
 * Handles retry functionality for error pages
 */

import { onReady, qs, qsa } from '../utils/dom-helpers.js';

/**
 * Configuration for the signer error page
 */
export interface SignerErrorConfig {
  basePath?: string;
}

/**
 * Signer error page controller
 * Sets up delegated event handling for retry buttons
 */
export class SignerErrorPageController {
  private readonly config: SignerErrorConfig;

  constructor(config: SignerErrorConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the error page
   */
  init(): void {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners using delegation
   */
  private setupEventListeners(): void {
    // Handle all retry buttons using data attributes
    const retryButtons = qsa<HTMLButtonElement>('[data-action="retry"]');
    retryButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.handleRetry());
    });

    // Fallback: handle any buttons with class indicating retry
    const fallbackButtons = qsa<HTMLButtonElement>('.retry-btn, [aria-label*="Try Again"]');
    fallbackButtons.forEach((btn) => {
      if (!btn.hasAttribute('data-action')) {
        btn.addEventListener('click', () => this.handleRetry());
      }
    });
  }

  /**
   * Handle retry action
   */
  private handleRetry(): void {
    window.location.reload();
  }
}

/**
 * Initialize signer error page from config
 */
export function initSignerErrorPage(config: SignerErrorConfig = {}): SignerErrorPageController {
  const controller = new SignerErrorPageController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap signer error page
 */
export function bootstrapSignerErrorPage(config: SignerErrorConfig = {}): void {
  const controller = new SignerErrorPageController(config);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignErrorController = controller;
  }
}

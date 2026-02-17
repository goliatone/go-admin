/**
 * E-Sign Signer Complete Page Controller
 * Handles artifact loading and display after signing completion
 */

import type { ESignPageConfig } from '../types.js';
import { onReady, qs, show, hide } from '../utils/dom-helpers.js';
import { poll } from '../utils/async-helpers.js';

export interface SignerCompleteConfig extends ESignPageConfig {
  token: string;
  apiBasePath: string;
  agreementCompleted: boolean;
  hasServerDownloadUrl: boolean;
}

export interface ArtifactUrls {
  executed: string | null;
  source: string | null;
  certificate: string | null;
}

interface ArtifactState {
  loaded: boolean;
  loading: boolean;
  hasArtifacts: boolean;
  retryCount: number;
  maxRetries: number;
}

/**
 * Signer completion page controller
 * Manages artifact loading states and display
 */
export class SignerCompletePageController {
  private readonly config: SignerCompleteConfig;
  private state: ArtifactState = {
    loaded: false,
    loading: false,
    hasArtifacts: false,
    retryCount: 0,
    maxRetries: 3,
  };

  constructor(config: SignerCompleteConfig) {
    this.config = config;
  }

  /**
   * Initialize the completion page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadArtifacts();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const retryBtn = qs('#retry-artifacts-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadArtifacts());
    }
  }

  /**
   * Load artifacts from the assets endpoint
   */
  async loadArtifacts(): Promise<void> {
    if (this.state.loading) return;

    this.state.loading = true;
    this.showArtifactState('loading');

    try {
      const response = await fetch(
        `${this.config.apiBasePath}/assets/${this.config.token}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load artifacts');
      }

      const payload = await response.json();
      const assets = payload?.assets || {};
      const artifacts = this.resolveArtifacts(assets);

      if (artifacts) {
        this.state.hasArtifacts = true;
        this.displayArtifacts(artifacts);
        this.showArtifactState('available');
      } else if (this.config.agreementCompleted) {
        // Agreement is complete but artifacts not yet generated - show processing state
        this.showArtifactState('processing');
        // Schedule a retry after a delay
        if (this.state.retryCount < this.state.maxRetries) {
          this.state.retryCount++;
          setTimeout(() => this.loadArtifacts(), 5000);
        }
      } else {
        // Agreement not complete yet - show processing (waiting for other signers)
        this.showArtifactState('processing');
      }

      this.state.loaded = true;
    } catch (error) {
      console.error('Artifact load error:', error);

      // If we have a server-rendered fallback, use it
      if (this.config.hasServerDownloadUrl) {
        this.showArtifactState('fallback');
      } else {
        this.showArtifactState('unavailable');
      }
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Resolve binary asset URLs from the assets response.
   * Never uses contract_url (which returns JSON).
   */
  private resolveArtifacts(
    assets: Record<string, string | undefined>
  ): ArtifactUrls | null {
    const artifacts: ArtifactUrls = {
      executed: assets.executed_url || null,
      source: assets.source_url || null,
      certificate: assets.certificate_url || null,
    };

    const hasAny = !!(
      artifacts.executed ||
      artifacts.source ||
      artifacts.certificate
    );

    return hasAny ? artifacts : null;
  }

  /**
   * Show a specific artifact section and hide others
   */
  private showArtifactState(state: string): void {
    const states = ['loading', 'processing', 'available', 'unavailable', 'fallback'];
    states.forEach((s) => {
      const el = qs(`#artifacts-${s}`);
      if (el) {
        if (s === state) {
          show(el as HTMLElement);
        } else {
          hide(el as HTMLElement);
        }
      }
    });
  }

  /**
   * Display available artifacts in the UI
   */
  private displayArtifacts(artifacts: ArtifactUrls): void {
    if (artifacts.executed) {
      const container = qs('#artifact-executed');
      const link = qs<HTMLAnchorElement>('#artifact-executed-link');
      if (container && link) {
        link.href = new URL(artifacts.executed, window.location.origin).toString();
        show(container as HTMLElement);
      }
    }

    if (artifacts.source) {
      const container = qs('#artifact-source');
      const link = qs<HTMLAnchorElement>('#artifact-source-link');
      if (container && link) {
        link.href = new URL(artifacts.source, window.location.origin).toString();
        show(container as HTMLElement);
      }
    }

    if (artifacts.certificate) {
      const container = qs('#artifact-certificate');
      const link = qs<HTMLAnchorElement>('#artifact-certificate-link');
      if (container && link) {
        link.href = new URL(artifacts.certificate, window.location.origin).toString();
        show(container as HTMLElement);
      }
    }
  }

  /**
   * Get current state (for testing)
   */
  getState(): ArtifactState {
    return { ...this.state };
  }
}

/**
 * Initialize signer complete page from config
 */
export function initSignerCompletePage(
  config: SignerCompleteConfig
): SignerCompletePageController {
  const controller = new SignerCompletePageController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap signer complete page from inline config
 */
export function bootstrapSignerCompletePage(config: SignerCompleteConfig): void {
  const controller = new SignerCompletePageController(config);
  onReady(() => controller.init());

  // Export for testing and retry functionality
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignCompletionController = controller;
    (window as unknown as Record<string, unknown>).loadArtifacts = () => controller.loadArtifacts();
  }
}

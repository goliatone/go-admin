/**
 * E-Sign Signer Complete Page Controller
 * Handles artifact loading and display after signing completion
 */

import type { ESignPageConfig } from '../types.js';
import { onReady, qs, show, hide } from '../utils/dom-helpers.js';
import { readHTTPError } from '../../shared/transport/http-client.js';

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

export interface SignerCompletePayloadState {
  artifacts: ArtifactUrls | null;
  agreementCompleted: boolean;
  completionPackageReady: boolean;
}

interface ArtifactState {
  loaded: boolean;
  loading: boolean;
  hasArtifacts: boolean;
  retryCount: number;
  agreementCompleted: boolean;
  completionPackageReady: boolean;
  autoPolling: boolean;
}

const COMPLETED_AGREEMENT_POLL_WINDOW_MS = 3 * 60 * 1000;
const PENDING_AGREEMENT_POLL_WINDOW_MS = 10 * 60 * 1000;
const COMPLETED_AGREEMENT_BASE_DELAY_MS = 2000;
const PENDING_AGREEMENT_BASE_DELAY_MS = 15000;
const COMPLETED_AGREEMENT_MAX_DELAY_MS = 15000;
const PENDING_AGREEMENT_MAX_DELAY_MS = 60000;

function normalizeAgreementStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function resolveSignerCompleteArtifacts(
  assets: Record<string, string | undefined | null> | null | undefined
): ArtifactUrls | null {
  if (!assets || typeof assets !== 'object') {
    return null;
  }

  const artifacts: ArtifactUrls = {
    executed: String(assets.executed_url || '').trim() || null,
    source: String(assets.source_url || '').trim() || null,
    certificate: String(assets.certificate_url || '').trim() || null,
  };

  const hasAny = Boolean(artifacts.executed || artifacts.source || artifacts.certificate);
  return hasAny ? artifacts : null;
}

export function resolveSignerCompletePayloadState(
  payload: Record<string, unknown> | null | undefined,
  fallbackAgreementCompleted = false
): SignerCompletePayloadState {
  const contract = payload && typeof payload === 'object' && payload.contract && typeof payload.contract === 'object'
    ? payload.contract as Record<string, unknown>
    : {};
  const assets = payload && typeof payload === 'object' && payload.assets && typeof payload.assets === 'object'
    ? payload.assets as Record<string, string | undefined | null>
    : {};

  const artifacts = resolveSignerCompleteArtifacts(assets);
  const agreementCompleted =
    normalizeAgreementStatus(contract.agreement_status) === 'completed' || fallbackAgreementCompleted;
  const completionPackageReady = agreementCompleted && (
    Boolean(artifacts?.executed) &&
    Boolean(artifacts?.certificate)
  );

  return {
    artifacts,
    agreementCompleted,
    completionPackageReady,
  };
}

export function getSignerCompletionPollDelayMs(
  attempt: number,
  agreementCompleted: boolean
): number {
  const normalizedAttempt = Math.max(1, Math.floor(attempt || 1));
  if (agreementCompleted) {
    return Math.min(
      Math.round(COMPLETED_AGREEMENT_BASE_DELAY_MS * Math.pow(1.6, normalizedAttempt - 1)),
      COMPLETED_AGREEMENT_MAX_DELAY_MS,
    );
  }
  return Math.min(
    Math.round(PENDING_AGREEMENT_BASE_DELAY_MS * Math.pow(1.5, normalizedAttempt - 1)),
    PENDING_AGREEMENT_MAX_DELAY_MS,
  );
}

function getSignerCompletionPollWindowMs(agreementCompleted: boolean): number {
  return agreementCompleted
    ? COMPLETED_AGREEMENT_POLL_WINDOW_MS
    : PENDING_AGREEMENT_POLL_WINDOW_MS;
}

/**
 * Signer completion page controller
 * Manages artifact loading states and display
 */
export class SignerCompletePageController {
  private readonly config: SignerCompleteConfig;
  private pollTimerId: ReturnType<typeof setTimeout> | null = null;
  private pollStartedAt: number | null = null;
  private destroyed = false;
  private state: ArtifactState = {
    loaded: false,
    loading: false,
    hasArtifacts: false,
    retryCount: 0,
    agreementCompleted: false,
    completionPackageReady: false,
    autoPolling: false,
  };

  constructor(config: SignerCompleteConfig) {
    this.config = config;
  }

  /**
   * Initialize the completion page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadArtifacts({ resetPollingWindow: true });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const retryBtn = qs('#retry-artifacts-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        void this.loadArtifacts({ resetPollingWindow: true });
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.destroy(), { once: true });
    }
  }

  /**
   * Load artifacts from the assets endpoint
   */
  async loadArtifacts(options: { resetPollingWindow?: boolean } = {}): Promise<void> {
    if (this.destroyed || this.state.loading) return;

    if (options.resetPollingWindow) {
      this.resetPollingWindow();
    }

    this.state.loading = true;
    this.clearScheduledPoll();
    if (!this.state.hasArtifacts) {
      this.showArtifactState('loading');
    }

    try {
      const response = await fetch(
        `${this.config.apiBasePath}/assets/${this.config.token}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(
          await readHTTPError(response, 'Failed to load artifacts', {
            appendStatusToFallback: false,
          })
        );
      }

      const payload = await response.json();
      const resolved = resolveSignerCompletePayloadState(
        payload && typeof payload === 'object' ? payload as Record<string, unknown> : null,
        this.config.agreementCompleted,
      );
      const artifacts = resolved.artifacts;

      this.state.agreementCompleted = resolved.agreementCompleted;
      this.state.completionPackageReady = resolved.completionPackageReady;
      this.state.hasArtifacts = Boolean(artifacts);

      if (artifacts) {
        this.displayArtifacts(artifacts);
        this.showArtifactState('available');
      } else {
        this.showArtifactState('processing');
      }

      this.schedulePollingIfNeeded();
      this.state.loaded = true;
    } catch (error) {
      console.error('Artifact load error:', error);

      if (this.state.hasArtifacts) {
        this.showArtifactState('available');
      } else if (this.config.hasServerDownloadUrl) {
        this.showArtifactState('fallback');
      } else {
        this.showArtifactState('unavailable');
      }
      this.schedulePollingIfNeeded();
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Stop active polling and release pending timers.
   */
  destroy(): void {
    this.destroyed = true;
    this.clearScheduledPoll();
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

  private schedulePollingIfNeeded(): void {
    if (this.destroyed || !this.shouldContinuePolling()) {
      this.state.autoPolling = false;
      return;
    }

    if (this.pollStartedAt == null) {
      this.pollStartedAt = Date.now();
    }

    this.state.retryCount += 1;
    this.state.autoPolling = true;

    const delay = getSignerCompletionPollDelayMs(
      this.state.retryCount,
      this.state.agreementCompleted,
    );

    this.pollTimerId = window.setTimeout(() => {
      this.pollTimerId = null;
      void this.loadArtifacts();
    }, delay);
  }

  private shouldContinuePolling(): boolean {
    const pollStartedAt = this.pollStartedAt ?? Date.now();
    const elapsedMs = Date.now() - pollStartedAt;
    const pollWindowMs = getSignerCompletionPollWindowMs(this.state.agreementCompleted);

    return elapsedMs < pollWindowMs && !this.state.completionPackageReady;
  }

  private clearScheduledPoll(): void {
    if (this.pollTimerId != null) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
  }

  private resetPollingWindow(): void {
    this.clearScheduledPoll();
    this.pollStartedAt = Date.now();
    this.state.retryCount = 0;
    this.state.autoPolling = false;
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

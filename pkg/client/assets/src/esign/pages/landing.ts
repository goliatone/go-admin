/**
 * E-Sign Landing Page Controller
 * Handles dynamic stats loading and page initialization for the landing page
 */

import type { ESignPageConfig, AgreementStats } from '../types.js';
import { ESignAPIClient, createESignClient } from '../api-client.js';
import { onReady, updateDataText, getPageConfig } from '../utils/dom-helpers.js';

export interface LandingPageConfig extends ESignPageConfig {
  initialStats?: Partial<AgreementStats>;
}

/**
 * Landing page controller
 * Fetches and displays agreement statistics dynamically
 */
export class LandingPageController {
  private readonly config: LandingPageConfig;
  private readonly client: ESignAPIClient;

  constructor(config: LandingPageConfig) {
    this.config = config;
    this.client = createESignClient({
      basePath: config.basePath,
      apiBasePath: config.apiBasePath,
    });
  }

  /**
   * Initialize the landing page
   */
  async init(): Promise<void> {
    try {
      await this.loadStats();
    } catch (err) {
      console.debug('Could not fetch agreement stats:', err);
    }
  }

  /**
   * Load and display agreement statistics
   */
  private async loadStats(): Promise<void> {
    const stats = await this.client.getAgreementStats();

    updateDataText('count="draft"', stats.draft);
    updateDataText('count="pending"', stats.pending);
    updateDataText('count="completed"', stats.completed);
    updateDataText('count="action_required"', stats.action_required);

    // Also update using the standard data attribute pattern
    this.updateStatElement('draft', stats.draft);
    this.updateStatElement('pending', stats.pending);
    this.updateStatElement('completed', stats.completed);
    this.updateStatElement('action_required', stats.action_required);
  }

  /**
   * Update a stat element by key
   */
  private updateStatElement(key: string, value: number): void {
    const el = document.querySelector(`[data-esign-count="${key}"]`);
    if (el) {
      el.textContent = String(value);
    }
  }
}

/**
 * Auto-initialize landing page from page config
 */
export function initLandingPage(config?: LandingPageConfig): LandingPageController {
  const pageConfig =
    config ||
    getPageConfig<LandingPageConfig>(
      '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
    );

  if (!pageConfig) {
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  }

  const controller = new LandingPageController(pageConfig);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap landing page from inline config (for migration compatibility)
 */
export function bootstrapLandingPage(basePath: string, apiBasePath?: string): void {
  const config: LandingPageConfig = {
    basePath,
    apiBasePath: apiBasePath || `${basePath}/api`,
  };

  const controller = new LandingPageController(config);
  onReady(() => controller.init());
}

// Auto-init if page marker is present
if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector(
      '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
    );
    if (pageEl) {
      const configScript = document.getElementById('esign-page-config');
      const configAttr = pageEl.getAttribute('data-esign-config');
      const rawConfig = (() => {
        if (configScript?.textContent) {
          try {
            return JSON.parse(configScript.textContent) as Record<string, unknown>;
          } catch (e) {
            console.warn('Failed to parse landing page config script:', e);
          }
        }
        if (configAttr) {
          try {
            return JSON.parse(configAttr) as Record<string, unknown>;
          } catch (e) {
            console.warn('Failed to parse landing page config attribute:', e);
          }
        }
        return null;
      })();
      if (rawConfig) {
        const basePath = String(rawConfig.basePath || rawConfig.base_path || '/admin');
        const apiBasePath = String(
          rawConfig.apiBasePath || rawConfig.api_base_path || `${basePath}/api`
        );
        const controller = new LandingPageController({ basePath, apiBasePath });
        controller.init();
      }
    }
  });
}

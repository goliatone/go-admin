/**
 * E-Sign Landing Page Controller
 * Handles dynamic stats loading and page initialization for the landing page
 */
import type { ESignPageConfig, AgreementStats } from '../types.js';
export interface LandingPageConfig extends ESignPageConfig {
    initialStats?: Partial<AgreementStats>;
}
/**
 * Landing page controller
 * Fetches and displays agreement statistics dynamically
 */
export declare class LandingPageController {
    private readonly config;
    private readonly client;
    constructor(config: LandingPageConfig);
    /**
     * Initialize the landing page
     */
    init(): Promise<void>;
    /**
     * Load and display agreement statistics
     */
    private loadStats;
    /**
     * Update a stat element by key
     */
    private updateStatElement;
}
/**
 * Auto-initialize landing page from page config
 */
export declare function initLandingPage(config?: LandingPageConfig): LandingPageController;
/**
 * Bootstrap landing page from inline config (for migration compatibility)
 */
export declare function bootstrapLandingPage(basePath: string, apiBasePath?: string): void;
//# sourceMappingURL=landing.d.ts.map
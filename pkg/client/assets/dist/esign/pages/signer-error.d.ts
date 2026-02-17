/**
 * E-Sign Signer Error Page Controller
 * Handles retry functionality for error pages
 */
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
export declare class SignerErrorPageController {
    private readonly config;
    constructor(config?: SignerErrorConfig);
    /**
     * Initialize the error page
     */
    init(): void;
    /**
     * Setup event listeners using delegation
     */
    private setupEventListeners;
    /**
     * Handle retry action
     */
    private handleRetry;
}
/**
 * Initialize signer error page from config
 */
export declare function initSignerErrorPage(config?: SignerErrorConfig): SignerErrorPageController;
/**
 * Bootstrap signer error page
 */
export declare function bootstrapSignerErrorPage(config?: SignerErrorConfig): void;
//# sourceMappingURL=signer-error.d.ts.map
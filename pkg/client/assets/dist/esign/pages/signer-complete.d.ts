/**
 * E-Sign Signer Complete Page Controller
 * Handles artifact loading and display after signing completion
 */
import type { ESignPageConfig } from '../types.js';
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
export declare class SignerCompletePageController {
    private readonly config;
    private state;
    constructor(config: SignerCompleteConfig);
    /**
     * Initialize the completion page
     */
    init(): Promise<void>;
    /**
     * Load artifacts from the assets endpoint
     */
    loadArtifacts(): Promise<void>;
    /**
     * Resolve binary asset URLs from the assets response.
     * Never uses contract_url (which returns JSON).
     */
    private resolveArtifacts;
    /**
     * Show a specific artifact section and hide others
     */
    private showArtifactState;
    /**
     * Display available artifacts in the UI
     */
    private displayArtifacts;
    /**
     * Get current state (for testing)
     */
    getState(): ArtifactState;
}
/**
 * Initialize signer complete page from config
 */
export declare function initSignerCompletePage(config: SignerCompleteConfig): SignerCompletePageController;
/**
 * Bootstrap signer complete page from inline config
 */
export declare function bootstrapSignerCompletePage(config: SignerCompleteConfig): void;
export {};
//# sourceMappingURL=signer-complete.d.ts.map
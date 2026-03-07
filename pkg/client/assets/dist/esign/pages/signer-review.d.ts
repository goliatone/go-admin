export type SignerProfileMode = 'local_only' | 'hybrid' | 'remote_only';
export interface SignerProfileConfig {
    mode?: SignerProfileMode;
    rememberByDefault?: boolean;
    ttlDays?: number;
    persistDrawnSignature?: boolean;
    endpointBasePath?: string;
}
export interface SignerReviewConfig {
    token: string;
    apiBasePath?: string;
    signerBasePath?: string;
    agreementId: string;
    recipientId: string;
    recipientEmail?: string;
    recipientName?: string;
    documentUrl: string;
    pageCount?: number;
    hasConsented?: boolean;
    fields?: any[];
    flowMode?: 'unified' | 'legacy' | string;
    telemetryEnabled?: boolean;
    viewer?: {
        coordinateSpace?: 'pdf' | 'screen' | string;
        contractVersion?: string;
        unit?: 'pt' | 'px' | string;
        origin?: 'top-left' | 'bottom-left' | string;
        yAxisDirection?: 'down' | 'up' | string;
        pages?: any[];
        compatibilityTier?: string;
        compatibilityReason?: string;
        compatibilityMessage?: string;
    };
    signerState?: 'active' | 'waiting' | 'completed' | 'declined' | string;
    recipientStage?: number;
    activeStage?: number;
    activeRecipientIds?: string[];
    waitingForRecipientIds?: string[];
    profile?: SignerProfileConfig;
}
export declare function bootstrapSignerReview(config: SignerReviewConfig): void;
export declare class SignerReviewController {
    private readonly config;
    constructor(config: SignerReviewConfig);
    init(): void;
    destroy(): void;
}
export declare function initSignerReview(config: SignerReviewConfig): SignerReviewController;
//# sourceMappingURL=signer-review.d.ts.map
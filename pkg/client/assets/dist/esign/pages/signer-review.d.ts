/**
 * E-Sign Signer Review Page Controller
 * Handles document viewing, field interactions, and signing flow
 *
 * Features:
 * - PDF document rendering via PDF.js
 * - Field overlays with accessibility support
 * - Signature capture (typed, drawn, uploaded)
 * - Consent/decline workflows
 * - Client-side telemetry
 * - Multi-signer stage support
 */
export interface SignerReviewConfig {
    token: string;
    apiBasePath: string;
    signerBasePath: string;
    agreementId: string;
    recipientId: string;
    documentUrl: string;
    pageCount: number;
    hasConsented: boolean;
    fields: SignerField[];
    flowMode: 'unified' | 'legacy';
    telemetryEnabled: boolean;
    viewer: ViewerConfig;
    signerState: 'active' | 'waiting' | 'completed' | 'declined';
    recipientStage: number;
    activeStage: number;
    activeRecipientIds: string[];
    waitingForRecipientIds: string[];
}
interface ViewerConfig {
    coordinateSpace: 'pdf' | 'screen';
    contractVersion: string;
    unit: 'pt' | 'px';
    origin: 'top-left' | 'bottom-left';
    yAxisDirection: 'down' | 'up';
    pages: PageConfig[];
}
interface PageConfig {
    pageNumber: number;
    width: number;
    height: number;
}
interface SignerField {
    id: string;
    type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox';
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required: boolean;
    recipientId: string;
    value?: string;
    completed?: boolean;
}
export declare class SignerReviewController {
    private readonly config;
    private telemetry;
    private pdfViewer;
    private fieldOverlay;
    private readonly elements;
    constructor(config: SignerReviewConfig);
    init(): Promise<void>;
    private setupEventListeners;
    private handleKeyDown;
    private isInInputField;
    private handlePageChange;
    private handleScaleChange;
    private handleFieldActivate;
    private handleFieldComplete;
    private updateProgress;
    private enableSubmit;
    private showConsentModal;
    private showSignatureModal;
    private showDatePicker;
    private showTextInput;
    private toggleCheckbox;
    private hideAllModals;
    destroy(): void;
}
export declare function initSignerReview(config: SignerReviewConfig): SignerReviewController;
export declare function bootstrapSignerReview(config: {
    token: string;
    apiBasePath?: string;
    signerBasePath?: string;
    agreementId: string;
    recipientId: string;
    documentUrl: string;
    pageCount?: number;
    hasConsented?: boolean;
    fields?: SignerField[];
    flowMode?: 'unified' | 'legacy';
    telemetryEnabled?: boolean;
    viewer?: Partial<ViewerConfig>;
    signerState?: 'active' | 'waiting' | 'completed' | 'declined';
    recipientStage?: number;
    activeStage?: number;
    activeRecipientIds?: string[];
    waitingForRecipientIds?: string[];
}): void;
export {};
//# sourceMappingURL=signer-review.d.ts.map
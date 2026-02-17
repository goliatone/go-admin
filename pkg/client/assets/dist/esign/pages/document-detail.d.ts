/**
 * E-Sign Document Detail Page Controller
 * Handles lazy loading PDF preview for document detail pages
 */
export interface DocumentDetailPreviewConfig {
    documentId: string;
    pdfUrl: string;
    pageCount: number;
}
/**
 * Document detail page controller for PDF preview
 */
export declare class DocumentDetailPreviewController {
    private readonly config;
    private pdfDoc;
    private currentPage;
    private isLoading;
    private isLoaded;
    private scale;
    private readonly elements;
    constructor(config: DocumentDetailPreviewConfig);
    /**
     * Initialize the controller
     */
    init(): void;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Load the PDF document
     */
    loadPdf(): Promise<void>;
    /**
     * Render a specific page
     */
    private renderPage;
    /**
     * Navigate to a specific page
     */
    goToPage(pageNumber: number): void;
    /**
     * Update pagination button states
     */
    private updatePaginationState;
    /**
     * Update status text
     */
    private updateStatus;
    /**
     * Show the loading spinner
     */
    private showSpinner;
    /**
     * Show the PDF viewer
     */
    private showViewer;
    /**
     * Show error state
     */
    private showError;
}
/**
 * Initialize document detail preview
 */
export declare function initDocumentDetailPreview(config: DocumentDetailPreviewConfig): DocumentDetailPreviewController;
/**
 * Bootstrap document detail preview from page config
 */
export declare function bootstrapDocumentDetailPreview(config: {
    documentId: string;
    pdfUrl: string;
    pageCount?: number;
}): void;
//# sourceMappingURL=document-detail.d.ts.map
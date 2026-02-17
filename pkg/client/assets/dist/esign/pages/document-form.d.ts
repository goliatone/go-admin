/**
 * E-Sign Document Form Page Controller
 * Handles PDF upload and Google Drive import for document ingestion
 */
export interface DocumentFormConfig {
    basePath: string;
    apiBasePath?: string;
    userId: string;
    googleEnabled: boolean;
    googleConnected: boolean;
    googleAccountId?: string;
    maxFileSize?: number;
    routes: {
        index: string;
        create?: string;
        agreements?: string;
        integrations?: string;
    };
}
/**
 * Document form page controller
 * Manages PDF upload and Google Drive import functionality
 */
export declare class DocumentFormController {
    private readonly config;
    private readonly apiBase;
    private readonly maxFileSize;
    private currentAccountId;
    private isSubmitting;
    private currentSource;
    private currentFiles;
    private nextPageToken;
    private currentFolderPath;
    private selectedFile;
    private searchQuery;
    private searchTimeout;
    private pollTimeout;
    private pollAttempts;
    private currentImportRunId;
    private readonly elements;
    constructor(config: DocumentFormConfig);
    /**
     * Initialize the document form page
     */
    init(): Promise<void>;
    /**
     * Setup all event listeners
     */
    private setupEventListeners;
    /**
     * Setup source tab switching listeners
     */
    private setupSourceTabListeners;
    /**
     * Setup PDF upload listeners
     */
    private setupUploadListeners;
    /**
     * Setup Google Drive listeners
     */
    private setupGoogleDriveListeners;
    /**
     * Resolve initial account ID from query, template, or localStorage
     */
    private resolveInitialAccountId;
    /**
     * Normalize account ID
     */
    private normalizeAccountId;
    /**
     * Sync account ID to URL and localStorage
     */
    private syncScopedAccountState;
    /**
     * Apply account ID to a path
     */
    private applyAccountIdToPath;
    /**
     * Update account scope UI elements
     */
    private updateAccountScopeUI;
    /**
     * Build scoped API URL
     */
    private buildScopedAPIURL;
    /**
     * Switch between upload and Google Drive source
     */
    private switchSource;
    /**
     * Initialize source from URL parameters
     */
    private initializeSourceFromURL;
    /**
     * Handle file selection
     */
    private handleFileSelect;
    /**
     * Validate uploaded file
     */
    private validateFile;
    /**
     * Show file preview
     */
    private showPreview;
    /**
     * Clear file preview
     */
    private clearPreview;
    /**
     * Clear file selection
     */
    private clearFileSelection;
    /**
     * Show error message
     */
    private showError;
    /**
     * Clear error message
     */
    private clearError;
    /**
     * Update submit button state
     */
    private updateSubmitState;
    /**
     * Set submitting state
     */
    private setSubmittingState;
    /**
     * Upload source PDF to API
     */
    private uploadSourcePDF;
    /**
     * Handle form submission
     */
    private handleFormSubmit;
    /**
     * Normalize drive file from API response
     */
    private normalizeDriveFile;
    /**
     * Check if file is a Google Doc
     */
    private isGoogleDoc;
    /**
     * Check if file is a PDF
     */
    private isPDF;
    /**
     * Check if file is a folder
     */
    private isFolder;
    /**
     * Check if file is importable
     */
    private isImportable;
    /**
     * Get file type name
     */
    private getFileTypeName;
    /**
     * Get file icon HTML
     */
    private getFileIcon;
    /**
     * Get import type info for display
     */
    private getImportTypeInfo;
    /**
     * Load files from Google Drive
     */
    loadFiles(options?: {
        folderId?: string;
        query?: string;
        pageToken?: string;
        append?: boolean;
    }): Promise<void>;
    /**
     * Render files in the file list
     */
    private renderFiles;
    /**
     * Navigate to folder
     */
    private navigateToFolder;
    /**
     * Update breadcrumb navigation
     */
    private updateBreadcrumb;
    /**
     * Select a file
     */
    private selectFile;
    /**
     * Clear drive selection
     */
    private clearDriveSelection;
    /**
     * Handle search input
     */
    private handleSearch;
    /**
     * Clear search
     */
    private clearSearch;
    /**
     * Load more files
     */
    private loadMoreFiles;
    /**
     * Refresh files
     */
    private refreshFiles;
    /**
     * Show import status panel
     */
    private showImportStatus;
    /**
     * Update import status message
     */
    private updateImportStatusMessage;
    /**
     * Show import error
     */
    private showImportError;
    /**
     * Start import process
     */
    private startImport;
    /**
     * Start polling for import status
     */
    private startPolling;
    /**
     * Poll import status
     */
    private pollImportStatus;
    /**
     * Resume import polling from URL parameter
     */
    private resumeImportPolling;
    /**
     * Escape HTML
     */
    private escapeHtml;
}
/**
 * Initialize document form page from config
 */
export declare function initDocumentForm(config: DocumentFormConfig): DocumentFormController;
/**
 * Bootstrap document form page from template context
 */
export declare function bootstrapDocumentForm(config: {
    basePath: string;
    apiBasePath?: string;
    userId: string;
    googleEnabled?: boolean;
    googleConnected?: boolean;
    googleAccountId?: string;
    maxFileSize?: number;
    routes: {
        index: string;
        create?: string;
        agreements?: string;
        integrations?: string;
    };
}): void;
//# sourceMappingURL=document-form.d.ts.map
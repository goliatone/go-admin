/**
 * E-Sign Google Drive Picker Page Controller
 * Handles Google Drive file browsing, selection, and import
 */
import type { ESignPageConfig } from '../types.js';
export interface GoogleDrivePickerConfig extends ESignPageConfig {
    userId: string;
    googleAccountId?: string;
    googleConnected: boolean;
    pickerRoutes?: {
        integrations?: string;
        agreements?: string;
        documents?: string;
    };
}
/**
 * Google Drive Picker page controller
 * Manages file browsing, search, selection, and import
 */
export declare class GoogleDrivePickerController {
    private readonly config;
    private readonly apiBase;
    private currentAccountId;
    private currentFiles;
    private nextPageToken;
    private currentFolderPath;
    private selectedFile;
    private searchQuery;
    private isListView;
    private isLoading;
    private readonly elements;
    constructor(config: GoogleDrivePickerConfig);
    /**
     * Initialize the drive picker page
     */
    init(): Promise<void>;
    /**
     * Setup all event listeners
     */
    private setupEventListeners;
    /**
     * Resolve initial account ID from various sources
     */
    private resolveInitialAccountId;
    /**
     * Normalize account ID
     */
    private normalizeAccountId;
    /**
     * Update UI elements with account scope
     */
    private updateScopedUI;
    /**
     * Sync account ID to URL and localStorage
     */
    private syncScopedURLState;
    /**
     * Apply account ID to a path
     */
    private applyAccountIdToPath;
    /**
     * Build scoped API URL
     */
    private buildScopedAPIURL;
    /**
     * Normalize drive file from API response
     */
    private normalizeDriveFile;
    /**
     * Load files from current folder or search
     */
    loadFiles(append?: boolean): Promise<void>;
    /**
     * Render files in the file list
     */
    private renderFiles;
    /**
     * Render a single file item
     */
    private renderFileItem;
    /**
     * Get SVG icon for file type
     */
    private getFileIcon;
    /**
     * Handle file list clicks
     */
    private handleFileListClick;
    /**
     * Navigate into a folder
     */
    private navigateToFolder;
    /**
     * Select a file
     */
    private selectFile;
    /**
     * Clear file selection
     */
    private clearSelection;
    /**
     * Render selection panel
     */
    private renderSelection;
    /**
     * Get human-readable mime type label
     */
    private getMimeTypeLabel;
    /**
     * Update breadcrumb navigation
     */
    private updateBreadcrumb;
    /**
     * Navigate to breadcrumb item
     */
    private navigateToBreadcrumb;
    /**
     * Update result count display
     */
    private updateResultCount;
    /**
     * Update pagination controls
     */
    private updatePagination;
    /**
     * Handle search
     */
    private handleSearch;
    /**
     * Clear search
     */
    private clearSearch;
    /**
     * Refresh file list
     */
    private refresh;
    /**
     * Load more files (pagination)
     */
    private loadMore;
    /**
     * Set view mode
     */
    private setViewMode;
    /**
     * Show import modal
     */
    private showImportModal;
    /**
     * Hide import modal
     */
    private hideImportModal;
    /**
     * Handle import form submission
     */
    private handleImport;
    /**
     * Render error state
     */
    private renderError;
    /**
     * Show toast notification
     */
    private showToast;
    /**
     * Escape HTML
     */
    private escapeHtml;
}
/**
 * Initialize Google Drive picker page from config
 */
export declare function initGoogleDrivePicker(config: GoogleDrivePickerConfig): GoogleDrivePickerController;
/**
 * Bootstrap Google Drive picker page from template context
 */
export declare function bootstrapGoogleDrivePicker(config: {
    basePath: string;
    apiBasePath?: string;
    userId: string;
    googleAccountId?: string;
    googleConnected?: boolean;
    pickerRoutes?: {
        integrations?: string;
        agreements?: string;
        documents?: string;
    };
}): void;
//# sourceMappingURL=google-drive-picker.d.ts.map
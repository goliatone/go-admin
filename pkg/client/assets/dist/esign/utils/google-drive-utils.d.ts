/**
 * Google Drive Utilities
 * Shared utilities for Google Drive integration across e-sign pages
 */
/**
 * Google MIME types
 */
export declare const MIME_GOOGLE_DOC = "application/vnd.google-apps.document";
export declare const MIME_GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
export declare const MIME_GOOGLE_SLIDES = "application/vnd.google-apps.presentation";
export declare const MIME_GOOGLE_FOLDER = "application/vnd.google-apps.folder";
export declare const MIME_PDF = "application/pdf";
/**
 * Importable MIME types for e-sign
 */
export declare const IMPORTABLE_MIME_TYPES: string[];
/**
 * LocalStorage key for Google account ID
 */
export declare const GOOGLE_ACCOUNT_STORAGE_KEY = "esign.google.account_id";
/**
 * Normalized Google Drive file
 */
export interface NormalizedDriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
    iconLink?: string;
    thumbnailLink?: string;
    webViewLink?: string;
    parents?: string[];
}
/**
 * Folder path item for breadcrumb navigation
 */
export interface FolderPathItem {
    id: string;
    name: string;
}
/**
 * Raw Google Drive file from API
 */
export interface RawGoogleDriveFile {
    id?: string;
    name?: string;
    mimeType?: string;
    size?: string | number;
    modifiedTime?: string;
    iconLink?: string;
    thumbnailLink?: string;
    webViewLink?: string;
    parents?: string[];
    [key: string]: unknown;
}
/**
 * Check if file is a Google Doc
 */
export declare function isGoogleDoc(file: NormalizedDriveFile): boolean;
/**
 * Check if file is a PDF
 */
export declare function isPDF(file: NormalizedDriveFile): boolean;
/**
 * Check if file is a folder
 */
export declare function isFolder(file: NormalizedDriveFile): boolean;
/**
 * Check if file is importable
 */
export declare function isImportable(file: NormalizedDriveFile): boolean;
/**
 * Check if file is a Google Workspace file (Doc, Sheet, Slides)
 */
export declare function isGoogleWorkspaceFile(file: NormalizedDriveFile): boolean;
/**
 * Normalize a raw Google Drive file to a standard format
 */
export declare function normalizeDriveFile(file: RawGoogleDriveFile): NormalizedDriveFile;
/**
 * Normalize an array of raw files
 */
export declare function normalizeDriveFiles(files: RawGoogleDriveFile[]): NormalizedDriveFile[];
/**
 * Get human-readable file type name from MIME type
 */
export declare function getFileTypeName(mimeType: string): string;
/**
 * Get file icon configuration based on file type
 */
export declare function getFileIconConfig(file: NormalizedDriveFile): {
    icon: string;
    bgClass: string;
    textClass: string;
};
/**
 * Format file size for display
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Format date for display
 */
export declare function formatDate(dateStr: string): string;
/**
 * Resolve account ID from multiple sources
 * Priority: queryParams > templateValue > localStorage
 */
export declare function resolveAccountId(queryParams: URLSearchParams, templateAccountId?: string): string;
/**
 * Normalize account ID value
 */
export declare function normalizeAccountId(value: string | null | undefined): string;
/**
 * Save account ID to localStorage
 */
export declare function saveAccountId(accountId: string): void;
/**
 * Apply account ID to a URL path or full URL
 */
export declare function applyAccountIdToPath(pathOrUrl: string, accountId: string): string;
/**
 * Build API URL with account ID scoping
 */
export declare function buildScopedApiUrl(apiBase: string, path: string, accountId?: string): URL;
/**
 * Sync account ID to URL state
 */
export declare function syncAccountIdToUrl(accountId: string): void;
/**
 * Escape HTML to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Render file icon HTML
 */
export declare function renderFileIcon(file: NormalizedDriveFile): string;
/**
 * Render breadcrumb HTML for folder navigation
 */
export declare function renderBreadcrumb(path: FolderPathItem[], onNavigate: (folderId: string) => void): string;
/**
 * Render a single file item HTML
 */
export declare function renderFileItem(file: NormalizedDriveFile, options?: {
    selectable?: boolean;
    showSize?: boolean;
    showDate?: boolean;
}): string;
/**
 * Render file list HTML
 */
export declare function renderFileList(files: NormalizedDriveFile[], options?: {
    emptyMessage?: string;
    selectable?: boolean;
}): string;
/**
 * Selected file state
 */
export interface SelectedFile {
    id: string;
    name: string;
    mimeType: string;
    typeName: string;
}
/**
 * Create selected file state from normalized file
 */
export declare function createSelectedFile(file: NormalizedDriveFile): SelectedFile;
//# sourceMappingURL=google-drive-utils.d.ts.map
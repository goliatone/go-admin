/**
 * Document Preview Card Module
 *
 * Provides a lightweight PDF thumbnail preview for the agreement wizard.
 * Shows in steps 1-4 and 6 to improve user orientation before the full
 * placement view in step 5.
 *
 * Features:
 * - Renders page 1 thumbnail using PDF.js
 * - Caches thumbnails by document ID
 * - Handles loading, error, and empty states gracefully
 * - Non-blocking: failures degrade gracefully without blocking step transitions
 */
import type { DocumentPreviewState, DocumentPreviewConfig } from './contracts';
/**
 * Thumbnail cache entry
 */
interface ThumbnailCacheEntry {
    dataUrl: string;
    pageCount: number;
    timestamp: number;
}
/**
 * Get cached thumbnail for a document
 */
export declare function getCachedThumbnail(documentId: string): ThumbnailCacheEntry | null;
/**
 * Clear thumbnail cache (useful for testing or memory management)
 */
export declare function clearThumbnailCache(): void;
/**
 * Document Preview Card Controller
 *
 * Manages the preview card UI state and rendering.
 */
export declare class DocumentPreviewCard {
    private state;
    private config;
    private requestVersion;
    private elements;
    constructor(config?: Partial<DocumentPreviewConfig>);
    /**
     * Initialize the preview card by binding to DOM elements
     */
    init(): void;
    /**
     * Retry loading the document preview
     */
    retry(): void;
    /**
     * Get current state (for testing)
     */
    getState(): DocumentPreviewState;
    /**
     * Update visibility based on current wizard step
     */
    updateVisibility(currentStep: number): void;
    /**
     * Set document and load preview
     */
    setDocument(documentId: string | null, documentTitle?: string | null, pageCount?: number | null): Promise<void>;
    /**
     * Fetch PDF URL from document API
     */
    private fetchDocumentPdfUrl;
    /**
     * Render the preview card based on current state
     */
    private render;
    /**
     * Clear the preview card state
     */
    clear(): void;
}
/**
 * Create and initialize a preview card instance
 */
export declare function createPreviewCard(config?: Partial<DocumentPreviewConfig>): DocumentPreviewCard;
export {};
//# sourceMappingURL=preview-card.d.ts.map
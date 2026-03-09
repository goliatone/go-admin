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
import { PREVIEW_CARD_DEFAULTS, WIZARD_STEP } from './constants';

/**
 * Thumbnail cache entry
 */
interface ThumbnailCacheEntry {
  dataUrl: string;
  pageCount: number;
  timestamp: number;
}

/**
 * In-memory thumbnail cache keyed by document ID
 */
const thumbnailCache = new Map<string, ThumbnailCacheEntry>();

/**
 * Cache TTL in milliseconds (30 minutes)
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * User-friendly error messages for common HTTP status codes
 */
const USER_FRIENDLY_ERRORS: Record<number, { message: string; suggestion: string }> = {
  401: {
    message: 'Unable to access this document',
    suggestion: 'Please sign in again or check your permissions.',
  },
  403: {
    message: 'Access denied',
    suggestion: 'You don\'t have permission to view this document.',
  },
  404: {
    message: 'Document not found',
    suggestion: 'This document may have been moved or deleted.',
  },
  500: {
    message: 'Server error',
    suggestion: 'Please try again in a moment.',
  },
  502: {
    message: 'Service temporarily unavailable',
    suggestion: 'Please try again in a moment.',
  },
  503: {
    message: 'Service temporarily unavailable',
    suggestion: 'Please try again in a moment.',
  },
};

/**
 * Parse error to extract HTTP status code if present
 */
function parseErrorStatusCode(error: string | Error): number | null {
  const errorStr = error instanceof Error ? error.message : error;

  // Match patterns like "response (401)" or "status 401" or just "401"
  const match = errorStr.match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (match) {
    const code = parseInt(match[1] || match[2] || match[3], 10);
    if (code >= 400 && code < 600) {
      return code;
    }
  }
  return null;
}

/**
 * Convert raw error to user-friendly display format
 */
function toUserFriendlyError(error: string | Error): { message: string; suggestion: string; isRetryable: boolean } {
  const errorStr = error instanceof Error ? error.message : error;
  const statusCode = parseErrorStatusCode(errorStr);

  // Check for network/connection errors
  if (errorStr.toLowerCase().includes('network') ||
      errorStr.toLowerCase().includes('failed to fetch') ||
      errorStr.toLowerCase().includes('connection')) {
    return {
      message: 'Connection problem',
      suggestion: 'Please check your internet connection and try again.',
      isRetryable: true,
    };
  }

  // Check for PDF.js specific errors
  if (errorStr.toLowerCase().includes('pdf') && errorStr.toLowerCase().includes('unavailable')) {
    return {
      message: 'Preview not available',
      suggestion: 'The preview feature is temporarily unavailable.',
      isRetryable: false,
    };
  }

  // Map HTTP status codes
  if (statusCode && USER_FRIENDLY_ERRORS[statusCode]) {
    const friendly = USER_FRIENDLY_ERRORS[statusCode];
    return {
      message: friendly.message,
      suggestion: friendly.suggestion,
      isRetryable: statusCode >= 500, // Server errors are retryable
    };
  }

  // Default fallback
  return {
    message: 'Preview unavailable',
    suggestion: 'Unable to load the document preview.',
    isRetryable: true,
  };
}

/**
 * Check if debug mode is enabled
 */
function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).__ADMIN_DEBUG__ === true ||
         (window as any).ADMIN_DEBUG === true ||
         document.body?.dataset?.debug === 'true';
}

/**
 * Check if PDF.js is loaded
 */
function isPdfJsLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    'pdfjsLib' in window &&
    typeof (window as any).pdfjsLib?.getDocument === 'function'
  );
}

/**
 * Ensure PDF.js is preloaded by the page.
 */
async function ensurePdfJsLoaded(): Promise<void> {
  if (isPdfJsLoaded()) return;
  throw new Error('PDF preview library unavailable');
}

/**
 * Get cached thumbnail for a document
 */
export function getCachedThumbnail(documentId: string): ThumbnailCacheEntry | null {
  const entry = thumbnailCache.get(documentId);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    thumbnailCache.delete(documentId);
    return null;
  }

  return entry;
}

/**
 * Store thumbnail in cache
 */
function cacheThumbnail(documentId: string, dataUrl: string, pageCount: number): void {
  thumbnailCache.set(documentId, {
    dataUrl,
    pageCount,
    timestamp: Date.now(),
  });
}

/**
 * Clear thumbnail cache (useful for testing or memory management)
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Render first page of PDF as a thumbnail data URL
 */
async function renderPdfThumbnail(
  pdfUrl: string,
  maxWidth: number = PREVIEW_CARD_DEFAULTS.THUMBNAIL_MAX_WIDTH,
  maxHeight: number = PREVIEW_CARD_DEFAULTS.THUMBNAIL_MAX_HEIGHT
): Promise<{ dataUrl: string; pageCount: number }> {
  await ensurePdfJsLoaded();

  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js not available');
  }

  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
    withCredentials: true,
    disableWorker: true,
  });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  // Get first page
  const page = await pdfDoc.getPage(1);
  const originalViewport = page.getViewport({ scale: 1 });

  // Calculate scale to fit within max dimensions while maintaining aspect ratio
  const scaleX = maxWidth / originalViewport.width;
  const scaleY = maxHeight / originalViewport.height;
  const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

  const viewport = page.getViewport({ scale });

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

  return { dataUrl, pageCount };
}

/**
 * Document Preview Card Controller
 *
 * Manages the preview card UI state and rendering.
 */
export class DocumentPreviewCard {
  private state: DocumentPreviewState;
  private config: DocumentPreviewConfig;
  private requestVersion = 0;
  private elements: {
    container: HTMLElement | null;
    thumbnail: HTMLImageElement | null;
    title: HTMLElement | null;
    pageCount: HTMLElement | null;
    loadingState: HTMLElement | null;
    errorState: HTMLElement | null;
    emptyState: HTMLElement | null;
    contentState: HTMLElement | null;
    errorMessage: HTMLElement | null;
    errorSuggestion: HTMLElement | null;
    errorRetryBtn: HTMLButtonElement | null;
    errorDebugInfo: HTMLElement | null;
  };

  constructor(config: Partial<DocumentPreviewConfig> = {}) {
    this.config = {
      apiBasePath: config.apiBasePath || '',
      basePath: config.basePath || '',
      thumbnailMaxWidth: config.thumbnailMaxWidth || PREVIEW_CARD_DEFAULTS.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: config.thumbnailMaxHeight || PREVIEW_CARD_DEFAULTS.THUMBNAIL_MAX_HEIGHT,
    };

    this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: false,
      error: null,
    };

    this.elements = {
      container: null,
      thumbnail: null,
      title: null,
      pageCount: null,
      loadingState: null,
      errorState: null,
      emptyState: null,
      contentState: null,
      errorMessage: null,
      errorSuggestion: null,
      errorRetryBtn: null,
      errorDebugInfo: null,
    };
  }

  /**
   * Initialize the preview card by binding to DOM elements
   */
  init(): void {
    this.elements.container = document.getElementById('document-preview-card');
    this.elements.thumbnail = document.getElementById('document-preview-thumbnail') as HTMLImageElement;
    this.elements.title = document.getElementById('document-preview-title');
    this.elements.pageCount = document.getElementById('document-preview-page-count');
    this.elements.loadingState = document.getElementById('document-preview-loading');
    this.elements.errorState = document.getElementById('document-preview-error');
    this.elements.emptyState = document.getElementById('document-preview-empty');
    this.elements.contentState = document.getElementById('document-preview-content');
    this.elements.errorMessage = document.getElementById('document-preview-error-message');
    this.elements.errorSuggestion = document.getElementById('document-preview-error-suggestion');
    this.elements.errorRetryBtn = document.getElementById('document-preview-retry-btn') as HTMLButtonElement;
    this.elements.errorDebugInfo = document.getElementById('document-preview-error-debug');

    // Setup retry button handler
    if (this.elements.errorRetryBtn) {
      this.elements.errorRetryBtn.addEventListener('click', () => this.retry());
    }

    this.render();
  }

  /**
   * Retry loading the document preview
   */
  retry(): void {
    if (this.state.documentId) {
      this.setDocument(this.state.documentId, this.state.documentTitle, this.state.pageCount);
    }
  }

  /**
   * Get current state (for testing)
   */
  getState(): DocumentPreviewState {
    return { ...this.state };
  }

  /**
   * Update visibility based on current wizard step
   */
  updateVisibility(currentStep: number): void {
    if (!this.elements.container) return;

    // Show in steps 1-4 and 6, hide in step 5 (full placement view)
    const shouldShow =
      currentStep === WIZARD_STEP.DOCUMENT ||
      currentStep === WIZARD_STEP.DETAILS ||
      currentStep === WIZARD_STEP.PARTICIPANTS ||
      currentStep === WIZARD_STEP.FIELDS ||
      currentStep === WIZARD_STEP.REVIEW;

    this.elements.container.classList.toggle('hidden', !shouldShow);
  }

  /**
   * Set document and load preview
   */
  async setDocument(
    documentId: string | null,
    documentTitle: string | null = null,
    pageCount: number | null = null
  ): Promise<void> {
    const requestVersion = ++this.requestVersion;

    // Clear state if no document
    if (!documentId) {
      this.state = {
        documentId: null,
        documentTitle: null,
        pageCount: null,
        thumbnailUrl: null,
        isLoading: false,
        error: null,
      };
      this.render();
      return;
    }

    // Check cache first
    const cached = getCachedThumbnail(documentId);
    if (cached) {
      this.state = {
        documentId,
        documentTitle,
        pageCount: pageCount ?? cached.pageCount,
        thumbnailUrl: cached.dataUrl,
        isLoading: false,
        error: null,
      };
      this.render();
      return;
    }

    // Set loading state
    this.state = {
      documentId,
      documentTitle,
      pageCount,
      thumbnailUrl: null,
      isLoading: true,
      error: null,
    };
    this.render();

    // Fetch document data and render thumbnail
    try {
      const pdfUrl = await this.fetchDocumentPdfUrl(documentId);
      if (requestVersion !== this.requestVersion) {
        return;
      }
      const { dataUrl, pageCount: fetchedPageCount } = await renderPdfThumbnail(
        pdfUrl,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (requestVersion !== this.requestVersion) {
        return;
      }

      // Cache the result
      cacheThumbnail(documentId, dataUrl, fetchedPageCount);

      this.state = {
        documentId,
        documentTitle,
        pageCount: pageCount ?? fetchedPageCount,
        thumbnailUrl: dataUrl,
        isLoading: false,
        error: null,
      };
    } catch (err) {
      if (requestVersion !== this.requestVersion) {
        return;
      }
      const rawError = err instanceof Error ? err.message : 'Failed to load preview';
      const friendlyError = toUserFriendlyError(rawError);

      // Only log in debug mode to avoid console noise in production
      if (isDebugMode()) {
        console.error('Failed to load document preview:', err);
      }

      this.state = {
        documentId,
        documentTitle,
        pageCount,
        thumbnailUrl: null,
        isLoading: false,
        error: rawError,
        errorMessage: friendlyError.message,
        errorSuggestion: friendlyError.suggestion,
        errorRetryable: friendlyError.isRetryable,
      };
    }

    this.render();
  }

  /**
   * Fetch PDF URL from document API
   */
  private async fetchDocumentPdfUrl(documentId: string): Promise<string> {
    const apiPath = this.config.apiBasePath || `${this.config.basePath}/api`;
    const normalizedApiPath = apiPath.replace(/\/+$/, '');
    const versionedApiPath = /\/v\d+$/i.test(normalizedApiPath)
      ? normalizedApiPath
      : `${normalizedApiPath}/v1`;
    return `${versionedApiPath}/panels/esign_documents/${encodeURIComponent(documentId)}/source/pdf`;
  }

  /**
   * Render the preview card based on current state
   */
  private render(): void {
    const { container, thumbnail, title, pageCount, loadingState, errorState, emptyState, contentState } =
      this.elements;

    if (!container) return;

    // Hide all states
    loadingState?.classList.add('hidden');
    errorState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    contentState?.classList.add('hidden');

    // No document selected - show empty state
    if (!this.state.documentId) {
      emptyState?.classList.remove('hidden');
      return;
    }

    // Loading - show loading state
    if (this.state.isLoading) {
      loadingState?.classList.remove('hidden');
      return;
    }

    // Error - show error state with user-friendly message
    if (this.state.error) {
      errorState?.classList.remove('hidden');

      // Display user-friendly error message
      if (this.elements.errorMessage) {
        this.elements.errorMessage.textContent = this.state.errorMessage || 'Preview unavailable';
      }

      // Display suggestion
      if (this.elements.errorSuggestion) {
        this.elements.errorSuggestion.textContent = this.state.errorSuggestion || '';
        this.elements.errorSuggestion.classList.toggle('hidden', !this.state.errorSuggestion);
      }

      // Show/hide retry button based on whether error is retryable
      if (this.elements.errorRetryBtn) {
        this.elements.errorRetryBtn.classList.toggle('hidden', !this.state.errorRetryable);
      }

      // Show technical details only in debug mode
      if (this.elements.errorDebugInfo) {
        if (isDebugMode()) {
          this.elements.errorDebugInfo.textContent = this.state.error;
          this.elements.errorDebugInfo.classList.remove('hidden');
        } else {
          this.elements.errorDebugInfo.classList.add('hidden');
        }
      }
      return;
    }

    // Success - show content
    contentState?.classList.remove('hidden');

    if (thumbnail && this.state.thumbnailUrl) {
      thumbnail.src = this.state.thumbnailUrl;
      thumbnail.alt = `Preview of ${this.state.documentTitle || 'document'}`;
    }

    if (title) {
      title.textContent = this.state.documentTitle || 'Untitled Document';
    }

    if (pageCount && this.state.pageCount) {
      pageCount.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Clear the preview card state
   */
  clear(): void {
    this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: false,
      error: null,
    };
    this.render();
  }
}

/**
 * Create and initialize a preview card instance
 */
export function createPreviewCard(config: Partial<DocumentPreviewConfig> = {}): DocumentPreviewCard {
  const card = new DocumentPreviewCard(config);
  card.init();
  return card;
}

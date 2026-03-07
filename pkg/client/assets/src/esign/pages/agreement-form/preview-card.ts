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
 * Check if PDF.js is loaded
 */
function isPdfJsLoaded(): boolean {
  return typeof window !== 'undefined' && 'pdfjsLib' in window;
}

/**
 * Load PDF.js library from CDN if not already loaded
 */
async function ensurePdfJsLoaded(): Promise<void> {
  if (isPdfJsLoaded()) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
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

  const loadingTask = pdfjsLib.getDocument(pdfUrl);
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
  private elements: {
    container: HTMLElement | null;
    thumbnail: HTMLImageElement | null;
    title: HTMLElement | null;
    pageCount: HTMLElement | null;
    loadingState: HTMLElement | null;
    errorState: HTMLElement | null;
    emptyState: HTMLElement | null;
    contentState: HTMLElement | null;
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

    this.render();
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
      const { dataUrl, pageCount: fetchedPageCount } = await renderPdfThumbnail(
        pdfUrl,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );

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
      console.error('Failed to load document preview:', err);
      this.state = {
        documentId,
        documentTitle,
        pageCount,
        thumbnailUrl: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load preview',
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

    const response = await fetch(`${versionedApiPath}/panels/esign_documents/${documentId}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to load document (${response.status})`);
    }

    const payload = await response.json();
    const docData =
      payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
        ? payload.data
        : payload;

    const sourceObjectKey = String(docData?.source_object_key || '')
      .trim()
      .replace(/^\/+/, '');
    const sourceAssetUrl = sourceObjectKey
      ? `${this.config.basePath}/assets/${sourceObjectKey
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`
      : '';

    const pdfUrl = String(
      docData?.file_url ||
        docData?.url ||
        docData?.source_url ||
        docData?.download_url ||
        sourceAssetUrl
    ).trim();

    if (!pdfUrl) {
      throw new Error('No PDF URL found');
    }

    return pdfUrl;
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

    // Error - show error state
    if (this.state.error) {
      errorState?.classList.remove('hidden');
      const errorMessage = errorState?.querySelector('#document-preview-error-message');
      if (errorMessage) {
        errorMessage.textContent = this.state.error;
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

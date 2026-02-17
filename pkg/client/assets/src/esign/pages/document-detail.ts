/**
 * E-Sign Document Detail Page Controller
 * Handles lazy loading PDF preview for document detail pages
 */

import { qs, show, hide, onReady } from '../utils/dom-helpers.js';

// PDF.js types (loaded globally from CDN)
declare const pdfjsLib: {
  getDocument: (url: string) => {
    promise: Promise<PDFDocumentProxy>;
  };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
};

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (context: PDFRenderContext) => { promise: Promise<void> };
}

interface PDFViewport {
  width: number;
  height: number;
}

interface PDFRenderContext {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFViewport;
}

export interface DocumentDetailPreviewConfig {
  documentId: string;
  pdfUrl: string;
  pageCount: number;
}

/**
 * Document detail page controller for PDF preview
 */
export class DocumentDetailPreviewController {
  private readonly config: DocumentDetailPreviewConfig;
  private pdfDoc: PDFDocumentProxy | null = null;
  private currentPage = 1;
  private isLoading = false;
  private isLoaded = false;
  private scale = 1.5;

  // Element references
  private readonly elements: {
    loadBtn: HTMLButtonElement | null;
    retryBtn: HTMLButtonElement | null;
    loading: HTMLElement | null;
    spinner: HTMLElement | null;
    error: HTMLElement | null;
    errorMessage: HTMLElement | null;
    viewer: HTMLElement | null;
    canvas: HTMLCanvasElement | null;
    pagination: HTMLElement | null;
    prevBtn: HTMLButtonElement | null;
    nextBtn: HTMLButtonElement | null;
    currentPageEl: HTMLElement | null;
    totalPagesEl: HTMLElement | null;
    status: HTMLElement | null;
  };

  constructor(config: DocumentDetailPreviewConfig) {
    this.config = config;
    this.elements = {
      loadBtn: qs<HTMLButtonElement>('#pdf-load-btn'),
      retryBtn: qs<HTMLButtonElement>('#pdf-retry-btn'),
      loading: qs('#pdf-loading'),
      spinner: qs('#pdf-spinner'),
      error: qs('#pdf-error'),
      errorMessage: qs('#pdf-error-message'),
      viewer: qs('#pdf-viewer'),
      canvas: qs<HTMLCanvasElement>('#pdf-canvas'),
      pagination: qs('#pdf-pagination'),
      prevBtn: qs<HTMLButtonElement>('#pdf-prev-page'),
      nextBtn: qs<HTMLButtonElement>('#pdf-next-page'),
      currentPageEl: qs('#pdf-current-page'),
      totalPagesEl: qs('#pdf-total-pages'),
      status: qs('#pdf-status'),
    };
  }

  /**
   * Initialize the controller
   */
  init(): void {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const { loadBtn, retryBtn, prevBtn, nextBtn } = this.elements;

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadPdf());
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadPdf());
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isLoaded) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.goToPage(this.currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.goToPage(this.currentPage + 1);
      }
    });
  }

  /**
   * Load the PDF document
   */
  async loadPdf(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showSpinner();

    try {
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded');
      }

      this.updateStatus('Loading PDF...');
      const loadingTask = pdfjsLib.getDocument(this.config.pdfUrl);
      this.pdfDoc = await loadingTask.promise;

      // Update total pages
      const totalPages = this.pdfDoc.numPages;
      if (this.elements.totalPagesEl) {
        this.elements.totalPagesEl.textContent = String(totalPages);
      }

      this.isLoaded = true;
      this.showViewer();
      await this.renderPage(1);
      this.updateStatus('');
    } catch (error) {
      console.error('Failed to load PDF:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to load document');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render a specific page
   */
  private async renderPage(pageNumber: number): Promise<void> {
    if (!this.pdfDoc || !this.elements.canvas) return;

    const totalPages = this.pdfDoc.numPages;
    if (pageNumber < 1 || pageNumber > totalPages) return;

    this.currentPage = pageNumber;
    this.updateStatus(`Rendering page ${pageNumber}...`);

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });

      const canvas = this.elements.canvas;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Update pagination state
      this.updatePaginationState();
      this.updateStatus('');
    } catch (error) {
      console.error('Failed to render page:', error);
      this.updateStatus('Failed to render page');
    }
  }

  /**
   * Navigate to a specific page
   */
  goToPage(pageNumber: number): void {
    if (!this.pdfDoc) return;

    const totalPages = this.pdfDoc.numPages;
    if (pageNumber < 1 || pageNumber > totalPages) return;

    this.renderPage(pageNumber);
  }

  /**
   * Update pagination button states
   */
  private updatePaginationState(): void {
    const { prevBtn, nextBtn, currentPageEl, pagination } = this.elements;
    const totalPages = this.pdfDoc?.numPages || 1;

    if (pagination) {
      pagination.classList.remove('hidden');
    }

    if (currentPageEl) {
      currentPageEl.textContent = String(this.currentPage);
    }

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  /**
   * Update status text
   */
  private updateStatus(message: string): void {
    if (this.elements.status) {
      this.elements.status.textContent = message;
    }
  }

  /**
   * Show the loading spinner
   */
  private showSpinner(): void {
    const { loading, spinner, error, viewer } = this.elements;
    if (loading) hide(loading);
    if (spinner) show(spinner);
    if (error) hide(error);
    if (viewer) hide(viewer);
  }

  /**
   * Show the PDF viewer
   */
  private showViewer(): void {
    const { loading, spinner, error, viewer } = this.elements;
    if (loading) hide(loading);
    if (spinner) hide(spinner);
    if (error) hide(error);
    if (viewer) show(viewer);
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    const { loading, spinner, error, errorMessage, viewer } = this.elements;
    if (loading) hide(loading);
    if (spinner) hide(spinner);
    if (error) show(error);
    if (viewer) hide(viewer);
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }
}

/**
 * Initialize document detail preview
 */
export function initDocumentDetailPreview(
  config: DocumentDetailPreviewConfig
): DocumentDetailPreviewController {
  const controller = new DocumentDetailPreviewController(config);
  controller.init();
  return controller;
}

/**
 * Bootstrap document detail preview from page config
 */
export function bootstrapDocumentDetailPreview(config: {
  documentId: string;
  pdfUrl: string;
  pageCount?: number;
}): void {
  const previewConfig: DocumentDetailPreviewConfig = {
    documentId: config.documentId,
    pdfUrl: config.pdfUrl,
    pageCount: config.pageCount || 1,
  };

  const controller = new DocumentDetailPreviewController(previewConfig);
  onReady(() => controller.init());

  // Export for debugging
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignDocumentDetailController =
      controller;
  }
}

// Auto-init if page marker is present
if (typeof document !== 'undefined') {
  onReady(() => {
    const container = document.querySelector('[data-esign-page="document-detail"]');
    if (container instanceof HTMLElement) {
      const documentId = container.dataset.documentId || '';
      const pdfUrl = container.dataset.pdfUrl || '';
      const pageCount = parseInt(container.dataset.pageCount || '1', 10);

      if (documentId && pdfUrl) {
        const controller = new DocumentDetailPreviewController({
          documentId,
          pdfUrl,
          pageCount,
        });
        controller.init();
      }
    }
  });
}

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

import { qs, qsa, show, hide, onReady, announce } from '../utils/dom-helpers.js';
import { debounce, throttle } from '../utils/async-helpers.js';

// =============================================================================
// Types
// =============================================================================

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

interface TelemetryEvent {
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// =============================================================================
// Telemetry Module
// =============================================================================

class TelemetryManager {
  private events: TelemetryEvent[] = [];
  private enabled: boolean;
  private sessionId: string;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private apiBasePath: string;
  private token: string;

  constructor(config: { enabled: boolean; apiBasePath: string; token: string }) {
    this.enabled = config.enabled;
    this.apiBasePath = config.apiBasePath;
    this.token = config.token;
    this.sessionId = this.generateSessionId();

    if (this.enabled) {
      this.startAutoFlush();
      this.setupBeforeUnload();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  track(type: string, data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });

    // Auto-flush if buffer is large
    if (this.events.length >= 50) {
      this.flush();
    }
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  async flush(sync = false): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    const payload = {
      session_id: this.sessionId,
      events: eventsToSend,
    };

    try {
      if (sync && navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.apiBasePath}/telemetry`,
          JSON.stringify(payload)
        );
      } else {
        await fetch(`${this.apiBasePath}/telemetry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.debug('Telemetry flush failed:', error);
      // Re-add events on failure
      this.events = [...eventsToSend, ...this.events];
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(true);
  }
}

// =============================================================================
// PDF Viewer Module
// =============================================================================

class PDFViewerController {
  private config: SignerReviewConfig;
  private pdfDoc: unknown = null;
  private currentPage = 1;
  private scale = 1.0;
  private minScale = 0.5;
  private maxScale = 3.0;
  private onPageChange: (page: number) => void;
  private onScaleChange: (scale: number) => void;

  // Elements
  private container: HTMLElement | null;
  private canvas: HTMLCanvasElement | null;
  private pageIndicator: HTMLElement | null;

  constructor(
    config: SignerReviewConfig,
    container: HTMLElement | null,
    onPageChange: (page: number) => void,
    onScaleChange: (scale: number) => void
  ) {
    this.config = config;
    this.container = container;
    this.canvas = qs<HTMLCanvasElement>('#pdf-canvas', container ?? undefined);
    this.pageIndicator = qs('#page-indicator', container ?? undefined);
    this.onPageChange = onPageChange;
    this.onScaleChange = onScaleChange;
  }

  async loadDocument(): Promise<void> {
    if (!this.config.documentUrl) {
      console.error('No document URL provided');
      return;
    }

    try {
      // PDF.js loading would happen here
      // This is a placeholder for the actual implementation
      console.debug('Loading PDF from:', this.config.documentUrl);

      // The actual PDF.js implementation is in the inline script
      // This controller provides the foundation for future migration
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.config.pageCount) return;
    this.currentPage = page;
    this.renderCurrentPage();
    this.onPageChange(page);
  }

  nextPage(): void {
    if (this.currentPage < this.config.pageCount) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  zoomIn(): void {
    const newScale = Math.min(this.scale * 1.2, this.maxScale);
    this.setScale(newScale);
  }

  zoomOut(): void {
    const newScale = Math.max(this.scale / 1.2, this.minScale);
    this.setScale(newScale);
  }

  fitToWidth(): void {
    if (!this.container) return;
    // Calculate scale to fit width
    const containerWidth = this.container.clientWidth;
    // This would need the actual page width from PDF.js
    // Placeholder implementation
    this.setScale(1.0);
  }

  private setScale(scale: number): void {
    this.scale = scale;
    this.renderCurrentPage();
    this.onScaleChange(scale);
  }

  private renderCurrentPage(): void {
    // Rendering logic would go here
    // This is handled by the inline script currently
    if (this.pageIndicator) {
      this.pageIndicator.textContent = `Page ${this.currentPage} of ${this.config.pageCount}`;
    }
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getScale(): number {
    return this.scale;
  }

  destroy(): void {
    // Cleanup
    this.pdfDoc = null;
  }
}

// =============================================================================
// Field Overlay Controller
// =============================================================================

class FieldOverlayController {
  private config: SignerReviewConfig;
  private fields: Map<string, SignerField> = new Map();
  private currentFieldIndex = 0;
  private overlayContainer: HTMLElement | null;
  private onFieldActivate: (field: SignerField) => void;
  private onFieldComplete: (field: SignerField, value: string) => void;

  constructor(
    config: SignerReviewConfig,
    overlayContainer: HTMLElement | null,
    onFieldActivate: (field: SignerField) => void,
    onFieldComplete: (field: SignerField, value: string) => void
  ) {
    this.config = config;
    this.overlayContainer = overlayContainer;
    this.onFieldActivate = onFieldActivate;
    this.onFieldComplete = onFieldComplete;

    // Initialize fields map
    for (const field of config.fields) {
      this.fields.set(field.id, field);
    }
  }

  renderOverlays(page: number, scale: number): void {
    if (!this.overlayContainer) return;

    // Clear existing overlays for this page
    const existingOverlays = this.overlayContainer.querySelectorAll(
      `.field-overlay[data-page="${page}"]`
    );
    existingOverlays.forEach((el) => el.remove());

    // Render fields for current page
    const pageFields = this.config.fields.filter((f) => f.page === page);

    for (const field of pageFields) {
      const overlay = this.createFieldOverlay(field, scale);
      this.overlayContainer.appendChild(overlay);
    }
  }

  private createFieldOverlay(field: SignerField, scale: number): HTMLElement {
    const overlay = document.createElement('button');
    overlay.className = `field-overlay field-overlay-${field.type} ${field.completed ? 'completed' : ''}`;
    overlay.type = 'button';
    overlay.dataset.fieldId = field.id;
    overlay.dataset.page = String(field.page);
    overlay.setAttribute('role', 'button');
    overlay.setAttribute(
      'aria-label',
      `${field.type} field${field.required ? ' (required)' : ''}`
    );

    // Position overlay
    overlay.style.left = `${field.x * scale}px`;
    overlay.style.top = `${field.y * scale}px`;
    overlay.style.width = `${field.width * scale}px`;
    overlay.style.height = `${field.height * scale}px`;

    overlay.addEventListener('click', () => {
      this.onFieldActivate(field);
    });

    return overlay;
  }

  getNextIncompleteField(): SignerField | null {
    const incomplete = this.config.fields.filter(
      (f) => !f.completed && f.recipientId === this.config.recipientId
    );
    return incomplete[0] || null;
  }

  getAllFields(): SignerField[] {
    return this.config.fields;
  }

  getFieldsForPage(page: number): SignerField[] {
    return this.config.fields.filter((f) => f.page === page);
  }

  getCompletionStatus(): { completed: number; total: number; required: number; requiredCompleted: number } {
    const myFields = this.config.fields.filter(
      (f) => f.recipientId === this.config.recipientId
    );
    const required = myFields.filter((f) => f.required);

    return {
      completed: myFields.filter((f) => f.completed).length,
      total: myFields.length,
      required: required.length,
      requiredCompleted: required.filter((f) => f.completed).length,
    };
  }

  markFieldComplete(fieldId: string, value: string): void {
    const field = this.fields.get(fieldId);
    if (field) {
      field.value = value;
      field.completed = true;
      this.onFieldComplete(field, value);
    }
  }

  destroy(): void {
    if (this.overlayContainer) {
      const overlays = this.overlayContainer.querySelectorAll('.field-overlay');
      overlays.forEach((el) => el.remove());
    }
  }
}

// =============================================================================
// SignerReviewController
// =============================================================================

export class SignerReviewController {
  private readonly config: SignerReviewConfig;
  private telemetry: TelemetryManager;
  private pdfViewer: PDFViewerController | null = null;
  private fieldOverlay: FieldOverlayController | null = null;

  private readonly elements: {
    pdfContainer: HTMLElement | null;
    overlayContainer: HTMLElement | null;
    fieldList: HTMLElement | null;
    progressBar: HTMLElement | null;
    progressText: HTMLElement | null;
    consentModal: HTMLElement | null;
    declineModal: HTMLElement | null;
    signatureModal: HTMLElement | null;
    submitBtn: HTMLElement | null;
    declineBtn: HTMLElement | null;
    prevPageBtn: HTMLElement | null;
    nextPageBtn: HTMLElement | null;
    zoomInBtn: HTMLElement | null;
    zoomOutBtn: HTMLElement | null;
    announcements: HTMLElement | null;
  };

  constructor(config: SignerReviewConfig) {
    this.config = config;
    this.telemetry = new TelemetryManager({
      enabled: config.telemetryEnabled,
      apiBasePath: config.apiBasePath,
      token: config.token,
    });

    this.elements = {
      pdfContainer: qs('#pdf-container'),
      overlayContainer: qs('#field-overlays'),
      fieldList: qs('#field-list'),
      progressBar: qs('#progress-bar'),
      progressText: qs('#progress-text'),
      consentModal: qs('#consent-modal'),
      declineModal: qs('#decline-modal'),
      signatureModal: qs('#signature-modal'),
      submitBtn: qs('#submit-btn'),
      declineBtn: qs('#decline-btn'),
      prevPageBtn: qs('#prev-page-btn'),
      nextPageBtn: qs('#next-page-btn'),
      zoomInBtn: qs('#zoom-in-btn'),
      zoomOutBtn: qs('#zoom-out-btn'),
      announcements: qs('#announcements'),
    };
  }

  async init(): Promise<void> {
    this.telemetry.track('page_load', {
      agreement_id: this.config.agreementId,
      recipient_id: this.config.recipientId,
    });

    // Initialize PDF viewer
    this.pdfViewer = new PDFViewerController(
      this.config,
      this.elements.pdfContainer,
      (page) => this.handlePageChange(page),
      (scale) => this.handleScaleChange(scale)
    );

    // Initialize field overlay controller
    this.fieldOverlay = new FieldOverlayController(
      this.config,
      this.elements.overlayContainer,
      (field) => this.handleFieldActivate(field),
      (field, value) => this.handleFieldComplete(field, value)
    );

    this.setupEventListeners();

    // Show consent modal if needed
    if (!this.config.hasConsented) {
      this.showConsentModal();
    } else {
      await this.pdfViewer.loadDocument();
      this.updateProgress();
    }
  }

  private setupEventListeners(): void {
    // Navigation
    if (this.elements.prevPageBtn) {
      this.elements.prevPageBtn.addEventListener('click', () => {
        this.pdfViewer?.prevPage();
      });
    }

    if (this.elements.nextPageBtn) {
      this.elements.nextPageBtn.addEventListener('click', () => {
        this.pdfViewer?.nextPage();
      });
    }

    // Zoom
    if (this.elements.zoomInBtn) {
      this.elements.zoomInBtn.addEventListener('click', () => {
        this.pdfViewer?.zoomIn();
      });
    }

    if (this.elements.zoomOutBtn) {
      this.elements.zoomOutBtn.addEventListener('click', () => {
        this.pdfViewer?.zoomOut();
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Arrow keys for page navigation
    if (e.key === 'ArrowLeft' && !this.isInInputField(e.target)) {
      this.pdfViewer?.prevPage();
    } else if (e.key === 'ArrowRight' && !this.isInInputField(e.target)) {
      this.pdfViewer?.nextPage();
    }

    // Escape to close modals
    if (e.key === 'Escape') {
      this.hideAllModals();
    }
  }

  private isInInputField(target: EventTarget | null): boolean {
    if (!target) return false;
    const el = target as HTMLElement;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable
    );
  }

  private handlePageChange(page: number): void {
    this.telemetry.track('page_view', { page });

    // Re-render field overlays for new page
    if (this.fieldOverlay && this.pdfViewer) {
      this.fieldOverlay.renderOverlays(page, this.pdfViewer.getScale());
    }

    announce(`Page ${page} of ${this.config.pageCount}`);
  }

  private handleScaleChange(scale: number): void {
    // Re-render field overlays at new scale
    if (this.fieldOverlay && this.pdfViewer) {
      this.fieldOverlay.renderOverlays(
        this.pdfViewer.getCurrentPage(),
        scale
      );
    }
  }

  private handleFieldActivate(field: SignerField): void {
    this.telemetry.track('field_activate', {
      field_id: field.id,
      field_type: field.type,
    });

    // Show appropriate input modal based on field type
    switch (field.type) {
      case 'signature':
      case 'initials':
        this.showSignatureModal(field);
        break;
      case 'date':
        this.showDatePicker(field);
        break;
      case 'text':
        this.showTextInput(field);
        break;
      case 'checkbox':
        this.toggleCheckbox(field);
        break;
    }
  }

  private handleFieldComplete(field: SignerField, value: string): void {
    this.telemetry.track('field_complete', {
      field_id: field.id,
      field_type: field.type,
    });

    this.updateProgress();

    // Check if all required fields are complete
    const status = this.fieldOverlay?.getCompletionStatus();
    if (status && status.requiredCompleted === status.required) {
      this.enableSubmit();
    }
  }

  private updateProgress(): void {
    const status = this.fieldOverlay?.getCompletionStatus();
    if (!status) return;

    const percentage = status.total > 0
      ? Math.round((status.completed / status.total) * 100)
      : 0;

    if (this.elements.progressBar) {
      this.elements.progressBar.style.width = `${percentage}%`;
    }

    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${status.completed} of ${status.total} fields completed`;
    }
  }

  private enableSubmit(): void {
    if (this.elements.submitBtn) {
      this.elements.submitBtn.removeAttribute('disabled');
      this.elements.submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    announce('All required fields completed. You can now submit.');
  }

  private showConsentModal(): void {
    if (this.elements.consentModal) {
      show(this.elements.consentModal);
    }
  }

  private showSignatureModal(field: SignerField): void {
    if (this.elements.signatureModal) {
      show(this.elements.signatureModal);
      // Configure modal for field type
    }
  }

  private showDatePicker(field: SignerField): void {
    // Date picker implementation
  }

  private showTextInput(field: SignerField): void {
    // Text input implementation
  }

  private toggleCheckbox(field: SignerField): void {
    const newValue = field.value === 'true' ? 'false' : 'true';
    this.fieldOverlay?.markFieldComplete(field.id, newValue);
  }

  private hideAllModals(): void {
    if (this.elements.consentModal) hide(this.elements.consentModal);
    if (this.elements.declineModal) hide(this.elements.declineModal);
    if (this.elements.signatureModal) hide(this.elements.signatureModal);
  }

  destroy(): void {
    this.telemetry.destroy();
    this.pdfViewer?.destroy();
    this.fieldOverlay?.destroy();
  }
}

// =============================================================================
// Initialization
// =============================================================================

export function initSignerReview(config: SignerReviewConfig): SignerReviewController {
  const controller = new SignerReviewController(config);
  onReady(() => controller.init());
  return controller;
}

export function bootstrapSignerReview(config: {
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
}): void {
  const pageConfig: SignerReviewConfig = {
    token: config.token,
    apiBasePath: config.apiBasePath || '/api/v1/esign/signing',
    signerBasePath: config.signerBasePath || '/esign/sign',
    agreementId: config.agreementId,
    recipientId: config.recipientId,
    documentUrl: config.documentUrl,
    pageCount: config.pageCount || 1,
    hasConsented: config.hasConsented || false,
    fields: config.fields || [],
    flowMode: config.flowMode || 'unified',
    telemetryEnabled: config.telemetryEnabled !== false,
    viewer: {
      coordinateSpace: config.viewer?.coordinateSpace || 'pdf',
      contractVersion: config.viewer?.contractVersion || '1.0',
      unit: config.viewer?.unit || 'pt',
      origin: config.viewer?.origin || 'top-left',
      yAxisDirection: config.viewer?.yAxisDirection || 'down',
      pages: config.viewer?.pages || [],
    },
    signerState: config.signerState || 'active',
    recipientStage: config.recipientStage || 1,
    activeStage: config.activeStage || 1,
    activeRecipientIds: config.activeRecipientIds || [],
    waitingForRecipientIds: config.waitingForRecipientIds || [],
  };

  const controller = new SignerReviewController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignSignerReviewController =
      controller;
  }
}

// Auto-init if page marker is present
if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector(
      '[data-esign-page="signer-review"], [data-esign-page="signer.review"]'
    );
    if (pageEl) {
      // Config would be parsed from inline script or config element
      // The actual initialization is handled by the inline script currently
      console.debug('Signer review page detected - module loaded');
    }
  });
}

/**
 * E-Sign Document Form Page Controller
 * Handles PDF upload and Google Drive import for document ingestion
 */

import { qs, qsa, show, hide, onReady, announce } from '../utils/dom-helpers.js';
import { debounce } from '../utils/async-helpers.js';
import { formatFileSize, formatDateTime } from '../utils/formatters.js';

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

interface NormalizedDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  parents: string[];
  owners: Array<{ emailAddress?: string }>;
}

interface FolderPathItem {
  id: string;
  name: string;
}

interface ConnectedGoogleAccount {
  account_id: string;
  email?: string;
  status?: string;
  is_default?: boolean;
}

// Constants
const GOOGLE_ACCOUNT_STORAGE_KEY = 'esign.google.account_id';
const MAX_FILE_SIZE_DEFAULT = 25 * 1024 * 1024; // 25 MB
const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 60;

const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document';
const MIME_PDF = 'application/pdf';
const MIME_FOLDER = 'application/vnd.google-apps.folder';

const IMPORTABLE_TYPES = [MIME_GOOGLE_DOC, MIME_PDF];

/**
 * Document form page controller
 * Manages PDF upload and Google Drive import functionality
 */
export class DocumentFormController {
  private readonly config: DocumentFormConfig;
  private readonly apiBase: string;
  private readonly maxFileSize: number;
  private currentAccountId: string;

  // Upload state
  private isSubmitting = false;

  // Source state
  private currentSource: 'upload' | 'google' = 'upload';

  // Google Drive state
  private currentFiles: NormalizedDriveFile[] = [];
  private nextPageToken: string | null = null;
  private currentFolderPath: FolderPathItem[] = [{ id: 'root', name: 'My Drive' }];
  private selectedFile: NormalizedDriveFile | null = null;
  private searchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollAttempts = 0;
  private currentImportRunId: string | null = null;
  private connectedAccounts: ConnectedGoogleAccount[] = [];

  // Element references
  private readonly elements: {
    // Upload panel
    form: HTMLFormElement | null;
    fileInput: HTMLInputElement | null;
    uploadZone: HTMLElement | null;
    placeholder: HTMLElement | null;
    preview: HTMLElement | null;
    fileName: HTMLElement | null;
    fileSize: HTMLElement | null;
    clearBtn: HTMLElement | null;
    errorEl: HTMLElement | null;
    submitBtn: HTMLButtonElement | null;
    titleInput: HTMLInputElement | null;
    sourceObjectKeyInput: HTMLInputElement | null;
    // Source tabs
    sourceTabs: HTMLElement[];
    sourcePanels: HTMLElement[];
    announcements: HTMLElement | null;
    // Google Drive panel
    searchInput: HTMLInputElement | null;
    clearSearchBtn: HTMLElement | null;
    fileList: HTMLElement | null;
    loadingState: HTMLElement | null;
    breadcrumb: HTMLElement | null;
    listTitle: HTMLElement | null;
    resultCount: HTMLElement | null;
    pagination: HTMLElement | null;
    loadMoreBtn: HTMLElement | null;
    refreshBtn: HTMLElement | null;
    driveAccountDropdown: HTMLSelectElement | null;
    accountScopeHelp: HTMLElement | null;
    connectGoogleLink: HTMLAnchorElement | null;
    // Selection panel
    noSelection: HTMLElement | null;
    filePreview: HTMLElement | null;
    previewIcon: HTMLElement | null;
    previewTitle: HTMLElement | null;
    previewType: HTMLElement | null;
    importTypeInfo: HTMLElement | null;
    importTypeLabel: HTMLElement | null;
    importTypeDesc: HTMLElement | null;
    snapshotWarning: HTMLElement | null;
    importDocumentTitle: HTMLInputElement | null;
    importBtn: HTMLButtonElement | null;
    importBtnText: HTMLElement | null;
    clearSelectionBtn: HTMLElement | null;
    // Import status
    importStatus: HTMLElement | null;
    importStatusQueued: HTMLElement | null;
    importStatusSuccess: HTMLElement | null;
    importStatusFailed: HTMLElement | null;
    importStatusMessage: HTMLElement | null;
    importErrorMessage: HTMLElement | null;
    importRetryBtn: HTMLElement | null;
    importReconnectLink: HTMLAnchorElement | null;
  };

  constructor(config: DocumentFormConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api/v1`;
    this.maxFileSize = config.maxFileSize || MAX_FILE_SIZE_DEFAULT;
    this.currentAccountId = this.resolveInitialAccountId();

    this.elements = {
      // Upload panel
      form: qs<HTMLFormElement>('#document-upload-form'),
      fileInput: qs<HTMLInputElement>('#pdf_file'),
      uploadZone: qs('#pdf-upload-zone'),
      placeholder: qs('#upload-placeholder'),
      preview: qs('#upload-preview'),
      fileName: qs('#selected-file-name'),
      fileSize: qs('#selected-file-size'),
      clearBtn: qs('#clear-file-btn'),
      errorEl: qs('#upload-error'),
      submitBtn: qs<HTMLButtonElement>('#submit-btn'),
      titleInput: qs<HTMLInputElement>('#title'),
      sourceObjectKeyInput: qs<HTMLInputElement>('#source_object_key'),
      // Source tabs
      sourceTabs: qsa<HTMLElement>('.source-tab'),
      sourcePanels: qsa<HTMLElement>('.source-panel'),
      announcements: qs('#doc-announcements'),
      // Google Drive panel
      searchInput: qs<HTMLInputElement>('#drive-search'),
      clearSearchBtn: qs('#clear-search-btn'),
      fileList: qs('#file-list'),
      loadingState: qs('#loading-state'),
      breadcrumb: qs('#breadcrumb'),
      listTitle: qs('#list-title'),
      resultCount: qs('#result-count'),
      pagination: qs('#pagination'),
      loadMoreBtn: qs('#load-more-btn'),
      refreshBtn: qs('#refresh-btn'),
      driveAccountDropdown: qs<HTMLSelectElement>('#drive-account-dropdown'),
      accountScopeHelp: qs('#account-scope-help'),
      connectGoogleLink: qs<HTMLAnchorElement>('#connect-google-link'),
      // Selection panel
      noSelection: qs('#no-selection'),
      filePreview: qs('#file-preview'),
      previewIcon: qs('#preview-icon'),
      previewTitle: qs('#preview-title'),
      previewType: qs('#preview-type'),
      importTypeInfo: qs('#import-type-info'),
      importTypeLabel: qs('#import-type-label'),
      importTypeDesc: qs('#import-type-desc'),
      snapshotWarning: qs('#snapshot-warning'),
      importDocumentTitle: qs<HTMLInputElement>('#import-document-title'),
      importBtn: qs<HTMLButtonElement>('#import-btn'),
      importBtnText: qs('#import-btn-text'),
      clearSelectionBtn: qs('#clear-selection-btn'),
      // Import status
      importStatus: qs('#import-status'),
      importStatusQueued: qs('#import-status-queued'),
      importStatusSuccess: qs('#import-status-success'),
      importStatusFailed: qs('#import-status-failed'),
      importStatusMessage: qs('#import-status-message'),
      importErrorMessage: qs('#import-error-message'),
      importRetryBtn: qs('#import-retry-btn'),
      importReconnectLink: qs<HTMLAnchorElement>('#import-reconnect-link'),
    };
  }

  /**
   * Initialize the document form page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    this.updateAccountScopeUI();
    if (this.config.googleEnabled && this.config.googleConnected) {
      await this.loadConnectedAccounts();
    }
    this.initializeSourceFromURL();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    this.setupSourceTabListeners();
    this.setupUploadListeners();
    if (this.config.googleEnabled && this.config.googleConnected) {
      this.setupGoogleDriveListeners();
    }
  }

  /**
   * Setup source tab switching listeners
   */
  private setupSourceTabListeners(): void {
    this.elements.sourceTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        if (!(tab as HTMLButtonElement).disabled) {
          const source = tab.dataset.source as 'upload' | 'google';
          this.switchSource(source);
        }
      });
    });
  }

  /**
   * Setup PDF upload listeners
   */
  private setupUploadListeners(): void {
    const {
      form,
      fileInput,
      uploadZone,
      clearBtn,
      titleInput,
    } = this.elements;

    // File input change
    if (fileInput) {
      fileInput.addEventListener('change', () => this.handleFileSelect());
    }

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearFileSelection();
      });
    }

    // Title input
    if (titleInput) {
      titleInput.addEventListener('input', () => this.updateSubmitState());
    }

    // Drag and drop
    if (uploadZone) {
      ['dragenter', 'dragover'].forEach((eventName) => {
        uploadZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.add('border-blue-400', 'bg-blue-50');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        uploadZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.remove('border-blue-400', 'bg-blue-50');
        });
      });

      uploadZone.addEventListener('drop', (e) => {
        const dt = (e as DragEvent).dataTransfer;
        if (dt?.files?.length && this.elements.fileInput) {
          this.elements.fileInput.files = dt.files;
          this.handleFileSelect();
        }
      });

      // Keyboard accessibility
      uploadZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.elements.fileInput?.click();
        }
      });
    }

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }
  }

  /**
   * Setup Google Drive listeners
   */
  private setupGoogleDriveListeners(): void {
    const {
      searchInput,
      clearSearchBtn,
      loadMoreBtn,
      refreshBtn,
      clearSelectionBtn,
      importBtn,
      importRetryBtn,
      driveAccountDropdown,
    } = this.elements;

    // Search
    if (searchInput) {
      const debouncedSearch = debounce(() => this.handleSearch(), 300);
      searchInput.addEventListener('input', debouncedSearch);
    }

    // Clear search
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => this.clearSearch());
    }

    // Load more
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMoreFiles());
    }

    // Refresh
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshFiles());
    }

    // Account selector
    if (driveAccountDropdown) {
      driveAccountDropdown.addEventListener('change', () => {
        this.setCurrentAccountId(driveAccountDropdown.value, this.currentSource === 'google');
      });
    }

    // Clear selection
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => this.clearFileSelection());
    }

    // Import button
    if (importBtn) {
      importBtn.addEventListener('click', () => this.startImport());
    }

    // Retry import
    if (importRetryBtn) {
      importRetryBtn.addEventListener('click', () => {
        if (this.selectedFile) {
          this.startImport();
        } else {
          this.clearDriveSelection();
        }
      });
    }
  }

  // ============================================================
  // Account ID Management
  // ============================================================

  /**
   * Resolve initial account ID from query, template, or localStorage
   */
  private resolveInitialAccountId(): string {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = this.normalizeAccountId(params.get('account_id'));
    if (fromQuery) return fromQuery;

    const fromTemplate = this.normalizeAccountId(this.config.googleAccountId);
    if (fromTemplate) return fromTemplate;

    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(GOOGLE_ACCOUNT_STORAGE_KEY)
      );
    } catch {
      return '';
    }
  }

  /**
   * Normalize account ID
   */
  private normalizeAccountId(value: string | null | undefined): string {
    return (value || '').trim();
  }

  /**
   * Set current account ID and optionally refresh Drive files
   */
  private setCurrentAccountId(value: string, refreshFiles = false): void {
    const normalized = this.normalizeAccountId(value);
    if (normalized === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }

    this.currentAccountId = normalized;
    this.updateAccountScopeUI();

    if (refreshFiles && this.config.googleEnabled && this.config.googleConnected) {
      this.currentFolderPath = [{ id: 'root', name: 'My Drive' }];
      this.searchQuery = '';
      const { searchInput, clearSearchBtn } = this.elements;
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) hide(clearSearchBtn);
      this.updateBreadcrumb();
      this.loadFiles({ folderId: 'root' });
    }
  }

  /**
   * Load connected accounts for account selector
   */
  private async loadConnectedAccounts(): Promise<void> {
    const { driveAccountDropdown } = this.elements;
    if (!driveAccountDropdown) {
      return;
    }

    try {
      const url = new URL(`${this.apiBase}/esign/integrations/google/accounts`, window.location.origin);
      url.searchParams.set('user_id', this.config.userId || '');

      const response = await fetch(url.toString(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        this.connectedAccounts = [];
        this.renderConnectedAccountsDropdown();
        return;
      }

      const data = await response.json();
      this.connectedAccounts = Array.isArray(data.accounts)
        ? (data.accounts as ConnectedGoogleAccount[])
        : [];
      this.renderConnectedAccountsDropdown();
    } catch {
      this.connectedAccounts = [];
      this.renderConnectedAccountsDropdown();
    }
  }

  /**
   * Render account selector options
   */
  private renderConnectedAccountsDropdown(): void {
    const { driveAccountDropdown } = this.elements;
    if (!driveAccountDropdown) {
      return;
    }

    driveAccountDropdown.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default account';
    if (!this.currentAccountId) {
      defaultOption.selected = true;
    }
    driveAccountDropdown.appendChild(defaultOption);

    const seen = new Set<string>(['']);
    for (const account of this.connectedAccounts) {
      const accountID = this.normalizeAccountId(account?.account_id);
      if (seen.has(accountID)) {
        continue;
      }
      seen.add(accountID);

      const option = document.createElement('option');
      option.value = accountID;
      const email = String(account?.email || '').trim();
      const status = String(account?.status || '').trim();
      const label = email || accountID || 'Default account';
      option.textContent = status && status !== 'connected' ? `${label} (${status})` : label;
      if (accountID === this.currentAccountId) {
        option.selected = true;
      }
      driveAccountDropdown.appendChild(option);
    }

    if (this.currentAccountId && !seen.has(this.currentAccountId)) {
      const customOption = document.createElement('option');
      customOption.value = this.currentAccountId;
      customOption.textContent = `${this.currentAccountId} (custom)`;
      customOption.selected = true;
      driveAccountDropdown.appendChild(customOption);
    }
  }

  /**
   * Sync account ID to URL and localStorage
   */
  private syncScopedAccountState(): void {
    const url = new URL(window.location.href);
    if (this.currentAccountId) {
      url.searchParams.set('account_id', this.currentAccountId);
    } else {
      url.searchParams.delete('account_id');
    }
    window.history.replaceState({}, '', url.toString());

    try {
      if (this.currentAccountId) {
        window.localStorage.setItem(GOOGLE_ACCOUNT_STORAGE_KEY, this.currentAccountId);
      } else {
        window.localStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  }

  /**
   * Apply account ID to a path
   */
  private applyAccountIdToPath(pathOrURL: string): string {
    const parsed = new URL(pathOrURL, window.location.origin);
    if (this.currentAccountId) {
      parsed.searchParams.set('account_id', this.currentAccountId);
    } else {
      parsed.searchParams.delete('account_id');
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  /**
   * Update account scope UI elements
   */
  private updateAccountScopeUI(): void {
    this.syncScopedAccountState();

    const { accountScopeHelp, connectGoogleLink, driveAccountDropdown } = this.elements;

    if (accountScopeHelp) {
      if (this.currentAccountId) {
        accountScopeHelp.textContent = `Account scope: ${this.currentAccountId}`;
        show(accountScopeHelp);
      } else {
        hide(accountScopeHelp);
      }
    }

    if (connectGoogleLink) {
      const baseHref =
        connectGoogleLink.dataset.baseHref || connectGoogleLink.getAttribute('href');
      if (baseHref) {
        connectGoogleLink.setAttribute('href', this.applyAccountIdToPath(baseHref));
      }
    }

    if (driveAccountDropdown) {
      const hasOption = Array.from(driveAccountDropdown.options).some(
        (option) => this.normalizeAccountId(option.value) === this.currentAccountId
      );
      if (!hasOption) {
        this.renderConnectedAccountsDropdown();
      }
      if (driveAccountDropdown.value !== this.currentAccountId) {
        driveAccountDropdown.value = this.currentAccountId;
      }
    }
  }

  /**
   * Build scoped API URL
   */
  private buildScopedAPIURL(path: string): URL {
    const url = new URL(`${this.apiBase}${path}`, window.location.origin);
    url.searchParams.set('user_id', this.config.userId || '');
    if (this.currentAccountId) {
      url.searchParams.set('account_id', this.currentAccountId);
    }
    return url;
  }

  // ============================================================
  // Source Tab Switching
  // ============================================================

  /**
   * Switch between upload and Google Drive source
   */
  private switchSource(source: 'upload' | 'google'): void {
    this.currentSource = source;

    // Update tabs
    this.elements.sourceTabs.forEach((tab) => {
      const isActive = tab.dataset.source === source;
      tab.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        tab.classList.add('border-blue-500', 'text-blue-600');
        tab.classList.remove(
          'border-transparent',
          'text-gray-500',
          'hover:text-gray-700',
          'hover:border-gray-300'
        );
      } else {
        tab.classList.remove('border-blue-500', 'text-blue-600');
        tab.classList.add(
          'border-transparent',
          'text-gray-500',
          'hover:text-gray-700',
          'hover:border-gray-300'
        );
      }
    });

    // Update panels
    this.elements.sourcePanels.forEach((panel) => {
      const panelSource = panel.id.replace('panel-', '');
      if (panelSource === source) {
        show(panel);
      } else {
        hide(panel);
      }
    });

    // Update URL
    const url = new URL(window.location.href);
    if (source === 'google') {
      url.searchParams.set('source', 'google');
    } else {
      url.searchParams.delete('source');
    }
    window.history.replaceState({}, '', url.toString());

    // Load Google Drive files if switching to Google and connected
    if (
      source === 'google' &&
      this.config.googleEnabled &&
      this.config.googleConnected
    ) {
      this.loadFiles({ folderId: 'root' });
    }

    announce(
      `Switched to ${source === 'google' ? 'Google Drive import' : 'PDF upload'}`
    );
  }

  /**
   * Initialize source from URL parameters
   */
  private initializeSourceFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const importRunId = params.get('import_run_id');

    if (source === 'google' && this.config.googleEnabled) {
      this.switchSource('google');
      // Resume import if import_run_id is present
      if (importRunId && this.config.googleConnected) {
        this.currentImportRunId = importRunId;
        this.resumeImportPolling(importRunId);
      }
    } else {
      this.switchSource('upload');
    }
  }

  // ============================================================
  // PDF Upload
  // ============================================================

  /**
   * Handle file selection
   */
  private handleFileSelect(): void {
    const { fileInput, titleInput, sourceObjectKeyInput } = this.elements;
    const file = fileInput?.files?.[0];

    if (file && this.validateFile(file)) {
      this.showPreview(file);
      if (sourceObjectKeyInput) {
        sourceObjectKeyInput.value = '';
      }

      // Auto-fill title from filename if empty
      if (titleInput && !titleInput.value.trim()) {
        const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
        titleInput.value = nameWithoutExt;
      }
    } else {
      if (fileInput) {
        fileInput.value = '';
      }
      this.clearPreview();
      if (sourceObjectKeyInput) {
        sourceObjectKeyInput.value = '';
      }
    }
    this.updateSubmitState();
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): boolean {
    this.clearError();

    if (!file) return false;

    // Check file type
    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      this.showError('Please select a PDF file.');
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      this.showError(
        `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(this.maxFileSize)}.`
      );
      return false;
    }

    // Check for empty file
    if (file.size === 0) {
      this.showError('The selected file appears to be empty.');
      return false;
    }

    return true;
  }

  /**
   * Show file preview
   */
  private showPreview(file: File): void {
    const { placeholder, preview, fileName, fileSize, uploadZone } = this.elements;

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    if (placeholder) hide(placeholder);
    if (preview) show(preview);
    if (uploadZone) {
      uploadZone.classList.remove('border-gray-300');
      uploadZone.classList.add('border-green-400', 'bg-green-50');
    }
  }

  /**
   * Clear file preview
   */
  private clearPreview(): void {
    const { placeholder, preview, uploadZone } = this.elements;

    if (placeholder) show(placeholder);
    if (preview) hide(preview);
    if (uploadZone) {
      uploadZone.classList.add('border-gray-300');
      uploadZone.classList.remove('border-green-400', 'bg-green-50');
    }
  }

  /**
   * Clear file selection
   */
  private clearFileSelection(): void {
    const { fileInput, sourceObjectKeyInput } = this.elements;
    if (fileInput) fileInput.value = '';
    if (sourceObjectKeyInput) sourceObjectKeyInput.value = '';
    this.clearPreview();
    this.clearError();
    this.updateSubmitState();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const { errorEl } = this.elements;
    if (errorEl) {
      errorEl.textContent = message;
      show(errorEl);
    }
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    const { errorEl } = this.elements;
    if (errorEl) {
      errorEl.textContent = '';
      hide(errorEl);
    }
  }

  /**
   * Update submit button state
   */
  private updateSubmitState(): void {
    const { fileInput, titleInput, submitBtn } = this.elements;
    const hasFile = fileInput?.files && fileInput.files.length > 0;
    const hasTitle = titleInput?.value.trim().length ?? 0 > 0;
    const isEnabled = hasFile && hasTitle;

    if (submitBtn) {
      submitBtn.disabled = !isEnabled;
      submitBtn.setAttribute('aria-disabled', String(!isEnabled));
    }
  }

  /**
   * Set submitting state
   */
  private setSubmittingState(submitting: boolean): void {
    const { submitBtn } = this.elements;
    if (!submitBtn) return;

    submitBtn.disabled = submitting;
    submitBtn.setAttribute('aria-disabled', String(submitting));

    if (submitting) {
      submitBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading...
      `;
    } else {
      submitBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        Upload Document
      `;
    }
  }

  /**
   * Upload source PDF to API
   */
  private async uploadSourcePDF(file: File): Promise<string> {
    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get('tenant_id');
    const orgId = params.get('org_id');

    const uploadURL = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    if (tenantId) uploadURL.searchParams.set('tenant_id', tenantId);
    if (orgId) uploadURL.searchParams.set('org_id', orgId);

    const payload = new FormData();
    payload.append('file', file);

    const response = await fetch(uploadURL.toString(), {
      method: 'POST',
      body: payload,
      credentials: 'same-origin',
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        body?.error?.message || body?.message || 'Upload failed. Please try again.';
      throw new Error(message);
    }

    const objectKey = body?.object_key ? String(body.object_key).trim() : '';
    if (!objectKey) {
      throw new Error('Upload failed: missing source object key.');
    }

    return objectKey;
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isSubmitting) return;

    const { fileInput, form, sourceObjectKeyInput } = this.elements;
    const file = fileInput?.files?.[0];

    if (!file || !this.validateFile(file)) {
      return;
    }

    this.clearError();
    this.isSubmitting = true;
    this.setSubmittingState(true);

    try {
      const objectKey = await this.uploadSourcePDF(file);
      if (sourceObjectKeyInput) {
        sourceObjectKeyInput.value = objectKey;
      }
      form?.submit();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      this.showError(message);
      this.setSubmittingState(false);
      this.isSubmitting = false;
      this.updateSubmitState();
    }
  }

  // ============================================================
  // Google Drive Browser
  // ============================================================

  /**
   * Normalize drive file from API response
   */
  private normalizeDriveFile(file: Record<string, unknown>): NormalizedDriveFile {
    if (!file || typeof file !== 'object') {
      return {
        id: '',
        name: '',
        mimeType: '',
        modifiedTime: '',
        webViewLink: '',
        parents: [],
        owners: [],
      };
    }

    const id = String(file.id || file.ID || '').trim();
    const name = String(file.name || file.Name || '').trim();
    const mimeType = String(file.mimeType || file.MimeType || '').trim();
    const modifiedTime = String(file.modifiedTime || file.ModifiedTime || '').trim();
    const webViewLink = String(
      file.webViewLink || file.webViewURL || file.WebViewURL || ''
    ).trim();
    const parentID = String(file.parentId || file.ParentID || '').trim();
    const ownerEmail = String(file.ownerEmail || file.OwnerEmail || '').trim();
    const parents = Array.isArray(file.parents)
      ? (file.parents as string[])
      : parentID
        ? [parentID]
        : [];
    const owners = Array.isArray(file.owners)
      ? (file.owners as Array<{ emailAddress?: string }>)
      : ownerEmail
        ? [{ emailAddress: ownerEmail }]
        : [];

    return {
      id,
      name,
      mimeType,
      modifiedTime,
      webViewLink,
      parents,
      owners,
    };
  }

  /**
   * Check if file is a Google Doc
   */
  private isGoogleDoc(file: NormalizedDriveFile): boolean {
    return file.mimeType === MIME_GOOGLE_DOC;
  }

  /**
   * Check if file is a PDF
   */
  private isPDF(file: NormalizedDriveFile): boolean {
    return file.mimeType === MIME_PDF;
  }

  /**
   * Check if file is a folder
   */
  private isFolder(file: NormalizedDriveFile): boolean {
    return file.mimeType === MIME_FOLDER;
  }

  /**
   * Check if file is importable
   */
  private isImportable(file: NormalizedDriveFile): boolean {
    return IMPORTABLE_TYPES.includes(file.mimeType);
  }

  /**
   * Get file type name
   */
  private getFileTypeName(mimeType: string): string {
    const normalized = String(mimeType || '').trim().toLowerCase();
    if (normalized === MIME_GOOGLE_DOC) return 'Google Document';
    if (normalized === MIME_PDF) return 'PDF Document';
    if (normalized === 'application/vnd.google-apps.spreadsheet')
      return 'Google Spreadsheet';
    if (normalized === 'application/vnd.google-apps.presentation')
      return 'Google Slides';
    if (normalized === MIME_FOLDER) return 'Folder';
    return 'File';
  }

  /**
   * Get file icon HTML
   */
  private getFileIcon(file: NormalizedDriveFile): {
    html: string;
    bg: string;
    text: string;
  } {
    const colors = {
      doc: { bg: 'bg-blue-100', text: 'text-blue-600' },
      pdf: { bg: 'bg-red-100', text: 'text-red-600' },
      folder: { bg: 'bg-gray-100', text: 'text-gray-600' },
      default: { bg: 'bg-gray-100', text: 'text-gray-400' },
    };

    let type: keyof typeof colors = 'default';
    if (this.isFolder(file)) type = 'folder';
    else if (this.isGoogleDoc(file)) type = 'doc';
    else if (this.isPDF(file)) type = 'pdf';

    const color = colors[type];

    const icons = {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder:
        '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default:
        '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>',
    };

    return { html: icons[type], ...color };
  }

  /**
   * Get import type info for display
   */
  private getImportTypeInfo(file: NormalizedDriveFile): {
    label: string;
    desc: string;
    bgClass: string;
    textClass: string;
    showSnapshot: boolean;
  } | null {
    if (this.isGoogleDoc(file)) {
      return {
        label: 'Google Doc \u2192 PDF Export',
        desc: 'Will be exported as PDF snapshot',
        bgClass: 'bg-blue-50 border-blue-100',
        textClass: 'text-blue-700',
        showSnapshot: true,
      };
    } else if (this.isPDF(file)) {
      return {
        label: 'Direct PDF Import',
        desc: 'Will be imported as-is',
        bgClass: 'bg-green-50 border-green-100',
        textClass: 'text-green-700',
        showSnapshot: false,
      };
    }
    return null;
  }

  /**
   * Load files from Google Drive
   */
  async loadFiles(options: {
    folderId?: string;
    query?: string;
    pageToken?: string;
    append?: boolean;
  } = {}): Promise<void> {
    const { folderId, query, pageToken, append } = options;
    const { fileList } = this.elements;

    if (!append && fileList) {
      fileList.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `;
    }

    try {
      let url: URL;
      if (query) {
        url = this.buildScopedAPIURL('/esign/google-drive/search');
        url.searchParams.set('q', query);
        url.searchParams.set('page_size', '20');
        if (pageToken) url.searchParams.set('page_token', pageToken);
      } else {
        url = this.buildScopedAPIURL('/esign/google-drive/browse');
        url.searchParams.set('page_size', '20');
        if (folderId && folderId !== 'root') {
          url.searchParams.set('folder_id', folderId);
        }
        if (pageToken) url.searchParams.set('page_token', pageToken);
      }

      const response = await fetch(url.toString(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load files');
      }

      const files = Array.isArray(data.files)
        ? data.files.map((f: Record<string, unknown>) => this.normalizeDriveFile(f))
        : [];

      this.nextPageToken = data.next_page_token || null;

      if (append) {
        this.currentFiles = [...this.currentFiles, ...files];
      } else {
        this.currentFiles = files;
      }

      this.renderFiles(append);

      // Update result count
      const { resultCount, listTitle } = this.elements;
      if (query && resultCount) {
        resultCount.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? 's' : ''})`;
        if (listTitle) listTitle.textContent = 'Search Results';
      } else {
        if (resultCount) resultCount.textContent = '';
        if (listTitle) {
          listTitle.textContent =
            this.currentFolderPath[this.currentFolderPath.length - 1].name;
        }
      }

      // Show/hide pagination
      const { pagination } = this.elements;
      if (pagination) {
        if (this.nextPageToken) {
          show(pagination);
        } else {
          hide(pagination);
        }
      }

      announce(`Loaded ${files.length} files`);
    } catch (error) {
      console.error('Error loading files:', error);
      if (fileList) {
        fileList.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `;
      }
      announce(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render files in the file list
   */
  private renderFiles(append = false): void {
    const { fileList } = this.elements;
    if (!fileList) return;

    if (this.currentFiles.length === 0) {
      fileList.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-500">No files found</p>
        </div>
      `;
      return;
    }

    const html = this.currentFiles
      .map((file, index) => {
        const icon = this.getFileIcon(file);
        const importable = this.isImportable(file);
        const folder = this.isFolder(file);
        const selected = this.selectedFile && this.selectedFile.id === file.id;
        const isDisabled = !importable && !folder;

        return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
          role="option"
          aria-selected="${selected}"
          data-file-index="${index}"
          ${isDisabled ? 'disabled title="Only Google Docs and PDFs can be imported"' : ''}
        >
          <div class="w-10 h-10 rounded-lg ${icon.bg} flex items-center justify-center flex-shrink-0 ${icon.text}">
            ${icon.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(file.name || 'Untitled')}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(file.mimeType)}
              ${file.modifiedTime ? ' \u2022 ' + formatDateTime(file.modifiedTime) : ''}
              ${isDisabled ? ' \u2022 Not importable' : ''}
            </p>
          </div>
          ${
            folder
              ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          `
              : ''
          }
        </button>
      `;
      })
      .join('');

    if (append) {
      fileList.insertAdjacentHTML('beforeend', html);
    } else {
      fileList.innerHTML = html;
    }

    // Attach click handlers
    fileList.querySelectorAll('.file-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt((item as HTMLElement).dataset.fileIndex || '0', 10);
        const file = this.currentFiles[index];
        if (this.isFolder(file)) {
          this.navigateToFolder(file);
        } else if (this.isImportable(file)) {
          this.selectFile(file);
        }
      });
    });
  }

  /**
   * Navigate to folder
   */
  private navigateToFolder(folder: NormalizedDriveFile): void {
    this.currentFolderPath.push({ id: folder.id, name: folder.name });
    this.updateBreadcrumb();
    this.searchQuery = '';
    const { searchInput, clearSearchBtn } = this.elements;
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) hide(clearSearchBtn);
    this.loadFiles({ folderId: folder.id });
  }

  /**
   * Update breadcrumb navigation
   */
  private updateBreadcrumb(): void {
    const { breadcrumb } = this.elements;
    if (!breadcrumb) return;

    if (this.currentFolderPath.length <= 1) {
      hide(breadcrumb);
      return;
    }

    show(breadcrumb);
    const ol = breadcrumb.querySelector('ol');
    if (ol) {
      ol.innerHTML = this.currentFolderPath
        .map((folder, index) => {
          const isLast = index === this.currentFolderPath.length - 1;
          return `
          <li class="flex items-center">
            ${index > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ''}
            <button type="button" data-folder-index="${index}" class="breadcrumb-item ${isLast ? 'text-gray-900 font-medium cursor-default' : 'text-blue-600 hover:text-blue-800 hover:underline'}">
              ${this.escapeHtml(folder.name)}
            </button>
          </li>
        `;
        })
        .join('');

      ol.querySelectorAll('.breadcrumb-item').forEach((item) => {
        item.addEventListener('click', () => {
          const index = parseInt((item as HTMLElement).dataset.folderIndex || '0', 10);
          this.currentFolderPath = this.currentFolderPath.slice(0, index + 1);
          this.updateBreadcrumb();
          const folder = this.currentFolderPath[this.currentFolderPath.length - 1];
          this.loadFiles({ folderId: folder.id });
        });
      });
    }
  }

  /**
   * Select a file
   */
  private selectFile(file: NormalizedDriveFile): void {
    this.selectedFile = file;
    const icon = this.getFileIcon(file);
    const typeInfo = this.getImportTypeInfo(file);

    // Update selection visual
    const { fileList } = this.elements;
    if (fileList) {
      fileList.querySelectorAll('.file-item').forEach((item) => {
        const index = parseInt((item as HTMLElement).dataset.fileIndex || '0', 10);
        if (this.currentFiles[index].id === file.id) {
          item.classList.add('bg-blue-50', 'border-l-2', 'border-l-blue-500');
          item.setAttribute('aria-selected', 'true');
        } else {
          item.classList.remove('bg-blue-50', 'border-l-2', 'border-l-blue-500');
          item.setAttribute('aria-selected', 'false');
        }
      });
    }

    // Show preview
    const {
      noSelection,
      filePreview,
      importStatus,
      previewIcon,
      previewTitle,
      previewType,
      importTypeInfo,
      importTypeLabel,
      importTypeDesc,
      snapshotWarning,
      importDocumentTitle,
    } = this.elements;

    if (noSelection) hide(noSelection);
    if (filePreview) show(filePreview);
    if (importStatus) hide(importStatus);

    if (previewIcon) {
      previewIcon.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${icon.bg} ${icon.text}`;
      previewIcon.innerHTML = icon.html.replace('w-5 h-5', 'w-6 h-6');
    }
    if (previewTitle) previewTitle.textContent = file.name || 'Untitled';
    if (previewType) previewType.textContent = this.getFileTypeName(file.mimeType);

    // Update import type info
    if (typeInfo && importTypeInfo) {
      importTypeInfo.className = `p-3 rounded-lg border ${typeInfo.bgClass}`;
      if (importTypeLabel) {
        importTypeLabel.textContent = typeInfo.label;
        importTypeLabel.className = `text-xs font-medium ${typeInfo.textClass}`;
      }
      if (importTypeDesc) {
        importTypeDesc.textContent = typeInfo.desc;
        importTypeDesc.className = `text-xs mt-1 ${typeInfo.textClass}`;
      }
      if (snapshotWarning) {
        if (typeInfo.showSnapshot) {
          show(snapshotWarning);
        } else {
          hide(snapshotWarning);
        }
      }
    }

    // Pre-fill document title
    if (importDocumentTitle) {
      importDocumentTitle.value = file.name || '';
    }

    announce(`Selected: ${file.name}`);
  }

  /**
   * Clear drive selection
   */
  private clearDriveSelection(): void {
    this.selectedFile = null;
    const { noSelection, filePreview, importStatus, fileList } = this.elements;

    if (noSelection) show(noSelection);
    if (filePreview) hide(filePreview);
    if (importStatus) hide(importStatus);

    if (fileList) {
      fileList.querySelectorAll('.file-item').forEach((item) => {
        item.classList.remove('bg-blue-50', 'border-l-2', 'border-l-blue-500');
        item.setAttribute('aria-selected', 'false');
      });
    }
  }

  /**
   * Handle search input
   */
  private handleSearch(): void {
    const { searchInput, clearSearchBtn } = this.elements;
    if (!searchInput) return;

    const query = searchInput.value.trim();

    if (query) {
      if (clearSearchBtn) show(clearSearchBtn);
      this.searchQuery = query;
      this.loadFiles({ query });
    } else {
      if (clearSearchBtn) hide(clearSearchBtn);
      this.searchQuery = '';
      const folder = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: folder.id });
    }
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    const { searchInput, clearSearchBtn } = this.elements;
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) hide(clearSearchBtn);
    this.searchQuery = '';
    const folder = this.currentFolderPath[this.currentFolderPath.length - 1];
    this.loadFiles({ folderId: folder.id });
  }

  /**
   * Load more files
   */
  private loadMoreFiles(): void {
    if (this.nextPageToken) {
      const folder = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({
        folderId: this.searchQuery ? undefined : folder.id,
        query: this.searchQuery || undefined,
        pageToken: this.nextPageToken,
        append: true,
      });
    }
  }

  /**
   * Refresh files
   */
  private refreshFiles(): void {
    if (this.searchQuery) {
      this.loadFiles({ query: this.searchQuery });
    } else {
      const folder = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: folder.id });
    }
  }

  // ============================================================
  // Async Import with Polling
  // ============================================================

  /**
   * Show import status panel
   */
  private showImportStatus(status: 'queued' | 'running' | 'succeeded' | 'failed'): void {
    const {
      noSelection,
      filePreview,
      importStatus,
      importStatusQueued,
      importStatusSuccess,
      importStatusFailed,
    } = this.elements;

    if (noSelection) hide(noSelection);
    if (filePreview) hide(filePreview);
    if (importStatus) show(importStatus);

    if (importStatusQueued) hide(importStatusQueued);
    if (importStatusSuccess) hide(importStatusSuccess);
    if (importStatusFailed) hide(importStatusFailed);

    switch (status) {
      case 'queued':
      case 'running':
        if (importStatusQueued) show(importStatusQueued);
        break;
      case 'succeeded':
        if (importStatusSuccess) show(importStatusSuccess);
        break;
      case 'failed':
        if (importStatusFailed) show(importStatusFailed);
        break;
    }
  }

  /**
   * Update import status message
   */
  private updateImportStatusMessage(message: string): void {
    const { importStatusMessage } = this.elements;
    if (importStatusMessage) {
      importStatusMessage.textContent = message;
    }
  }

  /**
   * Show import error
   */
  private showImportError(message: string, errorCode: string): void {
    this.showImportStatus('failed');
    const { importErrorMessage, importReconnectLink } = this.elements;

    if (importErrorMessage) {
      importErrorMessage.textContent = message;
    }

    // Show reconnect link for auth errors
    if (importReconnectLink) {
      if (
        errorCode === 'GOOGLE_ACCESS_REVOKED' ||
        errorCode === 'GOOGLE_SCOPE_VIOLATION'
      ) {
        const integrationsPath =
          this.config.routes.integrations || '/admin/esign/integrations/google';
        importReconnectLink.href = this.applyAccountIdToPath(integrationsPath);
        show(importReconnectLink);
      } else {
        hide(importReconnectLink);
      }
    }
  }

  /**
   * Start import process
   */
  private async startImport(): Promise<void> {
    const { importDocumentTitle, importBtn, importBtnText, importReconnectLink } =
      this.elements;

    if (!this.selectedFile || !importDocumentTitle) return;

    const documentTitle = importDocumentTitle.value.trim();
    if (!documentTitle) {
      importDocumentTitle.focus();
      return;
    }

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.pollAttempts = 0;

    // Disable button
    if (importBtn) importBtn.disabled = true;
    if (importBtnText) importBtnText.textContent = 'Starting...';
    if (importReconnectLink) hide(importReconnectLink);

    this.showImportStatus('queued');
    this.updateImportStatusMessage('Submitting import request...');

    try {
      const pendingURL = new URL(window.location.href);
      pendingURL.searchParams.delete('import_run_id');
      window.history.replaceState({}, '', pendingURL.toString());

      const response = await fetch(
        this.buildScopedAPIURL('/esign/google-drive/imports').toString(),
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            google_file_id: this.selectedFile.id,
            account_id: this.currentAccountId || undefined,
            document_title: documentTitle,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorCode = data.error?.code || '';
        const message = data.error?.message || 'Failed to start import';
        throw { message, code: errorCode };
      }

      this.currentImportRunId = data.import_run_id;
      this.pollAttempts = 0;

      // Update URL with import_run_id for resume on refresh
      const url = new URL(window.location.href);
      if (this.currentImportRunId) {
        url.searchParams.set('import_run_id', this.currentImportRunId);
      }
      window.history.replaceState({}, '', url.toString());

      this.updateImportStatusMessage('Import queued...');
      this.startPolling();
    } catch (error) {
      console.error('Import error:', error);
      const err = error as { message?: string; code?: string };
      this.showImportError(err.message || 'Failed to start import', err.code || '');
      if (importBtn) importBtn.disabled = false;
      if (importBtnText) importBtnText.textContent = 'Import Document';
    }
  }

  /**
   * Start polling for import status
   */
  private startPolling(): void {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), POLL_INTERVAL);
  }

  /**
   * Poll import status
   */
  private async pollImportStatus(): Promise<void> {
    if (!this.currentImportRunId) return;
    this.pollTimeout = null;

    this.pollAttempts++;

    if (this.pollAttempts > MAX_POLL_ATTEMPTS) {
      this.showImportError(
        'Import is taking too long. Please check the documents list.',
        ''
      );
      return;
    }

    try {
      const statusURL = this.buildScopedAPIURL(
        `/esign/google-drive/imports/${encodeURIComponent(this.currentImportRunId)}`
      ).toString();

      const response = await fetch(statusURL, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to check import status');
      }

      const status = data.status;

      switch (status) {
        case 'queued':
          this.updateImportStatusMessage('Waiting in queue...');
          this.startPolling();
          break;
        case 'running':
          this.updateImportStatusMessage('Importing document...');
          this.startPolling();
          break;
        case 'succeeded':
          this.showImportStatus('succeeded');
          announce('Import complete');
          // Redirect to created agreement when available; otherwise document
          setTimeout(() => {
            if (data.agreement?.id && this.config.routes.agreements) {
              window.location.href = `${this.config.routes.agreements}/${encodeURIComponent(data.agreement.id)}`;
            } else if (data.document?.id) {
              window.location.href = `${this.config.routes.index}/${encodeURIComponent(data.document.id)}`;
            } else {
              window.location.href = this.config.routes.index;
            }
          }, 1500);
          break;
        case 'failed': {
          const errorCode = data.error?.code || '';
          const message = data.error?.message || 'Import failed';
          this.showImportError(message, errorCode);
          announce('Import failed');
          break;
        }
        default:
          this.startPolling();
      }
    } catch (error) {
      console.error('Poll error:', error);
      // Continue polling on transient errors
      if (this.pollAttempts < MAX_POLL_ATTEMPTS) {
        this.startPolling();
      } else {
        this.showImportError('Unable to check import status', '');
      }
    }
  }

  /**
   * Resume import polling from URL parameter
   */
  private resumeImportPolling(importRunId: string): void {
    this.currentImportRunId = importRunId;
    this.pollAttempts = 0;
    this.showImportStatus('queued');
    this.updateImportStatusMessage('Resuming import status...');
    this.pollImportStatus();
  }

  // ============================================================
  // Utility
  // ============================================================

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Initialize document form page from config
 */
export function initDocumentForm(config: DocumentFormConfig): DocumentFormController {
  const controller = new DocumentFormController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap document form page from template context
 */
export function bootstrapDocumentForm(config: {
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
}): void {
  const pageConfig: DocumentFormConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api/v1`,
    userId: config.userId,
    googleEnabled: config.googleEnabled !== false,
    googleConnected: config.googleConnected !== false,
    googleAccountId: config.googleAccountId,
    maxFileSize: config.maxFileSize,
    routes: config.routes,
  };

  const controller = new DocumentFormController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignDocumentFormController =
      controller;
  }
}

function coerceDocumentFormConfig(
  raw: Record<string, unknown>
): DocumentFormConfig | null {
  const basePath = String(raw.basePath || raw.base_path || '').trim();
  const routes =
    raw.routes && typeof raw.routes === 'object'
      ? (raw.routes as Record<string, unknown>)
      : {};
  const features =
    raw.features && typeof raw.features === 'object'
      ? (raw.features as Record<string, unknown>)
      : {};
  const context =
    raw.context && typeof raw.context === 'object'
      ? (raw.context as Record<string, unknown>)
      : {};
  const indexRoute = String(routes.index || '').trim();
  if (!basePath && !indexRoute) {
    return null;
  }
  return {
    basePath: basePath || '/admin',
    apiBasePath: String(raw.apiBasePath || raw.api_base_path || '').trim() || undefined,
    userId: String(raw.userId || raw.user_id || context.user_id || '').trim(),
    googleEnabled: Boolean(raw.googleEnabled ?? features.google_enabled),
    googleConnected: Boolean(raw.googleConnected ?? features.google_connected),
    googleAccountId: String(
      raw.googleAccountId || raw.google_account_id || context.google_account_id || ''
    ).trim(),
    maxFileSize:
      typeof raw.maxFileSize === 'number'
        ? raw.maxFileSize
        : typeof raw.max_file_size === 'number'
          ? raw.max_file_size
          : undefined,
    routes: {
      index: indexRoute,
      create: String(routes.create || '').trim() || undefined,
      agreements: String(routes.agreements || '').trim() || undefined,
      integrations: String(routes.integrations || '').trim() || undefined,
    },
  };
}

// Auto-init if page marker is present
if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector(
      '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
    );
    if (pageEl) {
      const configScript = document.getElementById('esign-page-config');
      if (configScript) {
        try {
          const rawConfig = JSON.parse(
            configScript.textContent || '{}'
          ) as Record<string, unknown>;
          const config = coerceDocumentFormConfig(rawConfig);
          if (config) {
            const controller = new DocumentFormController(config);
            controller.init();
          }
        } catch (e) {
          console.warn('Failed to parse document form page config:', e);
        }
      }
    }
  });
}

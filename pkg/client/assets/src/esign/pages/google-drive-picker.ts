/**
 * E-Sign Google Drive Picker Page Controller
 * Handles Google Drive file browsing, selection, and import
 */

import type { ESignPageConfig, GoogleDriveFile } from '../types.js';
import { qs, qsa, show, hide, onReady, announce, on, setLoading } from '../utils/dom-helpers.js';
import { debounce } from '../utils/async-helpers.js';
import { formatDateTime } from '../utils/formatters.js';

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

interface FolderPathItem {
  id: string;
  name: string;
}

interface NormalizedDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  parents: string[];
  owners: Array<{ emailAddress?: string }>;
  size?: number;
  iconLink?: string;
  thumbnailLink?: string;
}

const GOOGLE_ACCOUNT_STORAGE_KEY = 'esign.google.account_id';

const MIME_TYPE_ICONS: Record<string, string> = {
  'application/vnd.google-apps.folder': 'folder',
  'application/vnd.google-apps.document': 'doc',
  'application/vnd.google-apps.spreadsheet': 'sheet',
  'application/vnd.google-apps.presentation': 'slide',
  'application/pdf': 'pdf',
  default: 'file',
};

const IMPORTABLE_TYPES = [
  'application/vnd.google-apps.document',
  'application/pdf',
];

/**
 * Google Drive Picker page controller
 * Manages file browsing, search, selection, and import
 */
export class GoogleDrivePickerController {
  private readonly config: GoogleDrivePickerConfig;
  private readonly apiBase: string;
  private currentAccountId: string;

  // State
  private currentFiles: NormalizedDriveFile[] = [];
  private nextPageToken: string | null = null;
  private currentFolderPath: FolderPathItem[] = [{ id: 'root', name: 'My Drive' }];
  private selectedFile: NormalizedDriveFile | null = null;
  private searchQuery = '';
  private isListView = true;
  private isLoading = false;

  // Elements
  private readonly elements: {
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
    announcements: HTMLElement | null;
    accountScopeHelp: HTMLElement | null;
    connectGoogleLink: HTMLAnchorElement | null;
    // Selection panel
    noSelection: HTMLElement | null;
    filePreview: HTMLElement | null;
    previewIcon: HTMLElement | null;
    previewTitle: HTMLElement | null;
    previewType: HTMLElement | null;
    previewFileId: HTMLElement | null;
    previewOwner: HTMLElement | null;
    previewLocation: HTMLElement | null;
    previewModified: HTMLElement | null;
    importBtn: HTMLElement | null;
    openInGoogleBtn: HTMLAnchorElement | null;
    clearSelectionBtn: HTMLElement | null;
    // Import modal
    importModal: HTMLElement | null;
    importForm: HTMLFormElement | null;
    importGoogleFileId: HTMLInputElement | null;
    importDocumentTitle: HTMLInputElement | null;
    importAgreementTitle: HTMLInputElement | null;
    importCancelBtn: HTMLElement | null;
    importConfirmBtn: HTMLElement | null;
    importSpinner: HTMLElement | null;
    importBtnText: HTMLElement | null;
    // View toggle
    viewListBtn: HTMLElement | null;
    viewGridBtn: HTMLElement | null;
  };

  constructor(config: GoogleDrivePickerConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;
    this.currentAccountId = this.resolveInitialAccountId();

    this.elements = {
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
      announcements: qs('#drive-announcements'),
      accountScopeHelp: qs('#account-scope-help'),
      connectGoogleLink: qs<HTMLAnchorElement>('#connect-google-link'),
      noSelection: qs('#no-selection'),
      filePreview: qs('#file-preview'),
      previewIcon: qs('#preview-icon'),
      previewTitle: qs('#preview-title'),
      previewType: qs('#preview-type'),
      previewFileId: qs('#preview-file-id'),
      previewOwner: qs('#preview-owner'),
      previewLocation: qs('#preview-location'),
      previewModified: qs('#preview-modified'),
      importBtn: qs('#import-btn'),
      openInGoogleBtn: qs<HTMLAnchorElement>('#open-in-google-btn'),
      clearSelectionBtn: qs('#clear-selection-btn'),
      importModal: qs('#import-modal'),
      importForm: qs<HTMLFormElement>('#import-form'),
      importGoogleFileId: qs<HTMLInputElement>('#import-google-file-id'),
      importDocumentTitle: qs<HTMLInputElement>('#import-document-title'),
      importAgreementTitle: qs<HTMLInputElement>('#import-agreement-title'),
      importCancelBtn: qs('#import-cancel-btn'),
      importConfirmBtn: qs('#import-confirm-btn'),
      importSpinner: qs('#import-spinner'),
      importBtnText: qs('#import-btn-text'),
      viewListBtn: qs('#view-list-btn'),
      viewGridBtn: qs('#view-grid-btn'),
    };
  }

  /**
   * Initialize the drive picker page
   */
  async init(): Promise<void> {
    if (!this.config.googleConnected) {
      return; // Nothing to initialize if not connected
    }

    this.setupEventListeners();
    this.updateScopedUI();
    await this.loadFiles();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    const {
      searchInput,
      clearSearchBtn,
      refreshBtn,
      loadMoreBtn,
      importBtn,
      clearSelectionBtn,
      importCancelBtn,
      importConfirmBtn,
      importForm,
      importModal,
      viewListBtn,
      viewGridBtn,
    } = this.elements;

    // Search input with debounce
    if (searchInput) {
      const debouncedSearch = debounce(() => this.handleSearch(), 300);
      searchInput.addEventListener('input', debouncedSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSearch();
        }
      });
    }

    // Clear search
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => this.clearSearch());
    }

    // Refresh
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    // Load more
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMore());
    }

    // Import button
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportModal());
    }

    // Clear selection
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => this.clearSelection());
    }

    // Import modal
    if (importCancelBtn) {
      importCancelBtn.addEventListener('click', () => this.hideImportModal());
    }

    if (importConfirmBtn && importForm) {
      importForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleImport();
      });
    }

    // Close modal on backdrop click
    if (importModal) {
      importModal.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === importModal || target.getAttribute('aria-hidden') === 'true') {
          this.hideImportModal();
        }
      });
    }

    // View toggle
    if (viewListBtn) {
      viewListBtn.addEventListener('click', () => this.setViewMode('list'));
    }
    if (viewGridBtn) {
      viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (importModal && !importModal.classList.contains('hidden')) {
          this.hideImportModal();
        }
      }
    });

    // File list click delegation
    const { fileList } = this.elements;
    if (fileList) {
      fileList.addEventListener('click', (e) => this.handleFileListClick(e));
    }
  }

  /**
   * Resolve initial account ID from various sources
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
   * Update UI elements with account scope
   */
  private updateScopedUI(): void {
    this.syncScopedURLState();

    const { accountScopeHelp, connectGoogleLink } = this.elements;

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
  }

  /**
   * Sync account ID to URL and localStorage
   */
  private syncScopedURLState(): void {
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
   * Build scoped API URL
   */
  private buildScopedAPIURL(path: string): string {
    const url = new URL(`${this.apiBase}${path}`, window.location.origin);
    url.searchParams.set('user_id', this.config.userId || '');
    if (this.currentAccountId) {
      url.searchParams.set('account_id', this.currentAccountId);
    }
    return url.toString();
  }

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
      size: file.size as number | undefined,
      iconLink: file.iconLink as string | undefined,
      thumbnailLink: file.thumbnailLink as string | undefined,
    };
  }

  /**
   * Load files from current folder or search
   */
  async loadFiles(append = false): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    const { loadingState, fileList } = this.elements;

    if (!append) {
      this.currentFiles = [];
      this.nextPageToken = null;
      if (loadingState) show(loadingState);
    }

    try {
      const currentFolder = this.currentFolderPath[this.currentFolderPath.length - 1];
      let url: string;

      if (this.searchQuery) {
        url = this.buildScopedAPIURL(
          `/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`
        );
      } else {
        url = this.buildScopedAPIURL(
          `/esign/integrations/google/files?folder_id=${encodeURIComponent(currentFolder.id)}`
        );
      }

      if (this.nextPageToken) {
        url += `&page_token=${encodeURIComponent(this.nextPageToken)}`;
      }

      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.status}`);
      }

      const data = await response.json();
      const files = Array.isArray(data.files)
        ? data.files.map((f: Record<string, unknown>) => this.normalizeDriveFile(f))
        : [];

      if (append) {
        this.currentFiles = [...this.currentFiles, ...files];
      } else {
        this.currentFiles = files;
      }

      this.nextPageToken = data.next_page_token || null;
      this.renderFiles();
      this.updateResultCount();
      this.updatePagination();

      announce(
        this.searchQuery
          ? `Found ${this.currentFiles.length} files`
          : `Loaded ${this.currentFiles.length} files`
      );
    } catch (error) {
      console.error('Error loading files:', error);
      this.renderError(error instanceof Error ? error.message : 'Failed to load files');
      announce('Error loading files');
    } finally {
      this.isLoading = false;
      if (loadingState) hide(loadingState);
    }
  }

  /**
   * Render files in the file list
   */
  private renderFiles(): void {
    const { fileList, loadingState } = this.elements;
    if (!fileList) return;

    if (loadingState) hide(loadingState);

    if (this.currentFiles.length === 0) {
      fileList.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            ${this.searchQuery ? 'No files found' : 'This folder is empty'}
          </h3>
          <p class="text-sm text-gray-500">
            ${this.searchQuery ? 'Try a different search term' : 'No files in this folder'}
          </p>
        </div>
      `;
      return;
    }

    const html = this.currentFiles
      .map((file) => this.renderFileItem(file))
      .join('');

    fileList.innerHTML = html;
  }

  /**
   * Render a single file item
   */
  private renderFileItem(file: NormalizedDriveFile): string {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const isImportable = IMPORTABLE_TYPES.includes(file.mimeType);
    const isSelected = this.selectedFile?.id === file.id;

    const iconType =
      MIME_TYPE_ICONS[file.mimeType] || MIME_TYPE_ICONS.default;
    const icon = this.getFileIcon(iconType);

    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}"
        data-file-id="${this.escapeHtml(file.id)}"
        data-is-folder="${isFolder}"
        role="option"
        aria-selected="${isSelected}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(file.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${formatDateTime(file.modifiedTime)}
          </p>
        </div>
        ${
          isImportable
            ? `<span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">Importable</span>`
            : ''
        }
      </div>
    `;
  }

  /**
   * Get SVG icon for file type
   */
  private getFileIcon(type: string): string {
    const iconMap: Record<string, string> = {
      folder: `<svg class="w-6 h-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
      doc: `<svg class="w-6 h-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>`,
      sheet: `<svg class="w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/></svg>`,
      slide: `<svg class="w-6 h-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>`,
      pdf: `<svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>`,
      file: `<svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>`,
    };
    return iconMap[type] || iconMap.file;
  }

  /**
   * Handle file list clicks
   */
  private handleFileListClick(e: Event): void {
    const target = e.target as HTMLElement;
    const fileItem = target.closest('.file-item') as HTMLElement | null;

    if (!fileItem) return;

    const fileId = fileItem.dataset.fileId;
    const isFolder = fileItem.dataset.isFolder === 'true';

    if (!fileId) return;

    if (isFolder) {
      this.navigateToFolder(fileId);
    } else {
      this.selectFile(fileId);
    }
  }

  /**
   * Navigate into a folder
   */
  private navigateToFolder(folderId: string): void {
    const folder = this.currentFiles.find((f) => f.id === folderId);
    if (!folder) return;

    this.currentFolderPath.push({ id: folder.id, name: folder.name });
    this.searchQuery = '';
    this.clearSelection();
    this.updateBreadcrumb();
    this.loadFiles();
  }

  /**
   * Select a file
   */
  private selectFile(fileId: string): void {
    const file = this.currentFiles.find((f) => f.id === fileId);
    if (!file) return;

    this.selectedFile = file;
    this.renderSelection();
    this.renderFiles(); // Re-render to update selection state
    announce(`Selected: ${file.name}`);
  }

  /**
   * Clear file selection
   */
  private clearSelection(): void {
    this.selectedFile = null;
    this.renderSelection();
    this.renderFiles();
  }

  /**
   * Render selection panel
   */
  private renderSelection(): void {
    const {
      noSelection,
      filePreview,
      previewIcon,
      previewTitle,
      previewType,
      previewFileId,
      previewOwner,
      previewModified,
      importBtn,
      openInGoogleBtn,
    } = this.elements;

    if (!this.selectedFile) {
      if (noSelection) show(noSelection);
      if (filePreview) hide(filePreview);
      return;
    }

    if (noSelection) hide(noSelection);
    if (filePreview) show(filePreview);

    const file = this.selectedFile;
    const isImportable = IMPORTABLE_TYPES.includes(file.mimeType);

    if (previewTitle) {
      previewTitle.textContent = file.name;
    }

    if (previewType) {
      previewType.textContent = this.getMimeTypeLabel(file.mimeType);
    }

    if (previewFileId) {
      previewFileId.textContent = file.id;
    }

    if (previewOwner && file.owners.length > 0) {
      previewOwner.textContent = file.owners[0].emailAddress || '-';
    }

    if (previewModified) {
      previewModified.textContent = formatDateTime(file.modifiedTime);
    }

    if (importBtn) {
      if (isImportable) {
        importBtn.removeAttribute('disabled');
        importBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        importBtn.setAttribute('disabled', 'true');
        importBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }

    if (openInGoogleBtn && file.webViewLink) {
      openInGoogleBtn.href = file.webViewLink;
    }
  }

  /**
   * Get human-readable mime type label
   */
  private getMimeTypeLabel(mimeType: string): string {
    const labels: Record<string, string> = {
      'application/vnd.google-apps.folder': 'Folder',
      'application/vnd.google-apps.document': 'Google Doc',
      'application/vnd.google-apps.spreadsheet': 'Google Sheet',
      'application/vnd.google-apps.presentation': 'Google Slides',
      'application/pdf': 'PDF',
    };
    return labels[mimeType] || 'File';
  }

  /**
   * Update breadcrumb navigation
   */
  private updateBreadcrumb(): void {
    const { breadcrumb, listTitle } = this.elements;
    if (!breadcrumb) return;

    if (this.searchQuery) {
      hide(breadcrumb);
      if (listTitle) listTitle.textContent = 'Search Results';
      return;
    }

    show(breadcrumb);
    const currentFolder = this.currentFolderPath[this.currentFolderPath.length - 1];
    if (listTitle) listTitle.textContent = currentFolder.name;

    const ol = breadcrumb.querySelector('ol');
    if (!ol) return;

    ol.innerHTML = this.currentFolderPath
      .map(
        (item, index) => `
        <li class="flex items-center">
          ${index > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ''}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(item.id)}"
            data-folder-index="${index}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(item.name)}
          </button>
        </li>
      `
      )
      .join('');

    // Add click handlers to breadcrumb items
    qsa('.breadcrumb-item', ol).forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.folderIndex || '0', 10);
        this.navigateToBreadcrumb(index);
      });
    });
  }

  /**
   * Navigate to breadcrumb item
   */
  private navigateToBreadcrumb(index: number): void {
    if (index < 0 || index >= this.currentFolderPath.length - 1) return;

    this.currentFolderPath = this.currentFolderPath.slice(0, index + 1);
    this.searchQuery = '';
    this.clearSelection();
    this.updateBreadcrumb();
    this.loadFiles();
  }

  /**
   * Update result count display
   */
  private updateResultCount(): void {
    const { resultCount } = this.elements;
    if (!resultCount) return;

    if (this.currentFiles.length > 0) {
      resultCount.textContent = `(${this.currentFiles.length}${this.nextPageToken ? '+' : ''} files)`;
    } else {
      resultCount.textContent = '';
    }
  }

  /**
   * Update pagination controls
   */
  private updatePagination(): void {
    const { pagination, loadMoreBtn } = this.elements;
    if (!pagination) return;

    if (this.nextPageToken) {
      show(pagination);
    } else {
      hide(pagination);
    }
  }

  /**
   * Handle search
   */
  private handleSearch(): void {
    const { searchInput, clearSearchBtn } = this.elements;
    if (!searchInput) return;

    const query = searchInput.value.trim();
    this.searchQuery = query;

    if (clearSearchBtn) {
      if (query) {
        show(clearSearchBtn);
      } else {
        hide(clearSearchBtn);
      }
    }

    this.clearSelection();
    this.loadFiles();
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    const { searchInput, clearSearchBtn } = this.elements;
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) hide(clearSearchBtn);

    this.searchQuery = '';
    this.clearSelection();
    this.updateBreadcrumb();
    this.loadFiles();
  }

  /**
   * Refresh file list
   */
  private refresh(): void {
    this.clearSelection();
    this.loadFiles();
  }

  /**
   * Load more files (pagination)
   */
  private loadMore(): void {
    if (this.nextPageToken) {
      this.loadFiles(true);
    }
  }

  /**
   * Set view mode
   */
  private setViewMode(mode: 'list' | 'grid'): void {
    const { viewListBtn, viewGridBtn } = this.elements;
    this.isListView = mode === 'list';

    if (viewListBtn) {
      viewListBtn.setAttribute('aria-pressed', String(this.isListView));
    }
    if (viewGridBtn) {
      viewGridBtn.setAttribute('aria-pressed', String(!this.isListView));
    }

    this.renderFiles();
  }

  /**
   * Show import modal
   */
  private showImportModal(): void {
    if (!this.selectedFile) return;

    const { importModal, importGoogleFileId, importDocumentTitle, importAgreementTitle } =
      this.elements;

    if (importGoogleFileId) {
      importGoogleFileId.value = this.selectedFile.id;
    }

    if (importDocumentTitle) {
      // Remove file extension for default title
      const name = this.selectedFile.name.replace(/\.[^/.]+$/, '');
      importDocumentTitle.value = name;
    }

    if (importAgreementTitle) {
      importAgreementTitle.value = '';
    }

    if (importModal) {
      show(importModal);
    }
  }

  /**
   * Hide import modal
   */
  private hideImportModal(): void {
    const { importModal } = this.elements;
    if (importModal) hide(importModal);
  }

  /**
   * Handle import form submission
   */
  private async handleImport(): Promise<void> {
    if (!this.selectedFile) return;

    const {
      importConfirmBtn,
      importSpinner,
      importBtnText,
      importDocumentTitle,
      importAgreementTitle,
    } = this.elements;

    const googleFileId = this.selectedFile.id;
    const documentTitle = importDocumentTitle?.value.trim() || this.selectedFile.name;
    const agreementTitle = importAgreementTitle?.value.trim() || '';

    // Set loading state
    if (importConfirmBtn) {
      importConfirmBtn.setAttribute('disabled', 'true');
    }
    if (importSpinner) show(importSpinner);
    if (importBtnText) importBtnText.textContent = 'Importing...';

    try {
      const response = await fetch(this.buildScopedAPIURL('/esign/google-drive/imports'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          google_file_id: googleFileId,
          document_title: documentTitle,
          agreement_title: agreementTitle || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Import failed');
      }

      const result = await response.json();

      this.showToast('Import started successfully', 'success');
      announce('Import started');

      this.hideImportModal();

      // Redirect to document or agreement if created
      if (result.document?.id && this.config.pickerRoutes?.documents) {
        window.location.href = `${this.config.pickerRoutes.documents}/${result.document.id}`;
      } else if (result.agreement?.id && this.config.pickerRoutes?.agreements) {
        window.location.href = `${this.config.pickerRoutes.agreements}/${result.agreement.id}`;
      }
    } catch (error) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'Import failed';
      this.showToast(message, 'error');
      announce(`Error: ${message}`);
    } finally {
      if (importConfirmBtn) {
        importConfirmBtn.removeAttribute('disabled');
      }
      if (importSpinner) hide(importSpinner);
      if (importBtnText) importBtnText.textContent = 'Import';
    }
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    const { fileList } = this.elements;
    if (!fileList) return;

    fileList.innerHTML = `
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
        <p class="text-sm text-gray-500 mb-4">${this.escapeHtml(message)}</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `;
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    const win = window as unknown as Record<string, unknown>;
    const toastManager = win.toastManager as
      | { success: (msg: string) => void; error: (msg: string) => void }
      | undefined;

    if (toastManager) {
      if (type === 'success') {
        toastManager.success(message);
      } else {
        toastManager.error(message);
      }
    }
  }

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
 * Initialize Google Drive picker page from config
 */
export function initGoogleDrivePicker(
  config: GoogleDrivePickerConfig
): GoogleDrivePickerController {
  const controller = new GoogleDrivePickerController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap Google Drive picker page from template context
 */
export function bootstrapGoogleDrivePicker(config: {
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
}): void {
  const pageConfig: GoogleDrivePickerConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
    userId: config.userId,
    googleAccountId: config.googleAccountId,
    googleConnected: config.googleConnected !== false,
    pickerRoutes: config.pickerRoutes,
  };

  const controller = new GoogleDrivePickerController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignGoogleDrivePickerController =
      controller;
  }
}

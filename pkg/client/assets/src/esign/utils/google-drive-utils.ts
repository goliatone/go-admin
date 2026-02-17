/**
 * Google Drive Utilities
 * Shared utilities for Google Drive integration across e-sign pages
 */

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

/**
 * Google MIME types
 */
export const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document';
export const MIME_GOOGLE_SHEET = 'application/vnd.google-apps.spreadsheet';
export const MIME_GOOGLE_SLIDES = 'application/vnd.google-apps.presentation';
export const MIME_GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
export const MIME_PDF = 'application/pdf';

/**
 * Importable MIME types for e-sign
 */
export const IMPORTABLE_MIME_TYPES = [MIME_GOOGLE_DOC, MIME_PDF];

/**
 * LocalStorage key for Google account ID
 */
export const GOOGLE_ACCOUNT_STORAGE_KEY = 'esign.google.account_id';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// File Type Predicates
// --------------------------------------------------------------------------

/**
 * Check if file is a Google Doc
 */
export function isGoogleDoc(file: NormalizedDriveFile): boolean {
  return file.mimeType === MIME_GOOGLE_DOC;
}

/**
 * Check if file is a PDF
 */
export function isPDF(file: NormalizedDriveFile): boolean {
  return file.mimeType === MIME_PDF;
}

/**
 * Check if file is a folder
 */
export function isFolder(file: NormalizedDriveFile): boolean {
  return file.mimeType === MIME_GOOGLE_FOLDER;
}

/**
 * Check if file is importable
 */
export function isImportable(file: NormalizedDriveFile): boolean {
  return IMPORTABLE_MIME_TYPES.includes(file.mimeType);
}

/**
 * Check if file is a Google Workspace file (Doc, Sheet, Slides)
 */
export function isGoogleWorkspaceFile(file: NormalizedDriveFile): boolean {
  return (
    file.mimeType === MIME_GOOGLE_DOC ||
    file.mimeType === MIME_GOOGLE_SHEET ||
    file.mimeType === MIME_GOOGLE_SLIDES
  );
}

// --------------------------------------------------------------------------
// Normalizers
// --------------------------------------------------------------------------

/**
 * Normalize a raw Google Drive file to a standard format
 */
export function normalizeDriveFile(file: RawGoogleDriveFile): NormalizedDriveFile {
  return {
    id: file.id || '',
    name: file.name || 'Untitled',
    mimeType: file.mimeType || 'application/octet-stream',
    size: typeof file.size === 'string' ? parseInt(file.size, 10) || 0 : (file.size || 0),
    modifiedTime: file.modifiedTime || new Date().toISOString(),
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    webViewLink: file.webViewLink,
    parents: file.parents,
  };
}

/**
 * Normalize an array of raw files
 */
export function normalizeDriveFiles(files: RawGoogleDriveFile[]): NormalizedDriveFile[] {
  return files.map(normalizeDriveFile);
}

// --------------------------------------------------------------------------
// Display Utilities
// --------------------------------------------------------------------------

/**
 * Get human-readable file type name from MIME type
 */
export function getFileTypeName(mimeType: string): string {
  const typeMap: Record<string, string> = {
    [MIME_GOOGLE_DOC]: 'Google Doc',
    [MIME_GOOGLE_SHEET]: 'Google Sheet',
    [MIME_GOOGLE_SLIDES]: 'Google Slides',
    [MIME_GOOGLE_FOLDER]: 'Folder',
    [MIME_PDF]: 'PDF',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'text/plain': 'Text File',
  };
  return typeMap[mimeType] || 'File';
}

/**
 * Get file icon configuration based on file type
 */
export function getFileIconConfig(file: NormalizedDriveFile): {
  icon: string;
  bgClass: string;
  textClass: string;
} {
  if (isFolder(file)) {
    return {
      icon: 'iconoir-folder',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-600',
    };
  }
  if (isGoogleDoc(file)) {
    return {
      icon: 'iconoir-google-docs',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-600',
    };
  }
  if (isPDF(file)) {
    return {
      icon: 'iconoir-page',
      bgClass: 'bg-red-100',
      textClass: 'text-red-600',
    };
  }
  if (file.mimeType === MIME_GOOGLE_SHEET) {
    return {
      icon: 'iconoir-table',
      bgClass: 'bg-green-100',
      textClass: 'text-green-600',
    };
  }
  if (file.mimeType === MIME_GOOGLE_SLIDES) {
    return {
      icon: 'iconoir-presentation',
      bgClass: 'bg-orange-100',
      textClass: 'text-orange-600',
    };
  }
  if (file.mimeType.startsWith('image/')) {
    return {
      icon: 'iconoir-media-image',
      bgClass: 'bg-purple-100',
      textClass: 'text-purple-600',
    };
  }
  return {
    icon: 'iconoir-page',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

// --------------------------------------------------------------------------
// Account ID Management
// --------------------------------------------------------------------------

/**
 * Resolve account ID from multiple sources
 * Priority: queryParams > templateValue > localStorage
 */
export function resolveAccountId(
  queryParams: URLSearchParams,
  templateAccountId?: string
): string {
  // 1. Check query params
  const queryAccountId = queryParams.get('account_id');
  if (queryAccountId) {
    return normalizeAccountId(queryAccountId);
  }

  // 2. Check template-provided value
  if (templateAccountId) {
    return normalizeAccountId(templateAccountId);
  }

  // 3. Check localStorage
  const storedAccountId = localStorage.getItem(GOOGLE_ACCOUNT_STORAGE_KEY);
  if (storedAccountId) {
    return normalizeAccountId(storedAccountId);
  }

  return '';
}

/**
 * Normalize account ID value
 */
export function normalizeAccountId(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === '0') {
    return '';
  }
  return trimmed;
}

/**
 * Save account ID to localStorage
 */
export function saveAccountId(accountId: string): void {
  const normalized = normalizeAccountId(accountId);
  if (normalized) {
    localStorage.setItem(GOOGLE_ACCOUNT_STORAGE_KEY, normalized);
  }
}

/**
 * Apply account ID to a URL path or full URL
 */
export function applyAccountIdToPath(pathOrUrl: string, accountId: string): string {
  if (!accountId) return pathOrUrl;

  try {
    const url = new URL(pathOrUrl, window.location.origin);
    url.searchParams.set('account_id', accountId);
    return url.pathname + url.search;
  } catch {
    // If not a valid URL, append as query param
    const separator = pathOrUrl.includes('?') ? '&' : '?';
    return `${pathOrUrl}${separator}account_id=${encodeURIComponent(accountId)}`;
  }
}

/**
 * Build API URL with account ID scoping
 */
export function buildScopedApiUrl(apiBase: string, path: string, accountId?: string): URL {
  const url = new URL(path, window.location.origin);
  if (!url.pathname.startsWith(apiBase)) {
    url.pathname = `${apiBase}${path}`;
  }
  if (accountId) {
    url.searchParams.set('account_id', accountId);
  }
  return url;
}

/**
 * Sync account ID to URL state
 */
export function syncAccountIdToUrl(accountId: string): void {
  const url = new URL(window.location.href);
  const currentAccountId = url.searchParams.get('account_id');

  if (accountId && currentAccountId !== accountId) {
    url.searchParams.set('account_id', accountId);
    window.history.replaceState({}, '', url.toString());
  } else if (!accountId && currentAccountId) {
    url.searchParams.delete('account_id');
    window.history.replaceState({}, '', url.toString());
  }
}

// --------------------------------------------------------------------------
// HTML Utilities
// --------------------------------------------------------------------------

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render file icon HTML
 */
export function renderFileIcon(file: NormalizedDriveFile): string {
  const config = getFileIconConfig(file);
  return `
    <div class="w-10 h-10 ${config.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${config.icon} ${config.textClass}" aria-hidden="true"></i>
    </div>
  `;
}

/**
 * Render breadcrumb HTML for folder navigation
 */
export function renderBreadcrumb(
  path: FolderPathItem[],
  onNavigate: (folderId: string) => void
): string {
  if (path.length === 0) {
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  }

  const items = [
    { id: '', name: 'My Drive' },
    ...path,
  ];

  return items
    .map((item, index) => {
      const isLast = index === items.length - 1;
      const separator = index > 0 ? '<span class="text-gray-400 mx-1">/</span>' : '';

      if (isLast) {
        return `${separator}<span class="text-gray-900 font-medium">${escapeHtml(item.name)}</span>`;
      }

      return `${separator}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${item.id}"
      >${escapeHtml(item.name)}</button>`;
    })
    .join('');
}

// --------------------------------------------------------------------------
// File List Rendering
// --------------------------------------------------------------------------

/**
 * Render a single file item HTML
 */
export function renderFileItem(
  file: NormalizedDriveFile,
  options: {
    selectable?: boolean;
    showSize?: boolean;
    showDate?: boolean;
  } = {}
): string {
  const { selectable = true, showSize = true, showDate = true } = options;
  const iconHtml = renderFileIcon(file);
  const isFolder_ = isFolder(file);
  const isImportable_ = isImportable(file);

  const selectableClass = isFolder_
    ? 'cursor-pointer hover:bg-gray-50'
    : isImportable_
      ? 'cursor-pointer hover:bg-blue-50'
      : 'opacity-60';

  const dataAttrs = isFolder_
    ? `data-folder-id="${file.id}" data-folder-name="${escapeHtml(file.name)}"`
    : isImportable_ && selectable
      ? `data-file-id="${file.id}" data-file-name="${escapeHtml(file.name)}" data-mime-type="${file.mimeType}"`
      : '';

  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${selectableClass} file-item"
      ${dataAttrs}
      role="listitem"
      ${isImportable_ ? 'tabindex="0"' : ''}
    >
      ${iconHtml}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${escapeHtml(file.name)}</p>
        <p class="text-xs text-gray-500">
          ${getFileTypeName(file.mimeType)}
          ${showSize && file.size > 0 ? ` &middot; ${formatFileSize(file.size)}` : ''}
          ${showDate && file.modifiedTime ? ` &middot; ${formatDate(file.modifiedTime)}` : ''}
        </p>
      </div>
      ${isImportable_ && selectable ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ''}
    </div>
  `;
}

/**
 * Render file list HTML
 */
export function renderFileList(
  files: NormalizedDriveFile[],
  options: {
    emptyMessage?: string;
    selectable?: boolean;
  } = {}
): string {
  const { emptyMessage = 'No files found', selectable = true } = options;

  if (files.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${escapeHtml(emptyMessage)}</p>
      </div>
    `;
  }

  // Sort: folders first, then by name
  const sorted = [...files].sort((a, b) => {
    if (isFolder(a) && !isFolder(b)) return -1;
    if (!isFolder(a) && isFolder(b)) return 1;
    return a.name.localeCompare(b.name);
  });

  return `
    <div class="space-y-2" role="list">
      ${sorted.map((file) => renderFileItem(file, { selectable })).join('')}
    </div>
  `;
}

// --------------------------------------------------------------------------
// Selection State
// --------------------------------------------------------------------------

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
export function createSelectedFile(file: NormalizedDriveFile): SelectedFile {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    typeName: getFileTypeName(file.mimeType),
  };
}

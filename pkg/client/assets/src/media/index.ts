import { appendCSRFHeader } from '../shared/transport/http-client';

type RecordValue = Record<string, unknown>;

type MediaFamily = 'image' | 'vector' | 'video' | 'audio' | 'document' | 'text' | 'asset';
type PreviewMode = 'card' | 'detail' | 'list';

type MediaItem = {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  type: string;
  mimeType: string;
  size: number;
  status: string;
  workflowStatus: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type MediaCapabilities = {
  operations?: {
    upload?: boolean;
    presign?: boolean;
    confirm?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  upload?: {
    direct_upload?: boolean;
    presign?: boolean;
  };
};

type MediaPageElements = {
  root: HTMLElement;
  search: HTMLInputElement | null;
  typeFilter: HTMLSelectElement | null;
  statusFilter: HTMLSelectElement | null;
  sort: HTMLSelectElement | null;
  grid: HTMLElement | null;
  listShell: HTMLElement | null;
  listBody: HTMLElement | null;
  loadMore: HTMLButtonElement | null;
  countLabel: HTMLElement | null;
  footer: HTMLElement | null;
  empty: HTMLElement | null;
  noResults: HTMLElement | null;
  loading: HTMLElement | null;
  error: HTMLElement | null;
  status: HTMLElement | null;
  uploadInput: HTMLInputElement | null;
  uploadTrigger: HTMLButtonElement | null;
  uploadEmpty: HTMLButtonElement | null;
  selectAll: HTMLInputElement | null;
  selectionBar: HTMLElement | null;
  selectionCount: HTMLElement | null;
  clearSelection: HTMLButtonElement | null;
  bulkDelete: HTMLButtonElement | null;
  detailEmpty: HTMLElement | null;
  detail: HTMLElement | null;
  detailPreview: HTMLElement | null;
  detailName: HTMLElement | null;
  detailURL: HTMLElement | null;
  detailType: HTMLElement | null;
  detailStatus: HTMLElement | null;
  detailSize: HTMLElement | null;
  detailDate: HTMLElement | null;
  detailForm: HTMLFormElement | null;
  detailAltText: HTMLInputElement | null;
  detailCaption: HTMLTextAreaElement | null;
  detailTags: HTMLInputElement | null;
  detailError: HTMLElement | null;
  detailFeedback: HTMLElement | null;
  detailSaveButton: HTMLButtonElement | null;
  detailCopyURL: HTMLButtonElement | null;
  detailDelete: HTMLButtonElement | null;
};

type MediaPageState = {
  items: MediaItem[];
  total: number;
  selectedIDs: Set<string>;
  activeID: string;
  loading: boolean;
  capabilities: MediaCapabilities | null;
};

type BatchMutationResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  failures: string[];
};

type BatchMutationFeedback = {
  status: string;
  error: string;
};

const DEFAULT_LIMIT_GRID = 24;
const DEFAULT_LIMIT_LIST = 50;
const PREVIEW_FAMILIES = new Set(['image', 'vector', 'video', 'audio']);
const MIME_FAMILY_FILTERS = new Set(['image', 'vector', 'video', 'audio']);

export function summarizeBatchMutation(
  operation: 'upload' | 'delete',
  result: BatchMutationResult,
): BatchMutationFeedback {
  const attempted = Math.max(0, result.attempted);
  const succeeded = Math.max(0, result.succeeded);
  const failed = Math.max(0, result.failed);
  const error = result.failures.map((entry) => toStringValue(entry)).filter(Boolean).join(' ');

  if (attempted === 0 || (succeeded === 0 && failed === 0)) {
    return { status: '', error };
  }

  if (failed === 0) {
    if (operation === 'upload') {
      return {
        status: succeeded === 1 ? 'Upload complete.' : `${succeeded} uploads completed.`,
        error: '',
      };
    }
    return {
      status: succeeded === 1 ? 'Media item deleted.' : `${succeeded} media items deleted.`,
      error: '',
    };
  }

  if (succeeded === 0) {
    return { status: '', error };
  }

  if (operation === 'upload') {
    return {
      status: `${succeeded} of ${attempted} uploads completed.`,
      error,
    };
  }

  return {
    status: `${succeeded} of ${attempted} media items deleted.`,
    error,
  };
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHTMLElement(value: unknown): value is HTMLElement {
  const ctor = globalThis.HTMLElement;
  return typeof ctor !== 'undefined' && value instanceof ctor;
}

function byData<T extends Element = Element>(root: ParentNode, selector: string): T | null {
  const node = root.querySelector(selector);
  return node instanceof Element ? (node as T) : null;
}

function byMediaPage<T extends Element = Element>(root: HTMLElement, selector: string): T | null {
  return byData<T>(root, selector) ?? byData<T>(root.ownerDocument, selector);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => toStringValue(entry)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  return { ...value };
}

function normalizeMediaItem(value: unknown): MediaItem {
  const record = isRecord(value) ? value : {};
  const metadata = normalizeMetadata(record.metadata);
  const mimeType = toStringValue(record.mime_type);
  return {
    id: toStringValue(record.id),
    name: toStringValue(record.name) || toStringValue(record.filename) || 'Untitled asset',
    url: toStringValue(record.url),
    thumbnail: toStringValue(record.thumbnail) || toStringValue(record.thumbnail_url),
    type: toStringValue(record.type) || inferTypeFromMIME(mimeType),
    mimeType,
    size: toNumberValue(record.size),
    status: toStringValue(record.status),
    workflowStatus: toStringValue(record.workflow_status),
    createdAt: toStringValue(record.created_at),
    metadata,
  };
}

function isCopiedAccessURL(thumbnail: string, url: string): boolean {
  return Boolean(thumbnail && url && thumbnail === url);
}

function inferTypeFromMIME(mimeType: string): string {
  const family = inferMediaFamily('', mimeType);
  return family === 'asset' ? '' : family;
}

function normalizeMediaType(value: string): string {
  return value.trim().toLowerCase();
}

function inferFamilyFromMIME(mimeType: string): MediaFamily | '' {
  const value = mimeType.split(';', 1)[0].trim().toLowerCase();
  if (!value) {
    return '';
  }
  if (value === 'image/svg+xml') {
    return 'vector';
  }
  if (value.startsWith('image/')) {
    return 'image';
  }
  if (value.startsWith('video/')) {
    return 'video';
  }
  if (value.startsWith('audio/')) {
    return 'audio';
  }
  if (value.startsWith('text/')) {
    return 'text';
  }
  if (value.includes('pdf') || value.includes('document')) {
    return 'document';
  }
  return '';
}

export function inferMediaFamily(type: string, mimeType = ''): MediaFamily {
  const normalizedType = normalizeMediaType(type);
  const mimeFamily = inferFamilyFromMIME(mimeType);

  if (PREVIEW_FAMILIES.has(normalizedType)) {
    return normalizedType as MediaFamily;
  }
  if (mimeFamily && PREVIEW_FAMILIES.has(mimeFamily)) {
    return mimeFamily;
  }
  if (normalizedType === 'document' || normalizedType === 'text') {
    return normalizedType;
  }
  if (mimeFamily === 'document' || mimeFamily === 'text') {
    return mimeFamily;
  }
  return 'asset';
}

function previewThumbnailURL(item: MediaItem, family: MediaFamily): string {
  if (!item.thumbnail) {
    return '';
  }
  if ((family === 'image' || family === 'vector') && isCopiedAccessURL(item.thumbnail, item.url)) {
    return item.thumbnail;
  }
  if (isCopiedAccessURL(item.thumbnail, item.url)) {
    return '';
  }
  return item.thumbnail;
}

export function mediaTypeFilterParam(value: string): { key: 'type' | 'mime_family'; value: string } | null {
  const normalized = normalizeMediaType(value);
  if (!normalized) {
    return null;
  }
  if (MIME_FAMILY_FILTERS.has(normalized)) {
    return { key: 'mime_family', value: normalized };
  }
  return { key: 'type', value: normalized };
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string): string {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iconForFamily(family: MediaFamily): string {
  switch (family) {
    case 'image':
    case 'vector':
      return 'iconoir-media-image';
    case 'video':
      return 'iconoir-video-camera';
    case 'audio':
      return 'iconoir-music-note';
    case 'document':
    case 'text':
      return 'iconoir-page';
    default:
      return 'iconoir-attachment';
  }
}

function statusTone(status: string): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-700';
    case 'processing':
      return 'bg-amber-100 text-amber-700';
    case 'uploaded':
      return 'bg-sky-100 text-sky-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function itemPath(template: string, id: string): string {
  return template.replace(':id', encodeURIComponent(id));
}

async function fetchJSON(url: string, init?: RequestInit): Promise<unknown> {
  const options = init ?? {};
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  appendCSRFHeader(url, options, headers);

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers,
  });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const expectsJSON = contentType.includes('application/json') || contentType.includes('+json');
  const payload = expectsJSON ? await response.json().catch(() => null) : await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(readErrorMessage(payload) || `Request failed (${response.status})`);
  }
  return payload;
}

function readErrorMessage(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      return '';
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = readErrorMessage(entry);
      if (message) {
        return message;
      }
    }
    return '';
  }
  if (!isRecord(value)) {
    return '';
  }
  for (const key of ['error', 'message', 'detail', 'reason']) {
    const message = readErrorMessage(value[key]);
    if (message) {
      return message;
    }
  }
  return '';
}

function buildFallbackPreview(family: MediaFamily, mode: PreviewMode): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className =
    mode === 'list'
      ? 'w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500'
      : 'w-full h-full bg-gray-100 flex items-center justify-center text-gray-500';
  const icon = document.createElement('i');
  icon.className = `${iconForFamily(family)} ${mode === 'detail' ? 'text-5xl' : 'text-2xl'}`;
  wrapper.appendChild(icon);
  return wrapper;
}

function buildPreview(item: MediaItem, mode: PreviewMode): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = mode === 'list' ? 'w-12 h-12' : 'w-full h-full';
  const family = inferMediaFamily(item.type, item.mimeType);
  const imageLike = family === 'image' || family === 'vector';
  const posterURL = previewThumbnailURL(item, family);
  const imageURL = posterURL || item.url;

  if (imageLike && imageURL) {
    const image = document.createElement('img');
    image.src = imageURL;
    image.alt = item.name;
    image.loading = 'lazy';
    image.className =
      mode === 'detail'
        ? 'w-full h-full object-contain'
        : mode === 'list'
          ? 'w-12 h-12 rounded-xl object-cover'
          : 'w-full h-full object-cover';
    wrapper.appendChild(image);
    return wrapper;
  }

  if (family === 'video' && mode !== 'detail' && posterURL) {
    const image = document.createElement('img');
    image.src = posterURL;
    image.alt = item.name;
    image.loading = 'lazy';
    image.className = mode === 'list' ? 'w-12 h-12 rounded-xl object-cover' : 'w-full h-full object-cover';
    wrapper.appendChild(image);
    return wrapper;
  }

  if (mode === 'detail' && family === 'video' && item.url) {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.className = 'w-full h-full object-contain bg-black';
    video.setAttribute('aria-label', item.name || 'Video preview');
    if (posterURL) {
      video.poster = posterURL;
    }
    wrapper.appendChild(video);
    return wrapper;
  }

  if (mode === 'detail' && family === 'audio' && item.url) {
    wrapper.className = 'w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-gray-600';
    const icon = document.createElement('i');
    icon.className = 'iconoir-music-note text-5xl';
    const audio = document.createElement('audio');
    audio.src = item.url;
    audio.controls = true;
    audio.preload = 'metadata';
    audio.className = 'w-full max-w-full';
    audio.setAttribute('aria-label', item.name || 'Audio preview');
    wrapper.appendChild(icon);
    wrapper.appendChild(audio);
    return wrapper;
  }

  return buildFallbackPreview(family, mode);
}

export function buildMediaPreview(value: unknown, mode: PreviewMode): HTMLElement {
  return buildPreview(normalizeMediaItem(value), mode);
}

function createCard(item: MediaItem, selected: boolean, active: boolean): HTMLElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.dataset.mediaItem = item.id;
  card.className = [
    'group',
    'text-left',
    'bg-white',
    'border',
    'rounded-2xl',
    'overflow-hidden',
    'shadow-sm',
    'transition',
    active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300 hover:shadow-md',
  ].join(' ');

  const header = document.createElement('div');
  header.className = 'relative aspect-[4/3] bg-gray-100 overflow-hidden';
  header.appendChild(buildPreview(item, 'card'));

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selected;
  checkbox.dataset.mediaSelect = item.id;
  checkbox.className = 'absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900';
  header.appendChild(checkbox);

  const status = document.createElement('span');
  status.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusTone(item.workflowStatus || item.status)}`;
  status.textContent = item.workflowStatus || item.status || 'unknown';
  header.appendChild(status);

  const body = document.createElement('div');
  body.className = 'p-4';
  body.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${escapeHTML(item.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${escapeHTML(item.type || 'asset')}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${escapeHTML(formatBytes(item.size))}</span>
      <span>${escapeHTML(formatDate(item.createdAt))}</span>
    </div>
  `;

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function createRow(item: MediaItem, selected: boolean, active: boolean): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.dataset.mediaItem = item.id;
  row.className = active ? 'bg-gray-50' : '';

  row.innerHTML = `
    <td class="px-4 py-3">
      <input type="checkbox" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" data-media-select="${escapeHTML(item.id)}" ${selected ? 'checked' : ''}>
    </td>
    <td class="px-4 py-3" data-media-preview-cell></td>
    <td class="px-4 py-3 min-w-[240px]">
      <div class="font-medium text-gray-900">${escapeHTML(item.name)}</div>
      <div class="text-xs text-gray-500 break-all mt-1">${escapeHTML(item.url || '')}</div>
    </td>
    <td class="px-4 py-3 hidden md:table-cell">${escapeHTML(item.type || 'asset')}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusTone(item.workflowStatus || item.status)}">
        ${escapeHTML(item.workflowStatus || item.status || 'unknown')}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${escapeHTML(formatBytes(item.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${escapeHTML(formatDate(item.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${escapeHTML(item.id)}">Inspect</button>
    </td>
  `;

  const previewCell = byData(row, '[data-media-preview-cell]');
  if (previewCell) {
    previewCell.appendChild(buildPreview(item, 'list'));
  }
  return row;
}

function collectElements(root: HTMLElement): MediaPageElements {
  return {
    root,
    search: byData<HTMLInputElement>(root, '[data-media-search]'),
    typeFilter: byData<HTMLSelectElement>(root, '[data-media-type-filter]'),
    statusFilter: byData<HTMLSelectElement>(root, '[data-media-status-filter]'),
    sort: byData<HTMLSelectElement>(root, '[data-media-sort]'),
    grid: byData(root, '[data-media-grid]'),
    listShell: byData(root, '[data-media-list]'),
    listBody: byData(root, '[data-media-list-body]'),
    loadMore: byData<HTMLButtonElement>(root, '[data-media-load-more]'),
    countLabel: byData(root, '[data-media-count-label]'),
    footer: byData(root, '[data-media-footer]'),
    empty: byData(root, '[data-media-empty]'),
    noResults: byData(root, '[data-media-no-results]'),
    loading: byData(root, '[data-media-loading]'),
    error: byData(root, '[data-media-error]'),
    status: byData(root, '[data-media-status]'),
    uploadInput: byMediaPage<HTMLInputElement>(root, '[data-media-upload-input]'),
    uploadTrigger: byMediaPage<HTMLButtonElement>(root, '[data-media-upload-trigger]'),
    uploadEmpty: byData<HTMLButtonElement>(root, '[data-media-upload-empty]'),
    selectAll: byData<HTMLInputElement>(root, '[data-media-select-all]'),
    selectionBar: byMediaPage(root, '[data-media-selection-bar]'),
    selectionCount: byMediaPage(root, '[data-media-selected-count]'),
    clearSelection: byMediaPage<HTMLButtonElement>(root, '[data-media-clear-selection]'),
    bulkDelete: byMediaPage<HTMLButtonElement>(root, '[data-media-bulk-delete]'),
    detailEmpty: byData(root, '[data-media-detail-empty]'),
    detail: byData(root, '[data-media-detail]'),
    detailPreview: byData(root, '[data-media-detail-preview]'),
    detailName: byData(root, '[data-media-detail-name]'),
    detailURL: byData(root, '[data-media-detail-url]'),
    detailType: byData(root, '[data-media-detail-type]'),
    detailStatus: byData(root, '[data-media-detail-status-label]'),
    detailSize: byData(root, '[data-media-detail-size]'),
    detailDate: byData(root, '[data-media-detail-date]'),
    detailForm: byData<HTMLFormElement>(root, '[data-media-detail-form]'),
    detailAltText: byData<HTMLInputElement>(root, '#media-alt-text'),
    detailCaption: byData<HTMLTextAreaElement>(root, '#media-caption'),
    detailTags: byData<HTMLInputElement>(root, '#media-tags'),
    detailError: byData(root, '[data-media-detail-error]'),
    detailFeedback: byData(root, '[data-media-detail-feedback]'),
    detailSaveButton: byData<HTMLButtonElement>(root, '[data-media-save-button]'),
    detailCopyURL: byData<HTMLButtonElement>(root, '[data-media-copy-url]'),
    detailDelete: byData<HTMLButtonElement>(root, '[data-media-delete]'),
  };
}

function debounce<T extends (...args: never[]) => void>(callback: T, timeout: number): T {
  let timer = 0;
  return ((...args: never[]) => {
    globalThis.clearTimeout(timer);
    timer = globalThis.setTimeout(() => callback(...args), timeout);
  }) as T;
}

function setMessage(target: HTMLElement | null, message: string): void {
  if (!target) {
    return;
  }
  if (!message) {
    target.textContent = '';
    target.classList.add('hidden');
    return;
  }
  target.textContent = message;
  target.classList.remove('hidden');
}

function updateVisibility(target: HTMLElement | null, visible: boolean, displayClass = 'hidden'): void {
  if (!target) {
    return;
  }
  if (visible) {
    target.classList.remove(displayClass);
  } else {
    target.classList.add(displayClass);
  }
}

function tagsFromMetadata(metadata: Record<string, unknown>): string {
  return toStringList(metadata.tags).join(', ');
}

async function bootMediaPage(root: HTMLElement): Promise<void> {
  const elements = collectElements(root);
  const view = toStringValue(root.dataset.mediaView) === 'list' ? 'list' : 'grid';
  const libraryPath = toStringValue(root.dataset.mediaLibraryPath);
  const itemPathTemplate = toStringValue(root.dataset.mediaItemPath);
  const uploadPath = toStringValue(root.dataset.mediaUploadPath);
  const presignPath = toStringValue(root.dataset.mediaPresignPath);
  const confirmPath = toStringValue(root.dataset.mediaConfirmPath);
  const capabilitiesPath = toStringValue(root.dataset.mediaCapabilitiesPath);

  const state: MediaPageState = {
    items: [],
    total: 0,
    selectedIDs: new Set<string>(),
    activeID: '',
    loading: false,
    capabilities: null,
  };

  function currentItem(): MediaItem | null {
    if (!state.activeID) {
      return null;
    }
    return state.items.find((item) => item.id === state.activeID) ?? null;
  }

  function canUpload(): boolean {
    return Boolean(
      state.capabilities?.operations?.upload ||
      state.capabilities?.operations?.presign ||
      state.capabilities?.upload?.direct_upload ||
      state.capabilities?.upload?.presign,
    );
  }

  function canUpdate(): boolean {
    return Boolean(state.capabilities?.operations?.update);
  }

  function canDelete(): boolean {
    return Boolean(state.capabilities?.operations?.delete);
  }

  function renderDetail(): void {
    const item = currentItem();
    updateVisibility(elements.detailEmpty, !item);
    updateVisibility(elements.detail, Boolean(item));
    if (!item) {
      setMessage(elements.detailError, '');
      setMessage(elements.detailFeedback, '');
      return;
    }
    if (elements.detailPreview) {
      elements.detailPreview.replaceChildren(buildPreview(item, 'detail'));
    }
    if (elements.detailName) {
      elements.detailName.textContent = item.name;
    }
    if (elements.detailURL) {
      elements.detailURL.textContent = item.url;
    }
    if (elements.detailType) {
      elements.detailType.textContent = item.type || item.mimeType || 'asset';
    }
    if (elements.detailStatus) {
      elements.detailStatus.textContent = item.workflowStatus || item.status || 'unknown';
    }
    if (elements.detailSize) {
      elements.detailSize.textContent = formatBytes(item.size);
    }
    if (elements.detailDate) {
      elements.detailDate.textContent = formatDate(item.createdAt);
    }
    if (elements.detailAltText) {
      elements.detailAltText.value = toStringValue(item.metadata.alt_text);
    }
    if (elements.detailCaption) {
      elements.detailCaption.value = toStringValue(item.metadata.caption);
    }
    if (elements.detailTags) {
      elements.detailTags.value = tagsFromMetadata(item.metadata);
    }
    if (elements.detailSaveButton) {
      elements.detailSaveButton.disabled = !canUpdate();
    }
    if (elements.detailDelete) {
      elements.detailDelete.disabled = !canDelete();
    }
  }

  function renderSelectionBar(): void {
    const selectedCount = state.selectedIDs.size;
    if (elements.selectionCount) {
      elements.selectionCount.textContent = String(selectedCount);
    }
    updateVisibility(elements.selectionBar, selectedCount > 0);
    if (elements.bulkDelete) {
      elements.bulkDelete.disabled = !canDelete() || selectedCount === 0;
    }
  }

  function renderList(): void {
    if (elements.grid) {
      elements.grid.replaceChildren();
      if (view === 'grid') {
        for (const item of state.items) {
          const card = createCard(item, state.selectedIDs.has(item.id), state.activeID === item.id);
          const checkbox = byData<HTMLInputElement>(card, `[data-media-select="${item.id}"]`);
          checkbox?.addEventListener('click', (event) => {
            event.stopPropagation();
          });
          checkbox?.addEventListener('change', () => {
            if (checkbox.checked) {
              state.selectedIDs.add(item.id);
            } else {
              state.selectedIDs.delete(item.id);
            }
            renderSelectionBar();
            renderList();
          });
          card.addEventListener('click', () => {
            state.activeID = item.id;
            renderDetail();
            renderList();
          });
          elements.grid.appendChild(card);
        }
      }
    }

    if (elements.listBody) {
      elements.listBody.replaceChildren();
      if (view === 'list') {
        for (const item of state.items) {
          const row = createRow(item, state.selectedIDs.has(item.id), state.activeID === item.id);
          row.addEventListener('click', () => {
            state.activeID = item.id;
            renderDetail();
            renderList();
          });
          const select = byData<HTMLInputElement>(row, `[data-media-select="${item.id}"]`);
          select?.addEventListener('click', (event) => {
            event.stopPropagation();
          });
          select?.addEventListener('change', () => {
            if (select.checked) {
              state.selectedIDs.add(item.id);
            } else {
              state.selectedIDs.delete(item.id);
            }
            renderSelectionBar();
            renderList();
          });
          const inspect = byData<HTMLButtonElement>(row, `[data-media-open="${item.id}"]`);
          inspect?.addEventListener('click', (event) => {
            event.stopPropagation();
            state.activeID = item.id;
            renderDetail();
            renderList();
          });
          elements.listBody.appendChild(row);
        }
      }
    }

    if (elements.countLabel) {
      elements.countLabel.textContent = `${state.items.length} of ${state.total || state.items.length} items`;
    }
    if (elements.selectAll) {
      elements.selectAll.checked = state.items.length > 0 && state.items.every((item) => state.selectedIDs.has(item.id));
    }
    updateVisibility(elements.footer, state.items.length > 0);
    updateVisibility(elements.loadMore, state.items.length > 0 && state.items.length < state.total);
    renderSelectionBar();
    renderDetail();
  }

  function renderEmptyStates(): void {
    const hasFilters = Boolean(
      elements.search?.value ||
      elements.typeFilter?.value ||
      elements.statusFilter?.value,
    );
    const hasItems = state.items.length > 0;
    updateVisibility(elements.loading, state.loading, 'hidden');
    updateVisibility(elements.empty, !state.loading && !hasItems && !hasFilters);
    updateVisibility(elements.noResults, !state.loading && !hasItems && hasFilters);
    updateVisibility(elements.grid, !state.loading && hasItems && view === 'grid');
    updateVisibility(elements.listShell, !state.loading && hasItems && view === 'list');
  }

  function mergeUpdatedItem(next: MediaItem): void {
    state.items = state.items.map((item) => (item.id === next.id ? next : item));
    if (!state.activeID) {
      state.activeID = next.id;
    }
    renderList();
    renderEmptyStates();
  }

  async function loadCapabilities(): Promise<void> {
    if (!capabilitiesPath) {
      return;
    }
    try {
      const payload = await fetchJSON(capabilitiesPath);
      state.capabilities = isRecord(payload) ? (payload as MediaCapabilities) : null;
    } catch (error) {
      setMessage(elements.status, '');
      setMessage(elements.error, error instanceof Error ? error.message : 'Failed to load media capabilities.');
    }
    if (elements.uploadTrigger) {
      elements.uploadTrigger.disabled = !canUpload();
    }
    if (elements.uploadEmpty) {
      elements.uploadEmpty.disabled = !canUpload();
    }
  }

  async function loadItems(append = false): Promise<void> {
    if (!libraryPath) {
      setMessage(elements.error, 'Media library endpoint is not configured.');
      return;
    }
    state.loading = true;
    renderEmptyStates();
    setMessage(elements.error, '');

    const query = new URLSearchParams();
    const limit = view === 'list' ? DEFAULT_LIMIT_LIST : DEFAULT_LIMIT_GRID;
    const offset = append ? state.items.length : 0;
    query.set('limit', String(limit));
    query.set('offset', String(offset));
    if (elements.search?.value.trim()) {
      query.set('search', elements.search.value.trim());
    }
    const typeFilter = mediaTypeFilterParam(elements.typeFilter?.value || '');
    if (typeFilter) {
      query.set(typeFilter.key, typeFilter.value);
    }
    if (elements.statusFilter?.value) {
      query.set('status', elements.statusFilter.value);
    }
    if (elements.sort?.value) {
      query.set('sort', elements.sort.value);
    }

    try {
      const payload = await fetchJSON(`${libraryPath}?${query.toString()}`);
      const page = isRecord(payload) ? payload : {};
      const rawItems = Array.isArray(page.items) ? page.items : [];
      const nextItems = rawItems.map((item) => normalizeMediaItem(item)).filter((item) => item.id);
      state.items = append ? [...state.items, ...nextItems.filter((item) => !state.items.some((current) => current.id === item.id))] : nextItems;
      state.total = Math.max(toNumberValue(page.total), state.items.length);
      if (state.activeID && !state.items.some((item) => item.id === state.activeID)) {
        state.activeID = '';
      }
      if (!state.activeID && state.items.length > 0) {
        state.activeID = state.items[0].id;
      }
    } catch (error) {
      setMessage(elements.error, error instanceof Error ? error.message : 'Failed to load media library.');
    } finally {
      state.loading = false;
      renderList();
      renderEmptyStates();
    }
  }

  async function persistMetadata(): Promise<void> {
    const item = currentItem();
    if (!item || !canUpdate()) {
      return;
    }
    if (!itemPathTemplate) {
      setMessage(elements.detailError, 'Media item endpoint is not configured.');
      return;
    }
    const metadata = { ...item.metadata };
    const altText = elements.detailAltText?.value.trim() || '';
    const caption = elements.detailCaption?.value.trim() || '';
    const tags = toStringList(elements.detailTags?.value || '');

    if (altText) {
      metadata.alt_text = altText;
    } else {
      delete metadata.alt_text;
    }
    if (caption) {
      metadata.caption = caption;
    } else {
      delete metadata.caption;
    }
    if (tags.length > 0) {
      metadata.tags = tags;
    } else {
      delete metadata.tags;
    }

    try {
      setMessage(elements.detailError, '');
      setMessage(elements.detailFeedback, '');
      const payload = await fetchJSON(itemPath(itemPathTemplate, item.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });
      mergeUpdatedItem(normalizeMediaItem(payload));
      setMessage(elements.detailFeedback, 'Metadata saved.');
    } catch (error) {
      setMessage(elements.detailError, error instanceof Error ? error.message : 'Failed to save metadata.');
    }
  }

  async function deleteItem(
    id: string,
    options?: { skipConfirm?: boolean; suppressStatus?: boolean; reportDetailError?: boolean },
  ): Promise<{ deleted: boolean; error: string }> {
    if (!canDelete()) {
      return { deleted: false, error: '' };
    }
    if (!itemPathTemplate) {
      const message = 'Media item endpoint is not configured.';
      if (options?.reportDetailError !== false) {
        setMessage(elements.detailError, message);
      }
      return { deleted: false, error: message };
    }
    const target = state.items.find((item) => item.id === id);
    const label = target?.name || 'this media item';
    if (!options?.skipConfirm && !globalThis.confirm(`Delete ${label}?`)) {
      return { deleted: false, error: '' };
    }
    try {
      setMessage(elements.detailError, '');
      await fetchJSON(itemPath(itemPathTemplate, id), { method: 'DELETE' });
      state.items = state.items.filter((item) => item.id !== id);
      state.selectedIDs.delete(id);
      if (state.activeID === id) {
        state.activeID = state.items[0]?.id || '';
      }
      state.total = Math.max(0, state.total - 1);
      renderList();
      renderEmptyStates();
      if (!options?.suppressStatus) {
        setMessage(elements.status, 'Media item deleted.');
      }
      return { deleted: true, error: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete media item.';
      if (options?.reportDetailError !== false) {
        setMessage(elements.detailError, message);
      }
      return { deleted: false, error: message };
    }
  }

  async function deleteSelected(): Promise<void> {
    if (!canDelete() || state.selectedIDs.size === 0) {
      return;
    }
    if (!globalThis.confirm(`Delete ${state.selectedIDs.size} selected media item(s)?`)) {
      return;
    }
    const ids = [...state.selectedIDs];
    const failedIDs = new Set<string>();
    const failures: string[] = [];
    let deleted = 0;
    setMessage(elements.error, '');
    setMessage(elements.detailError, '');
    for (const id of ids) {
      const item = state.items.find((entry) => entry.id === id);
      const result = await deleteItem(id, {
        skipConfirm: true,
        suppressStatus: true,
        reportDetailError: false,
      });
      if (result.deleted) {
        deleted += 1;
        continue;
      }
      failedIDs.add(id);
      if (result.error) {
        failures.push(`Failed to delete ${item?.name || id}: ${result.error}`);
      }
    }
    state.selectedIDs = failedIDs;
    renderSelectionBar();
    renderList();
    const feedback = summarizeBatchMutation('delete', {
      attempted: ids.length,
      succeeded: deleted,
      failed: failures.length,
      failures,
    });
    setMessage(elements.status, feedback.status);
    setMessage(elements.error, feedback.error);
  }

  async function copyCurrentURL(): Promise<void> {
    const item = currentItem();
    if (!item?.url) {
      return;
    }
    try {
      await globalThis.navigator.clipboard.writeText(item.url);
      setMessage(elements.detailFeedback, 'URL copied.');
    } catch {
      setMessage(elements.detailError, 'Clipboard access is unavailable.');
    }
  }

  async function performPresignedUpload(presign: RecordValue, file: File): Promise<void> {
    const uploadURL = toStringValue(presign.upload_url);
    if (!uploadURL) {
      throw new Error('Upload URL missing from presign response.');
    }
    const fields = isRecord(presign.fields) ? presign.fields : null;
    if (fields) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, String(value));
      }
      formData.append('file', file);
      const response = await fetch(uploadURL, {
        method: toStringValue(presign.method) || 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status}).`);
      }
      return;
    }
    const headers = new Headers();
    if (isRecord(presign.headers)) {
      for (const [key, value] of Object.entries(presign.headers)) {
        headers.set(key, String(value));
      }
    }
    const response = await fetch(uploadURL, {
      method: toStringValue(presign.method) || 'PUT',
      headers,
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Upload failed (${response.status}).`);
    }
  }

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    const fileList = Array.from(files);
    if (fileList.length === 0) {
      return;
    }
    if (!canUpload()) {
      setMessage(elements.error, 'Uploads are not available for this request.');
      return;
    }
    setMessage(elements.error, '');
    let uploaded = 0;
    const failures: string[] = [];
    for (const file of fileList) {
      setMessage(elements.status, `Uploading ${file.name}…`);
      try {
        if (state.capabilities?.upload?.direct_upload && uploadPath) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name);
          formData.append('file_name', file.name);
          formData.append('content_type', file.type);
          await fetchJSON(uploadPath, { method: 'POST', body: formData });
        } else if (state.capabilities?.upload?.presign && presignPath && confirmPath) {
          const presign = await fetchJSON(presignPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              file_name: file.name,
              content_type: file.type,
              size: file.size,
            }),
          });
          if (!isRecord(presign)) {
            throw new Error('Invalid presign response.');
          }
          await performPresignedUpload(presign, file);
          await fetchJSON(confirmPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upload_id: toStringValue(presign.upload_id),
              name: file.name,
              file_name: file.name,
              content_type: file.type,
              size: file.size,
            }),
          });
        } else {
          throw new Error('No supported upload mode is configured.');
        }
        uploaded += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to upload ${file.name}.`;
        failures.push(`Failed to upload ${file.name}: ${message}`);
      }
    }
    const feedback = summarizeBatchMutation('upload', {
      attempted: fileList.length,
      succeeded: uploaded,
      failed: failures.length,
      failures,
    });
    setMessage(elements.status, feedback.status);
    setMessage(elements.error, feedback.error);
    if (uploaded > 0) {
      await loadItems(false);
    }
  }

  const reload = debounce(() => {
    void loadItems(false);
  }, 250);

  elements.search?.addEventListener('input', reload);
  elements.typeFilter?.addEventListener('change', () => void loadItems(false));
  elements.statusFilter?.addEventListener('change', () => void loadItems(false));
  elements.sort?.addEventListener('change', () => void loadItems(false));
  elements.loadMore?.addEventListener('click', () => void loadItems(true));

  elements.selectAll?.addEventListener('change', () => {
    if (elements.selectAll?.checked) {
      for (const item of state.items) {
        state.selectedIDs.add(item.id);
      }
    } else {
      state.selectedIDs.clear();
    }
    renderSelectionBar();
    renderList();
  });

  const openUploadPicker = (): void => {
    elements.uploadInput?.click();
  };
  elements.uploadTrigger?.addEventListener('click', openUploadPicker);
  elements.uploadEmpty?.addEventListener('click', openUploadPicker);
  elements.uploadInput?.addEventListener('change', () => {
    if (elements.uploadInput?.files) {
      void uploadFiles(elements.uploadInput.files);
      elements.uploadInput.value = '';
    }
  });

  elements.clearSelection?.addEventListener('click', () => {
    state.selectedIDs.clear();
    renderSelectionBar();
    renderList();
  });
  elements.bulkDelete?.addEventListener('click', () => void deleteSelected());
  elements.detailForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void persistMetadata();
  });
  elements.detailCopyURL?.addEventListener('click', () => void copyCurrentURL());
  elements.detailDelete?.addEventListener('click', () => {
    if (state.activeID) {
      void deleteItem(state.activeID);
    }
  });

  await loadCapabilities();
  await loadItems(false);
}

export async function initMediaPages(): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }
  const roots = Array.from(document.querySelectorAll('[data-media-page-root]'));
  for (const root of roots) {
    if (!isHTMLElement(root)) {
      continue;
    }
    await bootMediaPage(root);
  }
}

if (typeof document !== 'undefined') {
  void initMediaPages();
}

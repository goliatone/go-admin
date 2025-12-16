type FileUploaderConfig = {
  uploadEndpoint?: string;
  allowedTypes?: string[];
  maxSize?: number;
  preview?: boolean;
  variant?: string;
};

type FileUploaderElements = {
  root: HTMLElement;
  urlInput: HTMLInputElement;
  fileInput: HTMLInputElement;
  previewImg?: HTMLImageElement;
  placeholder?: HTMLElement;
  errorEl: HTMLElement;
  statusEl: HTMLElement;
};

function parseConfig(raw: string | null): FileUploaderConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as FileUploaderConfig;
    }
  } catch {
    // ignore
  }
  return {};
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function showError(elements: FileUploaderElements, message: string): void {
  elements.errorEl.textContent = message;
  elements.errorEl.classList.remove('hidden');
  elements.statusEl.textContent = '';
  elements.statusEl.classList.add('hidden');
}

function clearError(elements: FileUploaderElements): void {
  elements.errorEl.textContent = '';
  elements.errorEl.classList.add('hidden');
}

function setStatus(elements: FileUploaderElements, message: string): void {
  elements.statusEl.textContent = message;
  elements.statusEl.classList.remove('hidden');
}

function clearStatus(elements: FileUploaderElements): void {
  elements.statusEl.textContent = '';
  elements.statusEl.classList.add('hidden');
}

function setPreview(elements: FileUploaderElements, src: string | null): void {
  if (!elements.previewImg || !elements.placeholder) return;
  if (src) {
    elements.previewImg.src = src;
    elements.previewImg.classList.remove('hidden');
    elements.placeholder.classList.add('hidden');
  } else {
    elements.previewImg.removeAttribute('src');
    elements.previewImg.classList.add('hidden');
    elements.placeholder.classList.remove('hidden');
  }
}

function ensureInlineElement(root: HTMLElement, selector: string, className: string): HTMLElement {
  const existing = root.querySelector<HTMLElement>(selector);
  if (existing) return existing;

  const el = document.createElement('p');
  el.className = className;
  root.appendChild(el);
  return el;
}

function resolveElements(root: HTMLElement): FileUploaderElements | null {
  const urlInput = root.querySelector<HTMLInputElement>('input[data-file-uploader-url]');
  const fileInput = root.querySelector<HTMLInputElement>('input[data-file-uploader-file]');
  if (!urlInput || !fileInput) return null;

  const errorEl = ensureInlineElement(root, '[data-file-uploader-error]', 'text-sm text-red-600 hidden');
  errorEl.setAttribute('data-file-uploader-error', 'true');

  const statusEl = ensureInlineElement(root, '[data-file-uploader-status]', 'text-xs text-gray-500 hidden');
  statusEl.setAttribute('data-file-uploader-status', 'true');

  const previewImg = root.querySelector<HTMLImageElement>('[data-file-uploader-preview]');
  const placeholder = root.querySelector<HTMLElement>('[data-file-uploader-placeholder]');

  return {
    root,
    urlInput,
    fileInput,
    previewImg: previewImg ?? undefined,
    placeholder: placeholder ?? undefined,
    errorEl,
    statusEl
  };
}

async function uploadFile(elements: FileUploaderElements, endpoint: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Upload failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as any;
      if (parsed?.message && typeof parsed.message === 'string') message = parsed.message;
      if (parsed?.error && typeof parsed.error === 'string') message = parsed.error;
      if (parsed?.error?.message && typeof parsed.error.message === 'string') message = parsed.error.message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { url?: unknown };
  if (!data || typeof data.url !== 'string' || !data.url) {
    throw new Error('Upload succeeded but response did not include a url');
  }

  return data.url;
}

function initUploader(root: HTMLElement): void {
  const elements = resolveElements(root);
  if (!elements) return;

  const config = parseConfig(root.getAttribute('data-component-config'));

  if (Array.isArray(config.allowedTypes) && config.allowedTypes.length > 0) {
    elements.fileInput.setAttribute('accept', config.allowedTypes.join(','));
  }

  if (config.preview !== false) {
    const existing = elements.urlInput.value?.trim();
    if (existing) setPreview(elements, existing);
  }

  elements.fileInput.addEventListener('change', async () => {
    clearError(elements);
    clearStatus(elements);

    const file = elements.fileInput.files?.[0];
    if (!file) return;

    if (Array.isArray(config.allowedTypes) && config.allowedTypes.length > 0) {
      if (!config.allowedTypes.includes(file.type)) {
        showError(elements, `Unsupported file type: ${file.type || 'unknown'}`);
        return;
      }
    }

    if (typeof config.maxSize === 'number' && Number.isFinite(config.maxSize) && config.maxSize > 0) {
      if (file.size > config.maxSize) {
        showError(elements, `File too large: ${formatBytes(file.size)} (max ${formatBytes(config.maxSize)})`);
        return;
      }
    }

    const endpoint = (config.uploadEndpoint || '').trim();
    if (!endpoint) {
      showError(elements, 'Upload endpoint is not configured');
      return;
    }

    const previousDisabled = elements.fileInput.disabled;
    elements.fileInput.disabled = true;

    let objectURL: string | null = null;
    try {
      if (config.preview !== false) {
        objectURL = URL.createObjectURL(file);
        setPreview(elements, objectURL);
      }

      setStatus(elements, 'Uploading…');
      const url = await uploadFile(elements, endpoint, file);
      elements.urlInput.value = url;
      if (config.preview !== false) setPreview(elements, url);
      setStatus(elements, 'Uploaded');
      window.setTimeout(() => clearStatus(elements), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showError(elements, message);
      if (config.preview !== false) {
        const existing = elements.urlInput.value?.trim();
        setPreview(elements, existing || null);
      }
    } finally {
      if (objectURL) URL.revokeObjectURL(objectURL);
      elements.fileInput.disabled = previousDisabled;
    }
  });
}

export function initFileUploaders(scope: ParentNode = document): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-component="file_uploader"], [data-file-uploader]'));
  roots.forEach((root) => initUploader(root));
}

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => initFileUploaders());


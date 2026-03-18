import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';

export interface PDFPageViewport {
  width: number;
  height: number;
  rotation?: number;
}

export interface PDFRenderTask {
  promise: Promise<unknown>;
}

export interface PDFRenderContext {
  canvasContext: CanvasRenderingContext2D | null;
  viewport: PDFPageViewport;
}

export interface PDFPageProxy {
  getViewport(options: { scale: number }): PDFPageViewport;
  render(options: PDFRenderContext): PDFRenderTask;
}

export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFLoadingTask<TDocument extends PDFDocumentProxy = PDFDocumentProxy> {
  promise: Promise<TDocument>;
}

export interface PdfLoadDocumentOptions {
  url: string;
  withCredentials?: boolean;
  surface?: string;
  documentId?: string;
}

export interface NormalizedPdfLoadError {
  code: string;
  message: string;
  suggestion: string;
  rawMessage: string;
  status: number | null;
  isRetryable: boolean;
  surface: string;
  documentId: string | null;
  url: string | null;
  workerMode: 'dedicated_worker';
  version: string;
}

interface PdfJsRuntime {
  version?: string;
  GlobalWorkerOptions?: {
    workerSrc?: string;
  };
  getDocument(
    src:
      | string
      | {
          url: string;
          withCredentials?: boolean;
        },
  ): PDFLoadingTask;
}

const runtime = pdfjsLib as unknown as PdfJsRuntime;
const DEFAULT_PDF_SURFACE = 'unknown';
const PDF_WORKER_SRC = new URL(
  /* @vite-ignore */
  '../pdf.worker.min.mjs',
  import.meta.url,
).toString();
let configuredWorkerSrc: string | null = null;

function getPdfRuntimeVersion(): string {
  return String(runtime.version || 'unknown').trim() || 'unknown';
}

function extractStatusCode(rawMessage: string): number | null {
  const match = rawMessage.match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (!match) {
    return null;
  }

  const status = parseInt(match[1] || match[2] || match[3], 10);
  if (Number.isNaN(status) || status < 400 || status > 599) {
    return null;
  }

  return status;
}

export function getPdfWorkerSrc(): string {
  return PDF_WORKER_SRC;
}

export function ensurePdfWorkerConfigured(): string {
  if (!runtime.GlobalWorkerOptions) {
    throw new Error('PDF worker configuration is unavailable.');
  }

  if (configuredWorkerSrc !== PDF_WORKER_SRC || runtime.GlobalWorkerOptions.workerSrc !== PDF_WORKER_SRC) {
    runtime.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    configuredWorkerSrc = PDF_WORKER_SRC;
  }

  return PDF_WORKER_SRC;
}

export function getPdfJs(): PdfJsRuntime {
  ensurePdfWorkerConfigured();
  return runtime;
}

export function loadPdfDocument<TDocument extends PDFDocumentProxy = PDFDocumentProxy>(
  options: PdfLoadDocumentOptions,
): PDFLoadingTask<TDocument> {
  const pdf = getPdfJs();
  const withCredentials =
    typeof options.withCredentials === 'boolean' ? options.withCredentials : null;
  const source = withCredentials === null
    ? options.url
    : {
        url: options.url,
        withCredentials,
      };

  return pdf.getDocument(source) as PDFLoadingTask<TDocument>;
}

export function normalizePdfLoadError(
  error: unknown,
  context: Partial<PdfLoadDocumentOptions> = {},
): NormalizedPdfLoadError {
  const rawMessage = error instanceof Error
    ? String(error.message || error.name || 'Failed to load PDF')
    : typeof error === 'string'
      ? error
      : 'Failed to load PDF';
  const normalizedMessage = rawMessage.trim() || 'Failed to load PDF';
  const lowercaseMessage = normalizedMessage.toLowerCase();
  const status = extractStatusCode(normalizedMessage);

  let code = 'pdf_load_failed';
  let message = 'Preview unavailable';
  let suggestion = 'Unable to load the document preview.';
  let isRetryable = true;

  if (
    lowercaseMessage.includes('globalworkeroptions.workersrc') ||
    lowercaseMessage.includes('worker configuration') ||
    lowercaseMessage.includes('worker src')
  ) {
    code = 'pdf_worker_configuration';
    message = 'Preview unavailable';
    suggestion = 'The document preview is temporarily unavailable. Please try again.';
  } else if (
    lowercaseMessage.includes('network') ||
    lowercaseMessage.includes('failed to fetch') ||
    lowercaseMessage.includes('connection')
  ) {
    code = 'pdf_network_error';
    message = 'Connection problem';
    suggestion = 'Please check your connection and try again.';
  } else if (status === 401) {
    code = 'pdf_unauthorized';
    message = 'Unable to access this document';
    suggestion = 'Please sign in again and try again.';
    isRetryable = false;
  } else if (status === 403) {
    code = 'pdf_forbidden';
    message = 'Access denied';
    suggestion = 'You do not have permission to view this document.';
    isRetryable = false;
  } else if (status === 404) {
    code = 'pdf_not_found';
    message = 'Document not found';
    suggestion = 'This document may have been moved or deleted.';
    isRetryable = false;
  } else if (status !== null && status >= 500) {
    code = 'pdf_server_error';
    message = 'Service temporarily unavailable';
    suggestion = 'Please try again in a moment.';
  } else if (
    lowercaseMessage.includes('invalidpdf') ||
    lowercaseMessage.includes('invalid pdf') ||
    lowercaseMessage.includes('corrupt') ||
    lowercaseMessage.includes('malformed')
  ) {
    code = 'pdf_invalid';
    message = 'Unsupported PDF';
    suggestion = 'This PDF could not be rendered for preview.';
    isRetryable = false;
  } else if (lowercaseMessage.includes('password')) {
    code = 'pdf_password_protected';
    message = 'Password-protected PDF';
    suggestion = 'This PDF requires a password and cannot be previewed here.';
    isRetryable = false;
  }

  return {
    code,
    message,
    suggestion,
    rawMessage: normalizedMessage,
    status,
    isRetryable,
    surface: String(context.surface || DEFAULT_PDF_SURFACE),
    documentId: context.documentId ? String(context.documentId) : null,
    url: context.url ? String(context.url) : null,
    workerMode: 'dedicated_worker',
    version: getPdfRuntimeVersion(),
  };
}

export function logPdfLoadError(
  error: unknown,
  context: Partial<PdfLoadDocumentOptions> = {},
): NormalizedPdfLoadError {
  const normalized = normalizePdfLoadError(error, context);
  console.error('[esign-pdf]', normalized);
  return normalized;
}

import { appendCSRFHeader } from './transport/http-client.js';

export const ENHANCED_ACTION_HEADER = 'X-Enhanced-Action';
export const ENHANCED_ACTION_ACCEPT = 'application/vnd.admin.enhanced+json';
export const ENHANCED_ACTION_HEADER_VALUE = '1';

export type EnhancedFragmentMode = 'replace';
export type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | string;

export interface EnhancedActionToast {
  type?: EnhancedToastType;
  message?: string;
}

export interface EnhancedActionFragment {
  selector?: string;
  mode?: EnhancedFragmentMode | string;
  html?: string;
}

export interface EnhancedActionError {
  message?: string;
  fields?: Record<string, string>;
}

export interface EnhancedActionEnvelope {
  version?: number;
  ok?: boolean;
  toast?: EnhancedActionToast;
  toasts?: EnhancedActionToast[];
  fragments?: EnhancedActionFragment[];
  focus?: string;
  redirect?: string;
  error?: EnhancedActionError;
}

export interface EnhancedActionRuntimeOptions {
  fetch?: typeof fetch;
  document?: Document;
  toast?: EnhancedToastSink;
  requestHeader?: string;
  requestHeaderValue?: string;
  accept?: string;
  onFragmentsApplied?: (fragments: EnhancedActionFragment[]) => void | Promise<void>;
}

export interface EnhancedActionController {
  destroy(): void;
}

export interface EnhancedToastSink {
  success?: (message: string) => void;
  error?: (message: string) => void;
  warning?: (message: string) => void;
  info?: (message: string) => void;
  show?: (message: string, type?: string) => void;
}

type BusyState = {
  controls: Array<{ control: HTMLButtonElement | HTMLInputElement; disabled: boolean }>;
  busy: string | null;
};

export function initEnhancedActions(
  root: Document | HTMLElement = document,
  options: EnhancedActionRuntimeOptions = {},
): EnhancedActionController {
  const doc = options.document ?? ownerDocument(root);
  const handleSubmit = (event: SubmitEvent) => {
    const form = formFromSubmitTarget(event.target, doc);
    if (!form || !form.matches('form[data-enhance-action]')) {
      return;
    }
    if (!canEnhance(options.fetch ?? globalThis.fetch, form.ownerDocument)) {
      return;
    }
    event.preventDefault();
    void submitEnhancedForm(form, event.submitter, { ...options, document: doc });
  };
  root.addEventListener('submit', handleSubmit as EventListener);
  return {
    destroy() {
      root.removeEventListener('submit', handleSubmit as EventListener);
    },
  };
}

export async function submitEnhancedForm(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
  options: EnhancedActionRuntimeOptions = {},
): Promise<EnhancedActionEnvelope | null> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!canEnhance(fetchImpl, form.ownerDocument)) {
    return null;
  }
  const action = resolveFormAction(form, submitter);
  if (!action) {
    return null;
  }
  const method = resolveFormMethod(form, submitter);
  const FormDataCtor = formDataConstructor(form.ownerDocument);
  const HeadersCtor = headersConstructor(form.ownerDocument);
  const formData = new FormDataCtor(form);
  appendSubmitterValue(formData, submitter);
  const requestURL = resolveRequestURL(action, method, formData);
  clearEnhancedErrors(form);
  const headers = new HeadersCtor();
  headers.set(enhancedRequestHeader(options), enhancedRequestHeaderValue(options));
  headers.set('Accept', enhancedActionAccept(options));
  appendCSRFHeader(requestURL, { method }, headers);

  const busy = setEnhancedBusy(form, true);
  try {
    const response = await fetchImpl(requestURL, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : formData,
      credentials: 'same-origin',
    });
    const envelope = await readEnhancedEnvelope(response);
    if (!response.ok || envelope.ok === false) {
      applyEnhancedErrors(form, envelope);
      showEnhancedToasts(envelope, options.toast);
      focusEnhancedTarget(envelope, options.document ?? form.ownerDocument);
      return envelope;
    }
    await applyEnhancedEnvelope(envelope, options);
    return envelope;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const envelope: EnhancedActionEnvelope = {
      ok: false,
      error: { message },
      toasts: [{ type: 'error', message }],
    };
    applyEnhancedErrors(form, envelope);
    showEnhancedToasts(envelope, options.toast);
    return envelope;
  } finally {
    restoreEnhancedBusy(form, busy);
  }
}

export async function applyEnhancedEnvelope(
  envelope: EnhancedActionEnvelope,
  options: EnhancedActionRuntimeOptions = {},
): Promise<void> {
  const doc = options.document ?? globalThis.document;
  const applied: EnhancedActionFragment[] = [];
  for (const fragment of envelope.fragments ?? []) {
    if (applyEnhancedFragment(doc, fragment)) {
      applied.push(fragment);
    }
  }
  if (applied.length > 0) {
    await reinitializeEnhancedFragments(options);
    await options.onFragmentsApplied?.(applied);
    dispatchEnhancedFragmentsApplied(doc, applied);
  }
  showEnhancedToasts(envelope, options.toast);
  focusEnhancedTarget(envelope, doc);
}

export function applyEnhancedFragment(doc: Document, fragment: EnhancedActionFragment): boolean {
  const selector = String(fragment.selector ?? '').trim();
  const html = String(fragment.html ?? '').trim();
  const mode = String(fragment.mode ?? 'replace').trim() || 'replace';
  if (!selector || !html || mode !== 'replace') {
    return false;
  }
  const target = doc.querySelector(selector);
  if (!target) {
    return false;
  }
  const template = doc.createElement('template');
  template.innerHTML = html;
  const replacement = template.content.firstElementChild;
  if (!replacement) {
    return false;
  }
  target.replaceWith(replacement);
  return true;
}

function canEnhance(fetchImpl?: typeof fetch, doc?: Document): fetchImpl is typeof fetch {
  return typeof fetchImpl === 'function' && !!formDataConstructor(doc) && !!headersConstructor(doc);
}

async function readEnhancedEnvelope(response: Response): Promise<EnhancedActionEnvelope> {
  try {
    const payload = await response.json() as unknown;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as EnhancedActionEnvelope;
    }
  } catch {
    // Fall through to a generic envelope.
  }
  return {
    ok: response.ok,
    error: response.ok ? undefined : { message: `Request failed (${response.status})` },
  };
}

function resolveFormAction(form: HTMLFormElement, submitter: HTMLElement | null): string {
  const submitterAction = submitter?.getAttribute('formaction')?.trim();
  return submitterAction || form.getAttribute('action')?.trim() || form.action || '';
}

function resolveFormMethod(form: HTMLFormElement, submitter: HTMLElement | null): string {
  const submitterMethod = submitter?.getAttribute('formmethod')?.trim();
  return (submitterMethod || form.getAttribute('method') || form.method || 'GET').trim().toUpperCase() || 'GET';
}

function formFromSubmitTarget(target: EventTarget | null, doc: Document): HTMLFormElement | null {
  const win = doc.defaultView;
  if (win?.HTMLFormElement && target instanceof win.HTMLFormElement) {
    return target;
  }
  if (typeof HTMLFormElement !== 'undefined' && target instanceof HTMLFormElement) {
    return target;
  }
  return null;
}

function formDataConstructor(doc?: Document): typeof FormData {
  const win = doc?.defaultView;
  return win?.FormData ?? globalThis.FormData;
}

function headersConstructor(doc?: Document): typeof Headers {
  const win = doc?.defaultView;
  return win?.Headers ?? globalThis.Headers;
}

function enhancedRequestHeader(options: EnhancedActionRuntimeOptions): string {
  return String(options.requestHeader || ENHANCED_ACTION_HEADER).trim() || ENHANCED_ACTION_HEADER;
}

function enhancedRequestHeaderValue(options: EnhancedActionRuntimeOptions): string {
  return String(options.requestHeaderValue || ENHANCED_ACTION_HEADER_VALUE).trim() || ENHANCED_ACTION_HEADER_VALUE;
}

function enhancedActionAccept(options: EnhancedActionRuntimeOptions): string {
  return String(options.accept || ENHANCED_ACTION_ACCEPT).trim() || ENHANCED_ACTION_ACCEPT;
}

function resolveRequestURL(action: string, method: string, body: FormData): string {
  if (method !== 'GET' && method !== 'HEAD') {
    return action;
  }
  const params = new URLSearchParams();
  body.forEach((value, name) => {
    params.append(name, typeof value === 'string' ? value : value.name);
  });
  const encoded = params.toString();
  if (!encoded) {
    return action;
  }
  try {
    const base = typeof location !== 'undefined' && location?.href ? location.href : undefined;
    const url = new URL(action, base);
    params.forEach((value, name) => {
      url.searchParams.append(name, value);
    });
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(action) || action.startsWith('//')) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const hashIndex = action.indexOf('#');
    const prefix = hashIndex >= 0 ? action.slice(0, hashIndex) : action;
    const hash = hashIndex >= 0 ? action.slice(hashIndex) : '';
    const separator = prefix.includes('?') ? '&' : '?';
    return `${prefix}${separator}${encoded}${hash}`;
  }
}

function appendSubmitterValue(body: FormData, submitter: HTMLElement | null): void {
  if (!isSubmitterControl(submitter)) {
    return;
  }
  const name = submitter.getAttribute('name')?.trim();
  if (!name || body.has(name)) {
    return;
  }
  body.append(name, submitter.getAttribute('value') ?? '');
}

function isSubmitterControl(submitter: HTMLElement | null): submitter is HTMLButtonElement | HTMLInputElement {
  if (!submitter) {
    return false;
  }
  const win = submitter.ownerDocument?.defaultView;
  if (win?.HTMLButtonElement && submitter instanceof win.HTMLButtonElement) {
    return true;
  }
  if (win?.HTMLInputElement && submitter instanceof win.HTMLInputElement) {
    return true;
  }
  if (typeof HTMLButtonElement !== 'undefined' && submitter instanceof HTMLButtonElement) {
    return true;
  }
  return typeof HTMLInputElement !== 'undefined' && submitter instanceof HTMLInputElement;
}

function setEnhancedBusy(form: HTMLFormElement, busy: boolean): BusyState {
  const state: BusyState = {
    controls: [],
    busy: form.getAttribute('aria-busy'),
  };
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
  for (const control of Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"], input[type="button"]'))) {
    state.controls.push({ control, disabled: control.disabled });
    control.disabled = busy || control.disabled;
  }
  return state;
}

function restoreEnhancedBusy(form: HTMLFormElement, state: BusyState): void {
  if (state.busy === null) {
    form.removeAttribute('aria-busy');
  } else {
    form.setAttribute('aria-busy', state.busy);
  }
  for (const item of state.controls) {
    item.control.disabled = item.disabled;
  }
}

function showEnhancedToasts(envelope: EnhancedActionEnvelope, explicitToast?: EnhancedToastSink): void {
  const sink = explicitToast ?? getEnhancedWindow().toastManager;
  const toasts = [...(envelope.toasts ?? [])];
  if (envelope.toast) {
    toasts.unshift(envelope.toast);
  }
  for (const toast of toasts) {
    const message = String(toast.message ?? '').trim();
    if (!message) {
      continue;
    }
    const type = String(toast.type ?? 'info').trim() || 'info';
    const typed = sink?.[type as keyof EnhancedToastSink];
    if (typeof typed === 'function') {
      typed.call(sink, message);
    } else if (typeof sink?.show === 'function') {
      sink.show(message, type);
    }
  }
}

function focusEnhancedTarget(envelope: EnhancedActionEnvelope, doc: Document): void {
  const selector = String(envelope.focus ?? '').trim();
  if (!selector) {
    return;
  }
  const target = doc.querySelector<HTMLElement>(selector);
  target?.focus?.();
}

function clearEnhancedErrors(form: HTMLFormElement): void {
  for (const node of Array.from(form.querySelectorAll('[data-enhance-generated-error]'))) {
    node.remove();
  }
  for (const field of Array.from(form.querySelectorAll<HTMLElement>('[aria-invalid="true"]'))) {
    field.removeAttribute('aria-invalid');
  }
}

function applyEnhancedErrors(form: HTMLFormElement, envelope: EnhancedActionEnvelope): void {
  const fields = envelope.error?.fields ?? {};
  for (const [field, message] of Object.entries(fields)) {
    const input = form.querySelector<HTMLElement>(`[name="${cssEscape(field)}"]`);
    if (!input) {
      continue;
    }
    input.setAttribute('aria-invalid', 'true');
    const error = form.ownerDocument.createElement('div');
    error.setAttribute('data-enhance-generated-error', 'true');
    error.setAttribute('data-enhance-field-error-for', field);
    error.className = 'mt-1 text-xs text-rose-600';
    error.textContent = message;
    input.insertAdjacentElement('afterend', error);
  }
  const message = String(envelope.error?.message ?? '').trim();
  if (!message) {
    return;
  }
  const targetSelector = form.getAttribute('data-enhance-error-target')?.trim();
  const target = targetSelector ? form.ownerDocument.querySelector<HTMLElement>(targetSelector) : null;
  if (target) {
    target.textContent = message;
    target.removeAttribute('hidden');
  }
}

function cssEscape(value: string): string {
  const css = globalThis.CSS as ({ escape?: (value: string) => string } | undefined);
  if (typeof css?.escape === 'function') {
    return css.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

async function reinitializeEnhancedFragments(options: EnhancedActionRuntimeOptions): Promise<void> {
  const rel = getEnhancedWindow().FormgenRelationships;
  if (typeof rel?.initRelationships === 'function') {
    await rel.initRelationships();
  }
}

function getEnhancedWindow(): {
  toastManager?: EnhancedToastSink;
  FormgenRelationships?: {
    initRelationships?: () => Promise<unknown> | unknown;
  };
} {
  return (globalThis.window ?? {}) as {
    toastManager?: EnhancedToastSink;
    FormgenRelationships?: {
      initRelationships?: () => Promise<unknown> | unknown;
    };
  };
}

function dispatchEnhancedFragmentsApplied(doc: Document, fragments: EnhancedActionFragment[]): void {
  const event = new CustomEvent('go-admin:enhanced-fragments-applied', {
    bubbles: true,
    detail: { fragments },
  });
  doc.dispatchEvent(event);
}

function ownerDocument(root: Document | HTMLElement): Document {
  return root instanceof Document ? root : root.ownerDocument;
}

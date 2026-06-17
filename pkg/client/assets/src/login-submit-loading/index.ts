import { onReady } from '../shared/dom-ready.js';

export const SUBMIT_LOADING_FORM_SELECTOR = 'form[data-submit-loading-form]';
export const SUBMIT_LOADING_ACTIVE_VALUE = 'true';

export interface SubmitLoadingOptions {
  formSelector?: string;
  root?: Document | HTMLElement;
  window?: Window;
}

export interface SubmitLoadingController {
  reset(): void;
  destroy(): void;
}

type SubmitControl = HTMLButtonElement | HTMLInputElement;

interface ControlState {
  control: SubmitControl;
  disabled: boolean;
  ariaLabel: string | null;
}

interface FormOverrideState {
  action: string | null;
  method: string | null;
  enctype: string | null;
  target: string | null;
  noValidate: boolean;
}

interface FormLoadingState {
  ariaBusy: string | null;
  controls: ControlState[];
  generatedInputs: HTMLInputElement[];
  overrides: FormOverrideState | null;
}

const formStates = new WeakMap<HTMLFormElement, FormLoadingState>();
const handledSubmitEvents = new WeakSet<Event>();

function ownerDocument(root: Document | HTMLElement): Document {
  return root.nodeType === 9 ? root as Document : (root as HTMLElement).ownerDocument || document;
}

function matchesSubmitLoadingForm(
  target: EventTarget | null,
  selector: string,
  doc: Document,
): HTMLFormElement | null {
  const win = doc.defaultView;
  if (win?.HTMLFormElement && target instanceof win.HTMLFormElement && target.matches(selector)) {
    return target;
  }
  if (typeof HTMLFormElement !== 'undefined' && target instanceof HTMLFormElement && target.matches(selector)) {
    return target;
  }
  return null;
}

function isSubmitControl(control: Element): control is SubmitControl {
  const tagName = control.tagName.toLowerCase();
  if (tagName === 'button') {
    return true;
  }
  if (tagName !== 'input') {
    return false;
  }
  const type = (control.getAttribute('type') || 'text').trim().toLowerCase();
  return type === 'submit' || type === 'button' || type === 'image';
}

function isNativeSubmitter(control: Element | null): control is SubmitControl {
  if (!control) {
    return false;
  }
  const tagName = control.tagName.toLowerCase();
  if (tagName === 'button') {
    const type = (control.getAttribute('type') || 'submit').trim().toLowerCase();
    return type === 'submit';
  }
  if (tagName !== 'input') {
    return false;
  }
  const type = (control.getAttribute('type') || 'text').trim().toLowerCase();
  return type === 'submit' || type === 'image';
}

function submitControls(form: HTMLFormElement): SubmitControl[] {
  return Array.from(form.querySelectorAll<SubmitControl>('button, input[type="submit"], input[type="button"], input[type="image"]'))
    .filter(isSubmitControl);
}

function submitterFromEvent(event: SubmitEvent, form: HTMLFormElement, doc: Document): SubmitControl | null {
  const submitter = event.submitter;
  if (!submitter) {
    return null;
  }
  const win = doc.defaultView;
  if (
    (win?.HTMLButtonElement && submitter instanceof win.HTMLButtonElement)
    || (win?.HTMLInputElement && submitter instanceof win.HTMLInputElement)
    || (typeof HTMLButtonElement !== 'undefined' && submitter instanceof HTMLButtonElement)
    || (typeof HTMLInputElement !== 'undefined' && submitter instanceof HTMLInputElement)
  ) {
    return submitter.form === form ? submitter : null;
  }
  return null;
}

function submitterSkipsValidation(form: HTMLFormElement, submitter: SubmitControl | null): boolean {
  return form.noValidate || submitter?.hasAttribute('formnovalidate') === true || submitter?.formNoValidate === true;
}

function appendGeneratedInput(state: FormLoadingState, form: HTMLFormElement, name: string, value: string): void {
  const input = form.ownerDocument.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  input.dataset.submitLoadingGenerated = SUBMIT_LOADING_ACTIVE_VALUE;
  form.appendChild(input);
  state.generatedInputs.push(input);
}

function preserveSubmitterSemantics(
  form: HTMLFormElement,
  submitter: SubmitControl | null,
  state: FormLoadingState,
): void {
  if (!submitter || !isNativeSubmitter(submitter) || submitter.disabled) {
    return;
  }

  const overrideState: FormOverrideState = {
    action: form.getAttribute('action'),
    method: form.getAttribute('method'),
    enctype: form.getAttribute('enctype'),
    target: form.getAttribute('target'),
    noValidate: form.noValidate,
  };
  let hasOverrides = false;

  const overrideAttributes: Array<[string, keyof Pick<FormOverrideState, 'action' | 'method' | 'enctype' | 'target'>]> = [
    ['formaction', 'action'],
    ['formmethod', 'method'],
    ['formenctype', 'enctype'],
    ['formtarget', 'target'],
  ];

  for (const [submitterAttr, formAttr] of overrideAttributes) {
    if (submitter.hasAttribute(submitterAttr)) {
      form.setAttribute(formAttr, submitter.getAttribute(submitterAttr) ?? '');
      hasOverrides = true;
    }
  }

  if (submitter.hasAttribute('formnovalidate') || submitter.formNoValidate) {
    form.noValidate = true;
    hasOverrides = true;
  }

  if (hasOverrides) {
    state.overrides = overrideState;
  }

  const name = submitter.getAttribute('name')?.trim();
  if (!name) {
    return;
  }

  const type = submitter.tagName.toLowerCase() === 'input'
    ? (submitter.getAttribute('type') || 'text').trim().toLowerCase()
    : 'submit';
  if (type === 'image') {
    appendGeneratedInput(state, form, `${name}.x`, '0');
    appendGeneratedInput(state, form, `${name}.y`, '0');
    return;
  }

  appendGeneratedInput(state, form, name, submitter.getAttribute('value') ?? '');
}

function disableSubmitControls(form: HTMLFormElement, submitter: SubmitControl | null, state: FormLoadingState): void {
  const controls = submitControls(form);
  if (submitter && !controls.includes(submitter)) {
    controls.push(submitter);
  }

  for (const control of controls) {
    state.controls.push({
      control,
      disabled: control.disabled,
      ariaLabel: control.getAttribute('aria-label'),
    });
    const busyLabel = control.dataset.submitLoadingBusyLabel?.trim();
    if (busyLabel) {
      control.setAttribute('aria-label', busyLabel);
    }
    control.disabled = true;
  }
}

export function setSubmitLoading(form: HTMLFormElement, submitter: SubmitControl | null = null): void {
  if (form.dataset.submitLoadingActive === SUBMIT_LOADING_ACTIVE_VALUE) {
    return;
  }
  const state: FormLoadingState = {
    ariaBusy: form.getAttribute('aria-busy'),
    controls: [],
    generatedInputs: [],
    overrides: null,
  };

  form.setAttribute('aria-busy', 'true');
  form.dataset.loading = SUBMIT_LOADING_ACTIVE_VALUE;
  form.dataset.submitLoadingActive = SUBMIT_LOADING_ACTIVE_VALUE;

  preserveSubmitterSemantics(form, submitter, state);
  disableSubmitControls(form, submitter, state);

  formStates.set(form, state);
}

export function resetSubmitLoading(form: HTMLFormElement): void {
  const state = formStates.get(form);

  if (state) {
    if (state.ariaBusy === null) {
      form.removeAttribute('aria-busy');
    } else {
      form.setAttribute('aria-busy', state.ariaBusy);
    }
    for (const item of state.controls) {
      item.control.disabled = item.disabled;
      if (item.ariaLabel === null) {
        item.control.removeAttribute('aria-label');
      } else {
        item.control.setAttribute('aria-label', item.ariaLabel);
      }
    }
    for (const input of state.generatedInputs) {
      input.remove();
    }
    if (state.overrides) {
      if (state.overrides.action === null) {
        form.removeAttribute('action');
      } else {
        form.setAttribute('action', state.overrides.action);
      }
      if (state.overrides.method === null) {
        form.removeAttribute('method');
      } else {
        form.setAttribute('method', state.overrides.method);
      }
      if (state.overrides.enctype === null) {
        form.removeAttribute('enctype');
      } else {
        form.setAttribute('enctype', state.overrides.enctype);
      }
      if (state.overrides.target === null) {
        form.removeAttribute('target');
      } else {
        form.setAttribute('target', state.overrides.target);
      }
      form.noValidate = state.overrides.noValidate;
    }
  } else {
    if (form.dataset.submitLoadingActive === SUBMIT_LOADING_ACTIVE_VALUE || form.dataset.loading === SUBMIT_LOADING_ACTIVE_VALUE) {
      form.removeAttribute('aria-busy');
    }
  }

  delete form.dataset.loading;
  delete form.dataset.submitLoadingActive;
  formStates.delete(form);
}

export function resetSubmitLoadingForms(
  root: Document | HTMLElement = document,
  selector = SUBMIT_LOADING_FORM_SELECTOR,
): void {
  root.querySelectorAll<HTMLFormElement>(selector).forEach((form) => {
    if (
      formStates.has(form)
      || form.dataset.submitLoadingActive === SUBMIT_LOADING_ACTIVE_VALUE
      || form.dataset.loading === SUBMIT_LOADING_ACTIVE_VALUE
    ) {
      resetSubmitLoading(form);
    }
  });
}

export function initSubmitLoadingForms(options: SubmitLoadingOptions = {}): SubmitLoadingController {
  const root = options.root ?? document;
  const selector = options.formSelector || SUBMIT_LOADING_FORM_SELECTOR;
  const doc = ownerDocument(root);
  const win = options.window ?? doc.defaultView ?? window;

  const handleSubmit = (event: SubmitEvent): void => {
    const form = matchesSubmitLoadingForm(event.target, selector, doc);
    if (!form || event.defaultPrevented) {
      return;
    }
    if (handledSubmitEvents.has(event)) {
      return;
    }
    if (form.dataset.submitLoadingActive === SUBMIT_LOADING_ACTIVE_VALUE) {
      event.preventDefault();
      return;
    }
    const submitter = submitterFromEvent(event, form, doc);
    if (!submitterSkipsValidation(form, submitter) && typeof form.checkValidity === 'function' && !form.checkValidity()) {
      return;
    }
    handledSubmitEvents.add(event);
    setSubmitLoading(form, submitter);
  };

  const handlePageShow = (): void => {
    resetSubmitLoadingForms(root, selector);
  };

  root.addEventListener('submit', handleSubmit as EventListener);
  win?.addEventListener('pageshow', handlePageShow);

  return {
    reset() {
      resetSubmitLoadingForms(root, selector);
    },
    destroy() {
      root.removeEventListener('submit', handleSubmit as EventListener);
      win?.removeEventListener('pageshow', handlePageShow);
    },
  };
}

export function bootstrapSubmitLoadingForms(options: SubmitLoadingOptions = {}): void {
  onReady(() => {
    initSubmitLoadingForms(options);
  });
}

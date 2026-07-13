export const BUSY_ACTIVE_VALUE = 'true';

export type BusyControl = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type BusyRoot = HTMLElement | HTMLFormElement;

export interface BusyOptions {
  controls?: Array<Element | null | undefined>;
  includeDescendantControls?: boolean;
  submitter?: Element | null;
  label?: string;
  generateSpinner?: boolean;
  compatibilitySubmitLoading?: boolean;
}

export interface BusyController {
  readonly root: BusyRoot;
  reset(): void;
}

interface ControlState {
  control: BusyControl;
  disabled: boolean;
  ariaLabel: string | null;
}

interface LabelState {
  element: HTMLElement;
  textContent: string | null;
  innerHTML?: string;
}

interface InputValueState {
  input: HTMLInputElement;
  value: string;
}

interface SpinnerState {
  element: HTMLElement;
  hidden: boolean;
}

interface FormOverrideState {
  action: string | null;
  method: string | null;
  enctype: string | null;
  target: string | null;
  noValidate: boolean;
}

interface BusyState {
  root: BusyRoot;
  ariaBusy: string | null;
  dataBusy: string | undefined;
  dataLoading: string | undefined;
  dataSubmitLoadingActive: string | undefined;
  controls: ControlState[];
  labels: LabelState[];
  inputValues: InputValueState[];
  spinners: SpinnerState[];
  generatedInputs: HTMLInputElement[];
  generatedSpinners: HTMLElement[];
  overrides: FormOverrideState | null;
}

const busyStates = new WeakMap<BusyRoot, BusyState>();

export function isBusy(root: BusyRoot | null | undefined): boolean {
  if (!root) {
    return false;
  }
  return busyStates.has(root)
    || root.dataset.busy === BUSY_ACTIVE_VALUE
    || root.dataset.submitLoadingActive === BUSY_ACTIVE_VALUE
    || root.getAttribute('aria-busy') === BUSY_ACTIVE_VALUE;
}

export function setBusy(root: BusyRoot, options: BusyOptions = {}): BusyController {
  const existing = busyStates.get(root);
  if (existing) {
    return controllerFor(existing);
  }

  const state: BusyState = {
    root,
    ariaBusy: root.getAttribute('aria-busy'),
    dataBusy: root.dataset.busy,
    dataLoading: root.dataset.loading,
    dataSubmitLoadingActive: root.dataset.submitLoadingActive,
    controls: [],
    labels: [],
    inputValues: [],
    spinners: [],
    generatedInputs: [],
    generatedSpinners: [],
    overrides: null,
  };

  root.setAttribute('aria-busy', BUSY_ACTIVE_VALUE);
  root.dataset.busy = BUSY_ACTIVE_VALUE;
  if (options.compatibilitySubmitLoading || root.hasAttribute('data-submit-loading-form')) {
    root.dataset.loading = BUSY_ACTIVE_VALUE;
    root.dataset.submitLoadingActive = BUSY_ACTIVE_VALUE;
  }

  if (isForm(root)) {
    preserveSubmitterSemantics(root, submitControlFromElement(options.submitter), state);
  }

  const controls = resolveBusyControls(root, options);
  for (const control of controls) {
    captureControl(control, state);
    applyControlBusy(control, options, state);
  }

  busyStates.set(root, state);
  return controllerFor(state);
}

export function resetBusy(root: BusyRoot | null | undefined): void {
  if (!root) {
    return;
  }
  const state = busyStates.get(root);
  if (!state) {
    if (root.dataset.busy === BUSY_ACTIVE_VALUE) {
      delete root.dataset.busy;
      root.removeAttribute('aria-busy');
    }
    if (root.dataset.submitLoadingActive === BUSY_ACTIVE_VALUE || root.dataset.loading === BUSY_ACTIVE_VALUE) {
      delete root.dataset.loading;
      delete root.dataset.submitLoadingActive;
    }
    return;
  }

  restoreAttribute(root, 'aria-busy', state.ariaBusy);
  restoreDatasetValue(root, 'busy', state.dataBusy);
  restoreDatasetValue(root, 'loading', state.dataLoading);
  restoreDatasetValue(root, 'submitLoadingActive', state.dataSubmitLoadingActive);

  for (const item of state.controls) {
    item.control.disabled = item.disabled;
    restoreAttribute(item.control, 'aria-label', item.ariaLabel);
  }
  for (const item of state.labels) {
    if (item.innerHTML !== undefined) {
      item.element.innerHTML = item.innerHTML;
    } else {
      item.element.textContent = item.textContent;
    }
  }
  for (const item of state.inputValues) {
    item.input.value = item.value;
  }
  for (const item of state.spinners) {
    item.element.hidden = item.hidden;
  }
  for (const input of state.generatedInputs) {
    input.remove();
  }
  for (const spinner of state.generatedSpinners) {
    spinner.remove();
  }
  if (state.overrides && isForm(root)) {
    restoreFormOverrides(root, state.overrides);
  }

  busyStates.delete(root);
}

export function resetBusyWithin(root: Document | HTMLElement = document): void {
  const doc = ownerDocument(root);
  const candidates: BusyRoot[] = [];
  if (isHTMLElement(root) && isBusy(root)) {
    candidates.push(root);
  }
  root.querySelectorAll<HTMLElement>('[data-busy="true"], [data-submit-loading-active="true"], [aria-busy="true"]').forEach((node) => {
    if (isHTMLElement(node)) {
      candidates.push(node);
    }
  });
  doc.querySelectorAll<HTMLFormElement>('form[data-submit-loading-form][data-loading="true"]').forEach((form) => {
    if ((root as Document | HTMLElement).contains?.(form) || root === doc) {
      candidates.push(form);
    }
  });
  for (const candidate of Array.from(new Set(candidates))) {
    resetBusy(candidate);
  }
}

export function submitterSkipsValidation(form: HTMLFormElement, submitter: Element | null): boolean {
  const control = submitControlFromElement(submitter);
  return form.noValidate || control?.hasAttribute('formnovalidate') === true || control?.formNoValidate === true;
}

export function submitsOutsideCurrentContext(form: HTMLFormElement, submitter: Element | null): boolean {
  return targetsOutsideCurrentContext(
    form.ownerDocument,
    effectiveSubmitTarget(form, submitControlFromElement(submitter)),
  );
}

export function targetsOutsideCurrentContext(
  doc: Document,
  explicitTarget: string | null | undefined,
): boolean {
  const target = resolveBrowsingContextTarget(doc, explicitTarget).toLowerCase();
  return target !== '' && target !== '_self';
}

function controllerFor(state: BusyState): BusyController {
  return {
    root: state.root,
    reset() {
      resetBusy(state.root);
    },
  };
}

function ownerDocument(root: Document | HTMLElement): Document {
  return root.nodeType === 9 ? root as Document : (root as HTMLElement).ownerDocument || document;
}

function isHTMLElement(value: unknown): value is HTMLElement {
  const doc = (value as HTMLElement | null)?.ownerDocument;
  const win = doc?.defaultView;
  return !!value && (
    (win?.HTMLElement && value instanceof win.HTMLElement)
    || (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement)
  );
}

function isForm(value: unknown): value is HTMLFormElement {
  const doc = (value as HTMLElement | null)?.ownerDocument;
  const win = doc?.defaultView;
  return !!value && (
    (win?.HTMLFormElement && value instanceof win.HTMLFormElement)
    || (typeof HTMLFormElement !== 'undefined' && value instanceof HTMLFormElement)
  );
}

function isBusyControl(value: unknown): value is BusyControl {
  const doc = (value as HTMLElement | null)?.ownerDocument;
  const win = doc?.defaultView;
  return !!value && (
    (win?.HTMLButtonElement && value instanceof win.HTMLButtonElement)
    || (win?.HTMLInputElement && value instanceof win.HTMLInputElement)
    || (win?.HTMLTextAreaElement && value instanceof win.HTMLTextAreaElement)
    || (win?.HTMLSelectElement && value instanceof win.HTMLSelectElement)
    || (typeof HTMLButtonElement !== 'undefined' && value instanceof HTMLButtonElement)
    || (typeof HTMLInputElement !== 'undefined' && value instanceof HTMLInputElement)
    || (typeof HTMLTextAreaElement !== 'undefined' && value instanceof HTMLTextAreaElement)
    || (typeof HTMLSelectElement !== 'undefined' && value instanceof HTMLSelectElement)
  );
}

function submitControlFromElement(value: Element | null | undefined): HTMLButtonElement | HTMLInputElement | null {
  if (!value) {
    return null;
  }
  const doc = (value as HTMLElement).ownerDocument;
  const win = doc?.defaultView;
  if (
    (win?.HTMLButtonElement && value instanceof win.HTMLButtonElement)
    || (win?.HTMLInputElement && value instanceof win.HTMLInputElement)
    || (typeof HTMLButtonElement !== 'undefined' && value instanceof HTMLButtonElement)
    || (typeof HTMLInputElement !== 'undefined' && value instanceof HTMLInputElement)
  ) {
    return value as HTMLButtonElement | HTMLInputElement;
  }
  return null;
}

function isSubmitControl(control: Element): control is HTMLButtonElement | HTMLInputElement {
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

function isNativeSubmitter(control: Element | null): control is HTMLButtonElement | HTMLInputElement {
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

function resolveBusyControls(root: BusyRoot, options: BusyOptions): BusyControl[] {
  const controls: BusyControl[] = [];
  for (const item of options.controls ?? []) {
    if (isBusyControl(item) && !controls.includes(item)) {
      controls.push(item);
    }
  }
  if (isBusyControl(options.submitter) && !controls.includes(options.submitter)) {
    controls.push(options.submitter);
  }
  if (isBusyControl(root) && !controls.includes(root)) {
    controls.push(root);
  }
  if (options.includeDescendantControls !== false) {
    const selector = isForm(root)
      ? 'button, input[type="submit"], input[type="button"], input[type="image"]'
      : 'button, input[type="submit"], input[type="button"], input[type="image"], select, textarea';
    root.querySelectorAll<BusyControl>(selector).forEach((control) => {
      if ((isForm(root) ? isSubmitControl(control) : isBusyControl(control)) && !controls.includes(control)) {
        controls.push(control);
      }
    });
  }
  return controls;
}

function captureControl(control: BusyControl, state: BusyState): void {
  state.controls.push({
    control,
    disabled: control.disabled,
    ariaLabel: control.getAttribute('aria-label'),
  });
}

function applyControlBusy(control: BusyControl, options: BusyOptions, state: BusyState): void {
  const busyLabel = resolveBusyLabel(control, options);
  if (busyLabel) {
    control.setAttribute('aria-label', busyLabel);
    const labelTarget = resolveLabelTarget(control);
    if (labelTarget) {
      state.labels.push({ element: labelTarget, textContent: labelTarget.textContent });
      labelTarget.textContent = busyLabel;
    } else if (control instanceof HTMLButtonElement) {
      state.labels.push({
        element: control,
        textContent: control.textContent,
        innerHTML: control.innerHTML,
      });
      control.textContent = busyLabel;
    } else if (control instanceof HTMLInputElement) {
      state.inputValues.push({ input: control, value: control.value });
      control.value = busyLabel;
    }
  }
  const spinner = resolveSpinner(control) || maybeGenerateSpinner(control, options, state);
  if (spinner) {
    state.spinners.push({ element: spinner, hidden: spinner.hidden });
    spinner.hidden = false;
  }
  control.disabled = true;
}

function resolveBusyLabel(control: BusyControl, options: BusyOptions): string {
  return String(
    options.label
    || control.getAttribute('data-busy-label')
    || control.getAttribute('data-submit-loading-busy-label')
    || '',
  ).trim();
}

function resolveLabelTarget(control: BusyControl): HTMLElement | null {
  if (control instanceof HTMLInputElement && control.tagName.toLowerCase() === 'input') {
    return null;
  }
  return control.querySelector<HTMLElement>('[data-busy-label-target], [data-submit-loading-label]');
}

function resolveSpinner(control: BusyControl): HTMLElement | null {
  if (control instanceof HTMLInputElement && control.tagName.toLowerCase() === 'input') {
    return null;
  }
  return control.querySelector<HTMLElement>('[data-busy-spinner], .submit-loading-spinner');
}

function maybeGenerateSpinner(control: BusyControl, options: BusyOptions, state: BusyState): HTMLElement | null {
  if (!options.generateSpinner && !control.hasAttribute('data-busy-button')) {
    return null;
  }
  if (control instanceof HTMLInputElement && control.tagName.toLowerCase() === 'input') {
    return null;
  }
  const spinner = control.ownerDocument.createElement('span');
  spinner.setAttribute('data-busy-spinner', '');
  spinner.setAttribute('data-busy-generated-spinner', 'true');
  spinner.setAttribute('aria-hidden', 'true');
  spinner.className = 'busy-spinner';
  control.insertBefore(spinner, control.firstChild);
  state.generatedSpinners.push(spinner);
  return spinner;
}

function appendGeneratedInput(
  state: BusyState,
  form: HTMLFormElement,
  name: string,
  value: string,
  after: Element | null = null,
): HTMLInputElement {
  const input = form.ownerDocument.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  input.dataset.busyGenerated = BUSY_ACTIVE_VALUE;
  input.dataset.submitLoadingGenerated = BUSY_ACTIVE_VALUE;
  if (after && after.parentNode === form) {
    after.after(input);
  } else {
    form.appendChild(input);
  }
  state.generatedInputs.push(input);
  return input;
}

function preserveSubmitterSemantics(
  form: HTMLFormElement,
  submitter: HTMLButtonElement | HTMLInputElement | null,
  state: BusyState,
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
    const xInput = appendGeneratedInput(state, form, `${name}.x`, '0', submitter);
    appendGeneratedInput(state, form, `${name}.y`, '0', xInput);
    return;
  }

  appendGeneratedInput(state, form, name, submitter.getAttribute('value') ?? '', submitter);
}

function effectiveSubmitTarget(form: HTMLFormElement, submitter: HTMLButtonElement | HTMLInputElement | null): string {
  const submitterTarget = submitter?.getAttribute('formtarget');
  if (submitterTarget !== null && submitterTarget !== undefined) {
    return submitterTarget;
  }
  return form.getAttribute('target') ?? '';
}

function resolveBrowsingContextTarget(
  doc: Document,
  explicitTarget: string | null | undefined,
): string {
  const target = String(explicitTarget ?? '').trim();
  if (target) {
    return target;
  }
  return doc.querySelector<HTMLBaseElement>('base[target]')?.getAttribute('target')?.trim() ?? '';
}

function restoreFormOverrides(form: HTMLFormElement, state: FormOverrideState): void {
  restoreAttribute(form, 'action', state.action);
  restoreAttribute(form, 'method', state.method);
  restoreAttribute(form, 'enctype', state.enctype);
  restoreAttribute(form, 'target', state.target);
  form.noValidate = state.noValidate;
}

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}

function restoreDatasetValue(element: HTMLElement, key: string, value: string | undefined): void {
  if (value === undefined) {
    delete element.dataset[key];
  } else {
    element.dataset[key] = value;
  }
}

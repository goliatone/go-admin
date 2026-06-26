import { onReady } from '../shared/dom-ready.js';
import {
  initBehaviors,
  resetBusy,
  setBusy,
  type BehaviorRuntimeController,
} from '../shared/behaviors/index.js';

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

export function setSubmitLoading(form: HTMLFormElement, submitter: SubmitControl | null = null): void {
  setBusy(form, {
    submitter,
    compatibilitySubmitLoading: true,
  });
}

export function resetSubmitLoading(form: HTMLFormElement): void {
  resetBusy(form);
}

export function resetSubmitLoadingForms(
  root: Document | HTMLElement = document,
  selector = SUBMIT_LOADING_FORM_SELECTOR,
): void {
  matchingForms(root, selector).forEach((form) => {
    if (
      form.dataset.submitLoadingActive === SUBMIT_LOADING_ACTIVE_VALUE
      || form.dataset.loading === SUBMIT_LOADING_ACTIVE_VALUE
      || form.dataset.busy === SUBMIT_LOADING_ACTIVE_VALUE
      || form.getAttribute('aria-busy') === SUBMIT_LOADING_ACTIVE_VALUE
    ) {
      resetBusy(form);
    }
  });
}

export function initSubmitLoadingForms(options: SubmitLoadingOptions = {}): SubmitLoadingController {
  const root = options.root ?? document;
  const selector = options.formSelector || SUBMIT_LOADING_FORM_SELECTOR;
  const controller: BehaviorRuntimeController = initBehaviors(root, {
    submitBusySelector: selector,
    window: options.window,
    compatibilitySubmitLoading: true,
  });
  return {
    reset() {
      resetSubmitLoadingForms(root, selector);
    },
    destroy() {
      controller.destroy();
    },
  };
}

export function bootstrapSubmitLoadingForms(options: SubmitLoadingOptions = {}): void {
  onReady(() => {
    initSubmitLoadingForms(options);
  });
}

function matchingForms(root: Document | HTMLElement, selector: string): HTMLFormElement[] {
  const forms: HTMLFormElement[] = [];
  if (isForm(root) && root.matches(selector)) {
    forms.push(root);
  }
  root.querySelectorAll<HTMLFormElement>(selector).forEach((form) => {
    if (!forms.includes(form)) {
      forms.push(form);
    }
  });
  return forms;
}

function isForm(value: Document | HTMLElement): value is HTMLFormElement {
  const win = value.nodeType === 9 ? (value as Document).defaultView : value.ownerDocument?.defaultView;
  return (
    (win?.HTMLFormElement && value instanceof win.HTMLFormElement)
    || (typeof HTMLFormElement !== 'undefined' && value instanceof HTMLFormElement)
  );
}

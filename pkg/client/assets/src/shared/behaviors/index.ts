import { onReady } from '../dom-ready.js';
import {
  BUSY_ACTIVE_VALUE,
  isBusy,
  resetBusy,
  resetBusyWithin,
  setBusy,
  submitterSkipsValidation,
  submitsOutsideCurrentContext,
  type BusyController,
} from './busy.js';

export {
  BUSY_ACTIVE_VALUE,
  isBusy,
  resetBusy,
  resetBusyWithin,
  setBusy,
  type BusyController,
  type BusyControl,
  type BusyOptions,
  type BusyRoot,
} from './busy.js';

export interface BehaviorRuntimeOptions {
  submitBusySelector?: string;
  window?: Window;
  listenForFragments?: boolean;
}

export interface BehaviorBootstrapOptions extends BehaviorRuntimeOptions {
  root?: Document | HTMLElement;
}

export interface BehaviorRuntimeController {
  reset(): void;
  destroy(): void;
}

const DEFAULT_SUBMIT_BUSY_SELECTOR = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]';

const rootControllers = new WeakMap<Document | HTMLElement, BehaviorRuntimeController>();
const handledSubmitEvents = new WeakSet<Event>();

export function initBehaviors(
  root: Document | HTMLElement = document,
  options: BehaviorRuntimeOptions = {},
): BehaviorRuntimeController {
  const existing = rootControllers.get(root);
  if (existing) {
    return existing;
  }

  const doc = ownerDocument(root);
  const win = options.window ?? doc.defaultView ?? window;
  const selector = options.submitBusySelector || DEFAULT_SUBMIT_BUSY_SELECTOR;

  const handleSubmit = (event: SubmitEvent): void => {
    const form = formFromSubmitTarget(event.target, doc);
    if (!form || event.defaultPrevented || !form.matches(selector)) {
      return;
    }
    if (handledSubmitEvents.has(event)) {
      return;
    }
    if (isBusy(form)) {
      event.preventDefault();
      return;
    }
    const submitter = submitterFromEvent(event, form, doc);
    if (!submitterSkipsValidation(form, submitter) && typeof form.checkValidity === 'function' && !form.checkValidity()) {
      return;
    }
    handledSubmitEvents.add(event);
    setBusy(form, {
      submitter,
      compatibilitySubmitLoading: form.hasAttribute('data-submit-loading-form'),
    });
    if (submitsOutsideCurrentContext(form, submitter)) {
      win?.setTimeout(() => {
        resetBusy(form);
      }, 0);
    }
  };

  const handlePageShow = (): void => {
    resetBehaviors(root);
  };

  const handleFragmentsApplied = (event: Event): void => {
    const detail = (event as CustomEvent<{ roots?: HTMLElement[]; root?: HTMLElement }>).detail;
    if (Array.isArray(detail?.roots) && detail.roots.length > 0) {
      detail.roots.forEach((fragmentRoot) => initBehaviors(fragmentRoot, options));
      return;
    }
    if (detail?.root) {
      initBehaviors(detail.root, options);
      return;
    }
    initBehaviors(root, options);
  };

  root.addEventListener('submit', handleSubmit as EventListener);
  win?.addEventListener('pageshow', handlePageShow);
  if (options.listenForFragments !== false) {
    doc.addEventListener('go-admin:enhanced-fragments-applied', handleFragmentsApplied as EventListener);
  }

  const controller: BehaviorRuntimeController = {
    reset() {
      resetBehaviors(root);
    },
    destroy() {
      root.removeEventListener('submit', handleSubmit as EventListener);
      win?.removeEventListener('pageshow', handlePageShow);
      doc.removeEventListener('go-admin:enhanced-fragments-applied', handleFragmentsApplied as EventListener);
      rootControllers.delete(root);
    },
  };
  rootControllers.set(root, controller);
  return controller;
}

export function resetBehaviors(root: Document | HTMLElement = document): void {
  resetBusyWithin(root);
}

export function bootstrapBehaviors(options: BehaviorBootstrapOptions = {}): BehaviorRuntimeController {
  const root = options.root ?? document;
  let controller: BehaviorRuntimeController | null = rootControllers.get(root) ?? null;
  onReady(() => {
    controller = initBehaviors(root, options);
  });
  return {
    reset() {
      controller?.reset();
    },
    destroy() {
      controller?.destroy();
    },
  };
}

function ownerDocument(root: Document | HTMLElement): Document {
  return root.nodeType === 9 ? root as Document : (root as HTMLElement).ownerDocument || document;
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

function submitterFromEvent(event: SubmitEvent, form: HTMLFormElement, doc: Document): HTMLButtonElement | HTMLInputElement | null {
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

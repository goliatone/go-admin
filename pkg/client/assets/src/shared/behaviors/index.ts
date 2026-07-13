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
import {
  handleNavigationBusyClick,
  handleNavigationBusySubmit,
  resetNavigationBusyWithin,
} from './navigation.js';

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
export {
  NAVIGATION_BUSY_ROOT_SELECTOR,
  NAVIGATION_BUSY_TRIGGER_SELECTOR,
  isNavigationBusy,
  resetNavigationBusy,
  resetNavigationBusyWithin,
} from './navigation.js';

export interface BehaviorRuntimeOptions {
  submitBusySelector?: string;
  window?: Window;
  listenForFragments?: boolean;
  compatibilitySubmitLoading?: boolean;
}

export interface BehaviorBootstrapOptions extends BehaviorRuntimeOptions {
  root?: Document | HTMLElement;
}

export interface BehaviorRuntimeController {
  reset(): void;
  destroy(): void;
}

const DEFAULT_SUBMIT_BUSY_SELECTOR = 'form[data-behavior~="submit-busy"], form[data-submit-loading-form]';

interface SubmitBusyRule {
  key: string;
  selector: string;
  compatibilitySubmitLoading: boolean;
  controller: BehaviorRuntimeController;
}

interface BehaviorRootState {
  root: Document | HTMLElement;
  doc: Document;
  win: Window | null;
  submitRules: SubmitBusyRule[];
  fragmentListenerAttached: boolean;
  handleClick: (event: MouseEvent) => void;
  handleSubmit: (event: SubmitEvent) => void;
  handlePageShow: () => void;
  handleFragmentsApplied: (event: Event) => void;
}

const rootStates = new WeakMap<Document | HTMLElement, BehaviorRootState>();
const handledSubmitEvents = new WeakSet<Event>();

export function initBehaviors(
  root: Document | HTMLElement = document,
  options: BehaviorRuntimeOptions = {},
): BehaviorRuntimeController {
  const state = rootStates.get(root) ?? createRootState(root, options);
  const rule = addSubmitBusyRule(state, options);
  if (options.listenForFragments !== false) {
    attachFragmentListener(state);
  }
  return rule.controller;
}

function createRootState(
  root: Document | HTMLElement,
  options: BehaviorRuntimeOptions,
): BehaviorRootState {
  const doc = ownerDocument(root);
  const win = options.window ?? doc.defaultView ?? window;

  const handleClick = (event: MouseEvent): void => {
    handleNavigationBusyClick(event, root, win);
  };

  const handleSubmit = (event: SubmitEvent): void => {
    if (handleNavigationBusySubmit(event, root, win)) {
      return;
    }
    const form = formFromSubmitTarget(event.target, doc);
    const rule = form ? matchingSubmitBusyRule(form, state.submitRules) : null;
    if (
      !form
      || !rule
      || event.defaultPrevented
      || form.matches('form[data-enhance-action]')
    ) {
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
      compatibilitySubmitLoading: rule.compatibilitySubmitLoading || form.hasAttribute('data-submit-loading-form'),
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
      detail.roots.forEach((fragmentRoot) => initFragmentRoot(state, fragmentRoot));
      return;
    }
    if (detail?.root) {
      initFragmentRoot(state, detail.root);
      return;
    }
    state.submitRules.forEach((submitRule) => {
      initBehaviors(root, {
        submitBusySelector: submitRule.selector,
        compatibilitySubmitLoading: submitRule.compatibilitySubmitLoading,
        window: win ?? undefined,
        listenForFragments: false,
      });
    });
  };

  const state: BehaviorRootState = {
    root,
    doc,
    win,
    submitRules: [],
    fragmentListenerAttached: false,
    handleClick,
    handleSubmit,
    handlePageShow,
    handleFragmentsApplied,
  };
  root.addEventListener('click', handleClick as EventListener);
  root.addEventListener('submit', handleSubmit as EventListener);
  win?.addEventListener('pageshow', handlePageShow);
  rootStates.set(root, state);
  return state;
}

function addSubmitBusyRule(
  state: BehaviorRootState,
  options: BehaviorRuntimeOptions,
): SubmitBusyRule {
  const selector = options.submitBusySelector || DEFAULT_SUBMIT_BUSY_SELECTOR;
  const compatibilitySubmitLoading = options.compatibilitySubmitLoading === true;
  const key = `${selector}\n${compatibilitySubmitLoading ? 'compat' : 'standard'}`;
  const existing = state.submitRules.find((rule) => rule.key === key);
  if (existing) {
    return existing;
  }
  const controller: BehaviorRuntimeController = {
    reset() {
      resetBehaviors(state.root);
    },
    destroy() {
      const index = state.submitRules.findIndex((rule) => rule.key === key);
      if (index >= 0) {
        state.submitRules.splice(index, 1);
      }
      if (state.submitRules.length === 0) {
        resetBehaviors(state.root);
        state.root.removeEventListener('click', state.handleClick as EventListener);
        state.root.removeEventListener('submit', state.handleSubmit as EventListener);
        state.win?.removeEventListener('pageshow', state.handlePageShow);
        state.doc.removeEventListener('go-admin:enhanced-fragments-applied', state.handleFragmentsApplied as EventListener);
        rootStates.delete(state.root);
      }
    },
  };
  const rule: SubmitBusyRule = {
    key,
    selector,
    compatibilitySubmitLoading,
    controller,
  };
  state.submitRules.push(rule);
  return rule;
}

function attachFragmentListener(state: BehaviorRootState): void {
  if (state.fragmentListenerAttached) {
    return;
  }
  state.doc.addEventListener('go-admin:enhanced-fragments-applied', state.handleFragmentsApplied as EventListener);
  state.fragmentListenerAttached = true;
}

function initFragmentRoot(state: BehaviorRootState, fragmentRoot: HTMLElement): void {
  state.submitRules.forEach((rule) => {
    initBehaviors(fragmentRoot, {
      submitBusySelector: rule.selector,
      compatibilitySubmitLoading: rule.compatibilitySubmitLoading,
      window: state.win ?? undefined,
      listenForFragments: false,
    });
  });
}

function matchingSubmitBusyRule(form: HTMLFormElement, rules: SubmitBusyRule[]): SubmitBusyRule | null {
  let matched: SubmitBusyRule | null = null;
  for (const rule of rules) {
    if (!form.matches(rule.selector)) {
      continue;
    }
    if (rule.compatibilitySubmitLoading) {
      return rule;
    }
    matched = matched ?? rule;
  }
  return matched;
}

export function resetBehaviors(root: Document | HTMLElement = document): void {
  resetNavigationBusyWithin(root);
  resetBusyWithin(root);
}

export function bootstrapBehaviors(options: BehaviorBootstrapOptions = {}): BehaviorRuntimeController {
  const root = options.root ?? document;
  let controller: BehaviorRuntimeController | null = null;
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

import {
  setBusy,
  submitterSkipsValidation,
  submitsOutsideCurrentContext,
  targetsOutsideCurrentContext,
  type BusyController,
} from './busy.js';

export const NAVIGATION_BUSY_ROOT_SELECTOR = '[data-behavior~="navigation-busy"]';
export const NAVIGATION_BUSY_TRIGGER_SELECTOR = '[data-navigation-busy-trigger]';

interface NavigationTriggerState {
  element: HTMLElement;
  ariaDisabled: string | null;
  active: string | undefined;
}

interface NavigationStatusState {
  element: HTMLElement;
  hidden: boolean;
  labelTarget: HTMLElement | null;
  labelText: string | null;
}

interface NavigationBusyState {
  root: HTMLElement;
  active: string | undefined;
  rootBusy: BusyController;
  formBusy: BusyController | null;
  triggers: NavigationTriggerState[];
  status: NavigationStatusState | null;
}

const navigationBusyStates = new WeakMap<HTMLElement, NavigationBusyState>();
const handledNavigationEvents = new WeakSet<Event>();

export function handleNavigationBusyClick(
  event: MouseEvent,
  scope: Document | HTMLElement,
  win: Window | null,
): boolean {
  if (handledNavigationEvents.has(event)) {
    return true;
  }
  const anchor = navigationAnchorFromTarget(event.target, scope);
  if (!anchor) {
    return false;
  }
  const root = navigationRootFor(anchor, scope);
  if (!root) {
    return false;
  }
  if (!isEligibleNavigationAnchor(anchor, event, win)) {
    return false;
  }
  if (isNavigationBusy(root)) {
    handledNavigationEvents.add(event);
    event.preventDefault();
    return true;
  }
  handledNavigationEvents.add(event);
  startNavigationBusy(root, anchor);
  return true;
}

export function handleNavigationBusySubmit(
  event: SubmitEvent,
  scope: Document | HTMLElement,
  win: Window | null,
): boolean {
  if (handledNavigationEvents.has(event)) {
    return true;
  }
  const form = navigationFormFromTarget(event.target, scope);
  if (!form) {
    return false;
  }
  const root = navigationRootFor(form, scope);
  if (!root) {
    return false;
  }
  if (event.defaultPrevented || form.matches('form[data-enhance-action]')) {
    return false;
  }
  const submitter = submitterFromEvent(event, form);
  if (submitsOutsideCurrentContext(form, submitter)) {
    return false;
  }
  if (!isEligibleNavigationForm(form, submitter)) {
    return false;
  }
  if (!submitterSkipsValidation(form, submitter) && typeof form.checkValidity === 'function' && !form.checkValidity()) {
    return false;
  }
  if (isNavigationBusy(root)) {
    handledNavigationEvents.add(event);
    event.preventDefault();
    return true;
  }
  handledNavigationEvents.add(event);
  startNavigationBusy(root, form, submitter);
  return true;
}

export function isNavigationBusy(root: HTMLElement | null | undefined): boolean {
  return !!root && (
    navigationBusyStates.has(root)
    || root.dataset.navigationBusyActive === 'true'
  );
}

export function resetNavigationBusy(root: HTMLElement | null | undefined): void {
  if (!root) {
    return;
  }
  const state = navigationBusyStates.get(root);
  if (!state) {
    if (root.dataset.navigationBusyActive === 'true') {
      delete root.dataset.navigationBusyActive;
    }
    return;
  }

  // The wider root captured form controls after the form controller disabled
  // them, so restore the wider root first and the form's original state last.
  state.rootBusy.reset();
  state.formBusy?.reset();
  restoreDatasetValue(root, 'navigationBusyActive', state.active);

  for (const trigger of state.triggers) {
    restoreAttribute(trigger.element, 'aria-disabled', trigger.ariaDisabled);
    restoreDatasetValue(trigger.element, 'navigationBusyTriggerActive', trigger.active);
  }
  if (state.status) {
    state.status.element.hidden = state.status.hidden;
    if (state.status.labelTarget) {
      state.status.labelTarget.textContent = state.status.labelText;
    }
  }
  navigationBusyStates.delete(root);
}

export function resetNavigationBusyWithin(root: Document | HTMLElement = document): void {
  const candidates: HTMLElement[] = [];
  if (isHTMLElement(root) && isNavigationBusy(root)) {
    candidates.push(root);
  }
  root.querySelectorAll<HTMLElement>('[data-navigation-busy-active="true"]').forEach((candidate) => {
    candidates.push(candidate);
  });
  for (const candidate of Array.from(new Set(candidates))) {
    resetNavigationBusy(candidate);
  }
}

function startNavigationBusy(
  root: HTMLElement,
  trigger: HTMLElement,
  submitter: HTMLButtonElement | HTMLInputElement | null = null,
): void {
  if (isNavigationBusy(root)) {
    return;
  }

  const form = isForm(trigger) ? trigger : null;
  const formBusy = form && form !== root
    ? setBusy(form, { submitter })
    : null;
  const rootBusy = setBusy(root, form === root ? { submitter } : {
    controls: Array.from(root.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]')),
    includeDescendantControls: false,
  });
  const triggers = navigationTriggers(root).map((element) => ({
    element,
    ariaDisabled: element.getAttribute('aria-disabled'),
    active: element.dataset.navigationBusyTriggerActive,
  }));
  for (const item of triggers) {
    item.element.setAttribute('aria-disabled', 'true');
    if (item.element === trigger) {
      item.element.dataset.navigationBusyTriggerActive = 'true';
    }
  }

  const statusElement = navigationStatusElement(root);
  const labelTarget = statusElement?.querySelector<HTMLElement>('[data-navigation-busy-label-target]') ?? null;
  const status = statusElement ? {
    element: statusElement,
    hidden: statusElement.hidden,
    labelTarget,
    labelText: labelTarget?.textContent ?? null,
  } : null;
  if (status) {
    if (status.labelTarget) {
      status.labelTarget.textContent = navigationBusyLabel(root, trigger);
    }
    status.element.hidden = false;
  }

  const state: NavigationBusyState = {
    root,
    active: root.dataset.navigationBusyActive,
    rootBusy,
    formBusy,
    triggers,
    status,
  };
  root.dataset.navigationBusyActive = 'true';
  navigationBusyStates.set(root, state);
}

function navigationAnchorFromTarget(
  target: EventTarget | null,
  scope: Document | HTMLElement,
): HTMLAnchorElement | null {
  if (!isElement(target)) {
    return null;
  }
  const anchor = target.closest<HTMLAnchorElement>(`a[href]${NAVIGATION_BUSY_TRIGGER_SELECTOR}`);
  return anchor && scopeContains(scope, anchor) ? anchor : null;
}

function navigationFormFromTarget(
  target: EventTarget | null,
  scope: Document | HTMLElement,
): HTMLFormElement | null {
  if (!isForm(target) || !target.matches(`form${NAVIGATION_BUSY_TRIGGER_SELECTOR}`)) {
    return null;
  }
  return scopeContains(scope, target) ? target : null;
}

function navigationRootFor(
  trigger: HTMLElement,
  scope: Document | HTMLElement,
): HTMLElement | null {
  const root = trigger.closest<HTMLElement>(NAVIGATION_BUSY_ROOT_SELECTOR);
  return root && scopeContains(scope, root) ? root : null;
}

function navigationTriggers(root: HTMLElement): HTMLElement[] {
  const triggers = Array.from(root.querySelectorAll<HTMLElement>(NAVIGATION_BUSY_TRIGGER_SELECTOR));
  if (root.matches(NAVIGATION_BUSY_TRIGGER_SELECTOR)) {
    triggers.unshift(root);
  }
  return triggers;
}

function isEligibleNavigationAnchor(anchor: HTMLAnchorElement, event: MouseEvent, win: Window | null): boolean {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || anchor.hasAttribute('download')
    || anchor.hasAttribute('data-navigation-busy-skip')
  ) {
    return false;
  }
  if (targetsOutsideCurrentContext(anchor.ownerDocument, anchor.getAttribute('target'))) {
    return false;
  }
  const href = anchor.getAttribute('href')?.trim() ?? '';
  if (!href || href.startsWith('#')) {
    return false;
  }
  try {
    const base = win?.location?.href || anchor.ownerDocument.URL;
    const destination = new URL(href, base);
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      return false;
    }
    if (win?.location) {
      const current = new URL(win.location.href);
      const sameDocument = destination.origin === current.origin
        && destination.pathname === current.pathname
        && destination.search === current.search;
      if (sameDocument && (destination.hash || current.hash)) {
        return false;
      }
    }
  } catch {
    return false;
  }
  return true;
}

function isEligibleNavigationForm(
  form: HTMLFormElement,
  submitter: HTMLButtonElement | HTMLInputElement | null,
): boolean {
  if (effectiveFormMethod(form, submitter) === 'dialog') {
    return false;
  }
  const action = effectiveFormAction(form, submitter);
  return action !== null && (action.protocol === 'http:' || action.protocol === 'https:');
}

function effectiveFormMethod(
  form: HTMLFormElement,
  submitter: HTMLButtonElement | HTMLInputElement | null,
): 'get' | 'post' | 'dialog' {
  const rawMethod = submitter?.hasAttribute('formmethod')
    ? submitter.getAttribute('formmethod')
    : form.getAttribute('method');
  const method = String(rawMethod ?? '').trim().toLowerCase();
  if (method === 'post' || method === 'dialog') {
    return method;
  }
  return 'get';
}

function effectiveFormAction(
  form: HTMLFormElement,
  submitter: HTMLButtonElement | HTMLInputElement | null,
): URL | null {
  const rawAction = submitter?.hasAttribute('formaction')
    ? submitter.getAttribute('formaction')
    : form.getAttribute('action');
  const action = String(rawAction ?? '').trim() || form.ownerDocument.URL;
  try {
    return new URL(action, form.ownerDocument.baseURI || form.ownerDocument.URL);
  } catch {
    return null;
  }
}

function navigationBusyLabel(root: HTMLElement, trigger: HTMLElement): string {
  return String(
    trigger.getAttribute('data-navigation-busy-label')
    || root.getAttribute('data-navigation-busy-label')
    || 'Loading...',
  ).trim();
}

function navigationStatusElement(root: HTMLElement): HTMLElement | null {
  const selector = root.getAttribute('data-navigation-busy-status-target')?.trim() ?? '';
  if (selector) {
    try {
      return root.ownerDocument.querySelector<HTMLElement>(selector);
    } catch {
      return null;
    }
  }
  return root.querySelector<HTMLElement>('[data-navigation-busy-status]');
}

function submitterFromEvent(
  event: SubmitEvent,
  form: HTMLFormElement,
): HTMLButtonElement | HTMLInputElement | null {
  const submitter = event.submitter;
  if (!submitter) {
    return null;
  }
  const win = form.ownerDocument.defaultView;
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

function isElement(value: unknown): value is Element {
  const doc = (value as Element | null)?.ownerDocument;
  const win = doc?.defaultView;
  return !!value && (
    (win?.Element && value instanceof win.Element)
    || (typeof Element !== 'undefined' && value instanceof Element)
  );
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

function scopeContains(scope: Document | HTMLElement, element: Element): boolean {
  return scope === element || scope.contains(element);
}

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}

function restoreDatasetValue(element: HTMLElement, key: string, value: string | undefined): void {
  if (value === undefined) {
    delete element.dataset[key];
    return;
  }
  element.dataset[key] = value;
}

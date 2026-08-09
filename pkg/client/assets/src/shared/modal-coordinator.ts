/**
 * Internal modal coordination shared by generated and template-backed dialogs.
 *
 * There is one coordinator per Document so independently loaded modal adapters
 * agree on stacking, Escape ownership, focus containment, and body scroll lock.
 */

export type ModalFocusTarget = string | HTMLElement | null;

export interface ModalLayerOptions {
  container: HTMLElement;
  zIndexTarget?: HTMLElement;
  initialFocus?: ModalFocusTarget;
  returnFocus?: HTMLElement | null;
  dismissOnEscape?: boolean;
  onEscape?: () => void;
  lockBodyScroll?: boolean;
}

export interface ModalLayerHandle {
  readonly zIndex: number;
  isTopmost(): boolean;
  focusInitial(target?: ModalFocusTarget): void;
  setClosing(closing: boolean): void;
  release(options?: { restoreFocus?: boolean }): void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

const MODAL_BASE_Z = 100;
const MODAL_Z_STEP = 10;

type Layer = {
  container: HTMLElement;
  zIndexTarget: HTMLElement;
  initialFocus: ModalFocusTarget;
  returnFocus: HTMLElement | null;
  dismissOnEscape: boolean;
  onEscape?: () => void;
  lockBodyScroll: boolean;
  zIndex: number;
  closing: boolean;
  released: boolean;
  addedFallbackTabIndex: boolean;
  previousZIndex: string;
  previousScrollLockMarker: string | null;
};

function hiddenByTree(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.hasAttribute('hidden')
      || current.getAttribute('aria-hidden') === 'true'
      || current.hasAttribute('inert')
    ) {
      return true;
    }
    const style = view?.getComputedStyle(current);
    if (style?.display === 'none' || style?.visibility === 'hidden') return true;
    current = current.parentElement;
  }
  return false;
}

/** Internal focus eligibility shared by modal adapters and legacy focus traps. */
export function canReceiveModalFocus(element: HTMLElement): boolean {
  if (!element.isConnected || hiddenByTree(element)) return false;
  if (element.matches(':disabled')) return false;
  return true;
}

/** Return sequentially keyboard-focusable descendants in DOM order. */
export function getModalFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0 && canReceiveModalFocus(element));
}

function resolveFocusTarget(container: HTMLElement, target: ModalFocusTarget): HTMLElement | null {
  if (!target) return null;
  if (typeof target !== 'string') {
    return target.isConnected && container.contains(target) ? target : null;
  }
  try {
    return container.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

function focusElement(element: HTMLElement, selectText = false): boolean {
  if (!canReceiveModalFocus(element)) return false;
  element.focus({ preventScroll: true });
  if (element.ownerDocument.activeElement !== element) return false;
  if (selectText && element.tagName === 'INPUT' && typeof (element as HTMLInputElement).select === 'function') {
    (element as HTMLInputElement).select();
  }
  return true;
}

class DocumentModalCoordinator {
  private readonly layers: Layer[] = [];
  private nextLayerIndex = 0;
  private scrollLockCount = 0;
  private bodyHadScrollLock = false;

  constructor(private readonly ownerDocument: Document) {}

  register(options: ModalLayerOptions): ModalLayerHandle {
    const zIndexTarget = options.zIndexTarget ?? options.container;
    const layer: Layer = {
      container: options.container,
      zIndexTarget,
      initialFocus: options.initialFocus ?? null,
      returnFocus: options.returnFocus ?? null,
      dismissOnEscape: options.dismissOnEscape ?? true,
      onEscape: options.onEscape,
      lockBodyScroll: options.lockBodyScroll ?? true,
      zIndex: MODAL_BASE_Z + (++this.nextLayerIndex * MODAL_Z_STEP),
      closing: false,
      released: false,
      addedFallbackTabIndex: false,
      previousZIndex: zIndexTarget.style.zIndex,
      previousScrollLockMarker: zIndexTarget.getAttribute('data-go-admin-modal-scroll-lock'),
    };

    if (this.layers.length === 0) {
      this.ownerDocument.addEventListener('keydown', this.handleKeyDown, true);
    }
    this.layers.push(layer);
    zIndexTarget.style.zIndex = String(layer.zIndex);
    if (layer.lockBodyScroll) this.lockBody(layer);

    const handle: ModalLayerHandle = {
      zIndex: layer.zIndex,
      isTopmost: () => this.topmost() === layer,
      focusInitial: (target?: ModalFocusTarget) => {
        if (this.topmost() !== layer || layer.released) return;
        this.focusInitial(layer, target);
      },
      setClosing: (closing: boolean) => {
        if (!layer.released) layer.closing = closing;
      },
      release: (releaseOptions = {}) => {
        this.release(layer, releaseOptions.restoreFocus ?? true);
      },
    };
    return handle;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const layer = this.topmost();
    if (!layer) return;

    if (event.key === 'Escape') {
      if (layer.closing || !layer.dismissOnEscape) return;
      event.preventDefault();
      event.stopPropagation();
      layer.onEscape?.();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(layer, event);
  };

  private topmost(): Layer | null {
    return this.layers[this.layers.length - 1] ?? null;
  }

  private focusInitial(layer: Layer, override?: ModalFocusTarget): void {
    const requested = override === undefined ? layer.initialFocus : override;
    const requestedTarget = resolveFocusTarget(layer.container, requested);
    if (requestedTarget && focusElement(requestedTarget, true)) return;

    const first = getModalFocusableElements(layer.container)[0];
    if (first && focusElement(first, true)) return;

    if (!layer.container.hasAttribute('tabindex')) {
      layer.container.setAttribute('tabindex', '-1');
      layer.addedFallbackTabIndex = true;
    }
    focusElement(layer.container);
  }

  private trapFocus(layer: Layer, event: KeyboardEvent): void {
    const focusable = getModalFocusableElements(layer.container);
    if (focusable.length === 0) {
      event.preventDefault();
      this.focusInitial(layer, null);
      return;
    }

    const active = this.ownerDocument.activeElement;
    const activeIndex = focusable.indexOf(active as HTMLElement);
    if (activeIndex === -1) {
      event.preventDefault();
      focusElement(event.shiftKey ? focusable[focusable.length - 1] : focusable[0]);
      return;
    }
    if (event.shiftKey && activeIndex === 0) {
      event.preventDefault();
      focusElement(focusable[focusable.length - 1]);
    } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
      event.preventDefault();
      focusElement(focusable[0]);
    }
  }

  private lockBody(layer: Layer): void {
    if (this.scrollLockCount === 0) {
      this.bodyHadScrollLock = this.ownerDocument.body.classList.contains('overflow-hidden');
      this.ownerDocument.body.classList.add('overflow-hidden');
    }
    this.scrollLockCount += 1;
    layer.zIndexTarget.setAttribute('data-go-admin-modal-scroll-lock', 'true');
  }

  private unlockBody(layer: Layer): void {
    if (layer.previousScrollLockMarker === null) {
      layer.zIndexTarget.removeAttribute('data-go-admin-modal-scroll-lock');
    } else {
      layer.zIndexTarget.setAttribute('data-go-admin-modal-scroll-lock', layer.previousScrollLockMarker);
    }
    if (this.scrollLockCount === 0) return;
    this.scrollLockCount -= 1;
    if (this.scrollLockCount === 0 && !this.bodyHadScrollLock) {
      this.ownerDocument.body.classList.remove('overflow-hidden');
    }
  }

  private release(layer: Layer, restoreFocus: boolean): void {
    if (layer.released) return;
    const wasTopmost = this.topmost() === layer;
    layer.released = true;
    const index = this.layers.indexOf(layer);
    if (index !== -1) this.layers.splice(index, 1);

    if (layer.lockBodyScroll) this.unlockBody(layer);
    layer.zIndexTarget.style.zIndex = layer.previousZIndex;
    if (layer.addedFallbackTabIndex) layer.container.removeAttribute('tabindex');

    if (this.layers.length === 0) {
      this.ownerDocument.removeEventListener('keydown', this.handleKeyDown, true);
      this.nextLayerIndex = 0;
    }

    if (!restoreFocus || !wasTopmost) return;
    const remainingTop = this.topmost();
    if (
      layer.returnFocus
      && canReceiveModalFocus(layer.returnFocus)
      && (!remainingTop || remainingTop.container.contains(layer.returnFocus))
      && focusElement(layer.returnFocus)
    ) {
      return;
    }
    if (remainingTop) this.focusInitial(remainingTop);
  }
}

const coordinators = new WeakMap<Document, DocumentModalCoordinator>();

export function registerModalLayer(options: ModalLayerOptions): ModalLayerHandle {
  const ownerDocument = options.container.ownerDocument;
  let coordinator = coordinators.get(ownerDocument);
  if (!coordinator) {
    coordinator = new DocumentModalCoordinator(ownerDocument);
    coordinators.set(ownerDocument, coordinator);
  }
  return coordinator.register(options);
}

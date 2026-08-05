export interface ActionMenuElements {
  container: HTMLElement;
  trigger: HTMLElement;
  menu: HTMLElement;
}

export interface ActionMenuPositionContext extends ActionMenuElements {
  opening: boolean;
}

export interface ActionMenuController {
  closeAll: () => void;
  destroy: () => void;
}

export interface ActionMenuOptions {
  containerSelector?: string;
  triggerSelector?: string;
  menuSelector?: string;
  itemSelector?: string;
  hiddenClass?: string;
  outsideIgnoreSelector?: string;
  positionMenu?: (context: ActionMenuPositionContext) => void;
  /** Move open menus to document.body so host stacking/containing blocks cannot clip them. */
  portal?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_CONTAINER_SELECTOR = '[data-action-menu], [data-dropdown]';
const DEFAULT_TRIGGER_SELECTOR = '[data-action-menu-trigger], [data-dropdown-trigger]';
const DEFAULT_MENU_SELECTOR = '[data-action-menu-content], .actions-menu';
const DEFAULT_ITEM_SELECTOR = '[role="menuitem"], [data-action-menu-item], .action-item';
const DEFAULT_HIDDEN_CLASS = 'hidden';

interface PortaledActionMenu {
  container: HTMLElement;
  trigger: HTMLElement;
  root: ParentNode;
  parent: Node;
  nextSibling: Node | null;
}

const portaledMenus = new Set<HTMLElement>();
const portalStateByMenu = new WeakMap<HTMLElement, PortaledActionMenu>();
const portaledMenuByTrigger = new WeakMap<HTMLElement, HTMLElement>();

function eventTargetElement(event: Event): HTMLElement | null {
  const target = event.target;
  if (target && typeof (target as Element).closest === 'function') {
    return target as HTMLElement;
  }
  return null;
}

function rootContains(root: ParentNode, element: Element): boolean {
  if ('contains' in root && typeof root.contains === 'function') {
    return root.contains(element);
  }
  return false;
}

export function findActionMenuElements(
  trigger: HTMLElement,
  options: ActionMenuOptions = {}
): ActionMenuElements | null {
  const containerSelector = options.containerSelector || DEFAULT_CONTAINER_SELECTOR;
  const menuSelector = options.menuSelector || DEFAULT_MENU_SELECTOR;
  const container = trigger.closest<HTMLElement>(containerSelector);
  const menu = portaledMenuByTrigger.get(trigger)
    ?? container?.querySelector<HTMLElement>(menuSelector)
    ?? null;
  if (!container || !menu) {
    return null;
  }
  return { container, trigger, menu };
}

function portalActionMenu(elements: ActionMenuElements, root: ParentNode): void {
  const { container, trigger, menu } = elements;
  if (portalStateByMenu.has(menu)) {
    return;
  }
  const doc = menu.ownerDocument;
  const parent = menu.parentNode;
  if (!doc.body || !parent) {
    return;
  }

  portalStateByMenu.set(menu, {
    container,
    trigger,
    root,
    parent,
    nextSibling: menu.nextSibling,
  });
  portaledMenus.add(menu);
  portaledMenuByTrigger.set(trigger, menu);
  doc.body.appendChild(menu);
}

function restoreActionMenu(menu: HTMLElement): void {
  const state = portalStateByMenu.get(menu);
  if (!state) {
    return;
  }

  portaledMenus.delete(menu);
  portalStateByMenu.delete(menu);
  portaledMenuByTrigger.delete(state.trigger);
  if (!state.parent.isConnected) {
    menu.remove();
    return;
  }
  if (state.nextSibling?.parentNode === state.parent) {
    state.parent.insertBefore(menu, state.nextSibling);
    return;
  }
  state.parent.appendChild(menu);
}

export function closeActionMenu(
  menu: HTMLElement,
  options: ActionMenuOptions = {}
): void {
  const hiddenClass = options.hiddenClass || DEFAULT_HIDDEN_CLASS;
  menu.classList.add(hiddenClass);
  const portalState = portalStateByMenu.get(menu);
  const container = portalState?.container
    ?? menu.closest<HTMLElement>(options.containerSelector || DEFAULT_CONTAINER_SELECTOR);
  const trigger = portalState?.trigger
    ?? container?.querySelector<HTMLElement>(options.triggerSelector || DEFAULT_TRIGGER_SELECTOR);
  trigger?.setAttribute('aria-expanded', 'false');
  restoreActionMenu(menu);
}

export function closeActionMenus(root: ParentNode = document, options: ActionMenuOptions = {}): void {
  const menuSelector = options.menuSelector || DEFAULT_MENU_SELECTOR;
  const menus = new Set<HTMLElement>(Array.from(root.querySelectorAll<HTMLElement>(menuSelector)));
  portaledMenus.forEach((menu) => {
    const state = portalStateByMenu.get(menu);
    if (state && (state.root === root || rootContains(root, state.trigger))) {
      menus.add(menu);
    }
  });
  menus.forEach((menu) => {
    closeActionMenu(menu, options);
  });
}

export function isActionMenuItemDisabled(item: HTMLElement): boolean {
  return item.getAttribute('aria-disabled') === 'true' || item.dataset.disabled === 'true';
}

export type ActionMenuPositionElements = Pick<ActionMenuPositionContext, 'trigger' | 'menu'>;

/**
 * Position an action menu as a viewport overlay.
 *
 * Dynamic geometry is applied inline so host utility stylesheets cannot change
 * the coordinate system after the position has been calculated. Component CSS
 * remains responsible for visual presentation and the default overlay layer.
 */
export function defaultActionMenuPositioner({ trigger, menu }: ActionMenuPositionElements): void {
  const triggerRect = trigger.getBoundingClientRect();
  const view = trigger.ownerDocument.defaultView ?? window;
  const visualViewport = view.visualViewport;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? view.innerWidth;
  const viewportHeight = visualViewport?.height ?? view.innerHeight;
  const viewportInset = 10;
  const triggerGap = 8;
  const availableWidth = Math.max(0, viewportWidth - (viewportInset * 2));
  const availableHeight = Math.max(0, viewportHeight - (viewportInset * 2));

  // Reset prior viewport constraints before reading the component/theme limits.
  menu.style.minWidth = '';
  menu.style.maxWidth = '';
  menu.style.maxHeight = '';
  const computedStyle = view.getComputedStyle(menu);
  const pixelLimit = (value: string, fallback: number): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const configuredMinWidth = pixelLimit(computedStyle.minWidth, 192);
  const configuredMaxWidth = pixelLimit(computedStyle.maxWidth, availableWidth);
  const configuredMaxHeight = pixelLimit(computedStyle.maxHeight, availableHeight);
  const constrainedMaxWidth = Math.min(configuredMaxWidth, availableWidth);

  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.margin = '0';
  menu.style.minWidth = `${Math.min(configuredMinWidth, constrainedMaxWidth)}px`;
  menu.style.maxWidth = `${constrainedMaxWidth}px`;
  menu.style.maxHeight = `${Math.min(configuredMaxHeight, availableHeight)}px`;

  const menuWidth = Math.min(menu.offsetWidth || 224, availableWidth);
  const menuHeight = Math.min(menu.offsetHeight || Math.min(300, availableHeight), availableHeight);
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const spaceBelow = viewportBottom - triggerRect.bottom;
  const spaceAbove = triggerRect.top - viewportTop;
  const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const desiredLeft = triggerRect.right - menuWidth;
  const minLeft = viewportLeft + viewportInset;
  const maxLeft = Math.max(minLeft, viewportRight - menuWidth - viewportInset);
  const left = Math.min(Math.max(minLeft, desiredLeft), maxLeft);
  const desiredTop = shouldOpenUpward
    ? triggerRect.top - menuHeight - triggerGap
    : triggerRect.bottom + triggerGap;
  const minTop = viewportTop + viewportInset;
  const maxTop = Math.max(minTop, viewportBottom - menuHeight - viewportInset);
  const top = Math.min(Math.max(minTop, desiredTop), maxTop);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

export function initActionMenus(
  root: ParentNode = document,
  options: ActionMenuOptions = {}
): ActionMenuController {
  const triggerSelector = options.triggerSelector || DEFAULT_TRIGGER_SELECTOR;
  const itemSelector = options.itemSelector || DEFAULT_ITEM_SELECTOR;
  const hiddenClass = options.hiddenClass || DEFAULT_HIDDEN_CLASS;
  const menuSelector = options.menuSelector || DEFAULT_MENU_SELECTOR;
  const positionMenu = options.positionMenu;
  const doc = root.nodeType === 9 ? root as Document : (root as Element).ownerDocument || document;
  const disposers: Array<() => void> = [];

  const controller: ActionMenuController = {
    closeAll: () => closeActionMenus(root, options),
    destroy: () => {
      controller.closeAll();
      while (disposers.length > 0) {
        const dispose = disposers.pop();
        dispose?.();
      }
    },
  };

  root.querySelectorAll<HTMLElement>(menuSelector).forEach((menu) => {
    if (!menu.classList.contains(hiddenClass)) {
      menu.classList.add(hiddenClass);
    }
  });

  const handleClick = (event: MouseEvent) => {
    const target = eventTargetElement(event);
    if (!target) {
      return;
    }

    const trigger = target.closest<HTMLElement>(triggerSelector);
    if (trigger && rootContains(root, trigger)) {
      const elements = findActionMenuElements(trigger, options);
      if (!elements) {
        return;
      }

      event.stopPropagation();
      const opening = elements.menu.classList.contains(hiddenClass);
      if (!opening) {
        closeActionMenu(elements.menu, options);
        return;
      }

      controller.closeAll();
      elements.menu.classList.remove(hiddenClass);
      elements.trigger.setAttribute('aria-expanded', 'true');
      if (options.portal) {
        portalActionMenu(elements, root);
      }
      if (positionMenu) {
        positionMenu({ ...elements, opening: true });
      }
      return;
    }

    const item = target.closest<HTMLElement>(itemSelector);
    const itemMenu = item?.closest<HTMLElement>(menuSelector) ?? null;
    const itemPortalState = itemMenu ? portalStateByMenu.get(itemMenu) : undefined;
    const itemBelongsToRoot = Boolean(itemMenu && (
      rootContains(root, itemMenu) || itemPortalState?.root === root
    ));
    if (item && itemBelongsToRoot) {
      if (isActionMenuItemDisabled(item)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      closeActionMenu(itemMenu!, options);
      return;
    }

    const ignoreSelector = options.outsideIgnoreSelector;
    if (ignoreSelector && target.closest(ignoreSelector)) {
      return;
    }

    const clickedMenu = target.closest<HTMLElement>(menuSelector);
    const clickedPortalState = clickedMenu ? portalStateByMenu.get(clickedMenu) : undefined;
    if (clickedMenu && (rootContains(root, clickedMenu) || clickedPortalState?.root === root)) {
      return;
    }
    controller.closeAll();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      controller.closeAll();
    }
  };

  doc.addEventListener('click', handleClick);
  doc.addEventListener('keydown', handleKeydown);
  disposers.push(() => doc.removeEventListener('click', handleClick));
  disposers.push(() => doc.removeEventListener('keydown', handleKeydown));
  const view = doc.defaultView;
  if (view && (options.portal || positionMenu)) {
    const closeForViewportChange = () => controller.closeAll();
    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target && typeof (target as Element).closest === 'function') {
        const targetMenu = (target as Element).closest<HTMLElement>(menuSelector);
        const targetState = targetMenu ? portalStateByMenu.get(targetMenu) : undefined;
        if (targetMenu && (rootContains(root, targetMenu) || targetState?.root === root)) {
          return;
        }
      }
      controller.closeAll();
    };
    view.addEventListener('pagehide', closeForViewportChange);
    view.addEventListener('pageshow', closeForViewportChange);
    view.addEventListener('resize', closeForViewportChange);
    view.visualViewport?.addEventListener('resize', closeForViewportChange);
    view.visualViewport?.addEventListener('scroll', closeForViewportChange);
    doc.addEventListener('scroll', handleScroll, true);
    disposers.push(() => view.removeEventListener('pagehide', closeForViewportChange));
    disposers.push(() => view.removeEventListener('pageshow', closeForViewportChange));
    disposers.push(() => view.removeEventListener('resize', closeForViewportChange));
    disposers.push(() => view.visualViewport?.removeEventListener('resize', closeForViewportChange));
    disposers.push(() => view.visualViewport?.removeEventListener('scroll', closeForViewportChange));
    disposers.push(() => doc.removeEventListener('scroll', handleScroll, true));
  }
  if (options.signal) {
    const handleAbort = () => controller.destroy();
    options.signal.addEventListener('abort', handleAbort, { once: true });
    disposers.push(() => options.signal?.removeEventListener('abort', handleAbort));
  }

  return controller;
}

export function initActionMenusForElement(
  root: Element,
  options: ActionMenuOptions = {}
): ActionMenuController {
  return initActionMenus(root, {
    ...options,
    containerSelector: options.containerSelector || DEFAULT_CONTAINER_SELECTOR,
  });
}

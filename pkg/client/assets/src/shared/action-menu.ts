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
  inlineStyle: string | null;
}

interface InlineStyleProperty {
  value: string;
  priority: string;
}

type InlineStyleSnapshot = Map<string, InlineStyleProperty>;

const portaledMenus = new Set<HTMLElement>();
const portalStateByMenu = new WeakMap<HTMLElement, PortaledActionMenu>();
const portaledMenuByTrigger = new WeakMap<HTMLElement, HTMLElement>();
const positionStyleByMenu = new WeakMap<HTMLElement, InlineStyleSnapshot>();

const POSITION_STYLE_PROPERTIES = [
  'position',
  'right',
  'bottom',
  'margin',
  'min-width',
  'max-width',
  'max-height',
  'left',
  'top',
];

const PORTAL_THEME_CUSTOM_PROPERTIES = [
  '--action-menu-z-index',
  '--action-menu-width',
  '--action-menu-min-width',
  '--action-menu-max-width',
  '--action-menu-max-height',
  '--action-menu-mobile-width',
  '--color-surface-raised',
  '--color-surface-subtle',
  '--color-border-default',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-status-danger',
  '--color-focus-ring',
  '--datagrid-border',
  '--datagrid-row-hover',
  '--radius-surface',
  '--shadow-overlay',
];

const PORTAL_THEME_PRESENTATION_PROPERTIES = [
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'box-shadow',
  'color',
  'color-scheme',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
];

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

function captureInlineStyleProperties(
  element: HTMLElement,
  properties: string[]
): InlineStyleSnapshot {
  const snapshot: InlineStyleSnapshot = new Map();
  properties.forEach((property) => {
    snapshot.set(property, {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    });
  });
  return snapshot;
}

function restoreInlineStyleProperties(
  element: HTMLElement,
  snapshot: InlineStyleSnapshot
): void {
  snapshot.forEach(({ value, priority }, property) => {
    if (value) {
      element.style.setProperty(property, value, priority);
      return;
    }
    element.style.removeProperty(property);
  });
}

function restoreActionMenuPositionStyles(menu: HTMLElement): void {
  const snapshot = positionStyleByMenu.get(menu);
  if (!snapshot) {
    return;
  }
  positionStyleByMenu.delete(menu);
  restoreInlineStyleProperties(menu, snapshot);
}

function capturePortalTheme(menu: HTMLElement): Map<string, string> {
  const snapshot = new Map<string, string>();
  const view = menu.ownerDocument.defaultView;
  if (!view) {
    return snapshot;
  }
  const computed = view.getComputedStyle(menu);
  const customProperties = new Set(PORTAL_THEME_CUSTOM_PROPERTIES);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property.startsWith('--')) {
      customProperties.add(property);
    }
  }
  customProperties.forEach((property) => {
    const value = computed.getPropertyValue(property).trim();
    if (value) {
      snapshot.set(property, value);
    }
  });
  PORTAL_THEME_PRESENTATION_PROPERTIES.forEach((property) => {
    const value = computed.getPropertyValue(property).trim();
    if (value) {
      snapshot.set(property, value);
    }
  });
  return snapshot;
}

function applyPortalTheme(menu: HTMLElement, snapshot: Map<string, string>): void {
  snapshot.forEach((value, property) => {
    menu.style.setProperty(property, value);
  });
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

  const theme = capturePortalTheme(menu);

  portalStateByMenu.set(menu, {
    container,
    trigger,
    root,
    parent,
    nextSibling: menu.nextSibling,
    inlineStyle: menu.getAttribute('style'),
  });
  portaledMenus.add(menu);
  portaledMenuByTrigger.set(trigger, menu);
  doc.body.appendChild(menu);
  applyPortalTheme(menu, theme);
}

function restoreActionMenu(menu: HTMLElement): void {
  const state = portalStateByMenu.get(menu);
  if (!state) {
    return;
  }

  portaledMenus.delete(menu);
  portalStateByMenu.delete(menu);
  portaledMenuByTrigger.delete(state.trigger);
  if (state.inlineStyle === null) {
    menu.removeAttribute('style');
  } else {
    menu.setAttribute('style', state.inlineStyle);
  }
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
  restoreActionMenuPositionStyles(menu);
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

function actionMenuItems(menu: HTMLElement, itemSelector: string): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>(itemSelector)).filter((item) => (
    !item.hasAttribute('disabled')
    && !item.hidden
    && item.getAttribute('aria-hidden') !== 'true'
  ));
}

function focusActionMenuItem(item: HTMLElement | undefined): void {
  if (!item) {
    return;
  }
  try {
    item.focus({ preventScroll: true });
  } catch (_error) {
    item.focus();
  }
}

function openActionMenuForRoot(
  root: ParentNode,
  menuSelector: string,
  hiddenClass: string
): HTMLElement | null {
  const menus = new Set<HTMLElement>(Array.from(root.querySelectorAll<HTMLElement>(menuSelector)));
  portaledMenus.forEach((menu) => {
    const state = portalStateByMenu.get(menu);
    if (state && (state.root === root || rootContains(root, state.trigger))) {
      menus.add(menu);
    }
  });
  return Array.from(menus).find((menu) => !menu.classList.contains(hiddenClass)) ?? null;
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
  restoreActionMenuPositionStyles(menu);
  positionStyleByMenu.set(menu, captureInlineStyleProperties(menu, POSITION_STYLE_PROPERTIES));

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

  const computedStyle = view.getComputedStyle(menu);
  const pixelLimit = (value: string, fallback: number): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const configuredMinWidth = pixelLimit(computedStyle.minWidth, 192);
  const configuredMaxWidth = pixelLimit(computedStyle.maxWidth, availableWidth);
  const configuredMaxHeight = pixelLimit(computedStyle.maxHeight, availableHeight);
  const constrainedMaxWidth = Math.min(configuredMaxWidth, availableWidth);

  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const spaceBelow = Math.max(
    0,
    viewportBottom - viewportInset - triggerRect.bottom - triggerGap
  );
  const spaceAbove = Math.max(
    0,
    triggerRect.top - viewportTop - viewportInset - triggerGap
  );
  const naturalMenuHeight = Math.min(
    menu.scrollHeight || menu.offsetHeight || Math.min(300, availableHeight),
    configuredMaxHeight,
    availableHeight
  );
  const shouldOpenUpward = naturalMenuHeight > spaceBelow && spaceAbove > spaceBelow;
  const availableOnChosenSide = shouldOpenUpward ? spaceAbove : spaceBelow;
  const constrainedMaxHeight = Math.min(configuredMaxHeight, availableHeight, availableOnChosenSide);

  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.margin = '0';
  menu.style.minWidth = `${Math.min(configuredMinWidth, constrainedMaxWidth)}px`;
  menu.style.maxWidth = `${constrainedMaxWidth}px`;
  menu.style.maxHeight = `${constrainedMaxHeight}px`;

  const menuWidth = Math.min(menu.offsetWidth || 224, availableWidth);
  const menuHeight = Math.min(
    menu.offsetHeight || naturalMenuHeight,
    constrainedMaxHeight
  );
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
      focusActionMenuItem(actionMenuItems(elements.menu, itemSelector)[0]);
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
    const menu = openActionMenuForRoot(root, menuSelector, hiddenClass);
    if (!menu) {
      return;
    }
    const items = actionMenuItems(menu, itemSelector);
    const activeElement = doc.activeElement as HTMLElement | null;
    const activeIndex = activeElement ? items.indexOf(activeElement) : -1;

    if (event.key === 'Escape') {
      const trigger = portalStateByMenu.get(menu)?.trigger
        ?? menu.closest<HTMLElement>(options.containerSelector || DEFAULT_CONTAINER_SELECTOR)
          ?.querySelector<HTMLElement>(triggerSelector)
        ?? null;
      event.preventDefault();
      event.stopPropagation();
      closeActionMenu(menu, options);
      if (trigger?.isConnected) {
        focusActionMenuItem(trigger);
      }
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') {
      nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }
    if (nextIndex !== null && items.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      focusActionMenuItem(items[nextIndex]);
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

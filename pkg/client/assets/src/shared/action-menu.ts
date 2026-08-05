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
  signal?: AbortSignal;
}

const DEFAULT_CONTAINER_SELECTOR = '[data-action-menu], [data-dropdown]';
const DEFAULT_TRIGGER_SELECTOR = '[data-action-menu-trigger], [data-dropdown-trigger]';
const DEFAULT_MENU_SELECTOR = '[data-action-menu-content], .actions-menu';
const DEFAULT_ITEM_SELECTOR = '[role="menuitem"], [data-action-menu-item], .action-item';
const DEFAULT_HIDDEN_CLASS = 'hidden';

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
  const menu = container?.querySelector<HTMLElement>(menuSelector) ?? null;
  if (!container || !menu) {
    return null;
  }
  return { container, trigger, menu };
}

export function closeActionMenu(
  menu: HTMLElement,
  options: ActionMenuOptions = {}
): void {
  const hiddenClass = options.hiddenClass || DEFAULT_HIDDEN_CLASS;
  menu.classList.add(hiddenClass);
  const container = menu.closest<HTMLElement>(options.containerSelector || DEFAULT_CONTAINER_SELECTOR);
  const trigger = container?.querySelector<HTMLElement>(options.triggerSelector || DEFAULT_TRIGGER_SELECTOR);
  trigger?.setAttribute('aria-expanded', 'false');
}

export function closeActionMenus(root: ParentNode = document, options: ActionMenuOptions = {}): void {
  const menuSelector = options.menuSelector || DEFAULT_MENU_SELECTOR;
  root.querySelectorAll<HTMLElement>(menuSelector).forEach((menu) => {
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
  const viewportWidth = window.innerWidth;
  const menuWidth = menu.offsetWidth || 224;
  const viewportHeight = window.innerHeight;
  const viewportInset = 10;
  const triggerGap = 8;
  const availableHeight = Math.max(0, viewportHeight - (viewportInset * 2));
  const menuHeight = menu.offsetHeight || Math.min(300, availableHeight);
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const desiredLeft = triggerRect.right - menuWidth;
  const maxLeft = Math.max(viewportInset, viewportWidth - menuWidth - viewportInset);
  const left = Math.min(Math.max(viewportInset, desiredLeft), maxLeft);
  const desiredTop = shouldOpenUpward
    ? triggerRect.top - menuHeight - triggerGap
    : triggerRect.bottom + triggerGap;
  const maxTop = Math.max(viewportInset, viewportHeight - menuHeight - viewportInset);
  const top = Math.min(Math.max(viewportInset, desiredTop), maxTop);

  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.bottom = 'auto';
  menu.style.margin = '0';
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
      root.querySelectorAll<HTMLElement>(menuSelector).forEach((menu) => {
        if (menu !== elements.menu) {
          closeActionMenu(menu, options);
        }
      });
      elements.menu.classList.toggle(hiddenClass);
      elements.trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening && positionMenu) {
        positionMenu({ ...elements, opening });
      }
      return;
    }

    const item = target.closest<HTMLElement>(itemSelector);
    if (item && isActionMenuItemDisabled(item)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const ignoreSelector = options.outsideIgnoreSelector;
    if (ignoreSelector && target.closest(ignoreSelector)) {
      return;
    }

    const clickedInsideMenu = target.closest(options.containerSelector || DEFAULT_CONTAINER_SELECTOR);
    if (!clickedInsideMenu || !Array.from(root.querySelectorAll(options.containerSelector || DEFAULT_CONTAINER_SELECTOR)).includes(clickedInsideMenu)) {
      controller.closeAll();
    }
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

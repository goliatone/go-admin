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
export declare function findActionMenuElements(trigger: HTMLElement, options?: ActionMenuOptions): ActionMenuElements | null;
export declare function closeActionMenu(menu: HTMLElement, options?: ActionMenuOptions): void;
export declare function closeActionMenus(root?: ParentNode, options?: ActionMenuOptions): void;
export declare function isActionMenuItemDisabled(item: HTMLElement): boolean;
export declare function defaultActionMenuPositioner({ trigger, menu }: ActionMenuPositionContext): void;
export declare function initActionMenus(root?: ParentNode, options?: ActionMenuOptions): ActionMenuController;
export declare function initActionMenusForElement(root: Element, options?: ActionMenuOptions): ActionMenuController;
//# sourceMappingURL=action-menu.d.ts.map
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
export declare function findActionMenuElements(trigger: HTMLElement, options?: ActionMenuOptions): ActionMenuElements | null;
export declare function closeActionMenu(menu: HTMLElement, options?: ActionMenuOptions): void;
export declare function closeActionMenus(root?: ParentNode, options?: ActionMenuOptions): void;
export declare function isActionMenuItemDisabled(item: HTMLElement): boolean;
export type ActionMenuPositionElements = Pick<ActionMenuPositionContext, 'trigger' | 'menu'>;
/**
 * Position an action menu as a viewport overlay.
 *
 * Dynamic geometry is applied inline so host utility stylesheets cannot change
 * the coordinate system after the position has been calculated. Component CSS
 * remains responsible for visual presentation and the default overlay layer.
 */
export declare function defaultActionMenuPositioner({ trigger, menu }: ActionMenuPositionElements): void;
export declare function initActionMenus(root?: ParentNode, options?: ActionMenuOptions): ActionMenuController;
export declare function initActionMenusForElement(root: Element, options?: ActionMenuOptions): ActionMenuController;
//# sourceMappingURL=action-menu.d.ts.map
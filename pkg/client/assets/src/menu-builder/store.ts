import { MenuBuilderAPIClient, type MenuPreviewRequest } from './api-client.js';
import type {
  MenuBindingRecord,
  MenuBuilderState,
  MenuItemNode,
  MenuRecord,
  MenuViewProfileRecord,
  NavigationOverrideValue,
  ValidationIssue,
} from './types.js';

const defaultState: MenuBuilderState = {
  loading: false,
  error: '',
  contracts: null,
  menus: [],
  selected_menu_id: '',
  selected_menu: null,
  draft_items: [],
  bindings: [],
  profiles: [],
  validation_issues: [],
  preview_result: null,
};

function cloneItems(items: MenuItemNode[]): MenuItemNode[] {
  return items.map(item => ({
    ...item,
    target: item.target ? { ...item.target } : undefined,
    children: cloneItems(item.children || []),
  }));
}

function collectItemIDs(items: MenuItemNode[], out: Set<string> = new Set()): Set<string> {
  items.forEach(item => {
    out.add(item.id);
    collectItemIDs(item.children || [], out);
  });
  return out;
}

function findAndRemoveNode(items: MenuItemNode[], id: string): { node: MenuItemNode | null; next: MenuItemNode[] } {
  const next: MenuItemNode[] = [];
  let removed: MenuItemNode | null = null;

  items.forEach(item => {
    if (item.id === id) {
      removed = {
        ...item,
        target: item.target ? { ...item.target } : undefined,
        children: cloneItems(item.children || []),
      };
      return;
    }

    const removedFromChildren = findAndRemoveNode(item.children || [], id);
    if (removedFromChildren.node && !removed) {
      removed = removedFromChildren.node;
      next.push({
        ...item,
        children: removedFromChildren.next,
      });
      return;
    }

    next.push({
      ...item,
      children: cloneItems(item.children || []),
    });
  });

  return { node: removed, next };
}

function insertBefore(items: MenuItemNode[], targetID: string, node: MenuItemNode): { inserted: boolean; items: MenuItemNode[] } {
  const next: MenuItemNode[] = [];
  let inserted = false;

  items.forEach(item => {
    if (!inserted && item.id === targetID) {
      next.push(node);
      inserted = true;
    }

    const childResult = insertBefore(item.children || [], targetID, node);
    if (childResult.inserted) {
      inserted = true;
      next.push({ ...item, children: childResult.items });
      return;
    }

    next.push({ ...item, children: cloneItems(item.children || []) });
  });

  return { inserted, items: next };
}

function insertAfter(items: MenuItemNode[], targetID: string, node: MenuItemNode): { inserted: boolean; items: MenuItemNode[] } {
  const next: MenuItemNode[] = [];
  let inserted = false;

  items.forEach(item => {
    const childResult = insertAfter(item.children || [], targetID, node);
    if (childResult.inserted) {
      inserted = true;
      next.push({ ...item, children: childResult.items });
      return;
    }

    next.push({ ...item, children: cloneItems(item.children || []) });
    if (!inserted && item.id === targetID) {
      next.push(node);
      inserted = true;
    }
  });

  return { inserted, items: next };
}

function insertAsChild(items: MenuItemNode[], parentID: string, node: MenuItemNode): { inserted: boolean; items: MenuItemNode[] } {
  let inserted = false;
  const next = items.map(item => {
    if (item.id === parentID) {
      inserted = true;
      return {
        ...item,
        children: [...cloneItems(item.children || []), node],
      };
    }
    const childResult = insertAsChild(item.children || [], parentID, node);
    if (childResult.inserted) {
      inserted = true;
      return {
        ...item,
        children: childResult.items,
      };
    }
    return {
      ...item,
      children: cloneItems(item.children || []),
    };
  });

  return { inserted, items: next };
}

function deriveTargetKey(item: MenuItemNode): string {
  const target = item.target;
  if (!target || !target.type) {
    return '';
  }
  if (target.type === 'external') {
    return `external:${String(target.url || '').trim().toLowerCase()}`;
  }
  if (target.type === 'route' || target.type === 'module') {
    return `${target.type}:${String(target.path || target.route || target.module || '').trim().toLowerCase()}`;
  }
  return `content:${String(target.content_type || '').trim().toLowerCase()}:${String(target.slug || target.id || '').trim().toLowerCase()}`;
}

function resolveTargetPreview(item: MenuItemNode): { url: string; valid: boolean; message: string } {
  const target = item.target;
  if (!target) {
    return { url: '', valid: false, message: 'Target required' };
  }

  switch (target.type) {
    case 'external': {
      const url = String(target.url || '').trim();
      const valid = /^https?:\/\//i.test(url);
      return {
        url,
        valid,
        message: valid ? 'Resolved external URL' : 'External URL must start with http:// or https://',
      };
    }
    case 'route': {
      const path = String(target.path || target.route || '').trim();
      return {
        url: path,
        valid: path.startsWith('/'),
        message: path.startsWith('/') ? 'Resolved route path' : 'Route path must start with /',
      };
    }
    case 'module': {
      const path = String(target.path || target.module || '').trim();
      return {
        url: path,
        valid: path.startsWith('/'),
        message: path.startsWith('/') ? 'Resolved module path' : 'Module path must start with /',
      };
    }
    case 'content': {
      const contentType = String(target.content_type || '').trim();
      const slug = String(target.slug || target.id || '').trim();
      const valid = contentType.length > 0 && slug.length > 0;
      return {
        url: valid ? `/${contentType}/${slug}` : '',
        valid,
        message: valid ? 'Resolved content URL' : 'Content target requires content type and slug/id',
      };
    }
    default:
      return { url: '', valid: false, message: 'Unsupported target type' };
  }
}

export class MenuBuilderStore extends EventTarget {
  private readonly client: MenuBuilderAPIClient;
  private state: MenuBuilderState;

  constructor(client: MenuBuilderAPIClient) {
    super();
    this.client = client;
    this.state = { ...defaultState };
  }

  snapshot(): MenuBuilderState {
    return {
      ...this.state,
      menus: [...this.state.menus],
      draft_items: cloneItems(this.state.draft_items),
      bindings: [...this.state.bindings],
      profiles: [...this.state.profiles],
      validation_issues: [...this.state.validation_issues],
      preview_result: this.state.preview_result
        ? {
            ...this.state.preview_result,
            menu: {
              ...this.state.preview_result.menu,
              items: cloneItems(this.state.preview_result.menu.items),
            },
          }
        : null,
    };
  }

  async initialize(): Promise<void> {
    this.setState({ loading: true, error: '' });
    try {
      const contracts = await this.client.loadContracts();
      const [menus, bindings, profiles] = await Promise.all([
        this.client.listMenus(),
        this.client.listBindings(),
        this.client.listProfiles(),
      ]);
      const firstMenuID = menus[0]?.id || '';
      this.setState({
        contracts,
        menus,
        bindings,
        profiles,
        selected_menu_id: firstMenuID,
        loading: false,
      });

      if (firstMenuID) {
        await this.selectMenu(firstMenuID);
      }
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async refreshMenus(): Promise<void> {
    const menus = await this.client.listMenus();
    const selectedID = this.state.selected_menu_id;
    const selectedExists = menus.some(menu => menu.id === selectedID);
    this.setState({
      menus,
      selected_menu_id: selectedExists ? selectedID : (menus[0]?.id || ''),
    });
    if (!selectedExists && menus[0]?.id) {
      await this.selectMenu(menus[0].id);
    }
  }

  async selectMenu(menuID: string): Promise<void> {
    const selected = menuID.trim();
    if (!selected) {
      this.setState({
        selected_menu_id: '',
        selected_menu: null,
        draft_items: [],
        validation_issues: [],
        preview_result: null,
      });
      return;
    }
    this.setState({
      selected_menu_id: selected,
      selected_menu: null,
      draft_items: [],
      validation_issues: [],
      preview_result: null,
      loading: true,
      error: '',
    });
    try {
      const payload = await this.client.getMenu(selected);
      this.setState({
        selected_menu_id: payload.menu.id,
        selected_menu: payload.menu,
        draft_items: cloneItems(payload.items),
        validation_issues: this.validateItems(payload.items),
        loading: false,
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async createMenu(input: Partial<MenuRecord>): Promise<void> {
    const menu = await this.client.createMenu(input);
    await this.refreshMenus();
    await this.selectMenu(menu.id);
  }

  async updateMenu(input: Partial<MenuRecord>): Promise<void> {
    if (!this.state.selected_menu_id) {
      return;
    }
    const updated = await this.client.updateMenu(this.state.selected_menu_id, input);
    this.setState({ selected_menu: updated });
    await this.refreshMenus();
  }

  async setPublishState(publish: boolean): Promise<void> {
    if (!this.state.selected_menu_id) {
      return;
    }
    const menu = await this.client.publishMenu(this.state.selected_menu_id, publish);
    this.setState({ selected_menu: menu });
    await this.refreshMenus();
  }

  async cloneSelectedMenu(nextCode: string): Promise<void> {
    if (!this.state.selected_menu_id) {
      return;
    }
    const cloned = await this.client.cloneMenu(this.state.selected_menu_id, nextCode);
    await this.refreshMenus();
    await this.selectMenu(cloned.id);
  }

  async archiveSelectedMenu(archived: boolean): Promise<void> {
    if (!this.state.selected_menu_id) {
      return;
    }
    const updated = await this.client.archiveMenu(this.state.selected_menu_id, archived);
    this.setState({ selected_menu: updated });
    await this.refreshMenus();
  }

  setDraftItems(items: MenuItemNode[]): void {
    const validation = this.validateItems(items);
    this.setState({ draft_items: cloneItems(items), validation_issues: validation });
  }

  addRootItem(): void {
    const nextItem: MenuItemNode = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: 'New Item',
      target: { type: 'route', path: '/' },
      children: [],
    };
    this.setDraftItems([...cloneItems(this.state.draft_items), nextItem]);
  }

  updateItem(itemID: string, update: Partial<MenuItemNode>): void {
    const next = this.mapItems(this.state.draft_items, itemID, current => ({
      ...current,
      ...update,
      target: update.target ? { ...update.target } : current.target,
    }));
    this.setDraftItems(next);
  }

  removeItem(itemID: string): void {
    const removed = findAndRemoveNode(this.state.draft_items, itemID);
    this.setDraftItems(removed.next);
  }

  addChild(parentID: string): void {
    const child: MenuItemNode = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: 'New Child',
      target: { type: 'route', path: '/' },
      children: [],
    };
    const inserted = insertAsChild(this.state.draft_items, parentID, child);
    if (inserted.inserted) {
      this.setDraftItems(inserted.items);
    }
  }

  moveItem(itemID: string, targetID: string, mode: 'before' | 'after' | 'inside'): void {
    if (!itemID || !targetID || itemID === targetID) {
      return;
    }

    const allIDs = collectItemIDs(this.state.draft_items);
    if (!allIDs.has(itemID) || !allIDs.has(targetID)) {
      return;
    }

    const removed = findAndRemoveNode(this.state.draft_items, itemID);
    if (!removed.node) {
      return;
    }

    let inserted: { inserted: boolean; items: MenuItemNode[] };
    switch (mode) {
      case 'before':
        inserted = insertBefore(removed.next, targetID, removed.node);
        break;
      case 'after':
        inserted = insertAfter(removed.next, targetID, removed.node);
        break;
      case 'inside':
      default:
        inserted = insertAsChild(removed.next, targetID, removed.node);
        break;
    }

    if (!inserted.inserted) {
      return;
    }

    this.setDraftItems(inserted.items);
  }

  async saveItems(): Promise<void> {
    if (!this.state.selected_menu_id) {
      return;
    }
    const localValidation = this.validateItems(this.state.draft_items);
    this.setState({ validation_issues: localValidation });
    if (localValidation.length > 0) {
      throw new Error('Fix menu validation issues before saving');
    }

    const items = await this.client.upsertMenuItems(this.state.selected_menu_id, this.state.draft_items);
    this.setState({ draft_items: cloneItems(items), validation_issues: [] });
  }

  async refreshBindings(): Promise<void> {
    const bindings = await this.client.listBindings();
    this.setState({ bindings });
  }

  async upsertBinding(location: string, input: Partial<MenuBindingRecord>): Promise<void> {
    await this.client.upsertBinding(location, input);
    await this.refreshBindings();
  }

  async refreshProfiles(): Promise<void> {
    const profiles = await this.client.listProfiles();
    this.setState({ profiles });
  }

  async createProfile(input: Partial<MenuViewProfileRecord>): Promise<void> {
    await this.client.createProfile(input);
    await this.refreshProfiles();
  }

  async updateProfile(code: string, input: Partial<MenuViewProfileRecord>): Promise<void> {
    await this.client.updateProfile(code, input);
    await this.refreshProfiles();
  }

  async deleteProfile(code: string): Promise<void> {
    await this.client.deleteProfile(code);
    await this.refreshProfiles();
  }

  async publishProfile(code: string, publish: boolean): Promise<void> {
    await this.client.publishProfile(code, publish);
    await this.refreshProfiles();
  }

  async preview(input: MenuPreviewRequest): Promise<void> {
    const result = await this.client.previewMenu(input);
    this.setState({ preview_result: result });
  }

  async patchEntryNavigation(
    contentType: string,
    recordID: string,
    overrides: Record<string, NavigationOverrideValue>,
    allowedLocations: string[]
  ): Promise<{ overrides: Record<string, NavigationOverrideValue>; effective_visibility: Record<string, boolean> }> {
    return this.client.patchEntryNavigation(contentType, recordID, overrides, allowedLocations);
  }

  resolveTarget(item: MenuItemNode): { url: string; valid: boolean; message: string } {
    return resolveTargetPreview(item);
  }

  private mapItems(
    items: MenuItemNode[],
    itemID: string,
    mapFn: (item: MenuItemNode) => MenuItemNode
  ): MenuItemNode[] {
    return items.map(item => {
      if (item.id === itemID) {
        return mapFn({ ...item, children: cloneItems(item.children || []) });
      }
      return {
        ...item,
        children: this.mapItems(item.children || [], itemID, mapFn),
      };
    });
  }

  private validateItems(items: MenuItemNode[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenTargets = new Map<string, string>();

    const walk = (node: MenuItemNode, depth: number, ancestors: Set<string>): void => {
      if (!node.label.trim()) {
        issues.push({
          code: 'label_required',
          message: `Menu item ${node.id} requires a label`,
          item_id: node.id,
        });
      }

      if (ancestors.has(node.id)) {
        issues.push({
          code: 'cycle',
          message: `Cycle detected at menu item ${node.id}`,
          item_id: node.id,
        });
      }

      if (depth > 8) {
        issues.push({
          code: 'depth',
          message: `Menu depth exceeds max level at ${node.id}`,
          item_id: node.id,
        });
      }

      const target = this.resolveTarget(node);
      if (!target.valid) {
        issues.push({
          code: 'invalid_target',
          message: `${node.label || node.id}: ${target.message}`,
          item_id: node.id,
        });
      }

      const targetKey = deriveTargetKey(node);
      if (targetKey) {
        const existing = seenTargets.get(targetKey);
        if (existing && existing !== node.id) {
          issues.push({
            code: 'duplicate_target',
            message: `Duplicate target detected between ${existing} and ${node.id}`,
            item_id: node.id,
          });
        } else {
          seenTargets.set(targetKey, node.id);
        }
      }

      const nextAncestors = new Set(ancestors);
      nextAncestors.add(node.id);
      (node.children || []).forEach(child => walk(child, depth + 1, nextAncestors));
    };

    items.forEach(item => walk(item, 1, new Set<string>()));
    return issues;
  }

  private setState(update: Partial<MenuBuilderState>): void {
    const selectedMenuChanged =
      Object.prototype.hasOwnProperty.call(update, 'selected_menu_id') &&
      update.selected_menu_id !== this.state.selected_menu_id;

    this.state = {
      ...this.state,
      ...update,
    };

    if (selectedMenuChanged && !Object.prototype.hasOwnProperty.call(update, 'preview_result')) {
      this.state.preview_result = null;
    }

    this.dispatchEvent(new CustomEvent<MenuBuilderState>('change', { detail: this.snapshot() }));
  }
}

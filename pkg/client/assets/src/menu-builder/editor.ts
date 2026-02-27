import { MenuBuilderAPIClient, MenuBuilderAPIError } from './api-client.js';
import { MenuBuilderStore } from './store.js';
import type {
  EntryNavigationConfig,
  EntryNavigationState,
  MenuBuilderState,
  MenuItemNode,
  MenuRecord,
  MenuTargetType,
  MenuViewProfileRecord,
  NavigationOverrideValue,
} from './types.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseJSONData<T>(raw: string | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeCSV(raw: string): string[] {
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort();
}

function safePrompt(message: string, initial = ''): string {
  const value = window.prompt(message, initial);
  return String(value || '').trim();
}

function normalizeRoute(basePath: string, path: string): string {
  if (!path) return '';
  if (path.startsWith('/')) return path;
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function normalizeAPIBasePath(basePath: string, candidate: string): string {
  const resolved = normalizeRoute(basePath, candidate || `${basePath}/api`);
  if (/\/api(\/|$)/.test(resolved)) {
    return resolved;
  }
  return `${resolved.replace(/\/+$/, '')}/api`;
}

function parseBool(raw: string | undefined): boolean {
  return String(raw || '').trim().toLowerCase() === 'true';
}

type DropMode = 'before' | 'after' | 'inside';

interface MenuBuilderUIConfig {
  basePath: string;
  apiBasePath: string;
  initialMenuID?: string;
}

export class MenuBuilderUI {
  private readonly root: HTMLElement;
  private readonly config: MenuBuilderUIConfig;
  private readonly store: MenuBuilderStore;
  private state: MenuBuilderState | null = null;
  private dragItemID = '';

  constructor(root: HTMLElement, config: MenuBuilderUIConfig) {
    this.root = root;
    this.config = config;
    const client = new MenuBuilderAPIClient({ basePath: config.apiBasePath });
    this.store = new MenuBuilderStore(client);
  }

  async init(): Promise<void> {
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
    this.root.addEventListener('dragstart', this.onDragStart);
    this.root.addEventListener('dragover', this.onDragOver);
    this.root.addEventListener('dragleave', this.onDragLeave);
    this.root.addEventListener('drop', this.onDrop);
    this.root.addEventListener('dragend', this.onDragEnd);

    this.store.addEventListener('change', (event: Event) => {
      const payload = (event as CustomEvent<MenuBuilderState>).detail;
      this.state = payload;
      this.render();
    });

    await this.store.initialize();
    const initialMenuID = String(this.config.initialMenuID || '').trim();
    if (initialMenuID) {
      await this.store.selectMenu(initialMenuID);
    }
  }

  destroy(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('change', this.onChange);
    this.root.removeEventListener('dragstart', this.onDragStart);
    this.root.removeEventListener('dragover', this.onDragOver);
    this.root.removeEventListener('dragleave', this.onDragLeave);
    this.root.removeEventListener('drop', this.onDrop);
    this.root.removeEventListener('dragend', this.onDragEnd);
  }

  private readonly onClick = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement;

    const selectMenuButton = target.closest<HTMLElement>('[data-menu-select]');
    if (selectMenuButton) {
      const id = String(selectMenuButton.dataset.menuSelect || '').trim();
      if (id) {
        await this.store.selectMenu(id);
      }
      return;
    }

    if (target.closest('[data-menu-create]')) {
      const code = safePrompt('New menu code (example: site.main):', 'site.main');
      if (!code) return;
      try {
        await this.store.createMenu({ code, name: code, status: 'draft' });
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-menu-save-meta]')) {
      const codeInput = this.root.querySelector<HTMLInputElement>('[data-menu-meta="code"]');
      const nameInput = this.root.querySelector<HTMLInputElement>('[data-menu-meta="name"]');
      const localeInput = this.root.querySelector<HTMLInputElement>('[data-menu-meta="locale"]');
      const descriptionInput = this.root.querySelector<HTMLTextAreaElement>('[data-menu-meta="description"]');

      try {
        await this.store.updateMenu({
          code: String(codeInput?.value || '').trim(),
          name: String(nameInput?.value || '').trim(),
          locale: String(localeInput?.value || '').trim(),
          description: String(descriptionInput?.value || '').trim(),
        });
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-menu-publish]')) {
      const action = String((target.closest('[data-menu-publish]') as HTMLElement).dataset.menuPublish || '').trim();
      try {
        await this.store.setPublishState(action === 'publish');
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-menu-clone]')) {
      const active = this.state?.selected_menu;
      if (!active) return;
      const code = safePrompt('Clone menu code:', `${active.code}_clone`);
      if (!code) return;
      try {
        await this.store.cloneSelectedMenu(code);
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-menu-archive]')) {
      const action = String((target.closest('[data-menu-archive]') as HTMLElement).dataset.menuArchive || '').trim();
      const archived = action === 'archive';
      try {
        await this.store.archiveSelectedMenu(archived);
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-menu-add-root]')) {
      this.store.addRootItem();
      return;
    }

    if (target.closest('[data-menu-add-child]')) {
      const id = String((target.closest('[data-menu-add-child]') as HTMLElement).dataset.menuAddChild || '').trim();
      if (id) {
        this.store.addChild(id);
      }
      return;
    }

    if (target.closest('[data-menu-remove-item]')) {
      const id = String((target.closest('[data-menu-remove-item]') as HTMLElement).dataset.menuRemoveItem || '').trim();
      if (id) {
        this.store.removeItem(id);
      }
      return;
    }

    if (target.closest('[data-menu-save-items]')) {
      try {
        await this.store.saveItems();
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-binding-save]')) {
      const locationInput = this.root.querySelector<HTMLInputElement>('[data-binding-field="location"]');
      const menuCodeInput = this.root.querySelector<HTMLSelectElement>('[data-binding-field="menu_code"]');
      const profileInput = this.root.querySelector<HTMLSelectElement>('[data-binding-field="view_profile_code"]');
      const statusInput = this.root.querySelector<HTMLSelectElement>('[data-binding-field="status"]');
      const localeInput = this.root.querySelector<HTMLInputElement>('[data-binding-field="locale"]');
      const priorityInput = this.root.querySelector<HTMLInputElement>('[data-binding-field="priority"]');

      const location = String(locationInput?.value || '').trim();
      if (!location) {
        this.showError(new Error('Binding location is required'));
        return;
      }

      try {
        await this.store.upsertBinding(location, {
          location,
          menu_code: String(menuCodeInput?.value || '').trim(),
          view_profile_code: String(profileInput?.value || '').trim(),
          status: (String(statusInput?.value || 'draft').trim().toLowerCase() as 'draft' | 'published'),
          locale: String(localeInput?.value || '').trim(),
          priority: Number.parseInt(String(priorityInput?.value || '0').trim(), 10) || 0,
        });
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-profile-create]')) {
      const code = safePrompt('Profile code:', 'footer');
      if (!code) return;
      try {
        await this.store.createProfile({ code, name: code, mode: 'full', status: 'draft' });
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-profile-save]')) {
      const codeInput = this.root.querySelector<HTMLSelectElement>('[data-profile-field="code"]');
      const nameInput = this.root.querySelector<HTMLInputElement>('[data-profile-field="name"]');
      const modeInput = this.root.querySelector<HTMLSelectElement>('[data-profile-field="mode"]');
      const topLevelInput = this.root.querySelector<HTMLInputElement>('[data-profile-field="max_top_level"]');
      const depthInput = this.root.querySelector<HTMLInputElement>('[data-profile-field="max_depth"]');
      const includeInput = this.root.querySelector<HTMLInputElement>('[data-profile-field="include_item_ids"]');
      const excludeInput = this.root.querySelector<HTMLInputElement>('[data-profile-field="exclude_item_ids"]');

      const code = String(codeInput?.value || '').trim();
      if (!code) {
        this.showError(new Error('Select a profile to update'));
        return;
      }

      try {
        await this.store.updateProfile(code, {
          code,
          name: String(nameInput?.value || '').trim(),
          mode: String(modeInput?.value || 'full').trim().toLowerCase() as MenuViewProfileRecord['mode'],
          max_top_level: Number.parseInt(String(topLevelInput?.value || '').trim(), 10) || undefined,
          max_depth: Number.parseInt(String(depthInput?.value || '').trim(), 10) || undefined,
          include_item_ids: normalizeCSV(String(includeInput?.value || '')),
          exclude_item_ids: normalizeCSV(String(excludeInput?.value || '')),
        });
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-profile-delete]')) {
      const codeInput = this.root.querySelector<HTMLSelectElement>('[data-profile-field="code"]');
      const code = String(codeInput?.value || '').trim();
      if (!code || code === 'full') {
        this.showError(new Error('Select a non-default profile to delete'));
        return;
      }
      if (!window.confirm(`Delete profile "${code}"?`)) {
        return;
      }
      try {
        await this.store.deleteProfile(code);
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-profile-publish]')) {
      const action = String((target.closest('[data-profile-publish]') as HTMLElement).dataset.profilePublish || '').trim();
      const codeInput = this.root.querySelector<HTMLSelectElement>('[data-profile-field="code"]');
      const code = String(codeInput?.value || '').trim();
      if (!code) {
        this.showError(new Error('Select a profile first'));
        return;
      }
      try {
        await this.store.publishProfile(code, action === 'publish');
      } catch (error) {
        this.showError(error);
      }
      return;
    }

    if (target.closest('[data-preview-run]')) {
      const menuID = this.state?.selected_menu_id || '';
      if (!menuID) return;

      const locationInput = this.root.querySelector<HTMLInputElement>('[data-preview-field="location"]');
      const localeInput = this.root.querySelector<HTMLInputElement>('[data-preview-field="locale"]');
      const profileInput = this.root.querySelector<HTMLInputElement>('[data-preview-field="view_profile"]');
      const includeDraftsInput = this.root.querySelector<HTMLInputElement>('[data-preview-field="include_drafts"]');
      const tokenInput = this.root.querySelector<HTMLInputElement>('[data-preview-field="preview_token"]');

      try {
        await this.store.preview({
          menuId: menuID,
          location: String(locationInput?.value || '').trim(),
          locale: String(localeInput?.value || '').trim(),
          view_profile: String(profileInput?.value || '').trim(),
          include_drafts: Boolean(includeDraftsInput?.checked),
          preview_token: String(tokenInput?.value || '').trim(),
        });
      } catch (error) {
        this.showError(error);
      }
    }
  };

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLElement;
    const field = target.closest<HTMLElement>('[data-menu-item-field]');
    if (field) {
      const itemID = String(field.dataset.menuItemField || '').trim();
      const input = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const fieldName = String(input.dataset.itemField || '').trim();
      if (!itemID || !fieldName) return;

      const item = this.findItemByID(this.state?.draft_items || [], itemID);
      if (!item) return;

      if (fieldName === 'label') {
        this.store.updateItem(itemID, { label: String(input.value || '').trim() });
        return;
      }

      if (fieldName === 'target.type') {
        const nextType = String(input.value || 'route').trim().toLowerCase() as MenuTargetType;
        this.store.updateItem(itemID, {
          target: {
            type: nextType,
            path: nextType === 'route' || nextType === 'module' ? '/' : undefined,
            url: nextType === 'external' ? 'https://' : undefined,
            content_type: nextType === 'content' ? 'page' : undefined,
            slug: nextType === 'content' ? 'home' : undefined,
          },
        });
        return;
      }

      const nextTarget: Record<string, unknown> = {
        ...(item.target || { type: 'route' as MenuTargetType }),
      };
      if (fieldName.startsWith('target.')) {
        const key = fieldName.replace('target.', '');
        nextTarget[key] = String(input.value || '').trim();
        this.store.updateItem(itemID, { target: nextTarget as unknown as MenuItemNode['target'] });
      }
      return;
    }

    const profileCodeField = target.closest<HTMLSelectElement>('[data-profile-field="code"]');
    if (profileCodeField) {
      this.syncSelectedProfile(profileCodeField.value);
    }
  };

  private readonly onDragStart = (event: Event): void => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-menu-item-id]');
    if (!item) return;
    const id = String(item.dataset.menuItemId || '').trim();
    if (!id) return;

    this.dragItemID = id;
    item.classList.add('opacity-60');
    if (event instanceof DragEvent && event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  };

  private readonly onDragOver = (event: Event): void => {
    if (!(event instanceof DragEvent)) return;
    const target = event.target as HTMLElement;
    const zone = target.closest<HTMLElement>('[data-drop-zone]');
    if (!zone) return;
    event.preventDefault();
    zone.classList.add('bg-blue-100');
  };

  private readonly onDragLeave = (event: Event): void => {
    const target = event.target as HTMLElement;
    const zone = target.closest<HTMLElement>('[data-drop-zone]');
    if (!zone) return;
    zone.classList.remove('bg-blue-100');
  };

  private readonly onDrop = (event: Event): void => {
    if (!(event instanceof DragEvent)) return;
    const target = event.target as HTMLElement;
    const zone = target.closest<HTMLElement>('[data-drop-zone]');
    if (!zone) return;

    event.preventDefault();
    zone.classList.remove('bg-blue-100');

    const targetID = String(zone.dataset.dropTarget || '').trim();
    const mode = String(zone.dataset.dropMode || 'inside').trim() as DropMode;
    const dragged = this.dragItemID || String(event.dataTransfer?.getData('text/plain') || '').trim();
    if (!dragged || !targetID || dragged === targetID) return;

    this.store.moveItem(dragged, targetID, mode);
  };

  private readonly onDragEnd = (event: Event): void => {
    this.dragItemID = '';
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-menu-item-id]');
    if (item) {
      item.classList.remove('opacity-60');
    }
    this.root.querySelectorAll<HTMLElement>('[data-drop-zone]').forEach(zone => zone.classList.remove('bg-blue-100'));
  };

  private render(): void {
    const state = this.state;
    if (!state) {
      return;
    }

    const activeMenu = state.selected_menu;
    const issueList = state.validation_issues
      .map(issue => `<li class="text-xs text-amber-700">${escapeHtml(issue.message)}</li>`)
      .join('');

    const previewItems = state.preview_result?.menu.items || [];

    this.root.innerHTML = `
      <div class="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-fit">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menus</h2>
            <button type="button" data-menu-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
          </div>
          <div class="space-y-2" data-menu-list>
            ${state.menus.length === 0
              ? '<p class="text-sm text-gray-500">No menus yet.</p>'
              : state.menus.map(menu => this.renderMenuCard(menu, state.selected_menu_id)).join('')}
          </div>
        </section>

        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-gray-900">${escapeHtml(activeMenu?.name || 'Menu Builder')}</h2>
              <p class="text-xs text-gray-500">List, create, edit, publish, clone, and archive menu trees.</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-menu-publish="publish" class="px-2.5 py-1.5 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700">Publish</button>
              <button type="button" data-menu-publish="unpublish" class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Unpublish</button>
              <button type="button" data-menu-clone class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Clone</button>
              <button type="button" data-menu-archive="archive" class="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded hover:bg-amber-200">Archive</button>
              <button type="button" data-menu-archive="restore" class="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Restore</button>
            </div>
          </header>

          ${state.error ? `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${escapeHtml(state.error)}</div>` : ''}

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600">
              Code
              <input data-menu-meta="code" value="${escapeHtml(activeMenu?.code || '')}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Name
              <input data-menu-meta="name" value="${escapeHtml(activeMenu?.name || '')}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Locale
              <input data-menu-meta="locale" value="${escapeHtml(activeMenu?.locale || '')}" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Status
              <input value="${escapeHtml(activeMenu?.status || 'draft')}" disabled class="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-600" />
            </label>
          </div>

          <label class="text-xs text-gray-600 block">
            Description
            <textarea data-menu-meta="description" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">${escapeHtml(activeMenu?.description || '')}</textarea>
          </label>

          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800">Menu Tree Editor</h3>
            <div class="flex items-center gap-2">
              <button type="button" data-menu-add-root class="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Add Root Item</button>
              <button type="button" data-menu-save-items class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Tree</button>
            </div>
          </div>

          ${issueList ? `<ul class="space-y-1 rounded border border-amber-200 bg-amber-50 px-3 py-2">${issueList}</ul>` : ''}

          <div class="rounded border border-gray-200 p-3" data-menu-tree>
            ${state.draft_items.length === 0
              ? '<p class="text-sm text-gray-500">No menu items yet. Add a root item to start.</p>'
              : this.renderTree(state.draft_items)}
          </div>
        </section>

        <section class="space-y-4">
          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-800">Location Binding Editor</h3>
            <p class="text-xs text-gray-500">Choose source menu and profile per location.</p>
            ${this.renderBindingList(state)}
            <div class="grid gap-2">
              <label class="text-xs text-gray-600">Location <input data-binding-field="location" placeholder="site.main" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Menu
                <select data-binding-field="menu_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Select menu</option>
                  ${state.menus.map(menu => `<option value="${escapeHtml(menu.code)}">${escapeHtml(menu.code)}</option>`).join('')}
                </select>
              </label>
              <label class="text-xs text-gray-600">View Profile
                <select data-binding-field="view_profile_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">full</option>
                  ${state.profiles.map(profile => `<option value="${escapeHtml(profile.code)}">${escapeHtml(profile.code)}</option>`).join('')}
                </select>
              </label>
              <label class="text-xs text-gray-600">Locale <input data-binding-field="locale" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Priority <input data-binding-field="priority" type="number" value="0" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Status
                <select data-binding-field="status" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </label>
              <button type="button" data-binding-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Binding</button>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">View Profile Editor</h3>
              <button type="button" data-profile-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
            </div>
            <label class="text-xs text-gray-600">Profile
              <select data-profile-field="code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                <option value="">Select profile</option>
                ${state.profiles.map(profile => `<option value="${escapeHtml(profile.code)}">${escapeHtml(profile.code)}</option>`).join('')}
              </select>
            </label>
            <label class="text-xs text-gray-600">Name <input data-profile-field="name" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Mode
              <select data-profile-field="mode" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                <option value="full">full</option>
                <option value="top_level_limit">top_level_limit</option>
                <option value="max_depth">max_depth</option>
                <option value="include_ids">include_ids</option>
                <option value="exclude_ids">exclude_ids</option>
              </select>
            </label>
            <label class="text-xs text-gray-600">Max Top Level <input data-profile-field="max_top_level" type="number" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Max Depth <input data-profile-field="max_depth" type="number" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Include Item IDs (csv) <input data-profile-field="include_item_ids" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Exclude Item IDs (csv) <input data-profile-field="exclude_item_ids" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <div class="flex items-center gap-2">
              <button type="button" data-profile-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Profile</button>
              <button type="button" data-profile-publish="publish" class="px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded hover:bg-green-200">Publish</button>
              <button type="button" data-profile-publish="unpublish" class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Unpublish</button>
              <button type="button" data-profile-delete class="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded hover:bg-red-200">Delete</button>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-800">Preview Simulation</h3>
            <p class="text-xs text-gray-500">Preview location/profile output and draft behavior.</p>
            <label class="text-xs text-gray-600">Location <input data-preview-field="location" placeholder="site.main" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Locale <input data-preview-field="locale" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">View Profile <input data-preview-field="view_profile" placeholder="full" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Preview Token <input data-preview-field="preview_token" placeholder="optional" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-700"><input data-preview-field="include_drafts" type="checkbox" class="rounded border-gray-300" /> include drafts</label>
            <button type="button" data-preview-run class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Run Preview</button>
            ${state.preview_result ? `
              <div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 space-y-1">
                <div><strong>Items:</strong> ${previewItems.length}</div>
                ${state.preview_result.simulation?.location ? `<div><strong>Location:</strong> ${escapeHtml(state.preview_result.simulation.location)}</div>` : ''}
                ${state.preview_result.simulation?.view_profile ? `<div><strong>Profile:</strong> ${escapeHtml(state.preview_result.simulation.view_profile)}</div>` : ''}
                <div><strong>Top Labels:</strong> ${escapeHtml(previewItems.map(item => item.label).join(', ') || '(none)')}</div>
              </div>
            ` : ''}
          </div>
        </section>
      </div>
    `;

    const selectedProfile = this.root.querySelector<HTMLSelectElement>('[data-profile-field="code"]');
    if (selectedProfile && selectedProfile.value) {
      this.syncSelectedProfile(selectedProfile.value);
    }
  }

  private renderMenuCard(menu: MenuRecord, selectedID: string): string {
    const selected = menu.id === selectedID;
    return `
      <button type="button"
              data-menu-select="${escapeHtml(menu.id)}"
              class="w-full text-left rounded-lg border px-3 py-2 ${selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">${escapeHtml(menu.name || menu.code)}</span>
          <span class="text-[10px] uppercase tracking-wide ${menu.status === 'published' ? 'text-green-700' : 'text-gray-500'}">${escapeHtml(menu.status)}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate">${escapeHtml(menu.code)}</div>
      </button>
    `;
  }

  private renderTree(items: MenuItemNode[]): string {
    return `<ul class="space-y-2">${items.map(item => this.renderTreeNode(item)).join('')}</ul>`;
  }

  private renderTreeNode(item: MenuItemNode): string {
    const targetType = String(item.target?.type || 'route');
    const resolved = this.store.resolveTarget(item);
    const targetFields = this.renderTargetFields(item, targetType);

    return `
      <li class="rounded border border-gray-200" data-menu-item-id="${escapeHtml(item.id)}" draggable="true">
        <div class="h-1 rounded-t bg-transparent" data-drop-zone data-drop-target="${escapeHtml(item.id)}" data-drop-mode="before"></div>
        <div class="px-2 py-2 space-y-2" data-drop-zone data-drop-target="${escapeHtml(item.id)}" data-drop-mode="inside">
          <div class="flex items-start gap-2" data-menu-item-field="${escapeHtml(item.id)}">
            <span class="cursor-move text-gray-400 pt-1" title="Drag to reorder">⋮⋮</span>
            <div class="flex-1 grid gap-2 md:grid-cols-[1fr,140px]">
              <input
                data-item-field="label"
                value="${escapeHtml(item.label)}"
                placeholder="Label"
                class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select data-item-field="target.type" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
                ${['content', 'route', 'module', 'external'].map(type => `<option value="${type}" ${type === targetType ? 'selected' : ''}>${type}</option>`).join('')}
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-menu-add-child="${escapeHtml(item.id)}" class="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded">+Child</button>
              <button type="button" data-menu-remove-item="${escapeHtml(item.id)}" class="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div data-menu-item-field="${escapeHtml(item.id)}" class="grid gap-2 md:grid-cols-[1fr,auto]">
            ${targetFields}
            <div class="text-[11px] ${resolved.valid ? 'text-green-700' : 'text-amber-700'}">
              <div class="font-semibold">${resolved.valid ? 'Resolved URL' : 'Validation'}</div>
              <div>${escapeHtml(resolved.url || resolved.message)}</div>
            </div>
          </div>
          ${item.children && item.children.length > 0 ? this.renderTree(item.children) : ''}
        </div>
        <div class="h-1 rounded-b bg-transparent" data-drop-zone data-drop-target="${escapeHtml(item.id)}" data-drop-mode="after"></div>
      </li>
    `;
  }

  private renderTargetFields(item: MenuItemNode, targetType: string): string {
    if (targetType === 'external') {
      return `
        <label class="text-xs text-gray-600">External URL
          <input data-item-field="target.url" value="${escapeHtml(item.target?.url || '')}" placeholder="https://example.com" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      `;
    }

    if (targetType === 'content') {
      return `
        <div class="grid gap-2 md:grid-cols-2">
          <label class="text-xs text-gray-600">Content Type
            <input data-item-field="target.content_type" value="${escapeHtml(item.target?.content_type || '')}" placeholder="page" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="text-xs text-gray-600">Slug / ID
            <input data-item-field="target.slug" value="${escapeHtml(item.target?.slug || item.target?.id || '')}" placeholder="home" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      `;
    }

    if (targetType === 'module') {
      return `
        <label class="text-xs text-gray-600">Module Path
          <input data-item-field="target.path" value="${escapeHtml(item.target?.path || item.target?.module || '')}" placeholder="/docs" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      `;
    }

    return `
      <label class="text-xs text-gray-600">Route Path
        <input data-item-field="target.path" value="${escapeHtml(item.target?.path || item.target?.route || '')}" placeholder="/" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
    `;
  }

  private renderBindingList(state: MenuBuilderState): string {
    if (state.bindings.length === 0) {
      return '<p class="text-xs text-gray-500">No bindings configured.</p>';
    }
    return `
      <div class="max-h-40 overflow-auto rounded border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-500 uppercase tracking-wide">
            <tr>
              <th class="text-left px-2 py-1">Location</th>
              <th class="text-left px-2 py-1">Menu</th>
              <th class="text-left px-2 py-1">Profile</th>
              <th class="text-left px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            ${state.bindings.map(binding => `
              <tr>
                <td class="px-2 py-1">${escapeHtml(binding.location)}</td>
                <td class="px-2 py-1">${escapeHtml(binding.menu_code)}</td>
                <td class="px-2 py-1">${escapeHtml(binding.view_profile_code || 'full')}</td>
                <td class="px-2 py-1">${escapeHtml(binding.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private findItemByID(items: MenuItemNode[], id: string): MenuItemNode | null {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      const nested = this.findItemByID(item.children || [], id);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  private syncSelectedProfile(code: string): void {
    const profile = (this.state?.profiles || []).find(item => item.code === code);
    if (!profile) return;

    const setValue = (selector: string, value: string): void => {
      const input = this.root.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
      if (input) {
        input.value = value;
      }
    };

    setValue('[data-profile-field="name"]', profile.name || '');
    setValue('[data-profile-field="mode"]', profile.mode || 'full');
    setValue('[data-profile-field="max_top_level"]', profile.max_top_level ? String(profile.max_top_level) : '');
    setValue('[data-profile-field="max_depth"]', profile.max_depth ? String(profile.max_depth) : '');
    setValue('[data-profile-field="include_item_ids"]', (profile.include_item_ids || []).join(','));
    setValue('[data-profile-field="exclude_item_ids"]', (profile.exclude_item_ids || []).join(','));
  }

  private showError(error: unknown): void {
    const container = this.root.parentElement?.querySelector<HTMLElement>('[data-menu-builder-error]') || null;
    const message = this.formatError(error);
    if (container) {
      container.textContent = message;
      container.classList.remove('hidden');
      return;
    }
    console.error('[MenuBuilderUI]', message, error);
  }

  private formatError(error: unknown): string {
    if (error instanceof MenuBuilderAPIError) {
      const field = String(error.metadata?.field || '').trim();
      if (field) {
        return `${error.message} (${field})`;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

export class EntryNavigationOverrideUI {
  private readonly root: HTMLElement;
  private readonly store: MenuBuilderStore;
  private readonly contentType: string;
  private readonly recordID: string;
  private readonly config: EntryNavigationConfig;
  private state: EntryNavigationState;

  constructor(root: HTMLElement, store: MenuBuilderStore, contentType: string, recordID: string, config: EntryNavigationConfig, state: EntryNavigationState) {
    this.root = root;
    this.store = store;
    this.contentType = contentType;
    this.recordID = recordID;
    this.config = config;
    this.state = state;
  }

  init(): void {
    this.root.addEventListener('change', this.onChange);
    this.root.addEventListener('click', this.onClick);
    this.render('');
  }

  destroy(): void {
    this.root.removeEventListener('change', this.onChange);
    this.root.removeEventListener('click', this.onClick);
  }

  private readonly onChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    if (!target.matches('[data-navigation-location]')) {
      return;
    }
    const location = String(target.dataset.navigationLocation || '').trim();
    const value = String(target.value || '').trim().toLowerCase() as NavigationOverrideValue;
    if (!location) return;
    if (!['inherit', 'show', 'hide'].includes(value)) return;
    this.state.overrides[location] = value;
  };

  private readonly onClick = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-navigation-save]')) {
      return;
    }
    await this.saveOverrides();
  };

  private async saveOverrides(): Promise<void> {
    if (!this.config.enabled) {
      this.render('Navigation overrides are disabled for this content type.');
      return;
    }
    if (!this.config.allow_instance_override) {
      this.render('Instance overrides are disabled by content type policy.');
      return;
    }

    try {
      const result = await this.store.patchEntryNavigation(
        this.contentType,
        this.recordID,
        this.state.overrides,
        this.config.eligible_locations
      );
      this.state = {
        overrides: { ...result.overrides },
        effective_visibility: { ...result.effective_visibility },
      };
      this.render('Saved entry navigation overrides.');
    } catch (error) {
      if (error instanceof MenuBuilderAPIError) {
        const invalidLocationField = String(error.metadata.field || '').trim();
        if (invalidLocationField.startsWith('_navigation.')) {
          this.render(`Invalid location: ${invalidLocationField.replace('_navigation.', '')}`);
          return;
        }
      }
      this.render(error instanceof Error ? error.message : String(error));
    }
  }

  private render(message: string): void {
    const rows = this.config.eligible_locations
      .map(location => {
        const override = this.state.overrides[location] || 'inherit';
        const effective = this.state.effective_visibility[location] === true;
        return `
          <div class="grid gap-2 md:grid-cols-[1fr,180px,120px] items-center">
            <div>
              <div class="text-sm font-medium text-gray-800">Show in ${escapeHtml(location)}</div>
              <div class="text-xs text-gray-500">Tri-state: inherit, show, hide</div>
            </div>
            <select data-navigation-location="${escapeHtml(location)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${!this.config.allow_instance_override ? 'disabled' : ''}>
              <option value="inherit" ${override === 'inherit' ? 'selected' : ''}>inherit</option>
              <option value="show" ${override === 'show' ? 'selected' : ''}>show</option>
              <option value="hide" ${override === 'hide' ? 'selected' : ''}>hide</option>
            </select>
            <span class="inline-flex justify-center rounded px-2 py-1 text-xs font-semibold ${effective ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
              ${effective ? 'Visible' : 'Hidden'}
            </span>
          </div>
        `;
      })
      .join('');

    const help = this.config.allow_instance_override
      ? 'Overrides are applied per entry. Use inherit/show/hide to control each location.'
      : 'This content type has instance-level overrides disabled.';

    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${escapeHtml(help)}</p>
        </div>
        <div class="space-y-2">${rows || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${message ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${escapeHtml(message)}</div>` : ''}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${!this.config.allow_instance_override ? 'disabled' : ''}>
            Save Visibility Overrides
          </button>
        </div>
      </section>
    `;
  }
}

function parseEntryNavigationConfig(root: HTMLElement): EntryNavigationConfig {
  return {
    enabled: parseBool(root.dataset.navigationEnabled),
    eligible_locations: parseJSONData<string[]>(root.dataset.navigationEligibleLocations, []),
    default_locations: parseJSONData<string[]>(root.dataset.navigationDefaultLocations, []),
    allow_instance_override: parseBool(root.dataset.navigationAllowInstanceOverride),
    merge_mode: String(root.dataset.navigationMergeMode || '').trim(),
  };
}

function parseEntryNavigationState(root: HTMLElement): EntryNavigationState {
  return {
    overrides: parseJSONData<Record<string, NavigationOverrideValue>>(root.dataset.navigationOverrides, {}),
    effective_visibility: parseJSONData<Record<string, boolean>>(root.dataset.navigationEffectiveVisibility, {}),
  };
}

export async function initMenuBuilder(root: HTMLElement): Promise<MenuBuilderUI> {
  const basePath = normalizeRoute('/', String(root.dataset.basePath || '/admin'));
  const apiBase = normalizeAPIBasePath(basePath, String(root.dataset.apiBasePath || `${basePath}/api`));
  const initialMenuID = String(root.dataset.menuId || '').trim();

  const ui = new MenuBuilderUI(root, {
    basePath,
    apiBasePath: apiBase,
    initialMenuID,
  });
  await ui.init();
  return ui;
}

export async function initEntryNavigationOverrides(root: HTMLElement): Promise<EntryNavigationOverrideUI | null> {
  const panelName = String(root.dataset.panelName || '').trim();
  const recordID = String(root.dataset.recordId || '').trim();
  if (!panelName || !recordID) {
    return null;
  }

  const basePath = normalizeRoute('/', String(root.dataset.basePath || '/admin'));
  const apiBase = normalizeAPIBasePath(basePath, String(root.dataset.apiBasePath || `${basePath}/api`));
  const store = new MenuBuilderStore(new MenuBuilderAPIClient({ basePath: apiBase }));

  const config = parseEntryNavigationConfig(root);
  const state = parseEntryNavigationState(root);
  const ui = new EntryNavigationOverrideUI(root, store, panelName, recordID, config, state);
  ui.init();
  return ui;
}

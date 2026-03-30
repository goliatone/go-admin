import {
  parseMenuBindingRecord,
  parseMenuContracts,
  parseMenuItemNode,
  parseMenuPreviewResult,
  parseMenuRecord,
  parseMenuViewProfileRecord,
  parseNavigationOverrides,
} from './guards.js';
import type {
  MenuBindingRecord,
  MenuBuilderContracts,
  MenuItemNode,
  MenuPreviewResult,
  MenuRecord,
  MenuViewProfileRecord,
  NavigationOverrideValue,
} from './types.js';
import { normalizeMenuBuilderPath } from './shared/path-helpers.js';
import { asRecord } from '../shared/coercion.js';

export class MenuBuilderAPIError extends Error {
  readonly status: number;
  readonly textCode: string;
  readonly metadata: Record<string, unknown>;

  constructor(message: string, status = 500, textCode = '', metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MenuBuilderAPIError';
    this.status = status;
    this.textCode = textCode;
    this.metadata = metadata;
  }
}

export interface MenuBuilderAPIClientConfig {
  basePath: string;
  contractsPath?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export interface MenuPreviewRequest {
  menuId: string;
  location?: string;
  locale?: string;
  view_profile?: string;
  include_drafts?: boolean;
  preview_token?: string;
}

function fillPath(pathTemplate: string, params: Record<string, string>): string {
  let resolved = pathTemplate;
  Object.entries(params).forEach(([key, value]) => {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(String(value)));
  });
  return resolved;
}

export class MenuBuilderAPIClient {
  private readonly config: Required<MenuBuilderAPIClientConfig>;
  private contracts: MenuBuilderContracts | null = null;

  constructor(config: MenuBuilderAPIClientConfig) {
    const normalizedBase = config.basePath.replace(/\/+$/, '');
    this.config = {
      basePath: normalizedBase,
      contractsPath: config.contractsPath || `${normalizedBase}/menu-contracts`,
      credentials: config.credentials ?? 'same-origin',
      headers: config.headers ?? {},
    };
  }

  async loadContracts(force = false): Promise<MenuBuilderContracts> {
    if (this.contracts && !force) {
      return this.contracts;
    }
    const response = await this.fetchJSON(this.config.contractsPath, { method: 'GET' });
    const payload = asRecord(response);
    const parsed = parseMenuContracts(payload.contracts ?? payload);
    this.contracts = parsed;
    return parsed;
  }

  async listMenus(): Promise<MenuRecord[]> {
    const payload = await this.fetchFromEndpoint('menus', { method: 'GET' });
    const rawMenus = Array.isArray(payload.menus)
      ? payload.menus
      : (Array.isArray(payload.data) ? payload.data : []);
    return rawMenus.map(item => parseMenuRecord(item));
  }

  async getMenu(id: string): Promise<{ menu: MenuRecord; items: MenuItemNode[] }> {
    const payload = await this.fetchFromEndpoint('menus.id', {
      method: 'GET',
      params: { id },
    });
    const menu = parseMenuRecord(payload.menu ?? payload.data ?? payload);
    const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
    const items = itemsRaw.map((item, index) => parseMenuItemNode(item, `menu.items[${index}]`));
    return { menu, items };
  }

  async createMenu(input: Partial<MenuRecord>): Promise<MenuRecord> {
    const payload = await this.fetchFromEndpoint('menus', {
      method: 'POST',
      body: input,
    });
    return parseMenuRecord(payload.menu ?? payload.data ?? payload);
  }

  async updateMenu(id: string, input: Partial<MenuRecord>): Promise<MenuRecord> {
    const payload = await this.fetchFromEndpoint('menus.id', {
      method: 'PUT',
      params: { id },
      body: input,
    });
    return parseMenuRecord(payload.menu ?? payload.data ?? payload);
  }

  async publishMenu(id: string, publish: boolean): Promise<MenuRecord> {
    const key = publish ? 'menus.publish' : 'menus.unpublish';
    const payload = await this.fetchFromEndpoint(key, {
      method: 'POST',
      params: { id },
      body: {},
    });
    return parseMenuRecord(payload.menu ?? payload.data ?? payload);
  }

  async cloneMenu(id: string, code: string): Promise<MenuRecord> {
    const payload = await this.fetchFromEndpoint('menus.clone', {
      method: 'POST',
      params: { id },
      body: { code },
    });
    return parseMenuRecord(payload.menu ?? payload.data ?? payload);
  }

  async archiveMenu(id: string, archived: boolean): Promise<MenuRecord> {
    const payload = await this.fetchFromEndpoint('menus.archive', {
      method: 'POST',
      params: { id },
      body: { archived },
    });
    return parseMenuRecord(payload.menu ?? payload.data ?? payload);
  }

  async upsertMenuItems(id: string, items: MenuItemNode[]): Promise<MenuItemNode[]> {
    const payload = await this.fetchFromEndpoint('menus.items', {
      method: 'PUT',
      params: { id },
      body: { items },
    });
    const menu = asRecord(payload.menu ?? payload.data ?? {});
    const rawItems = Array.isArray(menu.items)
      ? menu.items
      : (Array.isArray(menu.Items) ? menu.Items : []);
    return rawItems.map((item, index) => parseMenuItemNode(item, `menu.items[${index}]`));
  }

  async previewMenu(input: MenuPreviewRequest): Promise<MenuPreviewResult> {
    const query = new URLSearchParams();
    if (input.location) query.set('location', input.location);
    if (input.locale) query.set('locale', input.locale);
    if (input.view_profile) query.set('view_profile', input.view_profile);
    if (input.include_drafts) query.set('include_drafts', 'true');
    if (input.preview_token) query.set('preview_token', input.preview_token);

    const payload = await this.fetchFromEndpoint('menus.preview', {
      method: 'GET',
      params: { id: input.menuId },
      query,
    });
    return parseMenuPreviewResult(payload);
  }

  async listBindings(): Promise<MenuBindingRecord[]> {
    const payload = await this.fetchFromEndpoint('menu.bindings', { method: 'GET' });
    const rawBindings = Array.isArray(payload.bindings)
      ? payload.bindings
      : (Array.isArray(payload.data) ? payload.data : []);
    return rawBindings.map(item => parseMenuBindingRecord(item));
  }

  async upsertBinding(location: string, input: Partial<MenuBindingRecord>): Promise<MenuBindingRecord> {
    const payload = await this.fetchFromEndpoint('menu.bindings.location', {
      method: 'PUT',
      params: { location },
      body: input,
    });
    return parseMenuBindingRecord(payload.binding ?? payload.data ?? payload);
  }

  async listProfiles(): Promise<MenuViewProfileRecord[]> {
    const payload = await this.fetchFromEndpoint('menu.view_profiles', { method: 'GET' });
    const rawProfiles = Array.isArray(payload.view_profiles)
      ? payload.view_profiles
      : (Array.isArray(payload.profiles)
        ? payload.profiles
        : (Array.isArray(payload.data) ? payload.data : []));
    return rawProfiles.map(item => parseMenuViewProfileRecord(item));
  }

  async createProfile(input: Partial<MenuViewProfileRecord>): Promise<MenuViewProfileRecord> {
    const payload = await this.fetchFromEndpoint('menu.view_profiles', {
      method: 'POST',
      body: input,
    });
    return parseMenuViewProfileRecord(payload.view_profile ?? payload.profile ?? payload.data ?? payload);
  }

  async updateProfile(code: string, input: Partial<MenuViewProfileRecord>): Promise<MenuViewProfileRecord> {
    const payload = await this.fetchFromEndpoint('menu.view_profiles.code', {
      method: 'PUT',
      params: { code },
      body: input,
    });
    return parseMenuViewProfileRecord(payload.view_profile ?? payload.profile ?? payload.data ?? payload);
  }

  async deleteProfile(code: string): Promise<void> {
    await this.fetchFromEndpoint('menu.view_profiles.code', {
      method: 'DELETE',
      params: { code },
    });
  }

  async publishProfile(code: string, publish: boolean): Promise<MenuViewProfileRecord> {
    const payload = await this.fetchFromEndpoint('menu.view_profiles.publish', {
      method: 'POST',
      params: { code },
      body: { publish },
    });
    return parseMenuViewProfileRecord(payload.view_profile ?? payload.profile ?? payload.data ?? payload);
  }

  async patchEntryNavigation(
    contentType: string,
    recordID: string,
    overrides: Record<string, NavigationOverrideValue>,
    allowedLocations: string[] = []
  ): Promise<{ overrides: Record<string, NavigationOverrideValue>; effective_visibility: Record<string, boolean> }> {
    let template = `${this.config.basePath}/content/:type/:id/navigation`;
    try {
      const contracts = await this.loadContracts();
      template = contracts.content_navigation?.endpoints?.['content.navigation'] || template;
    } catch {
      // Fall back to canonical endpoint path when menu contracts are unavailable.
    }
    const endpoint = normalizeMenuBuilderPath(this.config.basePath, fillPath(template, { type: contentType, id: recordID }));
    const payload = await this.fetchJSON(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ _navigation: overrides }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const body = asRecord(payload);
    const data = asRecord(body.data ?? body);
    return {
      overrides: parseNavigationOverrides(data._navigation, allowedLocations),
      effective_visibility: asRecord(data.effective_navigation_visibility) as Record<string, boolean>,
    };
  }

  private async fetchFromEndpoint(
    key: string,
    options: {
      method: string;
      params?: Record<string, string>;
      body?: unknown;
      query?: URLSearchParams;
    }
  ): Promise<Record<string, unknown>> {
    const contracts = await this.loadContracts();
    const template = contracts.endpoints[key];
    if (!template) {
      throw new MenuBuilderAPIError(`missing endpoint contract for ${key}`, 500, 'CONTRACT_MISSING');
    }

    const endpoint = normalizeMenuBuilderPath(this.config.basePath, fillPath(template, options.params ?? {}));
    const query = String(options.query ?? '').trim();
    const queryString = query ? `?${query}` : '';

    const payload = await this.fetchJSON(`${endpoint}${queryString}`, {
      method: options.method,
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: options.body
        ? {
            'Content-Type': 'application/json',
          }
        : undefined,
    });

    return asRecord(payload);
  }

  private async fetchJSON(path: string, options: RequestInit): Promise<unknown> {
    const response = await fetch(path, {
      ...options,
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        ...(options.headers ?? {}),
      },
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = asRecord((payload as Record<string, unknown>)?.error ?? payload);
      const message = String(error.message ?? (response.statusText || 'request failed')).trim() || 'request failed';
      const textCode = String(error.text_code ?? '').trim();
      const metadata = asRecord(error.metadata);
      throw new MenuBuilderAPIError(message, response.status, textCode, metadata);
    }

    return payload;
  }
}

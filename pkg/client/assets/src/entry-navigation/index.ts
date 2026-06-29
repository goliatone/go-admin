import { coerceString } from '../shared/coercion.js';
import { escapeHTML as escapeHtml } from '../shared/html.js';
import { parseJSONValue } from '../shared/json-parse.js';
import { onReady } from '../shared/dom-ready.js';
import { EntryNavigationAPIClient, EntryNavigationAPIError } from './api-client.js';
import type { EntryNavigationConfig, EntryNavigationState, NavigationOverrideValue } from './types.js';

export type { EntryNavigationConfig, EntryNavigationPatchResult, EntryNavigationState, NavigationOverrideValue } from './types.js';
export { EntryNavigationAPIClient, EntryNavigationAPIError, parseNavigationOverrides } from './api-client.js';

function normalizePath(basePath: string, path: string, emptyFallback = basePath): string {
  if (!path) {
    return emptyFallback;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function normalizeAPIBasePath(basePath: string, candidate: string): string {
  const fallback = `${basePath.replace(/\/+$/, '')}/api`;
  const resolved = normalizePath(basePath, candidate || fallback, fallback);
  if (/\/api(\/|$)/.test(resolved)) {
    return resolved;
  }
  return `${resolved.replace(/\/+$/, '')}/api`;
}

function parseBool(raw: string | undefined): boolean {
  return coerceString(raw).toLowerCase() === 'true';
}

export class EntryNavigationOverrideUI {
  private readonly root: HTMLElement;
  private readonly client: EntryNavigationAPIClient;
  private readonly contentType: string;
  private readonly recordID: string;
  private readonly config: EntryNavigationConfig;
  private state: EntryNavigationState;

  constructor(root: HTMLElement, client: EntryNavigationAPIClient, contentType: string, recordID: string, config: EntryNavigationConfig, state: EntryNavigationState) {
    this.root = root;
    this.client = client;
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
    if (!this.config.editable) {
      return;
    }
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
      this.render('Navigation visibility is unavailable for this content type.');
      return;
    }
    if (!this.config.editable || !this.config.allow_instance_override) {
      this.render('Navigation visibility is read-only.');
      return;
    }

    try {
      const result = await this.client.patchEntryNavigation(
        this.contentType,
        this.recordID,
        this.state.overrides,
        this.config.eligible_locations
      );
      this.state = {
        overrides: { ...result.overrides },
        effective_visibility: { ...result.effective_visibility },
      };
      this.render('Saved entry navigation visibility.');
    } catch (error) {
      if (error instanceof EntryNavigationAPIError) {
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
    const disabled = !this.config.editable || !this.config.allow_instance_override;
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
            <select data-navigation-location="${escapeHtml(location)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${disabled ? 'disabled' : ''}>
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

    const help = disabled
      ? 'Navigation visibility is read-only for this entry.'
      : 'Overrides are applied per entry. Use inherit/show/hide to control each location.';

    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${escapeHtml(help)}</p>
        </div>
        <div class="space-y-2">${rows || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${message ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${escapeHtml(message)}</div>` : ''}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${disabled ? 'disabled' : ''}>
            Save Visibility
          </button>
        </div>
      </section>
    `;
  }
}

export function parseEntryNavigationConfig(root: HTMLElement): EntryNavigationConfig {
  return {
    enabled: parseBool(root.dataset.navigationEnabled),
    editable: parseBool(root.dataset.navigationEditable),
    read_only: parseBool(root.dataset.navigationReadOnly),
    endpoint: String(root.dataset.navigationEndpoint || '').trim(),
    eligible_locations: parseJSONValue<string[]>(root.dataset.navigationEligibleLocations, []),
    default_locations: parseJSONValue<string[]>(root.dataset.navigationDefaultLocations, []),
    allow_instance_override: parseBool(root.dataset.navigationAllowInstanceOverride),
  };
}

export function parseEntryNavigationState(root: HTMLElement): EntryNavigationState {
  return {
    overrides: parseJSONValue<Record<string, NavigationOverrideValue>>(root.dataset.navigationOverrides, {}),
    effective_visibility: parseJSONValue<Record<string, boolean>>(root.dataset.navigationEffectiveVisibility, {}),
  };
}

export async function initEntryNavigationOverrides(root: HTMLElement): Promise<EntryNavigationOverrideUI | null> {
  const panelName = String(root.dataset.panelName || '').trim();
  const recordID = String(root.dataset.recordId || '').trim();
  if (!panelName || !recordID) {
    return null;
  }

  const basePath = normalizePath('/', String(root.dataset.basePath || '/admin'), '');
  const apiBase = normalizeAPIBasePath(basePath, String(root.dataset.apiBasePath || `${basePath}/api`));
  const config = parseEntryNavigationConfig(root);
  const client = new EntryNavigationAPIClient({ basePath: apiBase, endpoint: config.endpoint });
  const state = parseEntryNavigationState(root);
  const ui = new EntryNavigationOverrideUI(root, client, panelName, recordID, config, state);
  ui.init();
  return ui;
}

onReady(() => {
  document.querySelectorAll<HTMLElement>('[data-entry-navigation-root]').forEach((root) => {
    if (root.dataset.initialized === 'true') return;
    initEntryNavigationOverrides(root)
      .then(() => {
        root.dataset.initialized = 'true';
      })
      .catch((error: unknown) => {
        console.error('[entry-navigation] failed to initialize', error);
        root.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${error instanceof Error ? error.message : String(error)}</div>`;
      });
  });
});

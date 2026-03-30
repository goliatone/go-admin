import { FallbackNotifier } from '../toast/toast-manager.js';
import type { ToastNotifier } from '../toast/types.js';
import {
  formatStructuredErrorForDisplay,
  getStructuredActionError,
  isHandledActionError,
} from '../toast/error-helpers.js';
import { normalizeDetailActionStatePayload } from './action-contracts.js';
import type { ActionButton } from './actions.js';
import { SchemaActionBuilder, type SchemaAction } from './schema-actions.js';
import { escapeHTML as escapeHtml } from '../shared/html.js';
import { readHTTPJSONValue } from '../shared/transport/http-client.js';

export interface DetailActionsMountConfig {
  mount: HTMLElement;
  notifier?: ToastNotifier;
  fetchImpl?: typeof fetch;
}

interface DetailPayload {
  data?: Record<string, unknown>;
  schema?: {
    actions?: SchemaAction[];
  };
}

function resolveDefaultNotifier(): ToastNotifier {
  const maybeWindow = globalThis.window as ({ toastManager?: ToastNotifier } | undefined);
  if (maybeWindow?.toastManager) {
    return maybeWindow.toastManager;
  }
  return new FallbackNotifier();
}

async function readDetailPayload(response: Response): Promise<unknown> {
  return readHTTPJSONValue<unknown>(response, null);
}

function actionKey(action: ActionButton, index: number): string {
  const raw = typeof action.id === 'string' && action.id.trim()
    ? action.id.trim()
    : `${action.label}-${index + 1}`;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `action-${index + 1}`;
}
function detailButtonClasses(action: ActionButton, disabled: boolean): string {
  const base = 'inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  if (disabled) {
    return `${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  }
  switch ((action.variant || 'secondary').toLowerCase()) {
    case 'primary':
      return `${base} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case 'danger':
      return `${base} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case 'success':
      return `${base} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case 'warning':
      return `${base} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${base} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}

function compactButtonClasses(action: ActionButton, disabled: boolean): string {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  if (disabled) {
    return `${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  }
  switch ((action.variant || 'secondary').toLowerCase()) {
    case 'primary':
      return `${base} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case 'danger':
      return `${base} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case 'success':
      return `${base} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case 'warning':
      return `${base} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${base} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}

function dropdownItemClasses(action: ActionButton, disabled: boolean): string {
  const base = 'flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors';
  if (disabled) {
    return `${base} cursor-not-allowed text-gray-400`;
  }
  switch ((action.variant || 'secondary').toLowerCase()) {
    case 'danger':
      return `${base} text-red-600 hover:bg-red-50`;
    case 'success':
      return `${base} text-emerald-600 hover:bg-emerald-50`;
    case 'warning':
      return `${base} text-amber-600 hover:bg-amber-50`;
    default:
      return `${base} text-gray-700 hover:bg-gray-50`;
  }
}

function getActionIcon(action: ActionButton): string {
  const iconMap: Record<string, string> = {
    edit: 'iconoir-edit-pencil',
    delete: 'iconoir-trash',
    publish: 'iconoir-cloud-upload',
    unpublish: 'iconoir-cloud-download',
    submit_for_approval: 'iconoir-send',
    approve: 'iconoir-check-circle',
    reject: 'iconoir-xmark-circle',
    archive: 'iconoir-archive',
    restore: 'iconoir-refresh',
    duplicate: 'iconoir-copy',
    add_translation: 'iconoir-translate',
    create_translation: 'iconoir-translate',
  };
  const actionId = String(action.id || '').toLowerCase().replace(/[^a-z_]/g, '_');
  return iconMap[actionId] || '';
}

function findPrimaryAction(actions: ActionButton[]): { primary: ActionButton | null; rest: ActionButton[] } {
  const editIndex = actions.findIndex((action) => String(action.id || '').toLowerCase() === 'edit');
  if (editIndex >= 0) {
    return {
      primary: actions[editIndex],
      rest: [...actions.slice(0, editIndex), ...actions.slice(editIndex + 1)],
    };
  }

  const primaryIndex = actions.findIndex((action) => (action.variant || '').toLowerCase() === 'primary');
  if (primaryIndex >= 0) {
    return {
      primary: actions[primaryIndex],
      rest: [...actions.slice(0, primaryIndex), ...actions.slice(primaryIndex + 1)],
    };
  }

  if (actions.length === 1) {
    return { primary: actions[0], rest: [] };
  }

  return { primary: null, rest: actions };
}

export function renderDetailActions(actions: ActionButton[]): string {
  if (actions.length === 0) {
    return '';
  }

  const { primary, rest } = findPrimaryAction(actions);

  let primaryHtml = '';
  if (primary) {
    const disabled = primary.disabled === true;
    const key = actionKey(primary, 0);
    const icon = getActionIcon(primary);
    const reason = disabled ? (primary.disabledReason || 'Action unavailable').trim() : '';
    const reasonId = reason ? `detail-action-reason-${key}` : '';
    const describedBy = reasonId ? `aria-describedby="${reasonId}"` : '';
    const ariaLabel = reason ? `${primary.label} unavailable: ${reason}` : primary.label;
    const remediation = disabled && primary.remediation?.href && primary.remediation?.label
      ? `
          <a
            href="${escapeHtml(primary.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${escapeHtml(key)}"
          >
            ${escapeHtml(primary.remediation.label.trim())}
          </a>
        `
      : '';
    const buttonTitleAttr = reason ? `title="${escapeHtml(reason)}"` : '';

    // For primary actions, show reason via hover icon instead of inline text
    const reasonHelpIcon = disabled && reason
      ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${escapeHtml(reason)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${escapeHtml(key)}" id="detail-action-reason-${escapeHtml(key)}">${escapeHtml(reason)}</span>`
      : '';

    primaryHtml = `
      <div data-detail-action-card="${escapeHtml(key)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${compactButtonClasses(primary, disabled)}"
          data-detail-action-button="${escapeHtml(key)}"
          data-detail-action-name="${escapeHtml(primary.id || primary.label)}"
          data-disabled="${disabled}"
          aria-disabled="${disabled ? 'true' : 'false'}"
          aria-label="${escapeHtml(ariaLabel)}"
          ${describedBy}
          ${buttonTitleAttr}
        >
          ${icon ? `<i class="${icon}"></i>` : ''}
          ${escapeHtml(primary.label)}
          ${reasonHelpIcon}
        </button>
        ${disabled && remediation ? remediation : ''}
      </div>
    `;
  }

  let dropdownHtml = '';
  if (rest.length > 0) {
    const dropdownItems = rest.map((action, index) => {
      const disabled = action.disabled === true;
      const key = actionKey(action, primary ? index + 1 : index);
      const icon = getActionIcon(action);
      const reason = disabled ? (action.disabledReason || 'Action unavailable').trim() : '';
      const reasonId = reason ? `detail-action-reason-${key}` : '';
      const describedBy = reasonId ? `aria-describedby="${reasonId}"` : '';
      const ariaLabel = reason ? `${action.label} unavailable: ${reason}` : action.label;
      const separator = action.variant === 'danger' && index > 0
        ? '<div class="my-1 border-t border-gray-100"></div>'
        : '';
      const titleAttr = reason ? `title="${escapeHtml(reason)}"` : '';
      const remediation = disabled && action.remediation?.href && action.remediation?.label
        ? `
            <a
              href="${escapeHtml(action.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${escapeHtml(key)}"
            >
              ${escapeHtml(action.remediation.label.trim())}
            </a>
          `
        : '';

      // For dropdown items, show reason via hover icon instead of inline text
      const reasonHelpIcon = disabled && reason
        ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${escapeHtml(reason)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${escapeHtml(key)}" id="detail-action-reason-${escapeHtml(key)}">${escapeHtml(reason)}</span>`
        : '';

      return `
        ${separator}
        <div data-detail-action-card="${escapeHtml(key)}" class="space-y-1">
          <button
            type="button"
            class="${dropdownItemClasses(action, disabled)}"
            data-detail-action-button="${escapeHtml(key)}"
            data-detail-action-name="${escapeHtml(action.id || action.label)}"
            data-disabled="${disabled}"
            aria-disabled="${disabled ? 'true' : 'false'}"
            aria-label="${escapeHtml(ariaLabel)}"
            ${describedBy}
            ${titleAttr}
          >
            ${icon ? `<i class="${icon} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${escapeHtml(action.label)}</span>
            ${reasonHelpIcon}
            ${disabled ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ''}
          </button>
          ${disabled && remediation ? remediation : ''}
        </div>
      `;
    }).join('');

    dropdownHtml = `
      <div class="relative" data-detail-actions-dropdown>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-detail-actions-dropdown-trigger
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="More actions"
        >
          <i class="iconoir-more-horiz text-lg"></i>
        </button>
        <div
          class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 hidden"
          data-detail-actions-dropdown-menu
          role="menu"
          aria-orientation="vertical"
        >
          ${dropdownItems}
        </div>
      </div>
    `;
  }

  return `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${primaryHtml}
      ${dropdownHtml}
    </div>
  `;
}

export class DetailActionsController {
  private readonly mount: HTMLElement;
  private readonly notifier: ToastNotifier;
  private readonly fetchImpl: typeof fetch;
  private actions: ActionButton[] = [];
  private record: Record<string, unknown> | null = null;
  private documentClickHandler: ((event: MouseEvent) => void) | null = null;
  private documentKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(config: DetailActionsMountConfig) {
    this.mount = config.mount;
    this.notifier = config.notifier || resolveDefaultNotifier();
    this.fetchImpl = config.fetchImpl || fetch.bind(globalThis);
  }

  async init(): Promise<void> {
    if (!this.mount) {
      return;
    }
    this.mount.setAttribute('aria-busy', 'true');
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.cleanupDocumentListeners();

    const detailPayload = await this.fetchDetailPayload();
    if (!detailPayload) {
      this.mount.innerHTML = '';
      this.mount.setAttribute('aria-busy', 'false');
      return;
    }

    const record = detailPayload.data && typeof detailPayload.data === 'object'
      ? detailPayload.data
      : null;
    const schemaActions = Array.isArray(detailPayload.schema?.actions)
      ? detailPayload.schema.actions
      : [];
    if (!record || schemaActions.length === 0) {
      this.mount.innerHTML = '';
      this.mount.setAttribute('aria-busy', 'false');
      return;
    }

    const panelName = this.panelName();
    const recordID = this.recordID();
    const panelBasePath = this.panelBasePath();
    const apiEndpoint = `${this.apiBasePath()}/panels/${encodeURIComponent(panelName)}`;
    const query = new URLSearchParams(window.location.search);
    const locale = query.get('locale') || undefined;
    const channel = query.get('channel') || query.get('environment') || undefined;
    const builder = new SchemaActionBuilder({
      apiEndpoint,
      actionBasePath: panelBasePath,
      panelName,
      locale,
      channel,
      actionContext: 'detail',
      onActionSuccess: async (actionName) => {
        if (actionName === 'delete') {
          const backHref = this.backHref();
          if (backHref) {
            window.location.assign(backHref);
            return;
          }
          window.location.assign(panelBasePath);
          return;
        }
        await this.refresh();
      },
      onActionError: (actionName, error) => {
        this.notifier.error(formatStructuredErrorForDisplay(error, `${actionName} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      },
    });

    this.record = record;
    this.actions = builder.buildRowActions(record, schemaActions);
    this.mount.innerHTML = renderDetailActions(this.actions);
    this.mount.setAttribute('aria-busy', 'false');
    this.attachListeners(recordID);
    this.attachDropdownListeners();
  }

  private async fetchDetailPayload(): Promise<DetailPayload | null> {
    const url = this.detailEndpoint();
    if (!url) {
      return null;
    }
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      this.notifier.error(`Actions unavailable (${response.status})`);
      return null;
    }
    const payload = await readDetailPayload(response);
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return normalizeDetailActionStatePayload(payload as Record<string, unknown>) as DetailPayload | null;
  }

  private attachListeners(recordID: string): void {
    this.actions.forEach((action, index) => {
      const key = actionKey(action, index);
      const button = this.mount.querySelector<HTMLElement>(`[data-detail-action-button="${key}"]`);
      if (!button) {
        return;
      }
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (button.getAttribute('aria-disabled') === 'true' || button.dataset.disabled === 'true') {
          return;
        }
        try {
          await action.action({
            ...(this.record || {}),
            id: recordID,
          });
        } catch (error) {
          if (!isHandledActionError(error)) {
            const structured = getStructuredActionError(error);
            const message = structured
              ? formatStructuredErrorForDisplay(structured, `${action.label} failed`)
              : error instanceof Error
                ? error.message
                : `${action.label} failed`;
            this.notifier.error(message);
          }
        }
      });
    });
  }

  private cleanupDocumentListeners(): void {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
    if (this.documentKeydownHandler) {
      document.removeEventListener('keydown', this.documentKeydownHandler);
      this.documentKeydownHandler = null;
    }
  }

  private attachDropdownListeners(): void {
    const dropdown = this.mount.querySelector<HTMLElement>('[data-detail-actions-dropdown]');
    if (!dropdown) {
      return;
    }

    const trigger = dropdown.querySelector<HTMLElement>('[data-detail-actions-dropdown-trigger]');
    const menu = dropdown.querySelector<HTMLElement>('[data-detail-actions-dropdown-menu]');
    if (!trigger || !menu) {
      return;
    }

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = !menu.classList.contains('hidden');
      if (isOpen) {
        this.closeDropdown(trigger, menu);
      } else {
        this.openDropdown(trigger, menu);
      }
    });

    this.documentClickHandler = (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) {
        this.closeDropdown(trigger, menu);
      }
    };
    document.addEventListener('click', this.documentClickHandler);

    this.documentKeydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !menu.classList.contains('hidden')) {
        this.closeDropdown(trigger, menu);
        trigger.focus();
      }
    };
    document.addEventListener('keydown', this.documentKeydownHandler);

    menu.querySelectorAll<HTMLElement>('[data-detail-action-button]').forEach((button) => {
      button.addEventListener('click', (event) => {
        if (button.getAttribute('aria-disabled') === 'true' || button.dataset.disabled === 'true') {
          event.preventDefault();
          return;
        }
        this.closeDropdown(trigger, menu);
      });
    });
  }

  private openDropdown(trigger: HTMLElement, menu: HTMLElement): void {
    menu.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
  }

  private closeDropdown(trigger: HTMLElement, menu: HTMLElement): void {
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
  }

  private detailEndpoint(): string {
    const panelName = this.panelName();
    const recordID = this.recordID();
    if (!panelName || !recordID) {
      return '';
    }
    const query = new URLSearchParams(window.location.search);
    const locale = query.get('locale');
    const channel = query.get('channel') || query.get('environment');
    const endpoint = `${this.apiBasePath()}/panels/${encodeURIComponent(panelName)}/${encodeURIComponent(recordID)}`;
    if (!locale && !channel) {
      return endpoint;
    }
    const params = new URLSearchParams();
    if (locale) {
      params.set('locale', locale);
    }
    if (channel) {
      params.set('channel', channel);
    }
    return `${endpoint}?${params.toString()}`;
  }

  private apiBasePath(): string {
    return String(this.mount.dataset.apiBasePath || '').trim().replace(/\/$/, '');
  }

  private panelBasePath(): string {
    const explicit = String(this.mount.dataset.panelBasePath || '').trim();
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }
    const basePath = String(this.mount.dataset.basePath || '').trim().replace(/\/$/, '');
    const panelName = this.panelName();
    return `${basePath}/${panelName}`.replace(/\/{2,}/g, '/');
  }

  private backHref(): string {
    return String(this.mount.dataset.backHref || '').trim();
  }

  private panelName(): string {
    return String(this.mount.dataset.panel || '').trim();
  }

  private recordID(): string {
    return String(this.mount.dataset.recordId || '').trim();
  }
}

export async function initPanelDetailActions(root: ParentNode = document): Promise<DetailActionsController[]> {
  const mounts = Array.from(root.querySelectorAll<HTMLElement>('[data-panel-detail-actions]'));
  const controllers: DetailActionsController[] = [];
  for (const mount of mounts) {
    const controller = new DetailActionsController({ mount });
    controllers.push(controller);
    await controller.init();
  }
  return controllers;
}

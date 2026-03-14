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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function renderDetailActions(actions: ActionButton[]): string {
  if (actions.length === 0) {
    return '';
  }

  return `
    <div class="flex flex-wrap items-start justify-end gap-3" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${actions.map((action, index) => {
        const disabled = action.disabled === true;
        const key = actionKey(action, index);
        const reason = disabled ? (action.disabledReason || 'Action unavailable').trim() : '';
        const reasonId = reason ? `detail-action-reason-${key}` : '';
        const remediation = disabled && action.remediation?.href && action.remediation?.label
          ? {
              href: action.remediation.href.trim(),
              label: action.remediation.label.trim(),
              kind: typeof action.remediation.kind === 'string' ? action.remediation.kind.trim() : '',
            }
          : null;
        const describedBy = reasonId ? `aria-describedby="${reasonId}"` : '';
        const ariaLabel = reason ? `${action.label} unavailable: ${reason}` : action.label;
        const remediationHtml = remediation
          ? `
              <a
                href="${escapeHtml(remediation.href)}"
                class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                data-detail-action-remediation="${escapeHtml(key)}"
              >
                ${escapeHtml(remediation.label)}
              </a>
            `
          : '';

        return `
          <div class="min-w-[12rem] max-w-[16rem] rounded-xl border border-gray-200 bg-white p-3 shadow-sm" data-detail-action-card="${escapeHtml(key)}">
            <button
              type="button"
              class="${detailButtonClasses(action, disabled)}"
              data-detail-action-button="${escapeHtml(key)}"
              data-detail-action-name="${escapeHtml(action.id || action.label)}"
              data-disabled="${disabled}"
              aria-disabled="${disabled ? 'true' : 'false'}"
              aria-label="${escapeHtml(ariaLabel)}"
              ${describedBy}
            >
              ${escapeHtml(action.label)}
            </button>
            ${reason ? `<p id="${reasonId}" class="mt-2 text-xs leading-5 text-gray-600" data-detail-action-reason="${escapeHtml(key)}">${escapeHtml(reason)}</p>` : ''}
            ${remediationHtml}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export class DetailActionsController {
  private readonly mount: HTMLElement;
  private readonly notifier: ToastNotifier;
  private readonly fetchImpl: typeof fetch;
  private actions: ActionButton[] = [];
  private record: Record<string, unknown> | null = null;

  constructor(config: DetailActionsMountConfig) {
    this.mount = config.mount;
    this.notifier = config.notifier || new FallbackNotifier();
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
    const builder = new SchemaActionBuilder({
      apiEndpoint,
      actionBasePath: panelBasePath,
      panelName,
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
    const payload = await response.json().catch(() => null);
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

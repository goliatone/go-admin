/**
 * Action System for DataGrid
 * Provides extensible row, detail, and bulk action capabilities.
 */

import type { ActionRemediation } from './action-contracts.js';
import type { ToastNotifier } from '../toast/types.js';
import { FallbackNotifier } from '../toast/toast-manager.js';
import {
  createStructuredActionError,
  executeStructuredRequest,
  formatStructuredErrorForDisplay,
  isHandledActionError,
} from '../toast/error-helpers.js';
import { escapeAttribute as escapeAttr, escapeHTML as escapeHtml } from '../shared/html.js';
import { closeActionMenu } from '../shared/action-menu.js';
import { readHTTPJSONValue } from '../shared/transport/http-client.js';
import { PayloadInputModal } from './payload-modal-lazy.js';
import type { PayloadModalFieldOption } from './payload-modal.js';

export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
export type ActionRenderMode = 'inline' | 'dropdown';

export interface ActionButton {
  id?: string;
  label: string;
  icon?: string;
  action: (record: any) => void | Promise<void>;
  condition?: (record: any) => boolean;
  disabled?: boolean;
  disabledReason?: string;
  disabledReasonCode?: string;
  disabledSeverity?: string;
  disabledKind?: string;
  remediation?: ActionRemediation | null;
  variant?: ActionVariant;
  className?: string;
}

export interface BulkActionConfig {
  id: string;
  label: string;
  icon?: string;
  endpoint: string;
  method?: 'POST' | 'PUT' | 'DELETE';
  confirm?: string;
  guard?: (selectedIds: string[]) => boolean;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  payload?: Record<string, unknown>;
  payloadRequired?: string[];
  payloadSchema?: Record<string, unknown>;
}

interface PayloadSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  oneOf?: PayloadSchemaOption[];
}

interface PayloadSchemaOption {
  const?: unknown;
  title?: string;
}

interface PayloadSchema {
  type?: string;
  required?: unknown;
  properties?: Record<string, PayloadSchemaProperty>;
}

export interface ActionRendererConfig {
  mode?: ActionRenderMode;
  actionBasePath?: string;
  notifier?: ToastNotifier;
  domIdPrefix?: string;
}

export interface RowActionListenerOptions {
  onError?: (error: unknown, action: ActionButton, record: any) => void | Promise<void>;
}

interface VisibleAction {
  action: ActionButton;
  sourceIndex: number;
}

let actionRendererInstanceSeq = 0;

export class ActionRenderer {
  private actionBasePath: string;
  private mode: ActionRenderMode;
  private notifier: ToastNotifier;
  private domNamespace: string;
  private rowRenderSeq: number;

  constructor(config: ActionRendererConfig = {}) {
    this.actionBasePath = config.actionBasePath || '';
    this.mode = config.mode || 'dropdown';  // Default to dropdown
    this.notifier = config.notifier || new FallbackNotifier();
    const namespaceHint = this.sanitize(config.domIdPrefix || 'grid') || 'grid';
    this.domNamespace = `${namespaceHint}-${++actionRendererInstanceSeq}`;
    this.rowRenderSeq = 0;
  }

  /**
   * Render row actions as HTML
   */
  renderRowActions(record: any, actions: ActionButton[]): string {
    const rowScope = `${this.domNamespace}-row-${++this.rowRenderSeq}`;
    if (this.mode === 'dropdown') {
      return this.renderRowActionsDropdown(record, actions, rowScope);
    }

    // Inline mode (existing behavior)
    const visibleActions = this.getVisibleActions(record, actions);

    if (visibleActions.length === 0) {
      return '<div class="admin-datagrid__action-list flex justify-end gap-2"></div>';
    }

    const actionButtons = visibleActions.map(({ action, sourceIndex }) => {
      const variantClass = this.getVariantClass(action.variant || 'secondary');
      const icon = action.icon ? this.renderIcon(action.icon) : '';
      const customClass = action.className || '';
      const disabled = action.disabled === true;
      const actionKey = this.getActionKey(action, sourceIndex);
      const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
      // Use aria-disabled instead of disabled to keep element focusable for accessibility
      const ariaDisabledAttr = disabled ? 'aria-disabled="true"' : '';
      const disabledReasonId = disabled && action.disabledReason
        ? `${rowScope}-${actionKey}-disabled-reason`
        : '';
      const describedByAttr = disabledReasonId
        ? `aria-describedby="${escapeAttr(disabledReasonId)}"`
        : '';
      const ariaLabel = disabled && action.disabledReason
        ? `${action.label} unavailable: ${action.disabledReason}`
        : action.label;
      const reasonAssistiveText = disabledReasonId
        ? `<span id="${escapeAttr(disabledReasonId)}" class="sr-only">${escapeHtml(action.disabledReason || 'Action unavailable')}</span>`
        : '';
      const titleAttr = action.disabledReason
        ? `title="${escapeAttr(action.disabledReason)}"`
        : '';

      return `
        <button
          type="button"
          class="admin-datagrid__action btn btn-sm ${escapeAttr(variantClass)} ${escapeAttr(customClass)} ${disabledClass}"
          data-action-id="${escapeAttr(this.sanitize(action.label))}"
          data-action-key="${escapeAttr(actionKey)}"
          data-record-id="${escapeAttr(record.id)}"
          data-disabled="${disabled}"
          ${ariaDisabledAttr}
          aria-label="${escapeAttr(ariaLabel)}"
          ${describedByAttr}
          ${titleAttr}
        >
          ${icon}
          ${escapeHtml(action.label)}
        </button>
        ${reasonAssistiveText}
      `;
    }).join('');

    return `<div class="admin-datagrid__action-list flex justify-end gap-2">${actionButtons}</div>`;
  }

  /**
   * Render row actions as dropdown menu
   */
  private renderRowActionsDropdown(record: any, actions: ActionButton[], rowScope: string): string {
    const visibleActions = this.getVisibleActions(record, actions);

    if (visibleActions.length === 0) {
      return '<div class="admin-datagrid__actions-empty text-sm text-gray-400">No actions</div>';
    }

    const menuId = `${rowScope}-menu`;
    const actionItems = this.buildDropdownItems(record, visibleActions, rowScope);

    return `
      <div class="action-menu action-menu--right actions-dropdown" data-action-menu data-dropdown>
        <button type="button"
                class="action-menu__trigger actions-menu-trigger"
                data-action-menu-trigger
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false"
                aria-controls="${escapeAttr(menuId)}">
          ${this.renderDotsIcon()}
        </button>

        <div id="${escapeAttr(menuId)}"
             class="action-menu__content actions-menu hidden"
             data-action-menu-content
             data-position="right"
             role="menu"
             aria-orientation="vertical">
          ${actionItems}
        </div>
      </div>
    `;
  }

  /**
   * Build dropdown menu items HTML
   */
  private buildDropdownItems(record: any, actions: VisibleAction[], rowScope: string): string {
    return actions.map(({ action, sourceIndex }, index) => {
      const isDestructive = action.variant === 'danger';
      const disabled = action.disabled === true;
      const actionKey = this.getActionKey(action, sourceIndex);
      const icon = action.icon ? this.renderIcon(action.icon) : '';
      const needsDivider = this.shouldShowDivider(action, index);
      const disabledReason = disabled
        ? (action.disabledReason || 'Action unavailable').trim()
        : '';
      const reasonID = disabledReason
        ? `${rowScope}-${actionKey}-disabled-reason`
        : '';

      const divider = needsDivider ? '<div class="action-menu__divider action-divider" role="separator"></div>' : '';

      const itemClass = disabled
        ? 'action-menu__item action-item action-item--disabled'
        : isDestructive
        ? 'action-menu__item action-menu__item--danger action-item action-item--danger'
        : 'action-menu__item action-item';
      // Use aria-disabled instead of disabled to keep element focusable for accessibility
      const ariaDisabledAttr = disabled ? 'aria-disabled="true"' : '';
      const describedByAttr = reasonID ? `aria-describedby="${escapeAttr(reasonID)}"` : '';
      const ariaLabel = disabledReason
        ? `${action.label} unavailable: ${disabledReason}`
        : action.label;
      const titleAttr = action.disabledReason
        ? `title="${escapeAttr(action.disabledReason)}"`
        : '';
      const reasonMarkup = disabledReason
        ? `<span id="${escapeAttr(reasonID)}" class="action-item-reason">${escapeHtml(disabledReason)}</span>`
        : '';

      return `
        ${divider}
        <button type="button"
                class="${escapeAttr(itemClass)}"
                data-action-id="${escapeAttr(this.sanitize(action.label))}"
                data-action-menu-item
                data-action-key="${escapeAttr(actionKey)}"
                data-record-id="${escapeAttr(record.id)}"
                data-disabled="${disabled}"
                role="menuitem"
                ${ariaDisabledAttr}
                aria-label="${escapeAttr(ariaLabel)}"
                ${describedByAttr}
                ${titleAttr}>
          <span class="action-item__icon">${icon}</span>
          <span class="action-item__content">
            <span class="action-item__label">${escapeHtml(action.label)}</span>
            ${reasonMarkup}
          </span>
        </button>
      `;
    }).join('');
  }

  /**
   * Determine if divider should be shown before action
   */
  private shouldShowDivider(action: ActionButton, index: number): boolean {
    if (index === 0) return false;

    // Show divider before destructive actions
    if (action.variant === 'danger') return true;

    // Show divider before certain action labels
    const dividerBefore = ['download', 'archive', 'delete', 'remove'];
    return dividerBefore.some(label =>
      action.label.toLowerCase().includes(label)
    );
  }

  /**
   * Render three-dot vertical icon
   */
  private renderDotsIcon(): string {
    return `
      <svg class="action-menu__icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
    `;
  }

  /**
   * Render default actions (view, edit, delete)
   * NOTE: This method is deprecated - default actions are now handled in core.ts
   * Kept for backward compatibility
   */
  renderDefaultActions(record: any, basePath: string): string {
    // Deprecated: Default actions are now created and bound in core.ts
    // This method is kept for backward compatibility but should not be used
    return '<div class="text-sm text-gray-400">Use core.ts for default actions</div>';
  }

  /**
   * Attach event listeners for row actions
   */
  attachRowActionListeners(
    container: HTMLElement,
    actions: ActionButton[],
    record: any,
    options: RowActionListenerOptions = {}
  ): void {
    // Bind from the source list rather than re-evaluating visibility conditions.
    // A hidden action simply has no matching rendered button; this keeps render and
    // binding deterministic even when a condition reads mutable application state.
    actions.forEach((action, sourceIndex) => {
      const actionKey = this.getActionKey(action, sourceIndex);
      const button = container.querySelector<HTMLElement>(
        `[data-action-key="${actionKey}"]`
      );
      if (!button) {
        return;
      }

      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (button.getAttribute('aria-disabled') === 'true' || button.dataset.disabled === 'true') {
          return;
        }
        const menu = button.closest<HTMLElement>('[data-action-menu-content]');
        if (menu) {
          closeActionMenu(menu);
        }
        try {
          await action.action(record);
        } catch (error) {
          console.error(`Action "${action.label}" failed:`, error);
          if (options.onError) {
            await options.onError(error, action, record);
            return;
          }
          const errorMsg = error instanceof Error ? error.message : `Action "${action.label}" failed`;
          this.notifier.error(errorMsg);
        }
      });
    });
  }

  /**
   * Render bulk actions toolbar
   */
  renderBulkActionsToolbar(bulkActions: BulkActionConfig[]): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.id = 'bulk-actions-bar';  // Match core selector
    toolbar.className = 'hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4';

    const info = document.createElement('span');
    info.className = 'text-sm font-medium text-blue-900';
    info.id = 'selected-count';  // Match core selector
    info.textContent = '0 items selected';
    toolbar.appendChild(info);

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'flex gap-2 flex-1';

    bulkActions.forEach(config => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-primary';
      button.dataset.bulkAction = config.id;

      if (config.icon) {
        button.innerHTML = `${this.renderIcon(config.icon)} ${config.label}`;
      } else {
        button.textContent = config.label;
      }

      actionsContainer.appendChild(button);
    });

    toolbar.appendChild(actionsContainer);

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'btn btn-sm btn-secondary';
    clearButton.id = 'clear-selection-btn';
    clearButton.textContent = 'Clear Selection';
    toolbar.appendChild(clearButton);

    return toolbar;
  }

  /**
   * Execute bulk action
   */
  async executeBulkAction(
    config: BulkActionConfig,
    selectedIds: string[]
  ): Promise<void> {
    // Check guard condition
    if (config.guard && !config.guard(selectedIds)) {
      console.warn(`Bulk action "${config.id}" guard failed`);
      return;
    }

    // Confirm if needed - use notifier's async confirm
    if (config.confirm) {
      const message = config.confirm.replace('{count}', selectedIds.length.toString());
      const confirmed = await this.notifier.confirm(message);
      if (!confirmed) {
        return;
      }
    }

    const requestPayload = await this.resolveBulkActionPayload(config, selectedIds);
    if (requestPayload === null) {
      return;
    }

    try {
      const result = await executeStructuredRequest(config.endpoint, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }, async (response) => {
        const payload = await readHTTPJSONValue<unknown>(response, undefined);
        return {
          success: true,
          data: payload === undefined ? undefined : payload as Record<string, unknown>,
        };
      });

      if (!result.success) {
        const structuredError = result.error;
        const errorMsg = structuredError
          ? formatStructuredErrorForDisplay(structuredError, `Bulk action '${config.id}' failed`)
          : `Bulk action '${config.id}' failed`;
        if (!config.onError) {
          this.notifier.error(errorMsg);
        }
        const actionError = structuredError
          ? createStructuredActionError(structuredError, `Bulk action '${config.id}' failed`, true)
          : createStructuredActionError({
            textCode: null,
            message: errorMsg,
            metadata: null,
            fields: null,
            validationErrors: null,
          }, `Bulk action '${config.id}' failed`, true);
        throw actionError;
      }

      const data = result.data;
      this.notifier.success(this.buildBulkSuccessMessage(config, data, selectedIds.length));

      if (config.onSuccess) {
        config.onSuccess(data);
      }
    } catch (error) {
      console.error(`Bulk action "${config.id}" failed:`, error);

      // Show error toast if onError callback didn't handle it
      if (!config.onError && !isHandledActionError(error)) {
        const errorMsg = error instanceof Error ? error.message : 'Bulk action failed';
        this.notifier.error(errorMsg);
      }

      if (config.onError) {
        config.onError(error as Error);
      }
      throw error;
    }
  }

  private async resolveBulkActionPayload(
    config: BulkActionConfig,
    selectedIds: string[]
  ): Promise<Record<string, unknown> | null> {
    const payload: Record<string, unknown> = {
      ...(config.payload || {}),
      ids: selectedIds,
    };

    const schema = this.normalizePayloadSchema(config.payloadSchema);
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([field, definition]) => {
        if (payload[field] === undefined && definition && definition.default !== undefined) {
          payload[field] = definition.default;
        }
      });
    }

    const required = this.collectRequiredFields(config.payloadRequired, schema);
    const missingRequired = required.filter((field) => field !== 'ids' && this.isEmptyPayloadValue(payload[field]));
    if (missingRequired.length === 0) {
      return payload;
    }

    const rawValues = await this.requestRequiredFields(config, missingRequired, schema, payload);
    if (rawValues === null) {
      return null;
    }

    for (const field of missingRequired) {
      const definition = schema?.properties?.[field];
      const rawValue = rawValues[field] ?? '';
      const parsed = this.coercePromptValue(rawValue, field, definition);
      if (parsed.error) {
        this.notifier.error(parsed.error);
        return null;
      }
      payload[field] = parsed.value;
    }

    return payload;
  }

  private collectRequiredFields(required: string[] | undefined, schema: PayloadSchema | null): string[] {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const append = (field: string): void => {
      const value = field.trim();
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      ordered.push(value);
    };

    if (Array.isArray(required)) {
      required.forEach((field) => append(String(field)));
    }
    if (Array.isArray(schema?.required)) {
      schema.required.forEach((field) => append(String(field)));
    }
    return ordered;
  }

  private normalizePayloadSchema(schema: Record<string, unknown> | undefined): PayloadSchema | null {
    if (!schema || typeof schema !== 'object') {
      return null;
    }
    const propertiesRaw = schema.properties;
    let properties: Record<string, PayloadSchemaProperty> | undefined;
    if (propertiesRaw && typeof propertiesRaw === 'object') {
      properties = {};
      Object.entries(propertiesRaw as Record<string, unknown>).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          properties![key] = value as PayloadSchemaProperty;
        }
      });
    }
    return {
      type: typeof schema.type === 'string' ? schema.type : undefined,
      required: schema.required,
      properties,
    };
  }

  private async requestRequiredFields(
    config: BulkActionConfig,
    requiredFields: string[],
    schema: PayloadSchema | null,
    payload: Record<string, unknown>
  ): Promise<Record<string, string> | null> {
    const modalFields = requiredFields.map((field) => {
      const definition = schema?.properties?.[field];
      const rawType = typeof definition?.type === 'string' ? definition.type.toLowerCase() : 'string';
      return {
        name: field,
        label: (definition?.title || field).trim(),
        description: (definition?.description || '').trim() || undefined,
        value: this.stringifyPromptDefault(payload[field] !== undefined ? payload[field] : definition?.default),
        type: rawType,
        options: this.buildSchemaOptions(definition),
      };
    });
    return PayloadInputModal.prompt({
      title: `Complete ${config.label || config.id}`,
      fields: modalFields,
    });
  }

  private buildSchemaOptions(definition: PayloadSchemaProperty | undefined): PayloadModalFieldOption[] | undefined {
    if (!definition) {
      return undefined;
    }

    if (Array.isArray(definition.oneOf) && definition.oneOf.length > 0) {
      const options = definition.oneOf
        .filter((option) => option && Object.prototype.hasOwnProperty.call(option, 'const'))
        .map((option) => {
          const value = this.stringifyPromptDefault(option.const);
          const label = typeof option.title === 'string' && option.title.trim() ? option.title.trim() : value;
          return { value, label };
        });
      return options.length > 0 ? options : undefined;
    }

    if (Array.isArray(definition.enum) && definition.enum.length > 0) {
      const options = definition.enum.map((item) => {
        const value = this.stringifyPromptDefault(item);
        return { value, label: value };
      });
      return options.length > 0 ? options : undefined;
    }

    if (typeof definition.type === 'string' && definition.type.toLowerCase() === 'boolean') {
      return [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' },
      ];
    }

    return undefined;
  }

  private stringifyPromptDefault(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  private coercePromptValue(
    rawValue: string,
    field: string,
    definition: PayloadSchemaProperty | undefined
  ): { value: unknown; error?: string } {
    if (Array.isArray(definition?.oneOf) && definition.oneOf.length > 0) {
      const match = definition.oneOf.find(
        (item) => item && Object.prototype.hasOwnProperty.call(item, 'const') && this.stringifyPromptDefault(item.const) === rawValue
      );
      if (!match || !Object.prototype.hasOwnProperty.call(match, 'const')) {
        const allowed = definition.oneOf
          .map((item) => (typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : this.stringifyPromptDefault(item.const)))
          .filter((value) => value !== '')
          .join(', ');
        return { value: rawValue, error: `${field} must be one of: ${allowed}` };
      }
      return { value: match.const };
    }

    const type = (definition?.type || 'string').toLowerCase();
    if (rawValue === '') {
      return { value: '' };
    }

    let value: unknown = rawValue;
    switch (type) {
      case 'integer': {
        const parsed = Number.parseInt(rawValue, 10);
        if (Number.isNaN(parsed)) {
          return { value: rawValue, error: `${field} must be an integer.` };
        }
        value = parsed;
        break;
      }
      case 'number': {
        const parsed = Number.parseFloat(rawValue);
        if (Number.isNaN(parsed)) {
          return { value: rawValue, error: `${field} must be a number.` };
        }
        value = parsed;
        break;
      }
      case 'boolean': {
        const normalized = rawValue.toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
          value = true;
          break;
        }
        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
          value = false;
          break;
        }
        return { value: rawValue, error: `${field} must be true/false.` };
      }
      case 'array':
      case 'object': {
        try {
          const parsed = JSON.parse(rawValue) as unknown;
          if (type === 'array' && !Array.isArray(parsed)) {
            return { value: rawValue, error: `${field} must be a JSON array.` };
          }
          if (type === 'object' && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')) {
            return { value: rawValue, error: `${field} must be a JSON object.` };
          }
          value = parsed;
        } catch {
          return { value: rawValue, error: `${field} must be valid JSON.` };
        }
        break;
      }
      default:
        value = rawValue;
    }

    if (Array.isArray(definition?.enum) && definition!.enum!.length > 0) {
      const matches = definition!.enum!.some((item) => item === value || String(item) === String(value));
      if (!matches) {
        return { value, error: `${field} must be one of: ${definition!.enum!.map((item) => String(item)).join(', ')}` };
      }
    }

    return { value };
  }

  private isEmptyPayloadValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length === 0;
    }
    return false;
  }

  private buildBulkSuccessMessage(
    config: BulkActionConfig,
    data: any,
    fallbackCount: number
  ): string {
    const actionLabel = config.label || config.id || 'Bulk action';
    const summary = data && typeof data === 'object' ? data.summary : null;
    const succeeded = summary && typeof summary.succeeded === 'number'
      ? summary.succeeded
      : (typeof data?.processed === 'number' ? data.processed : fallbackCount);
    const failed = summary && typeof summary.failed === 'number' ? summary.failed : 0;
    if (failed > 0) {
      return `${actionLabel} completed: ${succeeded} succeeded, ${failed} failed.`;
    }
    return `${actionLabel} completed for ${succeeded} item${succeeded === 1 ? '' : 's'}.`;
  }

  private getVariantClass(variant: ActionVariant): string {
    const variants: Record<ActionVariant, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
      success: 'btn-success',
      warning: 'btn-warning',
    };
    return variants[variant] || 'btn-secondary';
  }

  private renderIcon(icon: string): string {
    // Simple icon mapping - extend as needed
    const icons: Record<string, string> = {
      'eye': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
      'edit': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
      'trash': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
      'check-circle': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'pause': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'pause-circle': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'x-circle': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'key': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
      'archive': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>',
      'download': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
      'copy': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
      'user-badge': '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    };
    return icons[icon] || '';
  }

  private getActionKey(action: ActionButton, sourceIndex: number): string {
    const configuredID = typeof action.id === 'string' ? action.id.trim() : '';
    const hint = this.sanitize(configuredID || action.label) || 'action';
    return `action-${sourceIndex + 1}-${hint}`;
  }

  private getVisibleActions(record: any, actions: ActionButton[]): VisibleAction[] {
    return actions
      .map((action, sourceIndex) => ({ action, sourceIndex }))
      .filter(({ action }) => !action.condition || action.condition(record));
  }

  private sanitize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}

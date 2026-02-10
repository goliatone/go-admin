/**
 * Payload Input Modal
 *
 * Reusable modal for collecting payload values from users
 * before executing actions that require input.
 */

import { Modal, escapeHtml } from '../shared/modal.js';

// ============================================================================
// Types
// ============================================================================

export interface PayloadModalFieldOption {
  value: string;
  label: string;
}

export interface PayloadModalField {
  name: string;
  label: string;
  description?: string;
  value: string;
  type: string;
  options?: PayloadModalFieldOption[];
}

export interface PayloadModalConfig {
  title: string;
  fields: PayloadModalField[];
  confirmLabel?: string;
  cancelLabel?: string;
}

// ============================================================================
// PayloadInputModal
// ============================================================================

export class PayloadInputModal extends Modal {
  private readonly modalConfig: PayloadModalConfig;
  private readonly onConfirm: (values: Record<string, string>) => void;
  private readonly onCancel: () => void;
  private resolved = false;

  constructor(
    config: PayloadModalConfig,
    onConfirm: (values: Record<string, string>) => void,
    onCancel: () => void
  ) {
    super({ size: 'md', initialFocus: '[data-payload-field]', lockBodyScroll: false });
    this.modalConfig = config;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(config: PayloadModalConfig): Promise<Record<string, string> | null> {
    return new Promise<Record<string, string> | null>((resolve) => {
      const modal = new PayloadInputModal(
        config,
        (values) => resolve(values),
        () => resolve(null)
      );
      modal.show();
    });
  }

  protected renderContent(): string {
    const fields = this.modalConfig.fields.map((field) => this.renderField(field)).join('');
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${fields}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${escapeHtml(this.modalConfig.cancelLabel ?? 'Cancel')}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${escapeHtml(this.modalConfig.confirmLabel ?? 'Continue')}
          </button>
        </div>
      </form>
    `;
  }

  protected bindContentEvents(): void {
    const form = this.container?.querySelector<HTMLFormElement>('[data-payload-form]');
    const cancelBtn = this.container?.querySelector<HTMLButtonElement>('[data-payload-cancel]');

    const submit = (): void => {
      this.clearErrors();
      const values: Record<string, string> = {};
      let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;

      for (const field of this.modalConfig.fields) {
        const input = this.container?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          `[data-payload-field="${field.name}"]`
        );
        if (!input) {
          continue;
        }
        const value = input.value.trim();
        values[field.name] = value;
        if (!value) {
          if (!firstInvalid) {
            firstInvalid = input;
          }
          this.showFieldError(field.name, 'This field is required.');
        }
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      this.resolved = true;
      this.onConfirm(values);
      this.hide();
    };

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      submit();
    });
    cancelBtn?.addEventListener('click', () => {
      this.hide();
    });
  }

  protected onBeforeHide(): boolean {
    if (!this.resolved) {
      this.resolved = true;
      this.onCancel();
    }
    return true;
  }

  private renderField(field: PayloadModalField): string {
    const description = field.description
      ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(field.description)}</p>`
      : '';
    const control = field.options && field.options.length > 0
      ? this.renderSelect(field)
      : this.renderInput(field);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${field.name}">
          ${escapeHtml(field.label)}
        </label>
        ${control}
        ${description}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${field.name}"></p>
      </div>
    `;
  }

  private renderSelect(field: PayloadModalField): string {
    const selected = field.value;
    const options = field.options || [];
    const optionHtml = options
      .map((option) => {
        const isSelected = option.value === selected ? ' selected' : '';
        return `<option value="${escapeHtml(option.value)}"${isSelected}>${escapeHtml(option.label)}</option>`;
      })
      .join('');
    return `
      <select id="payload-field-${field.name}"
              data-payload-field="${field.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${optionHtml}
      </select>
    `;
  }

  private renderInput(field: PayloadModalField): string {
    const cls = 'w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300';
    if (field.type === 'array' || field.type === 'object') {
      return `
        <textarea id="payload-field-${field.name}"
                  data-payload-field="${field.name}"
                  rows="4"
                  class="${cls}"
                  placeholder="${field.type === 'array' ? '[...]' : '{...}'}">${escapeHtml(field.value)}</textarea>
      `;
    }
    const inputType = field.type === 'integer' || field.type === 'number' ? 'number' : 'text';
    return `
      <input id="payload-field-${field.name}"
             type="${inputType}"
             data-payload-field="${field.name}"
             value="${escapeHtml(field.value)}"
             class="${cls}" />
    `;
  }

  private clearErrors(): void {
    const errors = this.container?.querySelectorAll<HTMLElement>('[data-payload-error]');
    errors?.forEach((el) => {
      el.textContent = '';
      el.classList.add('hidden');
    });
  }

  private showFieldError(name: string, message: string): void {
    const errorEl = this.container?.querySelector<HTMLElement>(`[data-payload-error="${name}"]`);
    if (!errorEl) {
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

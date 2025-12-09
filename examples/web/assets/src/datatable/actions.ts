/**
 * Action System for DataGrid
 * Provides extensible row and bulk action capabilities
 */

export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';

export interface ActionButton {
  label: string;
  icon?: string;
  action: (record: any) => void | Promise<void>;
  condition?: (record: any) => boolean;
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
}

export class ActionRenderer {
  private actionBasePath: string;

  constructor(actionBasePath: string = '') {
    this.actionBasePath = actionBasePath;
  }

  /**
   * Render row actions as HTML
   */
  renderRowActions(record: any, actions: ActionButton[]): string {
    const visibleActions = actions.filter(action =>
      !action.condition || action.condition(record)
    );

    if (visibleActions.length === 0) {
      return '<div class="flex justify-end gap-2"></div>';
    }

    const actionButtons = visibleActions.map(action => {
      const variantClass = this.getVariantClass(action.variant || 'secondary');
      const icon = action.icon ? this.renderIcon(action.icon) : '';
      const customClass = action.className || '';

      return `
        <button
          type="button"
          class="btn btn-sm ${variantClass} ${customClass}"
          data-action-id="${this.sanitize(action.label)}"
          data-record-id="${record.id}"
        >
          ${icon}
          ${this.sanitize(action.label)}
        </button>
      `;
    }).join('');

    return `<div class="flex justify-end gap-2">${actionButtons}</div>`;
  }

  /**
   * Render default actions (view, edit, delete)
   */
  renderDefaultActions(record: any, basePath: string): string {
    return `
      <div class="flex justify-end gap-2">
        <a href="${basePath}/${record.id}" class="btn btn-sm btn-secondary">
          ${this.renderIcon('eye')}
          View
        </a>
        <a href="${basePath}/${record.id}/edit" class="btn btn-sm btn-primary">
          ${this.renderIcon('edit')}
          Edit
        </a>
        <button
          type="button"
          class="btn btn-sm btn-danger"
          data-action="delete"
          data-record-id="${record.id}"
        >
          ${this.renderIcon('trash')}
          Delete
        </button>
      </div>
    `;
  }

  /**
   * Attach event listeners for row actions
   */
  attachRowActionListeners(
    container: HTMLElement,
    actions: ActionButton[],
    records: Record<string, any>
  ): void {
    actions.forEach(action => {
      const buttons = container.querySelectorAll(
        `[data-action-id="${this.sanitize(action.label)}"]`
      );

      buttons.forEach((button) => {
        const btn = button as HTMLElement;
        const recordId = btn.dataset.recordId;
        const record = records[recordId!];

        if (record) {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              await action.action(record);
            } catch (error) {
              console.error(`Action "${action.label}" failed:`, error);
            }
          });
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

    // Confirm if needed
    if (config.confirm) {
      const message = config.confirm.replace('{count}', selectedIds.length.toString());
      if (!confirm(message)) {
        return;
      }
    }

    try {
      const response = await fetch(config.endpoint, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (config.onSuccess) {
        config.onSuccess(data);
      }
    } catch (error) {
      console.error(`Bulk action "${config.id}" failed:`, error);
      if (config.onError) {
        config.onError(error as Error);
      }
      throw error;
    }
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
      'eye': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
      'edit': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
      'trash': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
      'check-circle': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'pause': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      'key': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
      'archive': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>',
      'user-badge': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    };
    return icons[icon] || '';
  }

  private sanitize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}

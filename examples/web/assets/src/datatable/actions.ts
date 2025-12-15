/**
 * Action System for DataGrid
 * Provides extensible row and bulk action capabilities
 */

export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
export type ActionRenderMode = 'inline' | 'dropdown';

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

export interface ActionRendererConfig {
  mode?: ActionRenderMode;
  actionBasePath?: string;
}

export class ActionRenderer {
  private actionBasePath: string;
  private mode: ActionRenderMode;

  constructor(config: ActionRendererConfig = {}) {
    this.actionBasePath = config.actionBasePath || '';
    this.mode = config.mode || 'dropdown';  // Default to dropdown
  }

  /**
   * Render row actions as HTML
   */
  renderRowActions(record: any, actions: ActionButton[]): string {
    if (this.mode === 'dropdown') {
      return this.renderRowActionsDropdown(record, actions);
    }

    // Inline mode (existing behavior)
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
   * Render row actions as dropdown menu
   */
  private renderRowActionsDropdown(record: any, actions: ActionButton[]): string {
    const visibleActions = actions.filter(action =>
      !action.condition || action.condition(record)
    );

    if (visibleActions.length === 0) {
      return '<div class="text-sm text-gray-400">No actions</div>';
    }

    const menuId = `actions-menu-${record.id}`;
    const actionItems = this.buildDropdownItems(record, visibleActions);

    return `
      <div class="relative actions-dropdown" data-dropdown>
        <button type="button"
                class="actions-menu-trigger p-2 hover:bg-gray-100 rounded-md transition-colors"
                data-dropdown-trigger
                aria-label="Actions menu"
                aria-haspopup="true"
                aria-expanded="false">
          ${this.renderDotsIcon()}
        </button>

        <div id="${menuId}"
             class="actions-menu hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
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
  private buildDropdownItems(record: any, actions: ActionButton[]): string {
    return actions.map((action, index) => {
      const isDestructive = action.variant === 'danger';
      const icon = action.icon ? this.renderIcon(action.icon) : '';
      const needsDivider = this.shouldShowDivider(action, index, actions);

      const divider = needsDivider
        ? '<div class="action-divider border-t border-gray-200 my-1"></div>'
        : '';

      const itemClass = isDestructive
        ? 'action-item text-red-600 hover:bg-red-50'
        : 'action-item text-gray-700 hover:bg-gray-50';

      return `
        ${divider}
        <button type="button"
                class="${itemClass} flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                data-action-id="${this.sanitize(action.label)}"
                data-record-id="${record.id}"
                role="menuitem">
          <span class="flex-shrink-0 w-5 h-5">${icon}</span>
          <span class="text-sm font-medium">${this.escapeHtml(action.label)}</span>
        </button>
      `;
    }).join('');
  }

  /**
   * Determine if divider should be shown before action
   */
  private shouldShowDivider(action: ActionButton, index: number, actions: ActionButton[]): boolean {
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
      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
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

  private sanitize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

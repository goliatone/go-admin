/**
 * Layout Editor
 *
 * Modal/drawer UI for configuring content type layout with tabs/sections and grid settings.
 */

import type { UISchemaOverlay, UILayoutConfig, UITab, FieldDefinition } from './types';
import { Modal } from '../shared/modal';
import { renderIconTrigger, bindIconTriggerEvents, closeIconPicker } from './shared/icon-picker';

export interface LayoutEditorConfig {
  layout: UILayoutConfig;
  fields: FieldDefinition[];
  onSave: (layout: UILayoutConfig) => void;
  onCancel: () => void;
}

// =============================================================================
// Layout Editor Component
// =============================================================================

export class LayoutEditor extends Modal {
  private config: LayoutEditorConfig;
  private layout: UILayoutConfig;
  private dragState: { tabId: string; startIndex: number } | null = null;

  constructor(config: LayoutEditorConfig) {
    super({ size: '3xl', backdropDataAttr: 'data-layout-editor-backdrop' });
    this.config = config;
    this.layout = JSON.parse(JSON.stringify(config.layout ?? { type: 'flat', gridColumns: 12 }));
    if (!this.layout.tabs) {
      this.layout.tabs = [];
    }
  }

  protected onBeforeHide(): boolean {
    this.config.onCancel();
    return true;
  }

  protected renderContent(): string {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Layout Settings</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configure tabs, sections, and grid layout</p>
        </div>
        <button type="button" data-layout-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      </div>

      <div data-layout-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-layout-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-layout-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Apply Layout
        </button>
      </div>
    `;
  }

  private renderLayoutTypeSection(): string {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Layout Type</h3>

        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            data-layout-type="flat"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
              this.layout.type === 'flat' || !this.layout.type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Flat</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">All fields in one view</span>
          </button>

          <button
            type="button"
            data-layout-type="tabs"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
              this.layout.type === 'tabs'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tabs</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Organize with tabs</span>
          </button>

          <button
            type="button"
            data-layout-type="sections"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
              this.layout.type === 'sections'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Sections</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Collapsible sections</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderGridSection(): string {
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Grid Settings</h3>

        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Columns
            </label>
            <select
              data-grid-columns
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1" ${this.layout.gridColumns === 1 ? 'selected' : ''}>1 Column</option>
              <option value="2" ${this.layout.gridColumns === 2 ? 'selected' : ''}>2 Columns</option>
              <option value="3" ${this.layout.gridColumns === 3 ? 'selected' : ''}>3 Columns</option>
              <option value="4" ${this.layout.gridColumns === 4 ? 'selected' : ''}>4 Columns</option>
              <option value="6" ${this.layout.gridColumns === 6 ? 'selected' : ''}>6 Columns</option>
              <option value="12" ${this.layout.gridColumns === 12 || !this.layout.gridColumns ? 'selected' : ''}>12 Columns (default)</option>
            </select>
          </div>

          <div class="flex-1">
            <div class="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              Fields use <code class="text-xs">gridSpan</code> to control width. Set per-field in field settings.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTabsSection(): string {
    if (this.layout.type !== 'tabs' && this.layout.type !== 'sections') {
      return '';
    }

    const tabs = this.layout.tabs ?? [];
    const itemName = this.layout.type === 'tabs' ? 'Tab' : 'Section';

    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">${itemName}s</h3>
          <button
            type="button"
            data-add-tab
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add ${itemName}
          </button>
        </div>

        <div data-tabs-list class="space-y-2">
          ${tabs.length === 0
            ? `
            <div class="text-sm text-gray-500 dark:text-gray-400 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              No ${itemName.toLowerCase()}s defined. Fields without a section will appear in a default "${itemName.toLowerCase()}".
            </div>
          `
            : tabs.map((tab, i) => this.renderTabRow(tab, i)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderTabRow(tab: UITab, index: number): string {
    return `
      <div
        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900"
        data-tab-row="${tab.id}"
        data-tab-index="${index}"
        draggable="true"
      >
        <div class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-tab-drag-handle>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
        </div>

        <div class="flex-1 grid grid-cols-3 gap-3">
          <input
            type="text"
            data-tab-id="${tab.id}"
            name="tab_id_${index}"
            value="${escapeHtml(tab.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${index}"
            value="${escapeHtml(tab.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          ${renderIconTrigger(tab.icon ?? '', `name="tab_icon_${index}"`)}
        </div>

        <button
          type="button"
          data-remove-tab="${tab.id}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }

  private renderFieldAssignment(): string {
    if (this.layout.type !== 'tabs' && this.layout.type !== 'sections') {
      return '';
    }

    const tabs = this.layout.tabs ?? [];
    const itemName = this.layout.type === 'tabs' ? 'tab' : 'section';

    // Group fields by section
    const fieldsBySection = new Map<string, FieldDefinition[]>();
    fieldsBySection.set('', []); // Unassigned

    for (const tab of tabs) {
      fieldsBySection.set(tab.id, []);
    }

    for (const field of this.config.fields) {
      const section = field.section ?? '';
      if (!fieldsBySection.has(section)) {
        fieldsBySection.set(section, []);
      }
      fieldsBySection.get(section)!.push(field);
    }

    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${itemName}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(fieldsBySection.entries())
            .map(
              ([section, fields]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${section || '(Unassigned)'}
              </div>
              <div class="space-y-1">
                ${fields.length === 0
                  ? '<div class="text-xs text-gray-400">No fields</div>'
                  : fields.map((f) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${escapeHtml(f.label)} <span class="font-mono">(${escapeHtml(f.name)})</span></div>`).join('')
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    if (!this.container) return;

    // Close button
    this.container.querySelector('[data-layout-close]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Cancel button
    this.container.querySelector('[data-layout-cancel]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Save button
    this.container.querySelector('[data-layout-save]')?.addEventListener('click', () => {
      this.handleSave();
    });

    // Layout type selection
    this.container.querySelectorAll('[data-layout-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-layout-type') as 'flat' | 'tabs' | 'sections';
        this.layout.type = type;
        this.updateView();
      });
    });

    // Grid columns
    this.container.querySelector('[data-grid-columns]')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.layout.gridColumns = parseInt(value, 10);
    });

    // Add tab
    this.container.querySelector('[data-add-tab]')?.addEventListener('click', () => {
      this.addTab();
    });

    // Bind tab events
    this.bindTabEvents();
  }

  private bindTabEvents(): void {
    if (!this.container) return;

    // Remove tab
    this.container.querySelectorAll('[data-remove-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-remove-tab');
        if (tabId) this.removeTab(tabId);
      });
    });

    // Tab ID changes
    this.container.querySelectorAll('input[name^="tab_id_"]').forEach((input) => {
      input.addEventListener('input', () => {
        this.updateTabsFromForm();
      });
    });

    // Icon picker triggers
    bindIconTriggerEvents(this.container, '[data-icon-trigger]', (trigger) => {
      const hiddenInput = trigger.querySelector<HTMLInputElement>('input[name^="tab_icon_"]');
      return {
        value: hiddenInput?.value ?? '',
        onSelect: (v: string) => { if (hiddenInput) hiddenInput.value = v; },
        onClear: () => { if (hiddenInput) hiddenInput.value = ''; },
      };
    });

    // Tab drag and drop
    const tabsList = this.container.querySelector('[data-tabs-list]');
    if (tabsList) {
      tabsList.addEventListener('dragstart', (e) => {
        const target = (e as DragEvent).target as HTMLElement;
        const row = target.closest<HTMLElement>('[data-tab-row]');
        if (!row) return;

        this.dragState = {
          tabId: row.getAttribute('data-tab-row') ?? '',
          startIndex: parseInt(row.getAttribute('data-tab-index') ?? '0', 10),
        };
        row.classList.add('opacity-50');
      });

      tabsList.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      tabsList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!this.dragState) return;

        const target = (e as DragEvent).target as HTMLElement;
        const row = target.closest<HTMLElement>('[data-tab-row]');
        if (!row) return;

        const targetIndex = parseInt(row.getAttribute('data-tab-index') ?? '0', 10);
        this.moveTab(this.dragState.tabId, targetIndex);
        this.dragState = null;
      });

      tabsList.addEventListener('dragend', () => {
        tabsList.querySelectorAll('.opacity-50').forEach((el) => el.classList.remove('opacity-50'));
        this.dragState = null;
      });
    }
  }

  private addTab(): void {
    const newId = `section_${(this.layout.tabs?.length ?? 0) + 1}`;
    const newTab: UITab = {
      id: newId,
      label: `Section ${(this.layout.tabs?.length ?? 0) + 1}`,
      order: this.layout.tabs?.length ?? 0,
    };

    if (!this.layout.tabs) {
      this.layout.tabs = [];
    }
    this.layout.tabs.push(newTab);
    this.updateView();
  }

  private removeTab(tabId: string): void {
    if (!this.layout.tabs) return;
    this.layout.tabs = this.layout.tabs.filter((t) => t.id !== tabId);
    this.updateView();
  }

  private moveTab(tabId: string, newIndex: number): void {
    if (!this.layout.tabs) return;

    const currentIndex = this.layout.tabs.findIndex((t) => t.id === tabId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const tab = this.layout.tabs.splice(currentIndex, 1)[0];
    this.layout.tabs.splice(newIndex, 0, tab);

    // Update order values
    this.layout.tabs.forEach((t, i) => {
      t.order = i;
    });

    this.updateView();
  }

  private updateTabsFromForm(): void {
    if (!this.container || !this.layout.tabs) return;

    this.layout.tabs.forEach((tab, i) => {
      const idInput = this.container!.querySelector<HTMLInputElement>(`input[name="tab_id_${i}"]`);
      const labelInput = this.container!.querySelector<HTMLInputElement>(`input[name="tab_label_${i}"]`);
      const iconInput = this.container!.querySelector<HTMLInputElement>(`input[name="tab_icon_${i}"]`);

      if (idInput) tab.id = idInput.value.trim();
      if (labelInput) tab.label = labelInput.value.trim();
      if (iconInput) tab.icon = iconInput.value.trim() || undefined;
    });
  }

  private updateView(): void {
    if (!this.container) return;
    closeIconPicker();

    // Re-render the whole container content (but not the header/footer)
    const content = this.container.querySelector('.overflow-y-auto');
    if (content) {
      content.innerHTML = `
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      `;

      // Re-bind events
      this.container.querySelectorAll('[data-layout-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-layout-type') as 'flat' | 'tabs' | 'sections';
          this.layout.type = type;
          this.updateView();
        });
      });

      this.container.querySelector('[data-grid-columns]')?.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.layout.gridColumns = parseInt(value, 10);
      });

      this.container.querySelector('[data-add-tab]')?.addEventListener('click', () => {
        this.addTab();
      });

      this.bindTabEvents();
    }
  }

  private handleSave(): void {
    // Update tabs from form inputs
    this.updateTabsFromForm();

    // Validate tabs have unique IDs
    if (this.layout.tabs && this.layout.tabs.length > 0) {
      const ids = new Set<string>();
      for (const tab of this.layout.tabs) {
        if (!tab.id.trim()) {
          this.showLayoutError('All tabs must have an ID');
          return;
        }
        if (ids.has(tab.id)) {
          this.showLayoutError(`Duplicate tab ID: ${tab.id}`);
          return;
        }
        ids.add(tab.id);
      }
    }

    this.config.onSave(this.layout);
    this.hide();
  }

  private showLayoutError(message: string): void {
    const errorEl = this.container?.querySelector('[data-layout-error]');
    if (!errorEl) return;
    errorEl.classList.remove('hidden');
    const textEl = errorEl.querySelector('p');
    if (textEl) textEl.textContent = message;
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
  }
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Field Type Picker
 *
 * Modal/drawer UI for selecting a field type when adding new fields.
 */

import type { FieldType, FieldTypeMetadata, FieldTypeCategory, FieldTypePickerConfig } from './types';

// =============================================================================
// Field Type Registry
// =============================================================================

export const FIELD_TYPES: FieldTypeMetadata[] = [
  // Text Fields
  {
    type: 'text',
    label: 'Text',
    description: 'Single line text input',
    icon: 'T',
    category: 'text',
    defaultConfig: { validation: { maxLength: 255 } },
  },
  {
    type: 'textarea',
    label: 'Textarea',
    description: 'Multi-line text input',
    icon: '¶',
    category: 'text',
    defaultConfig: { config: { multiline: true, rows: 4 } },
  },
  {
    type: 'rich-text',
    label: 'Rich Text',
    description: 'WYSIWYG editor with formatting',
    icon: 'Aa',
    category: 'text',
  },
  {
    type: 'markdown',
    label: 'Markdown',
    description: 'Markdown text editor',
    icon: 'Md',
    category: 'text',
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Code editor with syntax highlighting',
    icon: '<>',
    category: 'text',
    defaultConfig: { config: { language: 'json', lineNumbers: true } },
  },

  // Number Fields
  {
    type: 'number',
    label: 'Number',
    description: 'Decimal number input',
    icon: '#',
    category: 'number',
  },
  {
    type: 'integer',
    label: 'Integer',
    description: 'Whole number input',
    icon: '1',
    category: 'number',
  },
  {
    type: 'currency',
    label: 'Currency',
    description: 'Money amount with currency symbol',
    icon: '$',
    category: 'number',
    defaultConfig: { config: { precision: 2, prefix: '$' } },
  },
  {
    type: 'percentage',
    label: 'Percentage',
    description: 'Percentage value (0-100)',
    icon: '%',
    category: 'number',
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: '%' } },
  },

  // Selection Fields
  {
    type: 'select',
    label: 'Select',
    description: 'Dropdown selection',
    icon: '▼',
    category: 'selection',
    defaultConfig: { config: { options: [] } },
  },
  {
    type: 'radio',
    label: 'Radio',
    description: 'Radio button selection',
    icon: '◉',
    category: 'selection',
    defaultConfig: { config: { options: [] } },
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'Single checkbox (true/false)',
    icon: '☑',
    category: 'selection',
  },
  {
    type: 'chips',
    label: 'Chips',
    description: 'Tag-style multi-select',
    icon: '⚪',
    category: 'selection',
    defaultConfig: { config: { options: [], multiple: true } },
  },
  {
    type: 'toggle',
    label: 'Toggle',
    description: 'Boolean switch',
    icon: '◐',
    category: 'selection',
  },

  // Date/Time Fields
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker',
    icon: '📅',
    category: 'datetime',
  },
  {
    type: 'time',
    label: 'Time',
    description: 'Time picker',
    icon: '🕐',
    category: 'datetime',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    description: 'Date and time picker',
    icon: '📆',
    category: 'datetime',
  },

  // Media Fields
  {
    type: 'media-picker',
    label: 'Media',
    description: 'Single media asset picker',
    icon: '🖼',
    category: 'media',
    defaultConfig: { config: { accept: 'image/*' } },
  },
  {
    type: 'media-gallery',
    label: 'Gallery',
    description: 'Multiple media assets',
    icon: '🎞',
    category: 'media',
    defaultConfig: { config: { accept: 'image/*', multiple: true } },
  },
  {
    type: 'file-upload',
    label: 'File',
    description: 'File attachment',
    icon: '📎',
    category: 'media',
  },

  // Reference Fields
  {
    type: 'reference',
    label: 'Reference',
    description: 'Link to another content type',
    icon: '🔗',
    category: 'reference',
    defaultConfig: { config: { target: '', displayField: 'name' } },
  },
  {
    type: 'references',
    label: 'References',
    description: 'Multiple links to another content type',
    icon: '⛓',
    category: 'reference',
    defaultConfig: { config: { target: '', displayField: 'name', multiple: true } },
  },
  {
    type: 'user',
    label: 'User',
    description: 'User reference',
    icon: '👤',
    category: 'reference',
  },

  // Structural Fields
  {
    type: 'group',
    label: 'Group',
    description: 'Collapsible field group',
    icon: '📁',
    category: 'structural',
  },
  {
    type: 'repeater',
    label: 'Repeater',
    description: 'Repeatable field group',
    icon: '🔄',
    category: 'structural',
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } },
  },
  {
    type: 'blocks',
    label: 'Blocks',
    description: 'Modular content blocks',
    icon: '🧩',
    category: 'structural',
    defaultConfig: { config: { allowedBlocks: [] } },
  },

  // Advanced Fields
  {
    type: 'json',
    label: 'JSON',
    description: 'Raw JSON editor',
    icon: '{}',
    category: 'advanced',
  },
  {
    type: 'slug',
    label: 'Slug',
    description: 'URL-friendly identifier',
    icon: '🔖',
    category: 'advanced',
    defaultConfig: { validation: { pattern: '^[a-z0-9-]+$' } },
  },
  {
    type: 'color',
    label: 'Color',
    description: 'Color picker',
    icon: '🎨',
    category: 'advanced',
  },
  {
    type: 'location',
    label: 'Location',
    description: 'Geographic coordinates',
    icon: '📍',
    category: 'advanced',
  },
];

export const FIELD_CATEGORIES: { id: FieldTypeCategory; label: string; icon: string }[] = [
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'number', label: 'Numbers', icon: '#' },
  { id: 'selection', label: 'Selection', icon: '▼' },
  { id: 'datetime', label: 'Date & Time', icon: '📅' },
  { id: 'media', label: 'Media', icon: '🖼' },
  { id: 'reference', label: 'References', icon: '🔗' },
  { id: 'structural', label: 'Structural', icon: '📁' },
  { id: 'advanced', label: 'Advanced', icon: '⚙' },
];

export function getFieldTypeMetadata(type: FieldType): FieldTypeMetadata | undefined {
  return FIELD_TYPES.find((ft) => ft.type === type);
}

export function getFieldTypesByCategory(category: FieldTypeCategory): FieldTypeMetadata[] {
  return FIELD_TYPES.filter((ft) => ft.category === category);
}

// =============================================================================
// Field Type Picker Component
// =============================================================================

export class FieldTypePicker {
  private config: FieldTypePickerConfig;
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private selectedCategory: FieldTypeCategory = 'text';
  private searchQuery: string = '';

  constructor(config: FieldTypePickerConfig) {
    this.config = config;
  }

  /**
   * Show the field type picker modal
   */
  show(): void {
    this.render();
    this.bindEvents();
    // Focus search input
    const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
    searchInput?.focus();
  }

  /**
   * Hide the field type picker modal
   */
  hide(): void {
    if (this.backdrop) {
      this.backdrop.classList.add('opacity-0');
      setTimeout(() => {
        this.backdrop?.remove();
        this.backdrop = null;
        this.container = null;
      }, 150);
    }
  }

  private render(): void {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150';
    this.backdrop.setAttribute('data-field-type-picker-backdrop', 'true');

    // Create modal container
    this.container = document.createElement('div');
    this.container.className =
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden';
    this.container.setAttribute('data-field-type-picker', 'true');

    this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Add Field</h2>
        <button type="button" data-field-type-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            data-field-type-search
            placeholder="Search field types..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-48 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" data-field-type-categories>
          ${this.renderCategories()}
        </div>

        <div class="flex-1 overflow-y-auto p-4" data-field-type-list>
          ${this.renderFieldTypes()}
        </div>
      </div>
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    // Trigger animation
    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });
  }

  private renderCategories(): string {
    return FIELD_CATEGORIES.map(
      (cat) => `
      <button
        type="button"
        data-field-category="${cat.id}"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
          cat.id === this.selectedCategory
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }"
      >
        <span class="flex-shrink-0 w-6 text-center">${cat.icon}</span>
        <span>${cat.label}</span>
      </button>
    `
    ).join('');
  }

  private renderFieldTypes(): string {
    const excludeSet = new Set(this.config.excludeTypes ?? []);
    let types = FIELD_TYPES.filter((ft) => !excludeSet.has(ft.type));

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      types = types.filter(
        (ft) =>
          ft.label.toLowerCase().includes(query) ||
          ft.description.toLowerCase().includes(query) ||
          ft.type.toLowerCase().includes(query)
      );
    } else {
      // Filter by category when not searching
      types = types.filter((ft) => ft.category === this.selectedCategory);
    }

    if (types.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-2 gap-3">
        ${types.map((ft) => this.renderFieldTypeCard(ft)).join('')}
      </div>
    `;
  }

  private renderFieldTypeCard(fieldType: FieldTypeMetadata): string {
    return `
      <button
        type="button"
        data-field-type-select="${fieldType.type}"
        class="flex items-start gap-3 p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      >
        <span class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-lg font-medium">
          ${fieldType.icon}
        </span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 dark:text-white">${fieldType.label}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">${fieldType.description}</div>
        </div>
      </button>
    `;
  }

  private bindEvents(): void {
    if (!this.container || !this.backdrop) return;

    // Close on backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.config.onCancel();
        this.hide();
      }
    });

    // Close button
    this.container.querySelector('[data-field-type-close]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Category selection
    this.container.querySelectorAll('[data-field-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.getAttribute('data-field-category') as FieldTypeCategory;
        this.searchQuery = '';
        const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
        if (searchInput) searchInput.value = '';
        this.updateView();
      });
    });

    // Field type selection
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-field-type-select]');
      if (target) {
        const type = target.getAttribute('data-field-type-select') as FieldType;
        this.config.onSelect(type);
        this.hide();
      }
    });

    // Search
    const searchInput = this.container.querySelector<HTMLInputElement>('[data-field-type-search]');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.updateView();
    });

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.config.onCancel();
        this.hide();
      }
    });
  }

  private updateView(): void {
    if (!this.container) return;

    // Update categories
    const categoriesContainer = this.container.querySelector('[data-field-type-categories]');
    if (categoriesContainer) {
      categoriesContainer.innerHTML = this.renderCategories();
      // Re-bind category events
      categoriesContainer.querySelectorAll('[data-field-category]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedCategory = btn.getAttribute('data-field-category') as FieldTypeCategory;
          this.searchQuery = '';
          const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
          if (searchInput) searchInput.value = '';
          this.updateView();
        });
      });
    }

    // Update field types list
    const listContainer = this.container.querySelector('[data-field-type-list]');
    if (listContainer) {
      listContainer.innerHTML = this.renderFieldTypes();
    }
  }
}

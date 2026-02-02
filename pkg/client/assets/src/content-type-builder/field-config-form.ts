/**
 * Field Configuration Form
 *
 * Modal/drawer UI for configuring a field's properties.
 */

import type {
  FieldDefinition,
  FieldConfigFormConfig,
  FieldType,
  SelectOption,
  SlugFieldConfig,
  ColorFieldConfig,
  LocationFieldConfig,
  DateRangeFieldConfig,
  RepeaterFieldConfig,
  BlocksFieldConfig,
  BlockDefinitionSummary,
} from './types';
import { getFieldTypeMetadata, FIELD_TYPES } from './field-type-picker';
import { generateFieldId, ContentTypeAPIClient } from './api-client';
import { Modal } from '../shared/modal';

// =============================================================================
// Field Config Form Component
// =============================================================================

export class FieldConfigForm extends Modal {
  private config: FieldConfigFormConfig;
  private field: FieldDefinition;
  private isNewField: boolean;

  constructor(config: FieldConfigFormConfig) {
    super({
      size: '2xl',
      initialFocus: 'input[name="name"]',
      backdropDataAttr: 'data-field-config-backdrop',
    });
    this.config = config;
    this.field = { ...config.field };
    this.isNewField = !config.field.id || config.field.id.startsWith('new_');
  }

  protected onBeforeHide(): boolean {
    this.config.onCancel();
    return true;
  }

  protected renderContent(): string {
    const fieldMeta = getFieldTypeMetadata(this.field.type);

    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${fieldMeta?.icon ?? '?'}
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${this.isNewField ? 'Add' : 'Edit'} ${fieldMeta?.label ?? 'Field'}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">${fieldMeta?.description ?? ''}</p>
          </div>
        </div>
        <button type="button" data-field-config-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <form data-field-config-form-element class="space-y-6">
          ${this.renderGeneralSection()}
          ${this.renderValidationSection()}
          ${this.renderAppearanceSection()}
          ${this.renderTypeSpecificSection()}
        </form>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-field-config-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-field-config-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ${this.isNewField ? 'Add Field' : 'Save Changes'}
        </button>
      </div>
    `;
  }

  private renderGeneralSection(): string {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">General</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value="${escapeHtml(this.field.name)}"
              placeholder="field_name"
              pattern="^[a-z][a-z0-9_]*$"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lowercase letters, numbers, underscores. Starts with letter.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="label"
              value="${escapeHtml(this.field.label)}"
              placeholder="Field Label"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows="2"
            placeholder="Help text for editors"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          >${escapeHtml(this.field.description ?? '')}</textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${escapeHtml(this.field.placeholder ?? '')}"
            placeholder="Placeholder text"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="required"
              ${this.field.required ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="readonly"
              ${this.field.readonly ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Read-only</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hidden"
              ${this.field.hidden ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Hidden</span>
          </label>
        </div>
      </div>
    `;
  }

  private renderValidationSection(): string {
    const validation = this.field.validation ?? {};
    const showStringValidation = ['text', 'textarea', 'rich-text', 'markdown', 'code', 'slug'].includes(
      this.field.type
    );
    const showNumberValidation = ['number', 'integer', 'currency', 'percentage'].includes(this.field.type);

    if (!showStringValidation && !showNumberValidation) {
      return '';
    }

    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${
            showStringValidation
              ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${validation.minLength ?? ''}"
                min="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Length
              </label>
              <input
                type="number"
                name="maxLength"
                value="${validation.maxLength ?? ''}"
                min="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          `
              : ''
          }

          ${
            showNumberValidation
              ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${validation.min ?? ''}"
                step="any"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum
              </label>
              <input
                type="number"
                name="max"
                value="${validation.max ?? ''}"
                step="any"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          `
              : ''
          }
        </div>

        ${
          showStringValidation
            ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${escapeHtml(validation.pattern ?? '')}"
              placeholder="^[a-z]+$"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  private renderAppearanceSection(): string {
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Appearance</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section/Tab
            </label>
            <input
              type="text"
              name="section"
              value="${escapeHtml(this.field.section ?? '')}"
              placeholder="main"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Span (1-12)
            </label>
            <input
              type="number"
              name="gridSpan"
              value="${this.field.gridSpan ?? ''}"
              min="1"
              max="12"
              placeholder="12"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    `;
  }

  private renderTypeSpecificSection(): string {
    const sections: string[] = [];

    // Select/Radio/Chips options
    if (['select', 'radio', 'chips'].includes(this.field.type)) {
      const config = this.field.config as { options?: SelectOption[] } | undefined;
      const options = config?.options ?? [];

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Options</h3>
            <button
              type="button"
              data-add-option
              class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Add Option
            </button>
          </div>

          <div data-options-list class="space-y-2">
            ${options
              .map(
                (opt, i) => `
              <div class="flex items-center gap-2" data-option-row="${i}">
                <input
                  type="text"
                  name="option_value_${i}"
                  value="${escapeHtml(String(opt.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${i}"
                  value="${escapeHtml(opt.label)}"
                  placeholder="label"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-remove-option="${i}"
                  class="p-2 text-gray-400 hover:text-red-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `);
    }

    // Reference target
    if (['reference', 'references', 'user'].includes(this.field.type)) {
      const config = this.field.config as { target?: string; displayField?: string } | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Reference Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Content Type
              </label>
              <input
                type="text"
                name="target"
                value="${escapeHtml(config?.target ?? '')}"
                placeholder="users"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Field
              </label>
              <input
                type="text"
                name="displayField"
                value="${escapeHtml(config?.displayField ?? '')}"
                placeholder="name"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      `);
    }

    // Media settings
    if (['media-picker', 'media-gallery', 'file-upload'].includes(this.field.type)) {
      const config = this.field.config as { accept?: string; maxSize?: number; multiple?: boolean } | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Media Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Accept Types
              </label>
              <input
                type="text"
                name="accept"
                value="${escapeHtml(config?.accept ?? '')}"
                placeholder="image/*"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${config?.maxSize ?? ''}"
                min="0"
                placeholder="10"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          ${
            this.field.type === 'media-gallery'
              ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="multiple"
                ${config?.multiple !== false ? 'checked' : ''}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Allow multiple files</span>
            </label>
          `
              : ''
          }
        </div>
      `);
    }

    // Code editor settings
    if (this.field.type === 'code') {
      const config = this.field.config as { language?: string; lineNumbers?: boolean } | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Code Editor Settings</h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              name="language"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="json" ${config?.language === 'json' ? 'selected' : ''}>JSON</option>
              <option value="javascript" ${config?.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
              <option value="typescript" ${config?.language === 'typescript' ? 'selected' : ''}>TypeScript</option>
              <option value="html" ${config?.language === 'html' ? 'selected' : ''}>HTML</option>
              <option value="css" ${config?.language === 'css' ? 'selected' : ''}>CSS</option>
              <option value="sql" ${config?.language === 'sql' ? 'selected' : ''}>SQL</option>
              <option value="yaml" ${config?.language === 'yaml' ? 'selected' : ''}>YAML</option>
              <option value="markdown" ${config?.language === 'markdown' ? 'selected' : ''}>Markdown</option>
            </select>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="lineNumbers"
              ${config?.lineNumbers !== false ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Show line numbers</span>
          </label>
        </div>
      `);
    }

    // Slug field settings
    if (this.field.type === 'slug') {
      const config = this.field.config as SlugFieldConfig | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Slug Settings</h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${escapeHtml(config?.sourceField ?? '')}"
              placeholder="title"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Field name to generate slug from (e.g., title)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                name="slugPrefix"
                value="${escapeHtml(config?.prefix ?? '')}"
                placeholder=""
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Suffix
              </label>
              <input
                type="text"
                name="slugSuffix"
                value="${escapeHtml(config?.suffix ?? '')}"
                placeholder=""
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Separator
              </label>
              <select
                name="slugSeparator"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="-" ${config?.separator === '-' || !config?.separator ? 'selected' : ''}>Hyphen (-)</option>
                <option value="_" ${config?.separator === '_' ? 'selected' : ''}>Underscore (_)</option>
              </select>
            </div>
          </div>
        </div>
      `);
    }

    // Color field settings
    if (this.field.type === 'color') {
      const config = this.field.config as ColorFieldConfig | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Color Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <select
                name="colorFormat"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hex" ${config?.format === 'hex' || !config?.format ? 'selected' : ''}>HEX (#ff0000)</option>
                <option value="rgb" ${config?.format === 'rgb' ? 'selected' : ''}>RGB (rgb(255,0,0))</option>
                <option value="hsl" ${config?.format === 'hsl' ? 'selected' : ''}>HSL (hsl(0,100%,50%))</option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  name="allowAlpha"
                  ${config?.allowAlpha ? 'checked' : ''}
                  class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Allow transparency (alpha)</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color Presets (comma-separated)
            </label>
            <input
              type="text"
              name="colorPresets"
              value="${escapeHtml(config?.presets?.join(', ') ?? '')}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      `);
    }

    // Location field settings
    if (this.field.type === 'location') {
      const config = this.field.config as LocationFieldConfig | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Location Settings</h3>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Latitude
              </label>
              <input
                type="number"
                name="defaultLat"
                value="${config?.defaultCenter?.lat ?? ''}"
                step="any"
                placeholder="40.7128"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Longitude
              </label>
              <input
                type="number"
                name="defaultLng"
                value="${config?.defaultCenter?.lng ?? ''}"
                step="any"
                placeholder="-74.0060"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Zoom
              </label>
              <input
                type="number"
                name="defaultZoom"
                value="${config?.defaultZoom ?? ''}"
                min="1"
                max="20"
                placeholder="12"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="searchEnabled"
              ${config?.searchEnabled !== false ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enable location search</span>
          </label>
        </div>
      `);
    }

    // DateRange field settings
    if (this.field.type === 'daterange') {
      const config = this.field.config as DateRangeFieldConfig | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Date Range Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Date
              </label>
              <input
                type="date"
                name="minDate"
                value="${escapeHtml(config?.minDate ?? '')}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Date
              </label>
              <input
                type="date"
                name="maxDate"
                value="${escapeHtml(config?.maxDate ?? '')}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${config?.allowSameDay !== false ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Allow same start and end date</span>
          </label>
        </div>
      `);
    }

    // Repeater field settings
    if (this.field.type === 'repeater') {
      const config = this.field.config as RepeaterFieldConfig | undefined;

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Repeater Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Items
              </label>
              <input
                type="number"
                name="minItems"
                value="${config?.minItems ?? ''}"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Items
              </label>
              <input
                type="number"
                name="maxItems"
                value="${config?.maxItems ?? ''}"
                min="1"
                placeholder="10"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="collapsed"
              ${config?.collapsed ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Start collapsed</span>
          </label>

          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Nested fields can be configured after saving. Edit this field to define repeater sub-fields.
            </p>
          </div>
        </div>
      `);
    }

    // Blocks field settings
    if (this.field.type === 'blocks') {
      const config = this.field.config as BlocksFieldConfig | undefined;
      const allowedBlocksJson = config?.allowedBlocks ? JSON.stringify(config.allowedBlocks) : '[]';
      const deniedBlocksJson = config?.deniedBlocks ? JSON.stringify(config.deniedBlocks) : '[]';

      sections.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Blocks Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Blocks
              </label>
              <input
                type="number"
                name="minBlocks"
                value="${config?.minBlocks ?? ''}"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Blocks
              </label>
              <input
                type="number"
                name="maxBlocks"
                value="${config?.maxBlocks ?? ''}"
                min="1"
                placeholder="No limit"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Allowed Blocks
              </label>
              <button
                type="button"
                data-block-picker-allowed
                class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Select blocks...
              </button>
            </div>
            <div
              data-allowed-blocks-list
              class="min-h-[48px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div data-allowed-blocks-chips class="flex flex-wrap gap-2">
                ${
                  config?.allowedBlocks?.length
                    ? config.allowedBlocks
                        .map(
                          (block) =>
                            `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${escapeHtml(block)}">${escapeHtml(block)}<button type="button" data-remove-allowed="${escapeHtml(block)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`
                        )
                        .join('')
                    : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'
                }
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${escapeHtml(allowedBlocksJson)}' />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to allow all block types</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Denied Blocks
              </label>
              <button
                type="button"
                data-block-picker-denied
                class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Select blocks...
              </button>
            </div>
            <div
              data-denied-blocks-list
              class="min-h-[48px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div data-denied-blocks-chips class="flex flex-wrap gap-2">
                ${
                  config?.deniedBlocks?.length
                    ? config.deniedBlocks
                        .map(
                          (block) =>
                            `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${escapeHtml(block)}">${escapeHtml(block)}<button type="button" data-remove-denied="${escapeHtml(block)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`
                        )
                        .join('')
                    : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'
                }
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${escapeHtml(deniedBlocksJson)}' />
          </div>
        </div>
      `);
    }

    return sections.join('');
  }

  protected bindContentEvents(): void {
    if (!this.container) return;

    // Close button
    this.container.querySelector('[data-field-config-close]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Cancel button
    this.container.querySelector('[data-field-config-cancel]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Save button
    this.container.querySelector('[data-field-config-save]')?.addEventListener('click', () => {
      this.handleSave();
    });

    // Form submit (Enter key)
    this.container.querySelector('[data-field-config-form-element]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    // Auto-generate name from label
    const nameInput = this.container.querySelector<HTMLInputElement>('input[name="name"]');
    const labelInput = this.container.querySelector<HTMLInputElement>('input[name="label"]');
    if (nameInput && labelInput && this.isNewField) {
      labelInput.addEventListener('input', () => {
        if (!nameInput.dataset.userModified) {
          nameInput.value = labelToFieldName(labelInput.value);
        }
      });
      nameInput.addEventListener('input', () => {
        nameInput.dataset.userModified = 'true';
      });
    }

    // Options management
    this.bindOptionsEvents();

    // Block picker events
    this.bindBlockPickerEvents();
  }

  private bindOptionsEvents(): void {
    if (!this.container) return;

    // Add option
    this.container.querySelector('[data-add-option]')?.addEventListener('click', () => {
      const optionsList = this.container?.querySelector('[data-options-list]');
      if (!optionsList) return;

      const index = optionsList.querySelectorAll('[data-option-row]').length;
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.setAttribute('data-option-row', String(index));
      row.innerHTML = `
        <input
          type="text"
          name="option_value_${index}"
          placeholder="value"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="option_label_${index}"
          placeholder="label"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          data-remove-option="${index}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
      optionsList.appendChild(row);

      // Bind remove event
      row.querySelector('[data-remove-option]')?.addEventListener('click', () => {
        row.remove();
      });

      // Focus value input
      row.querySelector<HTMLInputElement>(`input[name="option_value_${index}"]`)?.focus();
    });

    // Remove option
    this.container.querySelectorAll('[data-remove-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('[data-option-row]')?.remove();
      });
    });
  }

  private bindBlockPickerEvents(): void {
    if (!this.container || this.field.type !== 'blocks') return;

    // Open allowed blocks picker
    this.container.querySelector('[data-block-picker-allowed]')?.addEventListener('click', () => {
      this.showBlockPicker('allowed');
    });

    // Open denied blocks picker
    this.container.querySelector('[data-block-picker-denied]')?.addEventListener('click', () => {
      this.showBlockPicker('denied');
    });

    // Remove allowed block chip
    this.container.querySelectorAll('[data-remove-allowed]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const blockType = btn.getAttribute('data-remove-allowed');
        if (blockType) this.removeBlockFromList('allowed', blockType);
      });
    });

    // Remove denied block chip
    this.container.querySelectorAll('[data-remove-denied]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const blockType = btn.getAttribute('data-remove-denied');
        if (blockType) this.removeBlockFromList('denied', blockType);
      });
    });
  }

  private async showBlockPicker(listType: 'allowed' | 'denied'): Promise<void> {
    // Get current selections
    const hiddenInput = this.container?.querySelector<HTMLInputElement>(`input[name="${listType}Blocks"]`);
    const currentBlocks: string[] = hiddenInput?.value ? JSON.parse(hiddenInput.value) : [];

    // Create picker modal
    const picker = new BlockPickerModal({
      apiBasePath: this.config.apiBasePath ?? '/admin',
      selectedBlocks: currentBlocks,
      title: listType === 'allowed' ? 'Select Allowed Blocks' : 'Select Denied Blocks',
      onSelect: (blocks) => {
        this.updateBlockList(listType, blocks);
      },
    });
    picker.show();
  }

  private updateBlockList(listType: 'allowed' | 'denied', blocks: string[]): void {
    const hiddenInput = this.container?.querySelector<HTMLInputElement>(`input[name="${listType}Blocks"]`);
    const chipsContainer = this.container?.querySelector(`[data-${listType}-blocks-chips]`);

    if (!hiddenInput || !chipsContainer) return;

    // Update hidden input
    hiddenInput.value = JSON.stringify(blocks);

    // Update chips display
    if (blocks.length === 0) {
      const emptyText =
        listType === 'allowed' ? 'All blocks allowed (no restrictions)' : 'No blocks denied';
      chipsContainer.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${emptyText}</span>`;
    } else {
      const chipColor = listType === 'allowed' ? 'blue' : 'red';
      chipsContainer.innerHTML = blocks
        .map(
          (block) =>
            `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${chipColor}-100 text-${chipColor}-700 dark:bg-${chipColor}-900/30 dark:text-${chipColor}-400" data-block-chip="${escapeHtml(block)}">${escapeHtml(block)}<button type="button" data-remove-${listType}="${escapeHtml(block)}" class="hover:text-${chipColor}-900 dark:hover:text-${chipColor}-200">&times;</button></span>`
        )
        .join('');

      // Rebind remove events
      chipsContainer.querySelectorAll(`[data-remove-${listType}]`).forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const blockType = btn.getAttribute(`data-remove-${listType}`);
          if (blockType) this.removeBlockFromList(listType, blockType);
        });
      });
    }
  }

  private removeBlockFromList(listType: 'allowed' | 'denied', blockType: string): void {
    const hiddenInput = this.container?.querySelector<HTMLInputElement>(`input[name="${listType}Blocks"]`);
    if (!hiddenInput) return;

    const blocks: string[] = hiddenInput.value ? JSON.parse(hiddenInput.value) : [];
    const updatedBlocks = blocks.filter((b) => b !== blockType);
    this.updateBlockList(listType, updatedBlocks);
  }

  private handleSave(): void {
    const form = this.container?.querySelector<HTMLFormElement>('[data-field-config-form-element]');
    if (!form) return;

    const formData = new FormData(form);

    // Validate name
    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      this.showError('name', 'Field name is required');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      this.showError('name', 'Invalid field name format');
      return;
    }

    // Check for duplicate names
    const existingNames = this.config.existingFieldNames ?? [];
    const originalName = this.config.field.name;
    if (name !== originalName && existingNames.includes(name)) {
      this.showError('name', 'A field with this name already exists');
      return;
    }

    // Validate label
    const label = (formData.get('label') as string)?.trim();
    if (!label) {
      this.showError('label', 'Label is required');
      return;
    }

    // Build updated field
    const updatedField: FieldDefinition = {
      id: this.field.id || generateFieldId(),
      name,
      type: this.field.type,
      label,
      description: (formData.get('description') as string)?.trim() || undefined,
      placeholder: (formData.get('placeholder') as string)?.trim() || undefined,
      required: formData.get('required') === 'on',
      readonly: formData.get('readonly') === 'on',
      hidden: formData.get('hidden') === 'on',
      section: (formData.get('section') as string)?.trim() || undefined,
      gridSpan: formData.get('gridSpan') ? parseInt(formData.get('gridSpan') as string, 10) : undefined,
    };

    // Validation
    const validation: FieldDefinition['validation'] = {};
    const minLength = formData.get('minLength');
    if (minLength !== null && minLength !== '') {
      validation.minLength = parseInt(minLength as string, 10);
    }
    const maxLength = formData.get('maxLength');
    if (maxLength !== null && maxLength !== '') {
      validation.maxLength = parseInt(maxLength as string, 10);
    }
    const min = formData.get('min');
    if (min !== null && min !== '') {
      validation.min = parseFloat(min as string);
    }
    const max = formData.get('max');
    if (max !== null && max !== '') {
      validation.max = parseFloat(max as string);
    }
    const pattern = formData.get('pattern');
    if (pattern && (pattern as string).trim()) {
      validation.pattern = (pattern as string).trim();
    }
    if (Object.keys(validation).length > 0) {
      updatedField.validation = validation;
    }

    // Type-specific config
    const config = this.buildTypeSpecificConfig(formData);
    if (config && Object.keys(config).length > 0) {
      updatedField.config = config;
    }

    this.config.onSave(updatedField);
    this.hide();
  }

  private buildTypeSpecificConfig(formData: FormData): FieldDefinition['config'] | undefined {
    switch (this.field.type) {
      case 'select':
      case 'radio':
      case 'chips': {
        const options: SelectOption[] = [];
        let i = 0;
        while (formData.has(`option_value_${i}`)) {
          const value = (formData.get(`option_value_${i}`) as string)?.trim();
          const label = (formData.get(`option_label_${i}`) as string)?.trim();
          if (value) {
            options.push({ value, label: label || value });
          }
          i++;
        }
        return options.length > 0 ? { options } : undefined;
      }

      case 'reference':
      case 'references':
      case 'user': {
        const target = (formData.get('target') as string)?.trim();
        const displayField = (formData.get('displayField') as string)?.trim();
        if (!target) return undefined;
        return { target, displayField: displayField || undefined };
      }

      case 'media-picker':
      case 'media-gallery':
      case 'file-upload': {
        const accept = (formData.get('accept') as string)?.trim();
        const maxSize = formData.get('maxSize') ? parseInt(formData.get('maxSize') as string, 10) : undefined;
        const multiple = formData.get('multiple') === 'on';
        return {
          accept: accept || undefined,
          maxSize,
          multiple: this.field.type === 'media-gallery' ? multiple : undefined,
        };
      }

      case 'code': {
        const language = (formData.get('language') as string)?.trim() || 'json';
        const lineNumbers = formData.get('lineNumbers') === 'on';
        return { language, lineNumbers };
      }

      case 'slug': {
        const sourceField = (formData.get('sourceField') as string)?.trim();
        const prefix = (formData.get('slugPrefix') as string)?.trim();
        const suffix = (formData.get('slugSuffix') as string)?.trim();
        const separator = (formData.get('slugSeparator') as string)?.trim() || '-';
        return {
          sourceField: sourceField || undefined,
          prefix: prefix || undefined,
          suffix: suffix || undefined,
          separator,
        };
      }

      case 'color': {
        const format = (formData.get('colorFormat') as string)?.trim() || 'hex';
        const allowAlpha = formData.get('allowAlpha') === 'on';
        const presetsStr = (formData.get('colorPresets') as string)?.trim();
        const presets = presetsStr
          ? presetsStr.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        return {
          format: format as 'hex' | 'rgb' | 'hsl',
          allowAlpha,
          presets,
        };
      }

      case 'location': {
        const defaultLat = formData.get('defaultLat');
        const defaultLng = formData.get('defaultLng');
        const defaultZoom = formData.get('defaultZoom');
        const searchEnabled = formData.get('searchEnabled') === 'on';
        const config: LocationFieldConfig = { searchEnabled };
        if (defaultLat && defaultLng) {
          config.defaultCenter = {
            lat: parseFloat(defaultLat as string),
            lng: parseFloat(defaultLng as string),
          };
        }
        if (defaultZoom) {
          config.defaultZoom = parseInt(defaultZoom as string, 10);
        }
        return config;
      }

      case 'daterange': {
        const minDate = (formData.get('minDate') as string)?.trim();
        const maxDate = (formData.get('maxDate') as string)?.trim();
        const allowSameDay = formData.get('allowSameDay') === 'on';
        return {
          minDate: minDate || undefined,
          maxDate: maxDate || undefined,
          allowSameDay,
        };
      }

      case 'repeater': {
        const minItems = formData.get('minItems');
        const maxItems = formData.get('maxItems');
        const collapsed = formData.get('collapsed') === 'on';
        // Preserve existing nested fields
        const existingConfig = this.field.config as RepeaterFieldConfig | undefined;
        return {
          fields: existingConfig?.fields ?? [],
          minItems: minItems ? parseInt(minItems as string, 10) : undefined,
          maxItems: maxItems ? parseInt(maxItems as string, 10) : undefined,
          collapsed,
        };
      }

      case 'blocks': {
        const minBlocks = formData.get('minBlocks');
        const maxBlocks = formData.get('maxBlocks');
        const allowedStr = (formData.get('allowedBlocks') as string)?.trim();
        const deniedStr = (formData.get('deniedBlocks') as string)?.trim();

        // Parse JSON arrays (new format) or fall back to comma-separated (legacy)
        let allowedBlocks: string[] | undefined;
        let deniedBlocks: string[] | undefined;

        if (allowedStr) {
          try {
            const parsed = JSON.parse(allowedStr);
            allowedBlocks = Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
          } catch {
            // Fall back to comma-separated format
            allowedBlocks = allowedStr.split(',').map((s) => s.trim()).filter(Boolean);
            if (allowedBlocks.length === 0) allowedBlocks = undefined;
          }
        }

        if (deniedStr) {
          try {
            const parsed = JSON.parse(deniedStr);
            deniedBlocks = Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
          } catch {
            // Fall back to comma-separated format
            deniedBlocks = deniedStr.split(',').map((s) => s.trim()).filter(Boolean);
            if (deniedBlocks.length === 0) deniedBlocks = undefined;
          }
        }

        return {
          minBlocks: minBlocks ? parseInt(minBlocks as string, 10) : undefined,
          maxBlocks: maxBlocks ? parseInt(maxBlocks as string, 10) : undefined,
          allowedBlocks,
          deniedBlocks,
        };
      }

      default:
        return undefined;
    }
  }

  private showError(fieldName: string, message: string): void {
    const input = this.container?.querySelector<HTMLInputElement>(`[name="${fieldName}"]`);
    if (!input) return;

    input.classList.add('border-red-500', 'focus:ring-red-500');
    input.focus();

    // Remove existing error
    const existingError = input.parentElement?.querySelector('.field-error');
    existingError?.remove();

    // Add error message
    const errorEl = document.createElement('p');
    errorEl.className = 'field-error text-xs text-red-500 mt-1';
    errorEl.textContent = message;
    input.parentElement?.appendChild(errorEl);

    // Clear on input
    const clearError = () => {
      input.classList.remove('border-red-500', 'focus:ring-red-500');
      errorEl.remove();
      input.removeEventListener('input', clearError);
    };
    input.addEventListener('input', clearError);
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

function labelToFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/^[0-9]/, '_$&');
}

// =============================================================================
// Block Picker Modal
// =============================================================================

interface BlockPickerModalConfig {
  apiBasePath: string;
  selectedBlocks: string[];
  title: string;
  onSelect: (blocks: string[]) => void;
}

class BlockPickerModal extends Modal {
  private config: BlockPickerModalConfig;
  private api: ContentTypeAPIClient;
  private availableBlocks: BlockDefinitionSummary[] = [];
  private selectedBlocks: Set<string>;

  constructor(config: BlockPickerModalConfig) {
    super({ size: 'lg', maxHeight: 'max-h-[70vh]' });
    this.config = config;
    this.api = new ContentTypeAPIClient({ basePath: config.apiBasePath });
    this.selectedBlocks = new Set(config.selectedBlocks);
  }

  protected async onAfterShow(): Promise<void> {
    await this.loadBlocks();
  }

  protected renderContent(): string {
    return `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(this.config.title)}</h3>
        <button type="button" data-picker-close class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div data-blocks-loading class="flex items-center justify-center py-8">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
        <div data-blocks-list class="hidden space-y-2"></div>
        <div data-blocks-empty class="hidden text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No block definitions available. Create some in the Block Library first.
        </div>
      </div>

      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <span class="text-xs text-gray-500 dark:text-gray-400" data-selection-count>0 selected</span>
        <div class="flex gap-2">
          <button
            type="button"
            data-picker-cancel
            class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            data-picker-confirm
            class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    `;
  }

  protected bindContentEvents(): void {
    if (!this.container) return;

    this.container.querySelector('[data-picker-close]')?.addEventListener('click', () => this.hide());
    this.container.querySelector('[data-picker-cancel]')?.addEventListener('click', () => this.hide());

    this.container.querySelector('[data-picker-confirm]')?.addEventListener('click', () => {
      this.config.onSelect(Array.from(this.selectedBlocks));
      this.hide();
    });
  }

  private async loadBlocks(): Promise<void> {
    const loadingEl = this.container?.querySelector('[data-blocks-loading]');
    const listEl = this.container?.querySelector('[data-blocks-list]');
    const emptyEl = this.container?.querySelector('[data-blocks-empty]');

    try {
      const blocks = await this.api.listBlockDefinitionsSummary();
      this.availableBlocks = blocks;
      this.normalizeSelectedBlocks();

      loadingEl?.classList.add('hidden');

      if (blocks.length === 0) {
        emptyEl?.classList.remove('hidden');
      } else {
        listEl?.classList.remove('hidden');
        this.renderBlocksList();
      }
    } catch {
      loadingEl?.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      const emptyText = emptyEl?.querySelector('span') || emptyEl;
      if (emptyText) emptyText.textContent = 'Failed to load block definitions';
    }
  }

  private blockKey(block: BlockDefinitionSummary): string {
    return (block.slug || block.type || '').trim();
  }

  private normalizeSelectedBlocks(): void {
    if (this.selectedBlocks.size === 0 || this.availableBlocks.length === 0) return;

    const normalized = new Set<string>();
    const mappedLegacy = new Set<string>();

    for (const block of this.availableBlocks) {
      const key = this.blockKey(block);
      if (!key) continue;
      const hasKey = this.selectedBlocks.has(key);
      const hasType = this.selectedBlocks.has(block.type);
      if (hasKey || hasType) {
        normalized.add(key);
        if (hasType && block.slug && block.slug !== block.type) {
          mappedLegacy.add(block.type);
        }
      }
    }

    for (const value of this.selectedBlocks) {
      if (mappedLegacy.has(value)) continue;
      if (!normalized.has(value)) {
        normalized.add(value);
      }
    }

    this.selectedBlocks = normalized;
  }

  private renderBlocksList(): void {
    const listEl = this.container?.querySelector('[data-blocks-list]');
    if (!listEl) return;

    listEl.innerHTML = this.availableBlocks
      .map((block) => {
        const blockKey = this.blockKey(block);
        const isSelected = this.selectedBlocks.has(blockKey) || this.selectedBlocks.has(block.type);
        return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }">
            <input
              type="checkbox"
              value="${escapeHtml(blockKey)}"
              data-block-type="${escapeHtml(block.type)}"
              ${isSelected ? 'checked' : ''}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${block.icon || blockKey.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(block.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${escapeHtml(blockKey)}</div>
            </div>
            ${block.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${escapeHtml(block.schema_version)}</span>` : ''}
          </label>
        `;
      })
      .join('');

    // Bind checkbox events
    listEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const blockType = checkbox.value;
        const legacyType = checkbox.dataset.blockType;
        if (checkbox.checked) {
          this.selectedBlocks.add(blockType);
          if (legacyType && legacyType !== blockType) {
            this.selectedBlocks.delete(legacyType);
          }
        } else {
          this.selectedBlocks.delete(blockType);
          if (legacyType) {
            this.selectedBlocks.delete(legacyType);
          }
        }
        this.updateSelectionCount();
        this.renderBlocksList(); // Re-render to update styles
      });
    });

    this.updateSelectionCount();
  }

  private updateSelectionCount(): void {
    const countEl = this.container?.querySelector('[data-selection-count]');
    if (countEl) {
      const count = this.selectedBlocks.size;
      countEl.textContent = `${count} selected`;
    }
  }
}

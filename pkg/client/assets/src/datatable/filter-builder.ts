/**
 * FilterBuilder Component
 *
 * Manages the shared two-level filter structure in either the legacy overlay
 * or a caller-owned compact host. Overlay mode remains the default.
 */

import type { FilterCondition, FilterGroup, FilterStructure } from './behaviors/types.js';
import type { ToastNotifier } from '../toast/types.js';
import { FallbackNotifier } from '../toast/toast-manager.js';

export type FilterBuilderMode = 'overlay' | 'compact';
export type FilterBuilderElementTarget = string | HTMLElement;

export interface FilterBuilderOperatorOption {
  label: string;
  value: string;
}

export interface FilterBuilderFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  operators?: Array<string | FilterBuilderOperatorOption>;
  options?: { label: string; value: string }[];
  group?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface FilterBuilderChromeConfig {
  header?: boolean;
  title?: string;
  savedFilters?: boolean;
  sqlPreview?: boolean;
}

export interface FilterBuilderActionsConfig {
  apply?: boolean;
  clear?: boolean;
  save?: boolean;
}

export interface FilterBuilderLimitsConfig {
  maxGroups?: number;
  maxConditionsPerGroup?: number;
  maxTotalConditions?: number;
}

export interface FilterBuilderMessages {
  filtersTitle: string;
  savedFilters: string;
  editAsSQL: string;
  previewLabel: string;
  noFiltersApplied: string;
  filterName: string;
  filterNamePlaceholder: string;
  saveFilter: string;
  clearAll: string;
  applyFilter: string;
  addFilterGroup: string;
  removeGroup: string;
  dragToReorder: string;
  selectValue: string;
  enterValue: string;
  unavailable: string;
  and: string;
  or: string;
  operatorContains: string;
  operatorIs: string;
  operatorIsNot: string;
  operatorEquals: string;
  operatorNotEquals: string;
  operatorGreaterThan: string;
  operatorLessThan: string;
  operatorGreaterThanOrEqual: string;
  operatorLessThanOrEqual: string;
  operatorBefore: string;
  operatorAfter: string;
  removeGroupLabel: (group: number) => string;
  addConditionLabel: (logic: string, group: number) => string;
  unavailableOperatorOption: (operator: string) => string;
  missingFieldReason: (field: string) => string;
  disabledFieldReason: (field: string) => string;
  missingOperatorReason: (operator: string, field: string) => string;
  missingValueReason: (value: string, field: string) => string;
  fieldControlLabel: (group: number, condition: number) => string;
  operatorControlLabel: (group: number, condition: number) => string;
  valueControlLabel: (group: number, condition: number) => string;
  removeConditionLabel: (condition: number) => string;
  addLogicConditionLabel: (logic: string) => string;
  unavailableFieldOption: (field: string) => string;
  disabledFieldOption: (field: string, reason: string) => string;
  unavailableValueOption: (value: string) => string;
  groupConnectorLabel: (leftGroup: number, rightGroup: number) => string;
  unavailableFieldPreview: (field: string) => string;
  unavailableValuePreview: (value: string) => string;
  saveNameRequired: string;
  filterSaved: (name: string) => string;
  groupLimitReached: (limit: number) => string;
  conditionsPerGroupLimitReached: (limit: number) => string;
  totalConditionsLimitReached: (limit: number) => string;
  structureExceedsLimits: (reasons: string[]) => string;
}

export interface FilterBuilderConfig {
  fields: FilterBuilderFieldDefinition[];
  onApply?: (structure: FilterStructure) => void;
  onClear?: () => void;
  onChange?: (structure: FilterStructure) => void;
  notifier?: ToastNotifier;
  mode?: FilterBuilderMode;
  host?: FilterBuilderElementTarget;
  toggleButton?: FilterBuilderElementTarget;
  overlay?: FilterBuilderElementTarget;
  previewElement?: FilterBuilderElementTarget;
  initialStructure?: FilterStructure;
  chrome?: boolean | FilterBuilderChromeConfig;
  actions?: boolean | FilterBuilderActionsConfig;
  messages?: Partial<FilterBuilderMessages>;
  limits?: FilterBuilderLimitsConfig;
  restoreFromURL?: boolean;
}

interface ResolvedChromeConfig {
  header: boolean;
  title: string;
  savedFilters: boolean;
  sqlPreview: boolean;
}

interface ResolvedActionsConfig {
  apply: boolean;
  clear: boolean;
  save: boolean;
}

interface ResolvedLimitsConfig {
  maxGroups: number;
  maxConditionsPerGroup: number;
  maxTotalConditions: number;
}

interface FilterBuilderPreviewPart {
  groupIndex: number;
  text: string;
}

const DEFAULT_MESSAGES: FilterBuilderMessages = {
  filtersTitle: 'Filters',
  savedFilters: 'Saved filters',
  editAsSQL: 'Edit as SQL',
  previewLabel: 'Preview:',
  noFiltersApplied: 'No filters applied',
  filterName: 'Filter name',
  filterNamePlaceholder: 'Type a name here',
  saveFilter: 'Save filter',
  clearAll: 'Clear all',
  applyFilter: 'Apply filter',
  addFilterGroup: 'Add filter group',
  removeGroup: 'Remove group',
  dragToReorder: 'Drag to reorder',
  selectValue: 'Select...',
  enterValue: 'Enter value...',
  unavailable: 'Unavailable',
  and: 'AND',
  or: 'OR',
  operatorContains: 'contains',
  operatorIs: 'is',
  operatorIsNot: 'is not',
  operatorEquals: 'equals',
  operatorNotEquals: 'not equals',
  operatorGreaterThan: 'greater than',
  operatorLessThan: 'less than',
  operatorGreaterThanOrEqual: 'greater than or equal',
  operatorLessThanOrEqual: 'less than or equal',
  operatorBefore: 'before',
  operatorAfter: 'after',
  removeGroupLabel: group => `Remove filter group ${group}`,
  addConditionLabel: (logic, group) => `Add ${logic} condition to group ${group}`,
  unavailableOperatorOption: operator => `Unavailable operator: ${operator}`,
  missingFieldReason: field => `Field "${field}" is no longer available. Select a supported field to repair this condition.`,
  disabledFieldReason: field => `Field "${field}" is unavailable.`,
  missingOperatorReason: (operator, field) => `Operator "${operator}" is not available for ${field}. Select a supported operator.`,
  missingValueReason: (value, field) => `Value "${value}" is no longer available for ${field}. Select a supported value.`,
  fieldControlLabel: (group, condition) => `Group ${group} filter ${condition} field`,
  operatorControlLabel: (group, condition) => `Group ${group} filter ${condition} operator`,
  valueControlLabel: (group, condition) => `Group ${group} filter ${condition} value`,
  removeConditionLabel: condition => `Remove filter ${condition}`,
  addLogicConditionLabel: logic => `Add ${logic} condition`,
  unavailableFieldOption: field => `Unavailable field: ${field}`,
  disabledFieldOption: (field, reason) => `${field} — ${reason}`,
  unavailableValueOption: value => `Unavailable value: ${value}`,
  groupConnectorLabel: (leftGroup, rightGroup) => `Logic between filter groups ${leftGroup} and ${rightGroup}`,
  unavailableFieldPreview: field => `Unavailable field (${field})`,
  unavailableValuePreview: value => `Unavailable value (${value})`,
  saveNameRequired: 'Please enter a name for the filter',
  filterSaved: name => `Filter "${name}" saved!`,
  groupLimitReached: limit => `The maximum of ${limit} filter groups has been reached.`,
  conditionsPerGroupLimitReached: limit => `The maximum of ${limit} conditions in this group has been reached.`,
  totalConditionsLimitReached: limit => `The maximum of ${limit} total conditions has been reached.`,
  structureExceedsLimits: reasons => `This filter exceeds the editing limits: ${reasons.join(' ')}`,
};

let nextInstanceID = 0;

function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneStructure(structure: FilterStructure): FilterStructure {
  return {
    groups: structure.groups.map(group => ({
      logic: group.logic,
      conditions: group.conditions.map(condition => ({
        field: condition.field,
        operator: condition.operator,
        value: cloneValue(condition.value),
      })),
    })),
    groupLogic: [...structure.groupLogic],
  };
}

function resolveTarget(target: FilterBuilderElementTarget | undefined): HTMLElement | null {
  if (!target) return null;
  if (typeof target !== 'string') return target;
  return document.querySelector<HTMLElement>(target);
}

export class FilterBuilder {
  private readonly config: FilterBuilderConfig;
  private readonly mode: FilterBuilderMode;
  private readonly chrome: ResolvedChromeConfig;
  private readonly actions: ResolvedActionsConfig;
  private readonly messages: FilterBuilderMessages;
  private readonly limits: ResolvedLimitsConfig;
  private readonly instanceID: string;
  private readonly notifier: ToastNotifier;
  private readonly cleanupListeners: Array<() => void> = [];
  private structure: FilterStructure;
  private panel: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private previewElement: HTMLElement | null = null;
  private sqlPreviewElement: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private appliedPreviewContainer: HTMLElement | null = null;
  private ownsPanelID = false;
  private previousPanelInstance: string | null = null;
  private previousToggleAriaControls: string | null = null;
  private previousToggleAriaExpanded: string | null = null;
  private destroyed = false;

  constructor(config: FilterBuilderConfig) {
    if (!Array.isArray(config.fields) || config.fields.length === 0) {
      throw new Error('[FilterBuilder] At least one field is required');
    }

    this.config = config;
    this.mode = config.mode ?? 'overlay';
    this.messages = { ...DEFAULT_MESSAGES, ...config.messages };
    this.limits = this.resolveLimits(config.limits);
    this.chrome = this.resolveChrome(config.chrome);
    this.actions = this.resolveActions(config.actions);
    this.instanceID = `filter-builder-${++nextInstanceID}`;
    this.notifier = config.notifier || new FallbackNotifier();
    this.structure = config.initialStructure
      ? this.normalizeStructure(config.initialStructure)
      : this.createDefaultStructure();
    this.init();
  }

  private resolveChrome(input: FilterBuilderConfig['chrome']): ResolvedChromeConfig {
    const defaults: ResolvedChromeConfig = this.mode === 'overlay'
      ? { header: true, title: this.messages.filtersTitle, savedFilters: true, sqlPreview: true }
      : { header: false, title: this.messages.filtersTitle, savedFilters: false, sqlPreview: false };
    if (input === undefined) return defaults;
    if (typeof input === 'boolean') {
      return { header: input, title: defaults.title, savedFilters: input, sqlPreview: input };
    }
    return { ...defaults, ...input };
  }

  private resolveActions(input: FilterBuilderConfig['actions']): ResolvedActionsConfig {
    const defaults: ResolvedActionsConfig = this.mode === 'overlay'
      ? { apply: true, clear: true, save: true }
      : { apply: false, clear: false, save: false };
    if (input === undefined) return defaults;
    if (typeof input === 'boolean') return { apply: input, clear: input, save: input };
    return { ...defaults, ...input };
  }

  private resolveLimits(input: FilterBuilderLimitsConfig | undefined): ResolvedLimitsConfig {
    const resolve = (value: number | undefined, name: string): number => {
      if (value === undefined) return Number.POSITIVE_INFINITY;
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`[FilterBuilder] ${name} must be a positive integer`);
      }
      return value;
    };
    return {
      maxGroups: resolve(input?.maxGroups, 'maxGroups'),
      maxConditionsPerGroup: resolve(input?.maxConditionsPerGroup, 'maxConditionsPerGroup'),
      maxTotalConditions: resolve(input?.maxTotalConditions, 'maxTotalConditions'),
    };
  }

  private init(): void {
    this.previewElement = resolveTarget(this.config.previewElement);
    if (this.mode === 'compact') {
      this.panel = resolveTarget(this.config.host);
      if (!this.panel) {
        throw new Error('[FilterBuilder] Compact mode requires a valid host');
      }
    } else {
      this.panel = resolveTarget(this.config.host) || document.getElementById('filter-panel');
      if (!this.panel) {
        console.error('[FilterBuilder] Panel element not found');
        return;
      }
      this.toggleButton = resolveTarget(this.config.toggleButton) || document.getElementById('filter-toggle-btn');
      this.overlay = resolveTarget(this.config.overlay) || document.getElementById('filter-overlay');
      this.previewElement ||= document.getElementById('filter-preview-text');
      this.appliedPreviewContainer = document.getElementById('applied-filter-preview');
    }

    if (Array.from(this.panel.children).some(child => child.hasAttribute('data-filter-builder-root'))) {
      throw new Error('[FilterBuilder] Host already contains a mounted FilterBuilder');
    }

    this.previousPanelInstance = this.panel.getAttribute('data-filter-builder-instance');
    this.panel.dataset.filterBuilderInstance = this.instanceID;
    if (this.mode === 'overlay' && !this.panel.id) {
      this.panel.id = this.instanceID;
      this.ownsPanelID = true;
    }
    if (this.toggleButton) {
      this.previousToggleAriaControls = this.toggleButton.getAttribute('aria-controls');
      this.previousToggleAriaExpanded = this.toggleButton.getAttribute('aria-expanded');
    }
    this.buildPanelStructure();
    this.bindOwnedListeners();

    if (this.mode === 'overlay' && !this.config.initialStructure && (this.config.restoreFromURL ?? true)) {
      this.restoreFromURL();
    }
  }

  private buildPanelStructure(): void {
    if (!this.panel) return;

    this.root = document.createElement('div');
    this.root.dataset.filterBuilderRoot = this.instanceID;
    this.panel.appendChild(this.root);

    const header = this.chrome.header ? `
      <div class="flex items-center justify-between mb-4" data-filter-builder-header>
        <h3 id="${this.instanceID}-title" class="text-base font-semibold text-gray-900">${escapeHTML(this.chrome.title)}</h3>
        ${this.chrome.savedFilters ? `
          <div class="flex gap-2">
            <button type="button" data-filter-builder-saved-menu class="text-sm text-blue-600 hover:text-blue-800">
              ${escapeHTML(this.messages.savedFilters)} ▾
            </button>
            <button type="button" data-filter-builder-edit-sql class="text-sm text-blue-600 hover:text-blue-800">
              ${escapeHTML(this.messages.editAsSQL)}
            </button>
          </div>
        ` : ''}
      </div>
    ` : '';

    const sqlPreview = this.chrome.sqlPreview ? `
      <div class="border-t border-gray-200 pt-3 mb-4" data-filter-builder-preview-region>
        <div class="text-xs text-gray-500 mb-1">${escapeHTML(this.messages.previewLabel)}</div>
        <div data-filter-builder-sql-preview aria-live="polite" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          ${escapeHTML(this.messages.noFiltersApplied)}
        </div>
      </div>
    ` : '';

    const hasActions = this.actions.apply || this.actions.clear || this.actions.save;
    const actionFooter = hasActions ? `
      <div class="flex items-center justify-between border-t border-gray-200 pt-4" data-filter-builder-actions>
        <div class="flex gap-2">
          ${this.actions.save ? `
            <label class="sr-only" for="${this.instanceID}-save-name">${escapeHTML(this.messages.filterName)}</label>
            <input type="text" id="${this.instanceID}-save-name" data-filter-builder-save-name placeholder="${escapeHTML(this.messages.filterNamePlaceholder)}" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
            <button type="button" data-filter-builder-action="save" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
              ${escapeHTML(this.messages.saveFilter)}
            </button>
          ` : ''}
        </div>
        <div class="flex gap-2">
          ${this.actions.clear ? `
            <button type="button" data-filter-builder-action="clear" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
              ${escapeHTML(this.messages.clearAll)}
            </button>
          ` : ''}
          ${this.actions.apply ? `
            <button type="button" data-filter-builder-action="apply" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
              ${escapeHTML(this.messages.applyFilter)}
            </button>
          ` : ''}
        </div>
      </div>
    ` : '';

    this.root.innerHTML = `
      ${header}
      <div data-filter-builder-groups class="space-y-3 mb-4"></div>
      <p data-filter-builder-limit-status class="hidden mb-3 text-xs text-amber-700" role="status" aria-live="polite"></p>
      <button type="button" data-filter-builder-action="add-group" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 mb-4" aria-label="${escapeHTML(this.messages.addFilterGroup)}">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        ${escapeHTML(this.messages.and)}
      </button>
      ${sqlPreview}
      ${actionFooter}
    `;

    this.container = this.root.querySelector<HTMLElement>('[data-filter-builder-groups]');
    this.sqlPreviewElement = this.root.querySelector<HTMLElement>('[data-filter-builder-sql-preview]');
    this.render();
  }

  private bindOwnedListeners(): void {
    if (!this.root) return;

    this.listen(this.root, 'click', event => this.handleClick(event));
    this.listen(this.root, 'change', event => this.handleChange(event));
    this.listen(this.root, 'input', event => this.handleInput(event));

    if (this.mode !== 'overlay') return;

    if (this.toggleButton) {
      this.listen(this.toggleButton, 'click', () => this.toggle());
    }
    const clearButton = document.getElementById('clear-filters-btn');
    if (clearButton) {
      this.listen(clearButton, 'click', () => this.clearFilters());
    }
    if (this.overlay) {
      this.listen(this.overlay, 'click', () => this.close(true));
    }
    this.listen(document, 'keydown', event => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.key === 'Escape' && this.panel && !this.panel.classList.contains('hidden')) {
        this.close(true);
      }
    });
  }

  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.cleanupListeners.push(() => target.removeEventListener(type, listener));
  }

  private handleClick(event: Event): void {
    if (this.destroyed) return;
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest<HTMLElement>('[data-filter-builder-action]');
    if (!actionElement || !this.root?.contains(actionElement)) return;

    const action = actionElement.dataset.filterBuilderAction;
    switch (action) {
      case 'add-group':
        this.addGroup();
        return;
      case 'remove-group':
        this.removeGroup(Number(actionElement.dataset.groupIndex));
        return;
      case 'add-condition':
        this.addCondition(Number(actionElement.dataset.groupIndex));
        return;
      case 'add-condition-and':
        this.setGroupLogicAndAddCondition(Number(actionElement.dataset.groupIndex), 'and');
        return;
      case 'add-condition-or':
        this.setGroupLogicAndAddCondition(Number(actionElement.dataset.groupIndex), 'or');
        return;
      case 'remove-condition':
        this.removeCondition(Number(actionElement.dataset.groupIndex), Number(actionElement.dataset.conditionIndex));
        return;
      case 'group-logic':
        this.setGroupConnector(Number(actionElement.dataset.groupIndex), actionElement.dataset.logicValue as 'and' | 'or');
        return;
      case 'apply':
        this.applyFilters();
        return;
      case 'clear':
        this.clearAll(true);
        return;
      case 'save':
        this.saveFilter();
    }
  }

  private handleChange(event: Event): void {
    if (this.destroyed) return;
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input?.dataset.filterBuilderPart) return;

    const groupIndex = Number(input.dataset.groupIndex);
    const conditionIndex = Number(input.dataset.conditionIndex);
    const condition = this.structure.groups[groupIndex]?.conditions[conditionIndex];
    if (!condition) return;

    switch (input.dataset.filterBuilderPart) {
      case 'field': {
        const field = this.getField(input.value);
        if (!field || field.disabled) return;
        condition.field = input.value;
        condition.operator = this.getOperatorsForField(field)[0]?.value ?? 'eq';
        condition.value = '';
        this.render();
        this.focusConditionPart(groupIndex, conditionIndex, 'operator');
        this.emitChange();
        return;
      }
      case 'operator': {
        const field = this.getField(condition.field);
        if (!field || field.disabled) {
          return;
        }
        const operators = this.getOperatorsForField(field);
        if (!operators.some(operator => operator.value === input.value)) return;
        const previousOperatorAvailable = operators.some(operator => operator.value === condition.operator);
        condition.operator = input.value;
        if (previousOperatorAvailable) this.updatePreview();
        else {
          this.render();
          this.focusConditionPart(groupIndex, conditionIndex, 'value');
        }
        this.emitChange();
        return;
      }
      case 'value':
        if (input.tagName === 'INPUT') return;
        {
          const field = this.getField(condition.field);
          if (!field || field.disabled || !this.getOperatorsForField(field).some(operator => operator.value === condition.operator)) {
            return;
          }
          const previousValueAvailable = this.isValueAvailable(field, condition.value);
          condition.value = input.value;
          if (!previousValueAvailable) {
            this.render();
            this.focusConditionPart(groupIndex, conditionIndex, 'value');
          } else {
            this.updatePreview();
          }
          this.emitChange();
          return;
        }
    }
  }

  private handleInput(event: Event): void {
    if (this.destroyed) return;
    const input = event.target as HTMLInputElement | null;
    if (input?.dataset.filterBuilderPart !== 'value' || input.tagName === 'SELECT') return;

    const groupIndex = Number(input.dataset.groupIndex);
    const conditionIndex = Number(input.dataset.conditionIndex);
    const condition = this.structure.groups[groupIndex]?.conditions[conditionIndex];
    if (!condition) return;
    const field = this.getField(condition.field);
    if (!field || field.disabled || !this.getOperatorsForField(field).some(operator => operator.value === condition.operator)) {
      return;
    }
    condition.value = input.value;
    this.updatePreview();
    this.emitChange();
  }

  private createDefaultStructure(): FilterStructure {
    return {
      groups: [{ conditions: [this.createEmptyCondition()], logic: 'or' }],
      groupLogic: [],
    };
  }

  private normalizeStructure(structure: FilterStructure): FilterStructure {
    const cloned = cloneStructure(structure);
    cloned.groups = cloned.groups.filter(group => Array.isArray(group.conditions) && group.conditions.length > 0);
    cloned.groups.forEach(group => {
      group.logic = group.logic === 'and' ? 'and' : 'or';
    });
    cloned.groupLogic = cloned.groupLogic
      .slice(0, Math.max(0, cloned.groups.length - 1))
      .map(logic => logic === 'or' ? 'or' : 'and');
    while (cloned.groupLogic.length < Math.max(0, cloned.groups.length - 1)) {
      cloned.groupLogic.push('and');
    }
    return cloned.groups.length > 0 ? cloned : this.createDefaultStructure();
  }

  private createEmptyCondition(): FilterCondition {
    const firstField = this.config.fields.find(field => !field.disabled) || this.config.fields[0];
    return {
      field: firstField.name,
      operator: this.getOperatorsForField(firstField)[0]?.value ?? 'eq',
      value: '',
    };
  }

  private totalConditions(): number {
    return this.structure.groups.reduce((total, group) => total + group.conditions.length, 0);
  }

  private addGroupLimitReason(): string {
    if (this.structure.groups.length >= this.limits.maxGroups) {
      return this.messages.groupLimitReached(this.limits.maxGroups);
    }
    if (this.totalConditions() >= this.limits.maxTotalConditions) {
      return this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions);
    }
    return '';
  }

  private addConditionLimitReason(groupIndex: number): string {
    const group = this.structure.groups[groupIndex];
    if (!group) return '';
    if (group.conditions.length >= this.limits.maxConditionsPerGroup) {
      return this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup);
    }
    if (this.totalConditions() >= this.limits.maxTotalConditions) {
      return this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions);
    }
    return '';
  }

  private structureLimitReasons(): string[] {
    const reasons: string[] = [];
    if (this.structure.groups.length > this.limits.maxGroups) {
      reasons.push(this.messages.groupLimitReached(this.limits.maxGroups));
    }
    if (this.structure.groups.some(group => group.conditions.length > this.limits.maxConditionsPerGroup)) {
      reasons.push(this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup));
    }
    if (this.totalConditions() > this.limits.maxTotalConditions) {
      reasons.push(this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions));
    }
    return reasons;
  }

  private updateLimitState(): void {
    if (!this.root) return;
    const status = this.root.querySelector<HTMLElement>('[data-filter-builder-limit-status]');
    const reasons = this.structureLimitReasons();
    if (status) {
      status.textContent = reasons.length > 0 ? this.messages.structureExceedsLimits(reasons) : '';
      status.classList.toggle('hidden', reasons.length === 0);
    }

    const addGroup = this.root.querySelector<HTMLButtonElement>('[data-filter-builder-action="add-group"]');
    const reason = this.addGroupLimitReason();
    if (addGroup) {
      addGroup.disabled = reason !== '';
      if (reason) addGroup.title = reason;
      else addGroup.removeAttribute('title');
    }
  }

  private render(): void {
    if (!this.container || this.destroyed) return;
    this.container.innerHTML = this.structure.groups.map((group, groupIndex) => {
      const connector = groupIndex < this.structure.groups.length - 1
        ? this.renderGroupConnector(groupIndex)
        : '';
      return `${this.renderGroup(group, groupIndex)}${connector}`;
    }).join('');
    this.updateLimitState();
    this.updatePreview();
  }

  private renderGroup(group: FilterGroup, groupIndex: number): string {
    const addLimitReason = this.addConditionLimitReason(groupIndex);
    const addDisabled = addLimitReason ? ` disabled title="${escapeHTML(addLimitReason)}"` : '';
    const logicLabel = group.logic === 'and' ? this.messages.and : this.messages.or;
    const conditions = group.conditions.map((condition, conditionIndex) => {
      const connector = conditionIndex < group.conditions.length - 1
        ? `<div class="flex items-center justify-center my-1" aria-hidden="true">
            <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">${escapeHTML(logicLabel)}</span>
          </div>`
        : '';
      return `${this.renderCondition(condition, groupIndex, conditionIndex)}${connector}`;
    }).join('');

    return `
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50" data-filter-builder-group="${groupIndex}">
        <div class="flex justify-end mb-2">
          <button type="button" data-filter-builder-action="remove-group" data-group-index="${groupIndex}" class="text-xs text-red-600 hover:text-red-800" aria-label="${escapeHTML(this.messages.removeGroupLabel(groupIndex + 1))}">
            ${escapeHTML(this.messages.removeGroup)}
          </button>
        </div>
        ${conditions}
        <button type="button" data-filter-builder-action="add-condition" data-group-index="${groupIndex}" class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${escapeHTML(this.messages.addConditionLabel(logicLabel, groupIndex + 1))}"${addDisabled}>
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          ${escapeHTML(logicLabel)}
        </button>
      </div>
    `;
  }

  private renderCondition(condition: FilterCondition, groupIndex: number, conditionIndex: number): string {
    const field = this.getField(condition.field);
    const sequence = conditionIndex + 1;
    const fieldOptions = this.renderFieldOptions(condition.field);
    const availableOperators = field ? this.getOperatorsForField(field) : [];
    const operatorAvailable = availableOperators.some(operator => operator.value === condition.operator);
    const operatorOptions = `${operatorAvailable ? '' : `
      <option value="${escapeHTML(condition.operator)}" selected disabled>
        ${escapeHTML(this.messages.unavailableOperatorOption(condition.operator))}
      </option>
    `}${availableOperators.map(operator => `
      <option value="${escapeHTML(operator.value)}" ${operator.value === condition.operator ? 'selected' : ''}>${escapeHTML(operator.label)}</option>
    `).join('')}`;
    const fieldReason = !field
      ? this.messages.missingFieldReason(condition.field)
      : field.disabled
        ? field.disabledReason || this.messages.disabledFieldReason(field.label)
        : '';
    const operatorReason = field && !operatorAvailable
      ? this.messages.missingOperatorReason(condition.operator, field.label)
      : '';
    const valueAvailable = field ? this.isValueAvailable(field, condition.value) : true;
    const valueReason = field && operatorAvailable && !field.disabled && !valueAvailable
      ? this.messages.missingValueReason(String(condition.value), field.label)
      : '';
    const availabilityReason = fieldReason || operatorReason || valueReason;
    const statusID = `${this.instanceID}-group-${groupIndex + 1}-condition-${conditionIndex + 1}-status`;
    const describedBy = availabilityReason ? ` aria-describedby="${statusID}"` : '';
    const valueField: FilterBuilderFieldDefinition = field || {
      name: condition.field,
      label: condition.field,
      type: 'text',
    };
    const valueDisabled = !field || field.disabled || !operatorAvailable;

    return `
      <div class="flex flex-wrap items-center gap-2 mb-2" data-filter-builder-condition="${groupIndex}-${conditionIndex}">
        <div class="flex items-center text-gray-400 cursor-move" title="${escapeHTML(this.messages.dragToReorder)}" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <select data-filter-builder-part="field" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}" aria-label="${escapeHTML(this.messages.fieldControlLabel(groupIndex + 1, sequence))}"${describedBy} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
          ${fieldOptions}
        </select>
        <select data-filter-builder-part="operator" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}" aria-label="${escapeHTML(this.messages.operatorControlLabel(groupIndex + 1, sequence))}"${describedBy} ${!field || field.disabled ? 'disabled' : ''} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
          ${operatorOptions}
        </select>
        ${this.renderValueInput(valueField, condition, groupIndex, conditionIndex, sequence, valueDisabled, describedBy)}
        <button type="button" data-filter-builder-action="remove-condition" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}" class="text-red-600 hover:text-red-800" aria-label="${escapeHTML(this.messages.removeConditionLabel(sequence))}">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button type="button" data-filter-builder-action="add-condition-or" data-group-index="${groupIndex}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${escapeHTML(this.messages.addLogicConditionLabel(this.messages.or))}"${this.addConditionLimitReason(groupIndex) ? ` disabled title="${escapeHTML(this.addConditionLimitReason(groupIndex))}"` : ''}>
          ${escapeHTML(this.messages.or)}
        </button>
        <button type="button" data-filter-builder-action="add-condition-and" data-group-index="${groupIndex}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${escapeHTML(this.messages.addLogicConditionLabel(this.messages.and))}"${this.addConditionLimitReason(groupIndex) ? ` disabled title="${escapeHTML(this.addConditionLimitReason(groupIndex))}"` : ''}>
          ${escapeHTML(this.messages.and)}
        </button>
        ${availabilityReason ? `
          <p id="${statusID}" data-filter-builder-field-status class="w-full text-xs text-amber-700" role="note">
            ${escapeHTML(availabilityReason)}
          </p>
        ` : ''}
      </div>
    `;
  }

  private renderFieldOptions(selectedField: string): string {
    let activeGroup = '';
    let html = '';
    if (!this.getField(selectedField)) {
      html += `
        <option value="${escapeHTML(selectedField)}" selected disabled>
          ${escapeHTML(this.messages.unavailableFieldOption(selectedField))}
        </option>
      `;
    }
    for (const field of this.config.fields) {
      const nextGroup = field.group?.trim() || '';
      if (nextGroup !== activeGroup) {
        if (activeGroup) html += '</optgroup>';
        if (nextGroup) html += `<optgroup label="${escapeHTML(nextGroup)}">`;
        activeGroup = nextGroup;
      }
      const optionLabel = field.disabled
        ? this.messages.disabledFieldOption(field.label, field.disabledReason || this.messages.unavailable)
        : field.label;
      html += `
        <option value="${escapeHTML(field.name)}" ${field.name === selectedField ? 'selected' : ''} ${field.disabled ? 'disabled' : ''}>
          ${escapeHTML(optionLabel)}
        </option>
      `;
    }
    if (activeGroup) html += '</optgroup>';
    return html;
  }

  private renderValueInput(
    field: FilterBuilderFieldDefinition,
    condition: FilterCondition,
    groupIndex: number,
    conditionIndex: number,
    sequence: number,
    disabled: boolean,
    describedBy: string,
  ): string {
    const common = `data-filter-builder-part="value" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}" aria-label="${escapeHTML(this.messages.valueControlLabel(groupIndex + 1, sequence))}"${describedBy} ${disabled ? 'disabled' : ''}`;
    if (field.type === 'select') {
      const valueAvailable = this.isValueAvailable(field, condition.value);
      const unavailableOption = valueAvailable ? '' : `
        <option value="${escapeHTML(condition.value)}" selected disabled>${escapeHTML(this.messages.unavailableValueOption(String(condition.value)))}</option>
      `;
      const options = (field.options || []).map(option => `
        <option value="${escapeHTML(option.value)}" ${String(option.value) === String(condition.value) ? 'selected' : ''}>${escapeHTML(option.label)}</option>
      `).join('');
      return `
        <select ${common} class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">${escapeHTML(this.messages.selectValue)}</option>
          ${unavailableOption}
          ${options}
        </select>
      `;
    }

    const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';
    return `
      <input type="${inputType}" ${common} value="${escapeHTML(condition.value)}" placeholder="${escapeHTML(this.messages.enterValue)}" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }

  private isValueAvailable(field: FilterBuilderFieldDefinition, value: unknown): boolean {
    if (field.type !== 'select' || value === '' || value === null || value === undefined) return true;
    return (field.options || []).some(option => String(option.value) === String(value));
  }

  private renderGroupConnector(groupIndex: number): string {
    const logic = this.structure.groupLogic[groupIndex] || 'and';
    return `
      <div class="flex items-center justify-center py-2" role="group" aria-label="${escapeHTML(this.messages.groupConnectorLabel(groupIndex + 1, groupIndex + 2))}">
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${groupIndex}" data-logic-value="and" aria-pressed="${logic === 'and'}" class="px-3 py-1 text-xs font-medium rounded-l border ${logic === 'and' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
          ${escapeHTML(this.messages.and)}
        </button>
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${groupIndex}" data-logic-value="or" aria-pressed="${logic === 'or'}" class="px-3 py-1 text-xs font-medium rounded-r border ${logic === 'or' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
          ${escapeHTML(this.messages.or)}
        </button>
      </div>
    `;
  }

  private addGroup(): void {
    if (this.addGroupLimitReason()) return;
    this.structure.groups.push({ conditions: [this.createEmptyCondition()], logic: 'or' });
    if (this.structure.groups.length > 1) this.structure.groupLogic.push('and');
    this.render();
    this.focusConditionPart(this.structure.groups.length - 1, 0, 'field');
    this.emitChange();
  }

  private addCondition(groupIndex: number): void {
    const group = this.structure.groups[groupIndex];
    if (!group || this.addConditionLimitReason(groupIndex)) return;
    group.conditions.push(this.createEmptyCondition());
    this.render();
    this.focusConditionPart(groupIndex, group.conditions.length - 1, 'field');
    this.emitChange();
  }

  private setGroupLogicAndAddCondition(groupIndex: number, logic: 'and' | 'or'): void {
    const group = this.structure.groups[groupIndex];
    if (!group || this.addConditionLimitReason(groupIndex)) return;
    group.logic = logic;
    group.conditions.push(this.createEmptyCondition());
    this.render();
    this.focusConditionPart(groupIndex, group.conditions.length - 1, 'field');
    this.emitChange();
  }

  private removeCondition(groupIndex: number, conditionIndex: number): void {
    const group = this.structure.groups[groupIndex];
    if (!group) return;
    group.conditions.splice(conditionIndex, 1);
    if (group.conditions.length === 0) {
      this.removeGroup(groupIndex);
      return;
    }
    this.render();
    this.focusConditionPart(groupIndex, Math.min(conditionIndex, group.conditions.length - 1), 'field');
    this.emitChange();
  }

  private removeGroup(groupIndex: number): void {
    if (!this.structure.groups[groupIndex]) return;
    this.structure.groups.splice(groupIndex, 1);
    if (groupIndex < this.structure.groupLogic.length) {
      this.structure.groupLogic.splice(groupIndex, 1);
    } else if (groupIndex > 0) {
      this.structure.groupLogic.splice(groupIndex - 1, 1);
    }
    if (this.structure.groups.length === 0) this.structure = this.createDefaultStructure();
    this.render();
    this.focusConditionPart(Math.min(groupIndex, this.structure.groups.length - 1), 0, 'field');
    this.emitChange();
  }

  private setGroupConnector(groupIndex: number, logic: 'and' | 'or'): void {
    if ((logic !== 'and' && logic !== 'or') || !this.structure.groupLogic[groupIndex]) return;
    this.structure.groupLogic[groupIndex] = logic;
    this.render();
    this.root?.querySelector<HTMLElement>(
      `[data-filter-builder-action="group-logic"][data-group-index="${groupIndex}"][data-logic-value="${logic}"]`,
    )?.focus();
    this.emitChange();
  }

  private focusConditionPart(groupIndex: number, conditionIndex: number, part: 'field' | 'operator' | 'value'): void {
    this.root?.querySelector<HTMLElement>(
      `[data-filter-builder-part="${part}"][data-group-index="${groupIndex}"][data-condition-index="${conditionIndex}"]`,
    )?.focus();
  }

  private getField(name: string): FilterBuilderFieldDefinition | undefined {
    return this.config.fields.find(field => field.name === name);
  }

  private getOperatorsForField(field: FilterBuilderFieldDefinition): FilterBuilderOperatorOption[] {
    if (field.operators && field.operators.length > 0) {
      return field.operators.map(operator => typeof operator === 'string'
        ? { label: operator, value: operator }
        : operator);
    }
    const defaults: Record<string, FilterBuilderOperatorOption[]> = {
      text: [
        { label: this.messages.operatorContains, value: 'ilike' },
        { label: this.messages.operatorIs, value: 'eq' },
        { label: this.messages.operatorIsNot, value: 'ne' },
      ],
      number: [
        { label: this.messages.operatorEquals, value: 'eq' },
        { label: this.messages.operatorNotEquals, value: 'ne' },
        { label: this.messages.operatorGreaterThan, value: 'gt' },
        { label: this.messages.operatorLessThan, value: 'lt' },
        { label: this.messages.operatorGreaterThanOrEqual, value: 'gte' },
        { label: this.messages.operatorLessThanOrEqual, value: 'lte' },
      ],
      date: [
        { label: this.messages.operatorIs, value: 'eq' },
        { label: this.messages.operatorBefore, value: 'lt' },
        { label: this.messages.operatorAfter, value: 'gt' },
      ],
      select: [
        { label: this.messages.operatorIs, value: 'eq' },
        { label: this.messages.operatorIsNot, value: 'ne' },
      ],
    };
    return defaults[field.type] || defaults.text;
  }

  private updatePreview(): void {
    const sqlPreview = this.generateSQLPreview();
    const textPreview = this.generateTextPreview();
    if (this.sqlPreviewElement) this.sqlPreviewElement.textContent = sqlPreview || this.messages.noFiltersApplied;
    if (this.previewElement) this.previewElement.textContent = textPreview;
    if (this.appliedPreviewContainer) {
      this.appliedPreviewContainer.classList.toggle('hidden', !this.hasActiveFilters());
    }
  }

  private hasActiveFilters(): boolean {
    return this.structure.groups.some(group => group.conditions.some(condition =>
      condition.value !== '' && condition.value !== null && condition.value !== undefined));
  }

  private generateSQLPreview(): string {
    const groupParts = this.structure.groups.map((group, groupIndex): FilterBuilderPreviewPart | null => {
      const conditionParts = group.conditions
        .filter(condition => condition.value !== '' && condition.value !== null && condition.value !== undefined)
        .map(condition => {
          const operator = condition.operator.toUpperCase();
          const value = typeof condition.value === 'string' ? `'${condition.value}'` : condition.value;
          return `${condition.field} ${operator === 'ILIKE' ? 'ILIKE' : operator === 'EQ' ? '=' : operator} ${value}`;
        });
      if (conditionParts.length === 0) return null;
      const text = conditionParts.length === 1
        ? conditionParts[0]
        : `( ${conditionParts.join(` ${group.logic.toUpperCase()} `)} )`;
      return { groupIndex, text };
    }).filter((part): part is FilterBuilderPreviewPart => part !== null);
    return this.joinGroups(groupParts);
  }

  private generateTextPreview(): string {
    const groupParts = this.structure.groups.map((group, groupIndex): FilterBuilderPreviewPart | null => {
      const conditionParts = group.conditions
        .filter(condition => condition.value !== '' && condition.value !== null && condition.value !== undefined)
        .map(condition => {
          const field = this.getField(condition.field);
          const operator = field
            ? this.getOperatorsForField(field).find(item => item.value === condition.operator)
            : undefined;
          const fieldLabel = field?.label || this.messages.unavailableFieldPreview(condition.field);
          const valueLabel = field && !this.isValueAvailable(field, condition.value)
            ? this.messages.unavailableValuePreview(String(condition.value))
            : String(condition.value);
          return `${fieldLabel} ${operator?.label || condition.operator} "${valueLabel}"`;
        });
      if (conditionParts.length === 0) return null;
      const text = conditionParts.length === 1
        ? conditionParts[0]
        : `( ${conditionParts.join(` ${group.logic === 'and' ? this.messages.and : this.messages.or} `)} )`;
      return { groupIndex, text };
    }).filter((part): part is FilterBuilderPreviewPart => part !== null);
    return this.joinGroups(groupParts, true);
  }

  private joinGroups(parts: FilterBuilderPreviewPart[], localized = false): string {
    if (parts.length < 2) return parts[0]?.text || '';
    return parts.reduce((result, part, index) => {
      if (index === 0) return part.text;
      const connectorIndex = Math.max(0, part.groupIndex - 1);
      const logic = this.structure.groupLogic[connectorIndex] || 'and';
      const connector = localized
        ? logic === 'and' ? this.messages.and : this.messages.or
        : logic.toUpperCase();
      return `${result} ${connector} ${part.text}`;
    }, '');
  }

  private emitChange(): void {
    this.config.onChange?.(cloneStructure(this.structure));
  }

  private applyFilters(): void {
    this.config.onApply?.(cloneStructure(this.structure));
    if (this.mode === 'overlay') this.close(true);
  }

  private clearAll(notify: boolean): void {
    this.structure = this.createDefaultStructure();
    this.render();
    this.focusConditionPart(0, 0, 'field');
    if (notify) this.emitChange();
  }

  private clearFilters(): void {
    this.clearAll(true);
    this.config.onClear?.();
  }

  private saveFilter(): void {
    const nameInput = this.root?.querySelector<HTMLInputElement>('[data-filter-builder-save-name]');
    const name = nameInput?.value.trim();
    if (!name) {
      this.notifier.warning(this.messages.saveNameRequired);
      return;
    }
    const saved = this.getSavedFilters();
    saved[name] = cloneStructure(this.structure);
    localStorage.setItem('saved_filters', JSON.stringify(saved));
    this.notifier.success(this.messages.filterSaved(name));
    if (nameInput) nameInput.value = '';
  }

  private getSavedFilters(): Record<string, FilterStructure> {
    try {
      const saved = localStorage.getItem('saved_filters');
      return saved ? JSON.parse(saved) as Record<string, FilterStructure> : {};
    } catch {
      return {};
    }
  }

  private toggle(): void {
    if (this.panel?.classList.contains('hidden')) this.open();
    else this.close(true);
  }

  public open(): void {
    if (this.mode !== 'overlay' || !this.panel || !this.toggleButton || this.destroyed) return;
    const margin = 8;
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const triggerRect = this.toggleButton.getBoundingClientRect();

    this.panel.classList.remove('hidden');
    this.panel.style.visibility = 'hidden';
    const panelRect = this.panel.getBoundingClientRect();
    const availableWidth = Math.max(0, viewportWidth - margin * 2);
    const panelWidth = Math.min(panelRect.width || 800, availableWidth);
    const panelHeight = panelRect.height || this.panel.scrollHeight;
    const left = Math.min(
      Math.max(triggerRect.left, viewportLeft + margin),
      Math.max(viewportLeft + margin, viewportRight - margin - panelWidth),
    );
    const belowTop = triggerRect.bottom + margin;
    const roomBelow = viewportBottom - margin - belowTop;
    const roomAbove = triggerRect.top - margin - viewportTop;
    const top = panelHeight > roomBelow && roomAbove > roomBelow
      ? Math.max(viewportTop + margin, triggerRect.top - margin - Math.min(panelHeight, roomAbove))
      : Math.max(viewportTop + margin, belowTop);

    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
    this.panel.style.maxWidth = `${availableWidth}px`;
    this.panel.style.maxHeight = `${Math.max(0, viewportBottom - margin - top)}px`;
    this.panel.style.visibility = '';
    this.toggleButton.setAttribute('aria-expanded', 'true');
    this.toggleButton.setAttribute('aria-controls', this.panel.id || this.instanceID);
    this.overlay?.classList.remove('hidden');
    this.root?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
  }

  public close(returnFocus = false): void {
    if (this.mode !== 'overlay') return;
    this.panel?.classList.add('hidden');
    this.overlay?.classList.add('hidden');
    this.toggleButton?.setAttribute('aria-expanded', 'false');
    if (returnFocus) this.toggleButton?.focus();
  }

  private restoreFromURL(): void {
    const filtersParam = new URLSearchParams(window.location.search).get('filters');
    if (!filtersParam) return;
    try {
      const filters = JSON.parse(filtersParam);
      if (Array.isArray(filters) && filters.length > 0) {
        this.structure = this.normalizeStructure(this.convertLegacyFilters(filters));
        this.render();
      } else if (filters && Array.isArray(filters.groups) && Array.isArray(filters.groupLogic)) {
        this.structure = this.normalizeStructure(filters as FilterStructure);
        this.render();
      }
    } catch (error) {
      console.warn('[FilterBuilder] Failed to parse filters from URL:', error);
    }
  }

  private convertLegacyFilters(filters: Array<{ column: string; operator?: string; value: unknown }>): FilterStructure {
    const fieldGroups = new Map<string, Array<{ column: string; operator?: string; value: unknown }>>();
    filters.forEach(filter => {
      const group = fieldGroups.get(filter.column) || [];
      group.push(filter);
      fieldGroups.set(filter.column, group);
    });
    const groups: FilterGroup[] = [];
    fieldGroups.forEach(conditions => {
      groups.push({
        conditions: conditions.map(condition => ({
          field: condition.column,
          operator: condition.operator || 'ilike',
          value: cloneValue(condition.value),
        })),
        logic: conditions.length > 1 ? 'or' : 'and',
      });
    });
    return { groups, groupLogic: new Array(Math.max(0, groups.length - 1)).fill('and') };
  }

  public getStructure(): FilterStructure {
    return cloneStructure(this.structure);
  }

  public setStructure(structure: FilterStructure, notify = true): void {
    if (this.destroyed) return;
    this.structure = this.normalizeStructure(structure);
    this.render();
    if (notify) this.emitChange();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.close(false);
    this.destroyed = true;
    while (this.cleanupListeners.length > 0) this.cleanupListeners.pop()?.();
    this.root?.remove();
    if (this.panel) {
      if (this.previousPanelInstance === null) this.panel.removeAttribute('data-filter-builder-instance');
      else this.panel.setAttribute('data-filter-builder-instance', this.previousPanelInstance);
      if (this.ownsPanelID) this.panel.removeAttribute('id');
    }
    if (this.toggleButton) {
      if (this.previousToggleAriaControls === null) this.toggleButton.removeAttribute('aria-controls');
      else this.toggleButton.setAttribute('aria-controls', this.previousToggleAriaControls);
      if (this.previousToggleAriaExpanded === null) this.toggleButton.removeAttribute('aria-expanded');
      else this.toggleButton.setAttribute('aria-expanded', this.previousToggleAriaExpanded);
    }
    this.root = null;
    this.container = null;
    this.sqlPreviewElement = null;
    this.previewElement = null;
    this.appliedPreviewContainer = null;
    this.overlay = null;
    this.toggleButton = null;
    this.panel = null;
  }
}

/**
 * Advanced Search Component
 * Provides a query builder UI for complex search queries
 */
import { FallbackNotifier } from '../toast/toast-manager.js';
const DEFAULT_OPERATORS = {
    text: [
        { label: 'contains', value: 'ilike' },
        { label: 'equals', value: 'eq' },
        { label: 'starts with', value: 'starts' },
        { label: 'ends with', value: 'ends' },
        { label: 'not equals', value: 'ne' }
    ],
    number: [
        { label: 'equals', value: 'eq' },
        { label: 'not equals', value: 'ne' },
        { label: 'greater than', value: 'gt' },
        { label: 'less than', value: 'lt' },
        { label: 'between', value: 'between' }
    ],
    select: [
        { label: 'equals', value: 'eq' },
        { label: 'not equals', value: 'ne' }
    ],
    date: [
        { label: 'on', value: 'eq' },
        { label: 'before', value: 'lt' },
        { label: 'after', value: 'gt' },
        { label: 'between', value: 'between' }
    ]
};
export class AdvancedSearch {
    constructor(config) {
        this.criteria = [];
        this.modal = null;
        this.container = null;
        this.searchInput = null;
        this.clearBtn = null;
        this.config = config;
        this.notifier = config.notifier || new FallbackNotifier();
    }
    init() {
        this.modal = document.getElementById('advanced-search-modal');
        this.container = document.getElementById('search-criteria-container');
        this.searchInput = document.getElementById('table-search');
        this.clearBtn = document.getElementById('search-clear-btn');
        if (!this.modal || !this.container) {
            console.error('[AdvancedSearch] Required elements not found');
            return;
        }
        // Restore criteria from URL on init
        this.restoreCriteriaFromURL();
        // Re-render to show restored criteria in the modal and chips in input
        if (this.criteria.length > 0) {
            this.renderCriteria();
            this.renderChips();
        }
        this.bindEvents();
        this.bindClearButton();
    }
    /**
     * Restore advanced search criteria from URL
     */
    restoreCriteriaFromURL() {
        const params = new URLSearchParams(window.location.search);
        // Use the same 'filters' parameter as DataGrid for consistency
        const filtersParam = params.get('filters');
        if (filtersParam) {
            try {
                const filters = JSON.parse(filtersParam);
                // Convert DataGrid filters format to advanced search criteria format
                this.criteria = filters.map((f) => ({
                    field: f.column,
                    operator: f.operator || 'ilike',
                    value: f.value,
                    logic: 'and' // Default logic connector
                }));
                console.log('[AdvancedSearch] Restored criteria from URL:', this.criteria);
            }
            catch (e) {
                console.warn('[AdvancedSearch] Failed to parse filters from URL:', e);
            }
        }
    }
    /**
     * Push criteria to URL
     */
    pushCriteriaToURL() {
        const params = new URLSearchParams(window.location.search);
        if (this.criteria.length > 0) {
            params.set('advancedSearch', JSON.stringify(this.criteria));
        }
        else {
            params.delete('advancedSearch');
        }
        const newURL = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history.pushState({}, '', newURL);
        console.log('[AdvancedSearch] URL updated with criteria');
    }
    bindEvents() {
        // Open modal
        const openBtn = document.getElementById('advanced-search-btn');
        openBtn?.addEventListener('click', () => this.open());
        // Close modal
        const closeBtn = document.getElementById('advanced-search-close');
        const cancelBtn = document.getElementById('advanced-search-cancel');
        const overlay = document.getElementById('advanced-search-overlay');
        closeBtn?.addEventListener('click', () => this.close());
        cancelBtn?.addEventListener('click', () => this.close());
        overlay?.addEventListener('click', () => this.close());
        // Add criteria
        const addBtn = document.getElementById('add-criteria-btn');
        addBtn?.addEventListener('click', () => this.addCriterion());
        // Apply search
        const applyBtn = document.getElementById('advanced-search-apply');
        applyBtn?.addEventListener('click', () => this.applySearch());
        // Save/Load presets
        const saveBtn = document.getElementById('save-search-preset-btn');
        const loadBtn = document.getElementById('load-search-preset-btn');
        saveBtn?.addEventListener('click', () => this.savePreset());
        loadBtn?.addEventListener('click', () => this.loadPreset());
    }
    bindClearButton() {
        if (!this.searchInput || !this.clearBtn)
            return;
        // Show/hide clear button based on input value
        const updateClearButton = () => {
            if (this.searchInput.value.trim()) {
                this.clearBtn.classList.remove('hidden');
            }
            else {
                this.clearBtn.classList.add('hidden');
            }
        };
        this.searchInput.addEventListener('input', updateClearButton);
        // Clear search
        this.clearBtn.addEventListener('click', () => {
            if (this.searchInput) {
                this.searchInput.value = '';
                this.clearBtn.classList.add('hidden');
                // Clear advanced search criteria and chips
                this.clearAllChips();
            }
        });
        // Initial update
        updateClearButton();
    }
    open() {
        if (!this.modal)
            return;
        this.modal.classList.remove('hidden');
        // Initialize with one criterion if empty
        if (this.criteria.length === 0) {
            this.addCriterion();
        }
        else {
            this.renderCriteria();
        }
    }
    close() {
        if (!this.modal)
            return;
        this.modal.classList.add('hidden');
    }
    addCriterion(criterion) {
        const newCriterion = {
            field: criterion?.field || this.config.fields[0]?.name || '',
            operator: criterion?.operator || 'ilike',
            value: criterion?.value || '',
            logic: criterion?.logic || 'and'
        };
        this.criteria.push(newCriterion);
        this.renderCriteria();
    }
    removeCriterion(index) {
        this.criteria.splice(index, 1);
        this.renderCriteria();
    }
    renderCriteria() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        this.criteria.forEach((criterion, index) => {
            // Create wrapper for row + connector to keep separator line behind buttons
            const wrapper = document.createElement('div');
            const row = this.createCriterionRow(criterion, index);
            wrapper.appendChild(row);
            // Add logic connector between rows (except last)
            if (index < this.criteria.length - 1) {
                const connector = this.createLogicConnector(index);
                wrapper.appendChild(connector);
            }
            this.container.appendChild(wrapper);
        });
    }
    createCriterionRow(criterion, index) {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 py-3';
        const field = this.config.fields.find(f => f.name === criterion.field) || this.config.fields[0];
        // Field selector
        row.innerHTML = `
      <select data-criterion-index="${index}" data-criterion-part="field"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.config.fields.map(f => `
          <option value="${f.name}" ${f.name === criterion.field ? 'selected' : ''}>${f.label}</option>
        `).join('')}
      </select>

      <select data-criterion-index="${index}" data-criterion-part="operator"
              class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50">
        ${this.getOperatorsForField(field).map(op => `
          <option value="${op.value}" ${op.value === criterion.operator ? 'selected' : ''}>${op.label}</option>
        `).join('')}
      </select>

      ${this.createValueInput(field, criterion, index)}

      <button type="button" data-criterion-index="${index}" data-action="remove"
              class="p-2 text-gray-400 hover:text-red-600">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `;
        // Bind events
        row.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', (e) => this.updateCriterion(e.target));
        });
        row.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
            this.removeCriterion(index);
        });
        return row;
    }
    createValueInput(field, criterion, index) {
        if (field.type === 'select' && field.options) {
            return `
        <select data-criterion-index="${index}" data-criterion-part="value"
                class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="">Select...</option>
          ${field.options.map(opt => `
            <option value="${opt.value}" ${opt.value === criterion.value ? 'selected' : ''}>${opt.label}</option>
          `).join('')}
        </select>
      `;
        }
        const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';
        return `
      <input type="${inputType}"
             data-criterion-index="${index}"
             data-criterion-part="value"
             value="${criterion.value}"
             placeholder="Enter value..."
             class="flex-1 py-2 px-3 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500">
    `;
    }
    createLogicConnector(index) {
        const connector = document.createElement('div');
        connector.className = 'flex items-center justify-center gap-2 py-2';
        const logic = this.criteria[index].logic || 'and';
        connector.innerHTML = `
      <button type="button"
              data-logic-index="${index}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded border ${logic === 'and' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
        And
      </button>
      <button type="button"
              data-logic-index="${index}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded border ${logic === 'or' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
        Or
      </button>
    `;
        connector.querySelectorAll('[data-logic-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const idx = parseInt(target.dataset.logicIndex || '0', 10);
                const value = target.dataset.logicValue;
                this.criteria[idx].logic = value;
                this.renderCriteria();
            });
        });
        return connector;
    }
    updateCriterion(element) {
        const index = parseInt(element.dataset.criterionIndex || '0', 10);
        const part = element.dataset.criterionPart;
        if (!this.criteria[index])
            return;
        const value = element.value;
        if (part === 'field') {
            this.criteria[index].field = value;
            // Re-render to update operators and value input for new field type
            this.renderCriteria();
        }
        else if (part === 'operator') {
            this.criteria[index].operator = value;
        }
        else if (part === 'value') {
            this.criteria[index].value = value;
        }
    }
    getOperatorsForField(field) {
        if (field.operators && field.operators.length > 0) {
            return field.operators.map(op => ({ label: op, value: op }));
        }
        return DEFAULT_OPERATORS[field.type] || DEFAULT_OPERATORS.text;
    }
    applySearch() {
        this.pushCriteriaToURL();
        this.config.onSearch(this.criteria);
        this.renderChips(); // Render chips before closing modal
        this.close();
    }
    savePreset() {
        const name = prompt('Enter a name for this search preset:');
        if (!name)
            return;
        const presets = this.loadPresetsFromStorage();
        presets[name] = this.criteria;
        localStorage.setItem('search_presets', JSON.stringify(presets));
        this.notifier.success(`Preset "${name}" saved!`);
    }
    loadPreset() {
        const presets = this.loadPresetsFromStorage();
        const names = Object.keys(presets);
        if (names.length === 0) {
            this.notifier.warning('No saved presets found.');
            return;
        }
        const name = prompt(`Available presets:\n${names.join('\n')}\n\nEnter preset name to load:`);
        if (!name || !presets[name])
            return;
        this.criteria = presets[name];
        this.renderCriteria();
    }
    loadPresetsFromStorage() {
        try {
            const stored = localStorage.getItem('search_presets');
            return stored ? JSON.parse(stored) : {};
        }
        catch (e) {
            return {};
        }
    }
    getCriteria() {
        return this.criteria;
    }
    setCriteria(criteria) {
        this.criteria = criteria;
        this.renderCriteria();
        this.renderChips();
    }
    /**
     * Render filter chips in the search input
     */
    renderChips() {
        const chipsContainer = document.getElementById('filter-chips-container');
        const searchInput = document.getElementById('table-search');
        const clearBtn = document.getElementById('search-clear-btn');
        if (!chipsContainer)
            return;
        chipsContainer.innerHTML = '';
        if (this.criteria.length === 0) {
            // No chips - show placeholder, hide clear button
            if (searchInput) {
                searchInput.placeholder = 'Search for items';
                searchInput.style.display = '';
            }
            if (clearBtn)
                clearBtn.classList.add('hidden');
            return;
        }
        // Hide placeholder when chips present
        if (searchInput) {
            searchInput.placeholder = '';
            searchInput.style.display = '';
        }
        // Show clear button
        if (clearBtn)
            clearBtn.classList.remove('hidden');
        // Render each criterion as a chip
        this.criteria.forEach((criterion, index) => {
            const chip = this.createChip(criterion, index);
            chipsContainer.appendChild(chip);
        });
    }
    /**
     * Create a single filter chip
     */
    createChip(criterion, index) {
        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border border-blue-200';
        const field = this.config.fields.find(f => f.name === criterion.field);
        const fieldLabel = field?.label || criterion.field;
        const operatorLabel = criterion.operator === 'ilike' ? 'contains' :
            criterion.operator === 'eq' ? 'is' :
                criterion.operator;
        chip.innerHTML = `
      <span>${fieldLabel} ${operatorLabel} "${criterion.value}"</span>
      <button type="button"
              data-chip-index="${index}"
              class="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              title="Remove filter">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;
        // Bind remove handler
        const removeBtn = chip.querySelector('[data-chip-index]');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeChip(index);
            });
        }
        return chip;
    }
    /**
     * Remove a chip and update filters
     */
    removeChip(index) {
        this.criteria.splice(index, 1);
        this.renderCriteria();
        this.renderChips();
        // Trigger search with updated criteria
        this.config.onSearch(this.criteria);
    }
    /**
     * Clear all chips
     */
    clearAllChips() {
        this.criteria = [];
        this.renderCriteria();
        this.renderChips();
        // Trigger clear callback
        if (this.config.onClear) {
            this.config.onClear();
        }
    }
}
//# sourceMappingURL=advanced-search.js.map
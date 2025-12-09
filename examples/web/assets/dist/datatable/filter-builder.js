/**
 * FilterBuilder Component
 *
 * Manages complex filter groups with AND/OR logic between conditions and groups.
 * Renders a UI similar to query builders with drag-and-drop reordering.
 */
const DEFAULT_OPERATORS = {
    text: [
        { label: 'contains', value: 'ilike' },
        { label: 'is', value: 'eq' },
        { label: 'is not', value: 'ne' },
    ],
    number: [
        { label: 'equals', value: 'eq' },
        { label: 'not equals', value: 'ne' },
        { label: 'greater than', value: 'gt' },
        { label: 'less than', value: 'lt' },
        { label: 'greater than or equal', value: 'gte' },
        { label: 'less than or equal', value: 'lte' },
    ],
    date: [
        { label: 'is', value: 'eq' },
        { label: 'before', value: 'lt' },
        { label: 'after', value: 'gt' },
    ],
    select: [
        { label: 'is', value: 'eq' },
        { label: 'is not', value: 'ne' },
    ],
};
export class FilterBuilder {
    constructor(config) {
        this.panel = null;
        this.container = null;
        this.previewElement = null;
        this.sqlPreviewElement = null;
        this.overlay = null;
        this.config = config;
        this.structure = { groups: [], groupLogic: [] };
        this.init();
    }
    init() {
        this.panel = document.getElementById('filter-panel');
        this.overlay = document.getElementById('filter-overlay');
        this.previewElement = document.getElementById('filter-preview-text');
        if (!this.panel) {
            console.error('[FilterBuilder] Panel element not found');
            return;
        }
        // Build panel structure
        this.buildPanelStructure();
        // Bind toggle button
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        // Bind clear filters
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        // Close on overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
                this.close();
            }
        });
        // Restore from URL
        this.restoreFromURL();
    }
    buildPanelStructure() {
        if (!this.panel)
            return;
        this.panel.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-900">Filters</h3>
        <div class="flex gap-2">
          <button type="button" id="saved-filters-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Saved filters ▾
          </button>
          <button type="button" id="edit-sql-btn" class="text-sm text-blue-600 hover:text-blue-800">
            Edit as SQL
          </button>
        </div>
      </div>

      <!-- Filter Groups Container -->
      <div id="filter-groups-container" class="space-y-3 mb-4">
        <!-- Groups will be rendered here -->
      </div>

      <!-- Add Group Button -->
      <button type="button" id="add-group-btn" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        AND
      </button>

      <!-- SQL Preview -->
      <div class="border-t border-gray-200 pt-3 mb-4">
        <div class="text-xs text-gray-500 mb-1">Preview:</div>
        <div id="sql-preview" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          No filters applied
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between border-t border-gray-200 pt-4">
        <div class="flex gap-2">
          <input type="text" id="save-filter-name" placeholder="Type a name here" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
          <button type="button" id="save-filter-btn" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
            Save filter
          </button>
        </div>
        <div class="flex gap-2">
          <button type="button" id="clear-all-btn" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
            Clear all
          </button>
          <button type="button" id="apply-filter-btn" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
            Apply filter
          </button>
        </div>
      </div>
    `;
        this.container = document.getElementById('filter-groups-container');
        this.sqlPreviewElement = document.getElementById('sql-preview');
        // Bind action buttons
        this.bindActions();
        // Start with one empty group
        if (this.structure.groups.length === 0) {
            this.addGroup();
        }
    }
    bindActions() {
        const addGroupBtn = document.getElementById('add-group-btn');
        const applyBtn = document.getElementById('apply-filter-btn');
        const clearAllBtn = document.getElementById('clear-all-btn');
        const saveBtn = document.getElementById('save-filter-btn');
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => this.addGroup());
        }
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAll());
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveFilter());
        }
    }
    addGroup() {
        const newGroup = {
            conditions: [this.createEmptyCondition()],
            logic: 'or'
        };
        this.structure.groups.push(newGroup);
        // Add group logic if not first group
        if (this.structure.groups.length > 1) {
            this.structure.groupLogic.push('and');
        }
        this.render();
    }
    createEmptyCondition() {
        const firstField = this.config.fields[0];
        return {
            field: firstField.name,
            operator: 'ilike',
            value: ''
        };
    }
    render() {
        if (!this.container)
            return;
        this.container.innerHTML = '';
        this.structure.groups.forEach((group, groupIndex) => {
            // Create group container
            const groupEl = this.createGroupElement(group, groupIndex);
            this.container.appendChild(groupEl);
            // Add group logic connector (except after last group)
            if (groupIndex < this.structure.groups.length - 1) {
                const connector = this.createGroupConnector(groupIndex);
                this.container.appendChild(connector);
            }
        });
        this.updatePreview();
    }
    createGroupElement(group, groupIndex) {
        const groupEl = document.createElement('div');
        groupEl.className = 'border border-gray-200 rounded-lg p-3 bg-gray-50';
        // Group header (if multiple groups)
        const header = document.createElement('div');
        header.className = 'flex justify-end mb-2';
        header.innerHTML = `
      <button type="button" data-remove-group="${groupIndex}" class="text-xs text-red-600 hover:text-red-800">
        Remove group
      </button>
    `;
        groupEl.appendChild(header);
        // Render conditions
        group.conditions.forEach((condition, condIndex) => {
            const condEl = this.createConditionElement(condition, groupIndex, condIndex);
            groupEl.appendChild(condEl);
            // Add condition logic (except after last condition)
            if (condIndex < group.conditions.length - 1) {
                const condConnector = this.createConditionConnector(groupIndex, condIndex, group.logic);
                groupEl.appendChild(condConnector);
            }
        });
        // Add condition button
        const addCondBtn = document.createElement('button');
        addCondBtn.type = 'button';
        addCondBtn.className = 'mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800';
        addCondBtn.dataset.addCondition = String(groupIndex);
        addCondBtn.innerHTML = `
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14"/><path d="M5 12h14"/>
      </svg>
      ${group.logic.toUpperCase()}
    `;
        groupEl.appendChild(addCondBtn);
        // Bind events
        this.bindGroupEvents(groupEl, groupIndex);
        return groupEl;
    }
    createConditionElement(condition, groupIndex, condIndex) {
        const condEl = document.createElement('div');
        condEl.className = 'flex items-center gap-2 mb-2';
        const field = this.config.fields.find(f => f.name === condition.field) || this.config.fields[0];
        condEl.innerHTML = `
      <div class="flex items-center text-gray-400 cursor-move" title="Drag to reorder">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>

      <select data-cond="${groupIndex}-${condIndex}-field" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
        ${this.config.fields.map(f => `
          <option value="${f.name}" ${f.name === condition.field ? 'selected' : ''}>${f.label}</option>
        `).join('')}
      </select>

      <select data-cond="${groupIndex}-${condIndex}-operator" class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
        ${this.getOperatorsForField(field).map(op => `
          <option value="${op.value}" ${op.value === condition.operator ? 'selected' : ''}>${op.label}</option>
        `).join('')}
      </select>

      ${this.renderValueInput(field, condition, groupIndex, condIndex)}

      <button type="button" data-remove-cond="${groupIndex}-${condIndex}" class="text-red-600 hover:text-red-800">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>

      <button type="button" data-add-cond-or="${groupIndex}-${condIndex}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add OR condition">
        OR
      </button>

      <button type="button" data-add-cond-and="${groupIndex}-${condIndex}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50" title="Add AND condition">
        AND
      </button>
    `;
        return condEl;
    }
    renderValueInput(field, condition, groupIndex, condIndex) {
        if (field.type === 'select' && field.options) {
            return `
        <select data-cond="${groupIndex}-${condIndex}-value" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">Select...</option>
          ${field.options.map(opt => `
            <option value="${opt.value}" ${opt.value === condition.value ? 'selected' : ''}>${opt.label}</option>
          `).join('')}
        </select>
      `;
        }
        const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';
        return `
      <input type="${inputType}"
             data-cond="${groupIndex}-${condIndex}-value"
             value="${condition.value || ''}"
             placeholder="Enter value..."
             class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
    }
    createConditionConnector(groupIndex, condIndex, logic) {
        const connector = document.createElement('div');
        connector.className = 'flex items-center justify-center my-1';
        connector.innerHTML = `
      <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">
        ${logic.toUpperCase()}
      </span>
    `;
        return connector;
    }
    createGroupConnector(groupIndex) {
        const connector = document.createElement('div');
        connector.className = 'flex items-center justify-center py-2';
        const logic = this.structure.groupLogic[groupIndex] || 'and';
        connector.innerHTML = `
      <button type="button"
              data-group-logic="${groupIndex}"
              data-logic-value="and"
              class="px-3 py-1 text-xs font-medium rounded-l border ${logic === 'and' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
        AND
      </button>
      <button type="button"
              data-group-logic="${groupIndex}"
              data-logic-value="or"
              class="px-3 py-1 text-xs font-medium rounded-r border ${logic === 'or' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300'}">
        OR
      </button>
    `;
        // Bind logic toggle
        connector.querySelectorAll('[data-group-logic]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const idx = parseInt(target.dataset.groupLogic || '0', 10);
                const value = target.dataset.logicValue;
                this.structure.groupLogic[idx] = value;
                this.render();
            });
        });
        return connector;
    }
    bindGroupEvents(groupEl, groupIndex) {
        // Remove group
        const removeGroupBtn = groupEl.querySelector(`[data-remove-group="${groupIndex}"]`);
        if (removeGroupBtn) {
            removeGroupBtn.addEventListener('click', () => this.removeGroup(groupIndex));
        }
        // Add condition
        const addCondBtn = groupEl.querySelector(`[data-add-condition="${groupIndex}"]`);
        if (addCondBtn) {
            addCondBtn.addEventListener('click', () => this.addCondition(groupIndex));
        }
        // Condition field changes
        groupEl.querySelectorAll('[data-cond]').forEach(el => {
            const input = el;
            const [gIdx, cIdx, part] = input.dataset.cond.split('-');
            const gi = parseInt(gIdx, 10);
            const ci = parseInt(cIdx, 10);
            input.addEventListener('change', () => {
                if (part === 'field') {
                    this.structure.groups[gi].conditions[ci].field = input.value;
                    this.render(); // Re-render to update operators
                }
                else if (part === 'operator') {
                    this.structure.groups[gi].conditions[ci].operator = input.value;
                    this.updatePreview();
                }
                else if (part === 'value') {
                    this.structure.groups[gi].conditions[ci].value = input.value;
                    this.updatePreview();
                }
            });
        });
        // Remove condition
        groupEl.querySelectorAll('[data-remove-cond]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const closest = target.closest('[data-remove-cond]');
                if (!closest)
                    return;
                const [gIdx, cIdx] = closest.dataset.removeCond.split('-').map(Number);
                this.removeCondition(gIdx, cIdx);
            });
        });
        // Add OR/AND condition
        groupEl.querySelectorAll('[data-add-cond-or], [data-add-cond-and]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const isOr = target.dataset.addCondOr !== undefined;
                const dataAttr = isOr ? target.dataset.addCondOr : target.dataset.addCondAnd;
                if (!dataAttr)
                    return;
                const [gIdx] = dataAttr.split('-').map(Number);
                // Toggle group logic
                this.structure.groups[gIdx].logic = isOr ? 'or' : 'and';
                this.addCondition(gIdx);
            });
        });
    }
    addCondition(groupIndex) {
        this.structure.groups[groupIndex].conditions.push(this.createEmptyCondition());
        this.render();
    }
    removeCondition(groupIndex, condIndex) {
        const group = this.structure.groups[groupIndex];
        group.conditions.splice(condIndex, 1);
        // If group is empty, remove it
        if (group.conditions.length === 0) {
            this.removeGroup(groupIndex);
        }
        else {
            this.render();
        }
    }
    removeGroup(groupIndex) {
        this.structure.groups.splice(groupIndex, 1);
        // Adjust groupLogic array
        if (groupIndex < this.structure.groupLogic.length) {
            this.structure.groupLogic.splice(groupIndex, 1);
        }
        else if (groupIndex > 0 && this.structure.groupLogic.length > 0) {
            this.structure.groupLogic.splice(groupIndex - 1, 1);
        }
        // Ensure at least one group
        if (this.structure.groups.length === 0) {
            this.addGroup();
        }
        else {
            this.render();
        }
    }
    getOperatorsForField(field) {
        if (field.operators && field.operators.length > 0) {
            return field.operators.map(op => ({ label: op, value: op }));
        }
        return DEFAULT_OPERATORS[field.type] || DEFAULT_OPERATORS.text;
    }
    updatePreview() {
        const sqlPreview = this.generateSQLPreview();
        const textPreview = this.generateTextPreview();
        if (this.sqlPreviewElement) {
            this.sqlPreviewElement.textContent = sqlPreview || 'No filters applied';
        }
        if (this.previewElement) {
            this.previewElement.textContent = textPreview;
        }
        // Show/hide applied filter preview
        const previewContainer = document.getElementById('applied-filter-preview');
        if (previewContainer) {
            if (this.hasActiveFilters()) {
                previewContainer.classList.remove('hidden');
            }
            else {
                previewContainer.classList.add('hidden');
            }
        }
    }
    hasActiveFilters() {
        return this.structure.groups.some(g => g.conditions.some(c => c.value !== '' && c.value !== null && c.value !== undefined));
    }
    generateSQLPreview() {
        const groupParts = this.structure.groups.map(group => {
            const condParts = group.conditions
                .filter(c => c.value !== '' && c.value !== null)
                .map(c => {
                const op = c.operator.toUpperCase();
                const val = typeof c.value === 'string' ? `'${c.value}'` : c.value;
                return `${c.field} ${op === 'ILIKE' ? 'ILIKE' : op === 'EQ' ? '=' : op} ${val}`;
            });
            if (condParts.length === 0)
                return '';
            if (condParts.length === 1)
                return condParts[0];
            return `( ${condParts.join(` ${group.logic.toUpperCase()} `)} )`;
        }).filter(p => p !== '');
        if (groupParts.length === 0)
            return '';
        if (groupParts.length === 1)
            return groupParts[0];
        return groupParts.reduce((acc, part, idx) => {
            if (idx === 0)
                return part;
            const logic = this.structure.groupLogic[idx - 1] || 'and';
            return `${acc} ${logic.toUpperCase()} ${part}`;
        }, '');
    }
    generateTextPreview() {
        const groupParts = this.structure.groups.map(group => {
            const condParts = group.conditions
                .filter(c => c.value !== '' && c.value !== null)
                .map(c => {
                const field = this.config.fields.find(f => f.name === c.field);
                const fieldLabel = field?.label || c.field;
                const opLabel = this.getOperatorsForField(field).find(op => op.value === c.operator)?.label || c.operator;
                return `${fieldLabel} ${opLabel} "${c.value}"`;
            });
            if (condParts.length === 0)
                return '';
            if (condParts.length === 1)
                return condParts[0];
            return `( ${condParts.join(` ${group.logic.toUpperCase()} `)} )`;
        }).filter(p => p !== '');
        if (groupParts.length === 0)
            return '';
        if (groupParts.length === 1)
            return groupParts[0];
        return groupParts.reduce((acc, part, idx) => {
            if (idx === 0)
                return part;
            const logic = this.structure.groupLogic[idx - 1] || 'and';
            return `${acc} ${logic.toUpperCase()} ${part}`;
        }, '');
    }
    applyFilters() {
        this.config.onApply(this.structure);
        this.close();
    }
    clearAll() {
        this.structure = { groups: [], groupLogic: [] };
        this.addGroup();
        this.updatePreview();
    }
    clearFilters() {
        this.clearAll();
        this.config.onClear();
        this.updatePreview();
    }
    saveFilter() {
        const nameInput = document.getElementById('save-filter-name');
        const name = nameInput?.value.trim();
        if (!name) {
            alert('Please enter a name for the filter');
            return;
        }
        const saved = this.getSavedFilters();
        saved[name] = this.structure;
        localStorage.setItem('saved_filters', JSON.stringify(saved));
        alert(`Filter "${name}" saved!`);
        if (nameInput)
            nameInput.value = '';
    }
    getSavedFilters() {
        try {
            const saved = localStorage.getItem('saved_filters');
            return saved ? JSON.parse(saved) : {};
        }
        catch {
            return {};
        }
    }
    toggle() {
        if (this.panel?.classList.contains('hidden')) {
            this.open();
        }
        else {
            this.close();
        }
    }
    open() {
        // Position panel below the filter button
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (toggleBtn && this.panel) {
            const rect = toggleBtn.getBoundingClientRect();
            this.panel.style.top = `${rect.bottom + 8}px`;
            this.panel.style.left = `${rect.left}px`;
        }
        this.panel?.classList.remove('hidden');
        this.overlay?.classList.remove('hidden');
    }
    close() {
        this.panel?.classList.add('hidden');
        this.overlay?.classList.add('hidden');
    }
    restoreFromURL() {
        const params = new URLSearchParams(window.location.search);
        const filtersParam = params.get('filters');
        if (filtersParam) {
            try {
                const filters = JSON.parse(filtersParam);
                // Convert old format to new group structure if needed
                if (Array.isArray(filters) && filters.length > 0) {
                    this.structure = this.convertLegacyFilters(filters);
                    this.render();
                }
            }
            catch (e) {
                console.warn('[FilterBuilder] Failed to parse filters from URL:', e);
            }
        }
    }
    convertLegacyFilters(filters) {
        // Group filters by field to detect OR conditions
        const fieldGroups = new Map();
        filters.forEach(f => {
            const key = f.column;
            if (!fieldGroups.has(key)) {
                fieldGroups.set(key, []);
            }
            fieldGroups.get(key).push(f);
        });
        const groups = [];
        fieldGroups.forEach((conditions) => {
            groups.push({
                conditions: conditions.map(c => ({
                    field: c.column,
                    operator: c.operator || 'ilike',
                    value: c.value
                })),
                logic: conditions.length > 1 ? 'or' : 'and'
            });
        });
        return {
            groups,
            groupLogic: new Array(groups.length - 1).fill('and')
        };
    }
    getStructure() {
        return this.structure;
    }
    setStructure(structure) {
        this.structure = structure;
        this.render();
    }
}
//# sourceMappingURL=filter-builder.js.map
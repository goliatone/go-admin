// @ts-nocheck
import type { ApiResponse, GroupedData, ViewMode } from './core-types.js';
import {
  extractBackendSummaries,
  getViewModeForViewport,
  hasBackendGroupedRows,
  mergeBackendSummaries,
  normalizeBackendGroupedRows,
  normalizeExpandMode,
  renderGroupHeaderRow,
  transformToGroups,
} from './grouped-mode.js';

export function renderGroupedData(grid: any, data: ApiResponse, items: any[], tbody: HTMLElement): void {
    const groupByField = grid.config.groupByField || 'translation_group_id';
    const records = items.filter((item): item is Record<string, unknown> => {
      return !!item && typeof item === 'object' && !Array.isArray(item);
    });

    // Prefer backend grouped payload when contract is available.
    let groupedData = normalizeBackendGroupedRows(records, {
      groupByField,
      defaultExpanded: !grid.state.hasPersistedExpandState,
      expandMode: grid.state.expandMode,
      expandedGroups: grid.state.expandedGroups,
    });

    // Fallback for legacy flat payloads (local grouping).
    if (!groupedData) {
      groupedData = transformToGroups(records, {
        groupByField,
        defaultExpanded: !grid.state.hasPersistedExpandState,
        expandMode: grid.state.expandMode,
        expandedGroups: grid.state.expandedGroups,
      });
    }

    // Merge backend summaries if available
    const backendSummaries = extractBackendSummaries(data as Record<string, unknown>);
    if (backendSummaries.size > 0) {
      groupedData = mergeBackendSummaries(groupedData, backendSummaries);
    }

    // Store grouped data in state
    grid.state.groupedData = groupedData;

    const colSpan = grid.config.columns.length;

    // Render grouped rows
    for (const group of groupedData.groups) {
      // Render group header row
      const headerHtml = renderGroupHeaderRow(group, colSpan);
      tbody.insertAdjacentHTML('beforeend', headerHtml);

      // Get the header row and bind click handler
      const headerRow = tbody.lastElementChild as HTMLElement;
      if (headerRow) {
        headerRow.addEventListener('click', () => grid.toggleGroup(group.groupId));
        headerRow.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            grid.toggleGroup(group.groupId);
          }
        });
      }

      // Render child rows (collapsed groups keep rows hidden for fast toggle updates).
      for (const record of group.records) {
        if (record.id) {
          grid.recordsById[record.id as string] = record;
        }
        const row = grid.createTableRow(record);
        row.dataset.groupId = group.groupId;
        row.classList.add('group-child-row');
        if (!group.expanded) {
          row.style.display = 'none';
        }
        tbody.appendChild(row);
      }
    }

    // Render ungrouped rows (if any)
    for (const record of groupedData.ungrouped) {
      if (record.id) {
        grid.recordsById[record.id as string] = record;
      }
      const row = grid.createTableRow(record);
      tbody.appendChild(row);
    }

    console.log(`[DataGrid] Rendered ${groupedData.groups.length} groups, ${groupedData.ungrouped.length} ungrouped`);
  }

  /**
   * Whether grouped or matrix view is currently active and enabled.
   */
export function isGroupedViewActive(grid: any): boolean {
    if (!grid.config.enableGroupedMode) {
      return false;
    }
    return grid.state.viewMode === 'grouped' || grid.state.viewMode === 'matrix';
  }

  /**
   * Fallback to flat mode when grouped pagination contract is unavailable.
   */
export function fallbackGroupedMode(grid: any, reason: string): void {
    if (!grid.isGroupedViewActive()) {
      return;
    }

    grid.state.viewMode = 'flat';
    grid.state.groupedData = null;
    grid.pushStateToURL({ replace: true });

    grid.notify(reason, 'warning');
    void grid.refresh();
  }

  /**
   * Fallback on grouped mode request errors that indicate unsupported contract.
   */
export function handleGroupedModeStatusFallback(grid: any, status: number): boolean {
    if (!grid.isGroupedViewActive()) {
      return false;
    }
    if (![400, 404, 405, 422].includes(status)) {
      return false;
    }
    grid.fallbackGroupedMode('Grouped pagination is not supported by this panel. Switched to flat view.');
    return true;
  }

  /**
   * Fallback when payload does not follow backend grouped-row contract.
   */
export function handleGroupedModePayloadFallback(grid: any, items: unknown[]): boolean {
    if (!grid.isGroupedViewActive() || items.length === 0) {
      return false;
    }

    const records = items.filter((item): item is Record<string, unknown> => {
      return !!item && typeof item === 'object' && !Array.isArray(item);
    });
    if (records.length !== items.length || !hasBackendGroupedRows(records)) {
      grid.fallbackGroupedMode('Grouped pagination contract is unavailable. Switched to flat view to avoid split groups.');
      return true;
    }
    return false;
  }

  /**
   * Toggle group expand/collapse state (Phase 2)
   */
export function toggleGroup(grid: any, groupId: string): void {
    if (!grid.state.groupedData) return;
    const normalizedGroupID = String(groupId || '').trim();
    if (!normalizedGroupID) return;
    const currentlyExpanded = grid.isGroupExpandedByState(normalizedGroupID, !grid.state.hasPersistedExpandState);

    if (grid.state.expandMode === 'all') {
      if (currentlyExpanded) {
        grid.state.expandedGroups.add(normalizedGroupID);
      } else {
        grid.state.expandedGroups.delete(normalizedGroupID);
      }
    } else if (grid.state.expandMode === 'none') {
      if (currentlyExpanded) {
        grid.state.expandedGroups.delete(normalizedGroupID);
      } else {
        grid.state.expandedGroups.add(normalizedGroupID);
      }
    } else {
      // When default-expanded and no explicit state exists yet, seed with all groups first.
      if (!grid.state.hasPersistedExpandState && grid.state.expandedGroups.size === 0) {
        grid.state.expandedGroups = new Set(grid.state.groupedData.groups.map((group) => group.groupId));
      }
      if (grid.state.expandedGroups.has(normalizedGroupID)) {
        grid.state.expandedGroups.delete(normalizedGroupID);
      } else {
        grid.state.expandedGroups.add(normalizedGroupID);
      }
    }

    grid.state.hasPersistedExpandState = true;

    // Update the group's expanded state
    const group = grid.state.groupedData.groups.find(g => g.groupId === normalizedGroupID);
    if (group) {
      group.expanded = grid.isGroupExpandedByState(normalizedGroupID);
    }

    // Re-render the affected group (toggle child row visibility)
    grid.updateGroupVisibility(normalizedGroupID);
    grid.pushStateToURL({ replace: true });
  }

  /**
   * Set explicit expanded group IDs and switch expand mode to explicit.
   */
export function setExpandedGroups(grid: any, groupIDs: string[]): void {
    if (!grid.config.enableGroupedMode) {
      return;
    }
    const next = new Set(
      (groupIDs || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    );
    grid.state.expandMode = 'explicit';
    grid.state.expandedGroups = next;
    grid.state.hasPersistedExpandState = true;
    grid.updateGroupedRowsFromState();
    grid.pushStateToURL({ replace: true });
    if (!grid.state.groupedData && grid.isGroupedViewActive()) {
      void grid.refresh();
    }
  }

  /**
   * Expand all groups using compact mode semantics.
   */
export function expandAllGroups(grid: any): void {
    if (!grid.config.enableGroupedMode) {
      return;
    }
    grid.state.expandMode = 'all';
    grid.state.expandedGroups.clear();
    grid.state.hasPersistedExpandState = true;
    grid.updateGroupedRowsFromState();
    grid.pushStateToURL({ replace: true });
    if (!grid.state.groupedData && grid.isGroupedViewActive()) {
      void grid.refresh();
    }
  }

  /**
   * Collapse all groups using compact mode semantics.
   */
export function collapseAllGroups(grid: any): void {
    if (!grid.config.enableGroupedMode) {
      return;
    }
    grid.state.expandMode = 'none';
    grid.state.expandedGroups.clear();
    grid.state.hasPersistedExpandState = true;
    grid.updateGroupedRowsFromState();
    grid.pushStateToURL({ replace: true });
    if (!grid.state.groupedData && grid.isGroupedViewActive()) {
      void grid.refresh();
    }
  }

  /**
   * Update visibility of child rows for a group
   */
export function updateGroupVisibility(grid: any, groupId: string): void {
    const tbody = grid.tableEl?.querySelector('tbody');
    if (!tbody) return;

    const headerRow = tbody.querySelector(`tr[data-group-id="${groupId}"]`) as HTMLElement;
    if (!headerRow) return;

    const isExpanded = grid.isGroupExpandedByState(groupId);

    // Update header row state
    headerRow.dataset.expanded = String(isExpanded);
    headerRow.setAttribute('aria-expanded', String(isExpanded));

    // Update expand icon
    const expandIcon = headerRow.querySelector('.expand-icon');
    if (expandIcon) {
      expandIcon.textContent = isExpanded ? '▼' : '▶';
    }

    // Toggle child rows visibility
    const childRows = tbody.querySelectorAll<HTMLElement>(`tr.group-child-row[data-group-id="${groupId}"]`);
    childRows.forEach(row => {
      row.style.display = isExpanded ? '' : 'none';
    });
  }

export function updateGroupedRowsFromState(grid: any): void {
    if (!grid.state.groupedData) {
      return;
    }
    for (const group of grid.state.groupedData.groups) {
      group.expanded = grid.isGroupExpandedByState(group.groupId);
      grid.updateGroupVisibility(group.groupId);
    }
  }

export function isGroupExpandedByState(grid: any, groupId: string, defaultExpanded: boolean = false): boolean {
    const mode = normalizeExpandMode(grid.state.expandMode, 'explicit');
    if (mode === 'all') {
      return !grid.state.expandedGroups.has(groupId);
    }
    if (mode === 'none') {
      return grid.state.expandedGroups.has(groupId);
    }
    if (grid.state.expandedGroups.size === 0) {
      return defaultExpanded;
    }
    return grid.state.expandedGroups.has(groupId);
  }

  /**
   * Set view mode (flat, grouped, matrix) - Phase 2
   */
export function setViewMode(grid: any, mode: ViewMode): void {
    if (!grid.config.enableGroupedMode) {
      console.warn('[DataGrid] Grouped mode not enabled');
      return;
    }

    // Apply viewport-specific adjustments
    const effectiveMode = getViewModeForViewport(mode);

    grid.state.viewMode = effectiveMode;
    if (effectiveMode === 'flat') {
      grid.state.groupedData = null;
    }
    grid.pushStateToURL();

    // Re-fetch data with new mode
    void grid.refresh();
  }

  /**
   * Get current view mode
   */
export function getViewMode(grid: any): ViewMode {
    return grid.state.viewMode;
  }

  /**
   * Get grouped data (if available)
   */
export function getGroupedData(grid: any): GroupedData | null {
    return grid.state.groupedData;
  }

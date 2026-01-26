/**
 * Activity Manager
 * Manages activity feed display with enhanced formatting and view switching
 */

import type {
  ActivityEntry,
  ActivityPayload,
  ActivityConfig,
  ActivitySelectors,
  ActivityState,
  ActivityViewMode,
  ToastNotifier,
} from './types.js';

import {
  parseActionString,
  formatActivitySentence,
  formatTimestamp,
  formatRelativeTime,
  getMetadataSummary,
  formatMetadataExpanded,
  escapeHtml,
  formatChannel,
} from './formatters.js';

import { ActivityViewSwitcher } from './activity-view-switcher.js';
import { TimelineRenderer, createLoadingIndicator, createEndIndicator, createScrollSentinel } from './activity-timeline.js';

const DEFAULT_SELECTORS: ActivitySelectors = {
  form: '#activity-filters',
  tableBody: '#activity-table-body',
  emptyState: '#activity-empty',
  disabledState: '#activity-disabled',
  errorState: '#activity-error',
  countEl: '#activity-count',
  prevBtn: '#activity-prev',
  nextBtn: '#activity-next',
  refreshBtn: '#activity-refresh',
  clearBtn: '#activity-clear',
  limitInput: '#filter-limit',
};

const TIMELINE_SELECTORS = {
  container: '#activity-timeline',
  sentinel: '#activity-timeline-sentinel',
};

const FIELD_IDS = ['q', 'verb', 'channels', 'object_type', 'object_id'];
const DATE_FIELDS = ['since', 'until'];
const PASSTHROUGH_FIELDS = ['user_id', 'actor_id'];

export class ActivityManager {
  private config: ActivityConfig;
  private selectors: ActivitySelectors;
  private toast: ToastNotifier | null;

  private form: HTMLFormElement | null = null;
  private tableBody: HTMLTableSectionElement | null = null;
  private emptyState: HTMLElement | null = null;
  private disabledState: HTMLElement | null = null;
  private errorState: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private refreshBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private limitInput: HTMLSelectElement | null = null;

  private state: ActivityState = {
    limit: 50,
    offset: 0,
    total: 0,
    nextOffset: 0,
    hasMore: false,
    extraParams: {},
  };

  constructor(
    config: ActivityConfig,
    selectors: Partial<ActivitySelectors> = {},
    toast?: ToastNotifier
  ) {
    this.config = config;
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.toast = toast || (window as any).toastManager || null;
  }

  /**
   * Initialize the activity manager
   */
  init(): void {
    this.cacheElements();
    this.bindEvents();
    this.syncFromQuery();
    this.loadActivity();
  }

  private cacheElements(): void {
    this.form = document.querySelector<HTMLFormElement>(this.selectors.form);
    this.tableBody = document.querySelector<HTMLTableSectionElement>(this.selectors.tableBody);
    this.emptyState = document.querySelector<HTMLElement>(this.selectors.emptyState);
    this.disabledState = document.querySelector<HTMLElement>(this.selectors.disabledState);
    this.errorState = document.querySelector<HTMLElement>(this.selectors.errorState);
    this.countEl = document.querySelector<HTMLElement>(this.selectors.countEl);
    this.prevBtn = document.querySelector<HTMLButtonElement>(this.selectors.prevBtn);
    this.nextBtn = document.querySelector<HTMLButtonElement>(this.selectors.nextBtn);
    this.refreshBtn = document.querySelector<HTMLButtonElement>(this.selectors.refreshBtn);
    this.clearBtn = document.querySelector<HTMLButtonElement>(this.selectors.clearBtn);
    this.limitInput = document.querySelector<HTMLSelectElement>(this.selectors.limitInput);
  }

  private bindEvents(): void {
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.state.limit = parseInt(this.limitInput?.value || '50', 10) || 50;
      this.state.offset = 0;
      this.loadActivity();
    });

    this.clearBtn?.addEventListener('click', () => {
      FIELD_IDS.forEach((name) => this.setInputValue(name, ''));
      DATE_FIELDS.forEach((name) => this.setInputValue(name, ''));
      this.state.offset = 0;
      this.loadActivity();
    });

    this.prevBtn?.addEventListener('click', () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit);
      this.loadActivity();
    });

    this.nextBtn?.addEventListener('click', () => {
      if (!this.state.hasMore) return;
      this.state.offset = this.state.nextOffset;
      this.loadActivity();
    });

    this.refreshBtn?.addEventListener('click', () => {
      this.loadActivity();
    });
  }

  private getInputValue(name: string): string {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!input) return '';
    return String((input as HTMLInputElement).value || '').trim();
  }

  private setInputValue(name: string, value: string): void {
    const input = document.getElementById(`filter-${name.replace(/_/g, '-')}`);
    if (!input) return;
    (input as HTMLInputElement).value = value || '';
  }

  private toLocalInput(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const offset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
  }

  private toRFC3339(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  }

  private syncFromQuery(): void {
    const params = new URLSearchParams(window.location.search);
    const limit = parseInt(params.get('limit') || '', 10);
    const offset = parseInt(params.get('offset') || '', 10);

    if (!Number.isNaN(limit) && limit > 0) {
      this.state.limit = limit;
    }
    if (!Number.isNaN(offset) && offset >= 0) {
      this.state.offset = offset;
    }

    if (this.limitInput) {
      this.limitInput.value = String(this.state.limit);
    }

    FIELD_IDS.forEach((name) => this.setInputValue(name, params.get(name) || ''));
    DATE_FIELDS.forEach((name) => this.setInputValue(name, this.toLocalInput(params.get(name) || '')));
    PASSTHROUGH_FIELDS.forEach((name) => {
      const val = params.get(name);
      if (val) {
        this.state.extraParams[name] = val;
      }
    });
  }

  private buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    params.set('limit', String(this.state.limit));
    params.set('offset', String(this.state.offset));

    FIELD_IDS.forEach((name) => {
      const value = this.getInputValue(name);
      if (value) params.set(name, value);
    });

    DATE_FIELDS.forEach((name) => {
      const value = this.toRFC3339(this.getInputValue(name));
      if (value) params.set(name, value);
    });

    Object.entries(this.state.extraParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return params;
  }

  private syncUrl(params: URLSearchParams): void {
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', next);
  }

  private resetStates(): void {
    this.disabledState?.classList.add('hidden');
    this.errorState?.classList.add('hidden');
  }

  private showError(message: string): void {
    if (this.errorState) {
      this.errorState.textContent = message;
      this.errorState.classList.remove('hidden');
    }
  }

  private showDisabled(message: string): void {
    if (this.disabledState) {
      this.disabledState.textContent = message;
      this.disabledState.classList.remove('hidden');
    }
  }

  async loadActivity(): Promise<void> {
    this.resetStates();
    const params = this.buildParams();
    this.syncUrl(params);

    const url = `${this.config.apiPath}?${params.toString()}`;

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (response.status === 404 && payload?.text_code === 'FEATURE_DISABLED') {
          this.showDisabled(payload.message || 'Activity feature disabled.');
          this.renderRows([]);
          this.updatePagination(0);
          return;
        }

        this.showError(payload?.message || `Failed to load activity (${response.status})`);
        return;
      }

      const payload: ActivityPayload = await response.json();
      const entries = Array.isArray(payload.entries) ? payload.entries : [];

      this.state.total = typeof payload.total === 'number' ? payload.total : entries.length;
      this.state.hasMore = Boolean(payload.has_more);
      this.state.nextOffset =
        typeof payload.next_offset === 'number'
          ? payload.next_offset
          : this.state.offset + entries.length;

      this.renderRows(entries);
      this.updatePagination(entries.length);
    } catch (err) {
      this.showError('Failed to load activity.');
    }
  }

  private renderRows(entries: ActivityEntry[]): void {
    if (!this.tableBody) return;

    this.tableBody.innerHTML = '';

    if (!entries || entries.length === 0) {
      this.emptyState?.classList.remove('hidden');
      return;
    }

    this.emptyState?.classList.add('hidden');

    entries.forEach((entry) => {
      const { mainRow, detailsRow } = this.createRowPair(entry);
      this.tableBody!.appendChild(mainRow);
      if (detailsRow) {
        this.tableBody!.appendChild(detailsRow);
      }
    });

    // Wire up metadata toggles
    this.wireMetadataToggles();
  }

  private createRowPair(entry: ActivityEntry): { mainRow: HTMLTableRowElement; detailsRow: HTMLTableRowElement | null } {
    const actionLabels = this.config.actionLabels || {};
    const parsedAction = parseActionString(entry.action, actionLabels);
    const sentence = formatActivitySentence(entry, actionLabels);
    const timestamp = formatTimestamp(entry.created_at);
    const relativeTime = formatRelativeTime(entry.created_at);
    const metadataSummary = getMetadataSummary(entry.metadata);
    const metadataContent = formatMetadataExpanded(entry.metadata);
    const shortChannel = formatChannel(entry.channel);

    // Color scheme for action categories
    const categoryColors: Record<string, { bg: string; color: string; border: string }> = {
      created: { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
      updated: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
      deleted: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
      auth: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
      viewed: { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
      system: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
    };
    const colors = categoryColors[parsedAction.category] || categoryColors.system;

    const mainRow = document.createElement('tr');
    mainRow.className = `activity-row activity-row--${parsedAction.category}`;

    // Build action cell with namespace icon and action badge
    let actionCellHtml = '';
    if (parsedAction.namespace) {
      // Dotted action like "debug.repl.close" - show namespace icon + action badge
      actionCellHtml = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${escapeHtml(parsedAction.namespace)}">
            <i class="iconoir-${parsedAction.icon}" style="font-size: 14px;"></i>
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${colors.bg}; color: ${colors.color}; border: 1px solid ${colors.border};">
            ${escapeHtml(parsedAction.action)}
          </span>
        </div>
      `;
    } else {
      // Simple action - show as colored badge with icon
      actionCellHtml = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${colors.bg}; color: ${colors.color}; border: 1px solid ${colors.border};">
          <i class="iconoir-${parsedAction.icon}" style="font-size: 14px;"></i>
          <span>${escapeHtml(parsedAction.action || '-')}</span>
        </span>
      `;
    }

    // Build channel cell with shortened ID and copy tooltip
    let channelHtml = '';
    if (entry.channel) {
      channelHtml = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${escapeHtml(entry.channel)}">
          ${escapeHtml(shortChannel)}
        </span>
      `;
    } else {
      channelHtml = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    }

    // Build metadata toggle button (if there's metadata)
    let metadataCellHtml = '';
    if (metadataSummary) {
      metadataCellHtml = `
        <button type="button"
                class="activity-metadata-toggle"
                style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;"
                aria-expanded="false"
                data-metadata-toggle="${entry.id}">
          <span>${metadataSummary}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      `;
    } else {
      metadataCellHtml = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    }

    mainRow.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${colors.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${timestamp}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${relativeTime}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${actionCellHtml}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${sentence}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${channelHtml}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${metadataCellHtml}</td>
    `;

    // Create details row (hidden by default) if there's metadata
    let detailsRow: HTMLTableRowElement | null = null;
    if (metadataSummary) {
      detailsRow = document.createElement('tr');
      detailsRow.className = 'activity-details-row';
      detailsRow.style.display = 'none';
      detailsRow.dataset.metadataContent = entry.id;
      detailsRow.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${colors.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
              ${metadataContent}
            </div>
          </div>
        </td>
      `;
    }

    return { mainRow, detailsRow };
  }

  private wireMetadataToggles(): void {
    const toggles = document.querySelectorAll<HTMLButtonElement>('[data-metadata-toggle]');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const entryId = toggle.dataset.metadataToggle;
        // Find the details row (separate tr element)
        const detailsRow = document.querySelector<HTMLTableRowElement>(`tr[data-metadata-content="${entryId}"]`);

        if (!detailsRow) return;

        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const newExpanded = !isExpanded;

        // Toggle the details row visibility
        detailsRow.style.display = newExpanded ? 'table-row' : 'none';
        toggle.setAttribute('aria-expanded', newExpanded ? 'true' : 'false');

        // Update toggle button appearance
        toggle.style.background = newExpanded ? '#e5e7eb' : '#f3f4f6';

        // Rotate chevron
        const chevron = toggle.querySelector<SVGElement>('.activity-metadata-chevron');
        if (chevron) {
          chevron.style.transform = newExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    });
  }

  private updatePagination(count: number): void {
    const total = Number.isFinite(this.state.total) ? this.state.total : 0;
    const start = count > 0 ? this.state.offset + 1 : 0;
    const end = this.state.offset + count;

    if (this.countEl) {
      if (total > 0) {
        this.countEl.textContent = `Showing ${start}-${end} of ${total}`;
      } else if (count > 0) {
        this.countEl.textContent = `Showing ${start}-${end}`;
      } else {
        this.countEl.textContent = 'No activity entries';
      }
    }

    if (this.prevBtn) {
      this.prevBtn.disabled = this.state.offset <= 0;
    }

    if (this.nextBtn) {
      this.nextBtn.disabled = !this.state.hasMore;
    }
  }
}

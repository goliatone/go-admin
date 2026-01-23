/**
 * Activity Manager
 * Manages activity feed display with enhanced formatting
 */

import type {
  ActivityEntry,
  ActivityPayload,
  ActivityConfig,
  ActivitySelectors,
  ActivityState,
  ToastNotifier,
} from './types.js';

import {
  getActionCategory,
  formatActivitySentence,
  formatTimestamp,
  formatRelativeTime,
  getMetadataSummary,
  formatMetadataExpanded,
  escapeHtml,
  getActionIconHtml,
} from './formatters.js';

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
      const row = this.createRow(entry);
      this.tableBody!.appendChild(row);
    });

    // Wire up metadata toggles
    this.wireMetadataToggles();
  }

  private createRow(entry: ActivityEntry): HTMLTableRowElement {
    const category = getActionCategory(entry.action);
    const sentence = formatActivitySentence(entry);
    const timestamp = formatTimestamp(entry.created_at);
    const relativeTime = formatRelativeTime(entry.created_at);
    const metadataSummary = getMetadataSummary(entry.metadata);
    const metadataContent = formatMetadataExpanded(entry.metadata);

    const row = document.createElement('tr');
    row.className = `activity-row activity-row--${category}`;

    // Build action badge HTML
    const actionBadgeHtml = `
      <span class="activity-action-badge activity-action-badge--${category}">
        ${getActionIconHtml(category)}
        <span>${escapeHtml(entry.action || '-')}</span>
      </span>
    `;

    // Build metadata cell HTML
    let metadataCellHtml = '';
    if (metadataSummary) {
      const entryId = `metadata-${entry.id}`;
      metadataCellHtml = `
        <div class="activity-metadata">
          <button type="button"
                  class="activity-metadata-toggle"
                  aria-expanded="false"
                  aria-controls="${entryId}"
                  data-metadata-toggle="${entry.id}">
            <span>${metadataSummary}</span>
            <svg class="activity-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div id="${entryId}"
               class="activity-metadata-content"
               data-expanded="false"
               data-metadata-content="${entry.id}">
            ${metadataContent}
          </div>
        </div>
      `;
    } else {
      metadataCellHtml = '<span class="activity-metadata-empty">-</span>';
    }

    // Build channel cell
    const channelHtml = entry.channel
      ? `<span class="activity-channel">${escapeHtml(entry.channel)}</span>`
      : '<span class="text-gray-400">-</span>';

    row.innerHTML = `
      <td class="px-4 py-3">
        <div class="activity-timestamp">${timestamp}</div>
        <div class="activity-timestamp-relative">${relativeTime}</div>
      </td>
      <td class="px-4 py-3">${actionBadgeHtml}</td>
      <td class="px-4 py-3">
        <div class="activity-sentence">${sentence}</div>
      </td>
      <td class="px-4 py-3">${channelHtml}</td>
      <td class="px-4 py-3">${metadataCellHtml}</td>
    `;

    return row;
  }

  private wireMetadataToggles(): void {
    const toggles = document.querySelectorAll<HTMLButtonElement>('[data-metadata-toggle]');

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const entryId = toggle.dataset.metadataToggle;
        const content = document.querySelector<HTMLElement>(`[data-metadata-content="${entryId}"]`);

        if (!content) return;

        const isExpanded = content.dataset.expanded === 'true';
        content.dataset.expanded = isExpanded ? 'false' : 'true';
        toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
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

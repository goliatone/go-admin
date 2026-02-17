/**
 * E-Sign Integration Sync Runs Page Controller
 * Timeline view for CRM/HRIS sync operations
 */

import { qs, show, hide, onReady, announce } from '../utils/dom-helpers.js';

/**
 * Configuration for the integration sync runs page
 */
export interface IntegrationSyncRunsConfig {
  basePath: string;
  apiBasePath?: string;
}

/**
 * Sync run record
 */
interface SyncRun {
  id: string;
  provider: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'running' | 'completed' | 'failed';
  mapping_spec_id?: string;
  cursor?: string;
  started_at?: string;
  completed_at?: string;
  last_error?: string;
  attempt_count?: number;
}

/**
 * Mapping spec (for start sync modal)
 */
interface MappingSpec {
  id: string;
  name: string;
  provider: string;
  status: 'draft' | 'published';
}

/**
 * Checkpoint record
 */
interface Checkpoint {
  checkpoint_key: string;
  cursor: string;
  created_at?: string;
}

type PageState = 'loading' | 'empty' | 'error' | 'list';

/**
 * Integration Sync Runs page controller
 * Manages sync operations timeline, start sync, and run detail
 */
export class IntegrationSyncRunsController {
  private readonly config: IntegrationSyncRunsConfig;
  private readonly apiBase: string;
  private readonly syncRunsEndpoint: string;
  private readonly mappingsEndpoint: string;

  private syncRuns: SyncRun[] = [];
  private mappings: MappingSpec[] = [];
  private currentRunId: string | null = null;

  private readonly elements: {
    announcements: HTMLElement | null;
    loadingState: HTMLElement | null;
    emptyState: HTMLElement | null;
    errorState: HTMLElement | null;
    runsTimeline: HTMLElement | null;
    errorMessage: HTMLElement | null;
    refreshBtn: HTMLElement | null;
    retryBtn: HTMLElement | null;
    filterProvider: HTMLSelectElement | null;
    filterStatus: HTMLSelectElement | null;
    filterDirection: HTMLSelectElement | null;
    statTotal: HTMLElement | null;
    statRunning: HTMLElement | null;
    statCompleted: HTMLElement | null;
    statFailed: HTMLElement | null;
    startSyncBtn: HTMLElement | null;
    startSyncEmptyBtn: HTMLElement | null;
    startSyncModal: HTMLElement | null;
    startSyncForm: HTMLFormElement | null;
    cancelSyncBtn: HTMLElement | null;
    submitSyncBtn: HTMLElement | null;
    syncMappingSelect: HTMLSelectElement | null;
    runDetailModal: HTMLElement | null;
    closeDetailBtn: HTMLElement | null;
    detailRunId: HTMLElement | null;
    detailProvider: HTMLElement | null;
    detailDirection: HTMLElement | null;
    detailStatus: HTMLElement | null;
    detailStarted: HTMLElement | null;
    detailCompleted: HTMLElement | null;
    detailCursor: HTMLElement | null;
    detailAttempt: HTMLElement | null;
    detailErrorSection: HTMLElement | null;
    detailLastError: HTMLElement | null;
    detailCheckpoints: HTMLElement | null;
    actionResumeBtn: HTMLElement | null;
    actionRetryBtn: HTMLElement | null;
    actionCompleteBtn: HTMLElement | null;
    actionFailBtn: HTMLElement | null;
    actionDiagnosticsBtn: HTMLElement | null;
  };

  constructor(config: IntegrationSyncRunsConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;
    this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`;
    this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`;

    this.elements = {
      announcements: qs('#sync-announcements'),
      loadingState: qs('#loading-state'),
      emptyState: qs('#empty-state'),
      errorState: qs('#error-state'),
      runsTimeline: qs('#runs-timeline'),
      errorMessage: qs('#error-message'),
      refreshBtn: qs('#refresh-btn'),
      retryBtn: qs('#retry-btn'),
      filterProvider: qs<HTMLSelectElement>('#filter-provider'),
      filterStatus: qs<HTMLSelectElement>('#filter-status'),
      filterDirection: qs<HTMLSelectElement>('#filter-direction'),
      statTotal: qs('#stat-total'),
      statRunning: qs('#stat-running'),
      statCompleted: qs('#stat-completed'),
      statFailed: qs('#stat-failed'),
      startSyncBtn: qs('#start-sync-btn'),
      startSyncEmptyBtn: qs('#start-sync-empty-btn'),
      startSyncModal: qs('#start-sync-modal'),
      startSyncForm: qs<HTMLFormElement>('#start-sync-form'),
      cancelSyncBtn: qs('#cancel-sync-btn'),
      submitSyncBtn: qs('#submit-sync-btn'),
      syncMappingSelect: qs<HTMLSelectElement>('#sync-mapping'),
      runDetailModal: qs('#run-detail-modal'),
      closeDetailBtn: qs('#close-detail-btn'),
      detailRunId: qs('#detail-run-id'),
      detailProvider: qs('#detail-provider'),
      detailDirection: qs('#detail-direction'),
      detailStatus: qs('#detail-status'),
      detailStarted: qs('#detail-started'),
      detailCompleted: qs('#detail-completed'),
      detailCursor: qs('#detail-cursor'),
      detailAttempt: qs('#detail-attempt'),
      detailErrorSection: qs('#detail-error-section'),
      detailLastError: qs('#detail-last-error'),
      detailCheckpoints: qs('#detail-checkpoints'),
      actionResumeBtn: qs('#action-resume-btn'),
      actionRetryBtn: qs('#action-retry-btn'),
      actionCompleteBtn: qs('#action-complete-btn'),
      actionFailBtn: qs('#action-fail-btn'),
      actionDiagnosticsBtn: qs('#action-diagnostics-btn'),
    };
  }

  /**
   * Initialize the sync runs page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await Promise.all([this.loadMappings(), this.loadSyncRuns()]);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const {
      startSyncBtn,
      startSyncEmptyBtn,
      cancelSyncBtn,
      startSyncForm,
      refreshBtn,
      retryBtn,
      closeDetailBtn,
      filterProvider,
      filterStatus,
      filterDirection,
      actionResumeBtn,
      actionRetryBtn,
      actionCompleteBtn,
      actionFailBtn,
      actionDiagnosticsBtn,
      startSyncModal,
      runDetailModal,
    } = this.elements;

    // Start sync modal
    startSyncBtn?.addEventListener('click', () => this.openStartSyncModal());
    startSyncEmptyBtn?.addEventListener('click', () => this.openStartSyncModal());
    cancelSyncBtn?.addEventListener('click', () => this.closeStartSyncModal());
    startSyncForm?.addEventListener('submit', (e) => this.startSync(e));

    // List actions
    refreshBtn?.addEventListener('click', () => this.loadSyncRuns());
    retryBtn?.addEventListener('click', () => this.loadSyncRuns());
    closeDetailBtn?.addEventListener('click', () => this.closeRunDetail());

    // Filters
    filterProvider?.addEventListener('change', () => this.renderTimeline());
    filterStatus?.addEventListener('change', () => this.renderTimeline());
    filterDirection?.addEventListener('change', () => this.renderTimeline());

    // Run actions
    actionResumeBtn?.addEventListener('click', () => this.runAction('resume'));
    actionRetryBtn?.addEventListener('click', () => this.runAction('resume'));
    actionCompleteBtn?.addEventListener('click', () => this.runAction('complete'));
    actionFailBtn?.addEventListener('click', () => this.runAction('fail'));
    actionDiagnosticsBtn?.addEventListener('click', () => this.openDiagnostics());

    // Modal escape/backdrop
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (startSyncModal && !startSyncModal.classList.contains('hidden')) {
          this.closeStartSyncModal();
        }
        if (runDetailModal && !runDetailModal.classList.contains('hidden')) {
          this.closeRunDetail();
        }
      }
    });

    [startSyncModal, runDetailModal].forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modal || target.getAttribute('aria-hidden') === 'true') {
          if (modal === startSyncModal) this.closeStartSyncModal();
          else if (modal === runDetailModal) this.closeRunDetail();
        }
      });
    });
  }

  /**
   * Announce message for screen readers
   */
  private announce(message: string): void {
    const { announcements } = this.elements;
    if (announcements) {
      announcements.textContent = message;
    }
    announce(message);
  }

  /**
   * Show a specific page state
   */
  private showState(state: PageState): void {
    const { loadingState, emptyState, errorState, runsTimeline } = this.elements;

    hide(loadingState);
    hide(emptyState);
    hide(errorState);
    hide(runsTimeline);

    switch (state) {
      case 'loading':
        show(loadingState);
        break;
      case 'empty':
        show(emptyState);
        break;
      case 'error':
        show(errorState);
        break;
      case 'list':
        show(runsTimeline);
        break;
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Format date string
   */
  private formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return dateStr;
    }
  }

  /**
   * Get status badge HTML
   */
  private getStatusBadge(status: string): string {
    const configs: Record<
      string,
      { label: string; bg: string; text: string; dot: string; animate?: boolean }
    > = {
      pending: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
      running: {
        label: 'Running',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
        animate: true,
      },
      completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
      failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    };
    const config = configs[status] || configs.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}">
      <span class="w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}" aria-hidden="true"></span>
      ${config.label}
    </span>`;
  }

  /**
   * Get direction badge HTML
   */
  private getDirectionBadge(direction: string): string {
    if (direction === 'inbound') {
      return '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">↓ Inbound</span>';
    }
    return '<span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">↑ Outbound</span>';
  }

  /**
   * Load mappings from API
   */
  async loadMappings(): Promise<void> {
    try {
      const response = await fetch(this.mappingsEndpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        this.mappings = (data.mappings || []).filter((m: MappingSpec) => m.status === 'published');
        this.populateMappingSelect();
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  }

  /**
   * Populate mapping select dropdown
   */
  private populateMappingSelect(): void {
    const { syncMappingSelect } = this.elements;
    if (!syncMappingSelect) return;

    syncMappingSelect.innerHTML =
      '<option value="">Select mapping...</option>' +
      this.mappings
        .map(
          (m) =>
            `<option value="${this.escapeHtml(m.id)}">${this.escapeHtml(m.name)} (${this.escapeHtml(m.provider)})</option>`
        )
        .join('');
  }

  /**
   * Load sync runs from API
   */
  async loadSyncRuns(): Promise<void> {
    this.showState('loading');

    try {
      const { filterProvider } = this.elements;
      const params = new URLSearchParams();
      if (filterProvider?.value) {
        params.set('provider', filterProvider.value);
      }

      const response = await fetch(
        `${this.syncRunsEndpoint}${params.toString() ? '?' + params : ''}`,
        {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.syncRuns = data.runs || [];

      // Populate provider filter
      this.populateProviderFilter();

      this.updateStats();
      this.renderTimeline();
      this.announce(`Loaded ${this.syncRuns.length} sync runs`);
    } catch (error) {
      console.error('Error loading sync runs:', error);
      const { errorMessage } = this.elements;
      if (errorMessage) {
        errorMessage.textContent = error instanceof Error ? error.message : 'An error occurred';
      }
      this.showState('error');
    }
  }

  /**
   * Populate provider filter dropdown
   */
  private populateProviderFilter(): void {
    const { filterProvider } = this.elements;
    if (!filterProvider) return;

    const currentProvider = filterProvider.value;
    const providers = [...new Set(this.syncRuns.map((r) => r.provider).filter(Boolean))];

    filterProvider.innerHTML =
      '<option value="">All Providers</option>' +
      providers
        .map(
          (p) =>
            `<option value="${this.escapeHtml(p)}" ${p === currentProvider ? 'selected' : ''}>${this.escapeHtml(p)}</option>`
        )
        .join('');
  }

  /**
   * Update stats display
   */
  private updateStats(): void {
    const { statTotal, statRunning, statCompleted, statFailed } = this.elements;

    const total = this.syncRuns.length;
    const running = this.syncRuns.filter(
      (r) => r.status === 'running' || r.status === 'pending'
    ).length;
    const completed = this.syncRuns.filter((r) => r.status === 'completed').length;
    const failed = this.syncRuns.filter((r) => r.status === 'failed').length;

    if (statTotal) statTotal.textContent = String(total);
    if (statRunning) statRunning.textContent = String(running);
    if (statCompleted) statCompleted.textContent = String(completed);
    if (statFailed) statFailed.textContent = String(failed);
  }

  /**
   * Render sync runs timeline with filters applied
   */
  private renderTimeline(): void {
    const { runsTimeline, filterStatus, filterDirection } = this.elements;
    if (!runsTimeline) return;

    const statusFilter = filterStatus?.value || '';
    const directionFilter = filterDirection?.value || '';

    const filtered = this.syncRuns.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (directionFilter && r.direction !== directionFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      this.showState('empty');
      return;
    }

    runsTimeline.innerHTML = filtered
      .map(
        (run) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(run.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${run.status === 'running' ? 'bg-blue-100' : run.status === 'completed' ? 'bg-green-100' : run.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'} flex items-center justify-center">
                <svg class="w-5 h-5 ${run.status === 'running' ? 'text-blue-600 animate-spin' : run.status === 'completed' ? 'text-green-600' : run.status === 'failed' ? 'text-red-600' : 'text-gray-400'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${this.escapeHtml(run.provider)}</span>
                  ${this.getDirectionBadge(run.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(run.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(run.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(run.started_at)}</p>
            </div>
          </div>

          ${
            run.cursor
              ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(run.cursor)}</span></p>
            </div>
          `
              : ''
          }

          ${
            run.last_error
              ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(run.last_error)}</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
      )
      .join('');

    this.showState('list');

    // Attach click listeners
    runsTimeline.querySelectorAll<HTMLElement>('.sync-run-card').forEach((card) => {
      card.addEventListener('click', () => this.openRunDetail(card.dataset.id || ''));
    });
  }

  /**
   * Open start sync modal
   */
  private openStartSyncModal(): void {
    const { startSyncModal, startSyncForm } = this.elements;

    startSyncForm?.reset();
    show(startSyncModal);

    const syncProviderInput = document.getElementById('sync-provider') as HTMLInputElement | null;
    syncProviderInput?.focus();
  }

  /**
   * Close start sync modal
   */
  private closeStartSyncModal(): void {
    hide(this.elements.startSyncModal);
  }

  /**
   * Start a new sync run
   */
  private async startSync(e: Event): Promise<void> {
    e.preventDefault();

    const { startSyncForm, submitSyncBtn } = this.elements;
    if (!startSyncForm || !submitSyncBtn) return;

    const formData = new FormData(startSyncForm);
    const payload = {
      provider: formData.get('provider'),
      direction: formData.get('direction'),
      mapping_spec_id: formData.get('mapping_spec_id'),
      cursor: formData.get('cursor') || undefined,
    };

    submitSyncBtn.setAttribute('disabled', 'true');
    submitSyncBtn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...`;

    try {
      const response = await fetch(this.syncRunsEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': `sync-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast('Sync run started', 'success');
      this.announce('Sync run started');
      this.closeStartSyncModal();
      await this.loadSyncRuns();
    } catch (error) {
      console.error('Start sync error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to start: ${message}`, 'error');
    } finally {
      submitSyncBtn.removeAttribute('disabled');
      submitSyncBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync`;
    }
  }

  /**
   * Open run detail modal
   */
  private async openRunDetail(runId: string): Promise<void> {
    this.currentRunId = runId;
    const run = this.syncRuns.find((r) => r.id === runId);
    if (!run) return;

    const {
      runDetailModal,
      detailRunId,
      detailProvider,
      detailDirection,
      detailStatus,
      detailStarted,
      detailCompleted,
      detailCursor,
      detailAttempt,
      detailErrorSection,
      detailLastError,
      detailCheckpoints,
      actionResumeBtn,
      actionRetryBtn,
      actionCompleteBtn,
      actionFailBtn,
    } = this.elements;

    // Populate basic info
    if (detailRunId) detailRunId.textContent = run.id;
    if (detailProvider) detailProvider.textContent = run.provider;
    if (detailDirection) {
      detailDirection.textContent =
        run.direction === 'inbound' ? 'Inbound (Import)' : 'Outbound (Export)';
    }
    if (detailStatus) detailStatus.innerHTML = this.getStatusBadge(run.status);
    if (detailStarted) detailStarted.textContent = this.formatDate(run.started_at);
    if (detailCompleted) {
      detailCompleted.textContent = run.completed_at ? this.formatDate(run.completed_at) : '-';
    }
    if (detailCursor) detailCursor.textContent = run.cursor || '-';
    if (detailAttempt) detailAttempt.textContent = String(run.attempt_count || 1);

    // Error section
    if (run.last_error) {
      if (detailLastError) detailLastError.textContent = run.last_error;
      show(detailErrorSection);
    } else {
      hide(detailErrorSection);
    }

    // Show/hide action buttons based on status
    if (actionResumeBtn) {
      actionResumeBtn.classList.toggle('hidden', run.status !== 'running');
    }
    if (actionRetryBtn) {
      actionRetryBtn.classList.toggle('hidden', run.status !== 'failed');
    }
    if (actionCompleteBtn) {
      actionCompleteBtn.classList.toggle('hidden', run.status !== 'running');
    }
    if (actionFailBtn) {
      actionFailBtn.classList.toggle('hidden', run.status !== 'running');
    }

    // Load checkpoints
    if (detailCheckpoints) {
      detailCheckpoints.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>';
    }

    show(runDetailModal);

    // Fetch checkpoints
    try {
      const response = await fetch(`${this.syncRunsEndpoint}/${runId}/checkpoints`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        this.renderCheckpoints(data.checkpoints || []);
      } else {
        if (detailCheckpoints) {
          detailCheckpoints.innerHTML =
            '<p class="text-sm text-gray-500">No checkpoints available</p>';
        }
      }
    } catch (error) {
      console.error('Error loading checkpoints:', error);
      if (detailCheckpoints) {
        detailCheckpoints.innerHTML =
          '<p class="text-sm text-red-600">Failed to load checkpoints</p>';
      }
    }
  }

  /**
   * Render checkpoints
   */
  private renderCheckpoints(checkpoints: Checkpoint[]): void {
    const { detailCheckpoints } = this.elements;
    if (!detailCheckpoints) return;

    if (checkpoints.length === 0) {
      detailCheckpoints.innerHTML = '<p class="text-sm text-gray-500">No checkpoints recorded</p>';
      return;
    }

    detailCheckpoints.innerHTML = checkpoints
      .map(
        (cp, index) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${index + 1}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-900">${this.escapeHtml(cp.checkpoint_key)}</span>
            <span class="text-xs text-gray-500">${this.formatDate(cp.created_at)}</span>
          </div>
          <p class="text-xs text-gray-600 font-mono truncate">Cursor: ${this.escapeHtml(cp.cursor)}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Close run detail modal
   */
  private closeRunDetail(): void {
    hide(this.elements.runDetailModal);
    this.currentRunId = null;
  }

  /**
   * Run an action on the current sync run
   */
  private async runAction(action: 'resume' | 'complete' | 'fail'): Promise<void> {
    if (!this.currentRunId) return;

    const { actionResumeBtn, actionRetryBtn, actionCompleteBtn, actionFailBtn } = this.elements;

    const btn =
      action === 'resume'
        ? actionResumeBtn
        : action === 'complete'
          ? actionCompleteBtn
          : actionFailBtn;

    // Also check retry button for resume action
    const retryBtn = action === 'resume' ? actionRetryBtn : null;

    if (!btn) return;

    btn.setAttribute('disabled', 'true');
    retryBtn?.setAttribute('disabled', 'true');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;

    try {
      const endpoint = `${this.syncRunsEndpoint}/${this.currentRunId}/${action}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': `${action}-${this.currentRunId}-${Date.now()}`,
        },
        body: JSON.stringify(
          action === 'fail' ? { last_error: 'Manually marked as failed' } : {}
        ),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast(`Sync run ${action} successful`, 'success');
      this.closeRunDetail();
      await this.loadSyncRuns();
    } catch (error) {
      console.error(`${action} error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed: ${message}`, 'error');
    } finally {
      btn.removeAttribute('disabled');
      retryBtn?.removeAttribute('disabled');
      btn.innerHTML = originalText;
    }
  }

  /**
   * Open diagnostics for current run
   */
  private async openDiagnostics(): Promise<void> {
    if (!this.currentRunId) return;

    try {
      const response = await fetch(
        `${this.apiBase}/esign/integrations/diagnostics?run_id=${this.currentRunId}`,
        {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Diagnostics:', data);
        this.showToast('Diagnostics logged to console', 'info');
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
    }
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const win = window as unknown as Record<string, unknown>;
    const toastManager = win.toastManager as
      | { success: (msg: string) => void; error: (msg: string) => void; info?: (msg: string) => void }
      | undefined;

    if (toastManager) {
      if (type === 'success') {
        toastManager.success(message);
      } else if (type === 'error') {
        toastManager.error(message);
      } else if (type === 'info' && toastManager.info) {
        toastManager.info(message);
      }
    }
  }
}

/**
 * Initialize integration sync runs page from config
 */
export function initIntegrationSyncRuns(
  config: IntegrationSyncRunsConfig
): IntegrationSyncRunsController {
  const controller = new IntegrationSyncRunsController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap integration sync runs page from template context
 */
export function bootstrapIntegrationSyncRuns(config: {
  basePath: string;
  apiBasePath?: string;
}): void {
  const pageConfig: IntegrationSyncRunsConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
  };

  const controller = new IntegrationSyncRunsController(pageConfig);
  onReady(() => controller.init());

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignIntegrationSyncRunsController = controller;
  }
}

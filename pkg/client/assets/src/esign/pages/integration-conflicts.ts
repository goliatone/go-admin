/**
 * E-Sign Integration Conflicts Page Controller
 * Conflict queue management for CRM/HRIS sync operations
 */

import { qs, show, hide, onReady, announce } from '../utils/dom-helpers.js';

/**
 * Configuration for the integration conflicts page
 */
export interface IntegrationConflictsConfig {
  basePath: string;
  apiBasePath?: string;
}

/**
 * Conflict record
 */
interface ConflictRecord {
  id: string;
  status: 'pending' | 'resolved' | 'ignored';
  reason?: string;
  provider: string;
  entity_kind: string;
  external_id: string;
  internal_id?: string;
  binding_id?: string;
  run_id?: string;
  version?: number;
  payload?: Record<string, unknown>;
  payload_json?: string;
  resolution?: Record<string, unknown>;
  resolution_json?: string;
  resolved_at?: string;
  resolved_by_user_id?: string;
  created_at?: string;
}

type PageState = 'loading' | 'empty' | 'error' | 'list';

/**
 * Integration Conflicts page controller
 * Manages conflict queue, detail view, and resolution workflow
 */
export class IntegrationConflictsController {
  private readonly config: IntegrationConflictsConfig;
  private readonly apiBase: string;
  private readonly conflictsEndpoint: string;

  private conflicts: ConflictRecord[] = [];
  private currentConflictId: string | null = null;

  private readonly elements: {
    announcements: HTMLElement | null;
    loadingState: HTMLElement | null;
    emptyState: HTMLElement | null;
    errorState: HTMLElement | null;
    conflictsList: HTMLElement | null;
    errorMessage: HTMLElement | null;
    refreshBtn: HTMLElement | null;
    retryBtn: HTMLElement | null;
    filterStatus: HTMLSelectElement | null;
    filterProvider: HTMLSelectElement | null;
    filterEntity: HTMLSelectElement | null;
    statPending: HTMLElement | null;
    statResolved: HTMLElement | null;
    statIgnored: HTMLElement | null;
    conflictDetailModal: HTMLElement | null;
    closeDetailBtn: HTMLElement | null;
    detailReason: HTMLElement | null;
    detailEntityType: HTMLElement | null;
    detailStatusBadge: HTMLElement | null;
    detailProvider: HTMLElement | null;
    detailExternalId: HTMLElement | null;
    detailInternalId: HTMLElement | null;
    detailBindingId: HTMLElement | null;
    detailPayload: HTMLElement | null;
    resolutionSection: HTMLElement | null;
    detailResolvedAt: HTMLElement | null;
    detailResolvedBy: HTMLElement | null;
    detailResolution: HTMLElement | null;
    detailConflictId: HTMLElement | null;
    detailRunId: HTMLElement | null;
    detailCreatedAt: HTMLElement | null;
    detailVersion: HTMLElement | null;
    actionButtons: HTMLElement | null;
    actionResolveBtn: HTMLElement | null;
    actionIgnoreBtn: HTMLElement | null;
    resolveModal: HTMLElement | null;
    resolveForm: HTMLFormElement | null;
    cancelResolveBtn: HTMLElement | null;
    submitResolveBtn: HTMLElement | null;
    resolutionAction: HTMLSelectElement | null;
  };

  constructor(config: IntegrationConflictsConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;
    this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`;

    this.elements = {
      announcements: qs('#conflicts-announcements'),
      loadingState: qs('#loading-state'),
      emptyState: qs('#empty-state'),
      errorState: qs('#error-state'),
      conflictsList: qs('#conflicts-list'),
      errorMessage: qs('#error-message'),
      refreshBtn: qs('#refresh-btn'),
      retryBtn: qs('#retry-btn'),
      filterStatus: qs<HTMLSelectElement>('#filter-status'),
      filterProvider: qs<HTMLSelectElement>('#filter-provider'),
      filterEntity: qs<HTMLSelectElement>('#filter-entity'),
      statPending: qs('#stat-pending'),
      statResolved: qs('#stat-resolved'),
      statIgnored: qs('#stat-ignored'),
      conflictDetailModal: qs('#conflict-detail-modal'),
      closeDetailBtn: qs('#close-detail-btn'),
      detailReason: qs('#detail-reason'),
      detailEntityType: qs('#detail-entity-type'),
      detailStatusBadge: qs('#detail-status-badge'),
      detailProvider: qs('#detail-provider'),
      detailExternalId: qs('#detail-external-id'),
      detailInternalId: qs('#detail-internal-id'),
      detailBindingId: qs('#detail-binding-id'),
      detailPayload: qs('#detail-payload'),
      resolutionSection: qs('#resolution-section'),
      detailResolvedAt: qs('#detail-resolved-at'),
      detailResolvedBy: qs('#detail-resolved-by'),
      detailResolution: qs('#detail-resolution'),
      detailConflictId: qs('#detail-conflict-id'),
      detailRunId: qs('#detail-run-id'),
      detailCreatedAt: qs('#detail-created-at'),
      detailVersion: qs('#detail-version'),
      actionButtons: qs('#action-buttons'),
      actionResolveBtn: qs('#action-resolve-btn'),
      actionIgnoreBtn: qs('#action-ignore-btn'),
      resolveModal: qs('#resolve-modal'),
      resolveForm: qs<HTMLFormElement>('#resolve-form'),
      cancelResolveBtn: qs('#cancel-resolve-btn'),
      submitResolveBtn: qs('#submit-resolve-btn'),
      resolutionAction: qs<HTMLSelectElement>('#resolution-action'),
    };
  }

  /**
   * Initialize the conflicts page
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadConflicts();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const {
      refreshBtn,
      retryBtn,
      closeDetailBtn,
      filterStatus,
      filterProvider,
      filterEntity,
      actionResolveBtn,
      actionIgnoreBtn,
      cancelResolveBtn,
      resolveForm,
      conflictDetailModal,
      resolveModal,
    } = this.elements;

    // List actions
    refreshBtn?.addEventListener('click', () => this.loadConflicts());
    retryBtn?.addEventListener('click', () => this.loadConflicts());

    // Detail modal
    closeDetailBtn?.addEventListener('click', () => this.closeConflictDetail());

    // Filters
    filterStatus?.addEventListener('change', () => this.loadConflicts());
    filterProvider?.addEventListener('change', () => this.renderConflicts());
    filterEntity?.addEventListener('change', () => this.renderConflicts());

    // Actions
    actionResolveBtn?.addEventListener('click', () => this.openResolveModal('resolved'));
    actionIgnoreBtn?.addEventListener('click', () => this.openResolveModal('ignored'));
    cancelResolveBtn?.addEventListener('click', () => this.closeResolveModal());
    resolveForm?.addEventListener('submit', (e) => this.submitResolution(e));

    // Modal escape/backdrop
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (resolveModal && !resolveModal.classList.contains('hidden')) {
          this.closeResolveModal();
        } else if (conflictDetailModal && !conflictDetailModal.classList.contains('hidden')) {
          this.closeConflictDetail();
        }
      }
    });

    [conflictDetailModal, resolveModal].forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modal || target.getAttribute('aria-hidden') === 'true') {
          if (modal === conflictDetailModal) this.closeConflictDetail();
          else if (modal === resolveModal) this.closeResolveModal();
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
    const { loadingState, emptyState, errorState, conflictsList } = this.elements;

    hide(loadingState);
    hide(emptyState);
    hide(errorState);
    hide(conflictsList);

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
        show(conflictsList);
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
    const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
      ignored: { label: 'Ignored', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
    };
    const config = configs[status] || configs.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}">
      <span class="w-1.5 h-1.5 rounded-full ${config.dot}" aria-hidden="true"></span>
      ${config.label}
    </span>`;
  }

  /**
   * Get entity badge HTML
   */
  private getEntityBadge(entityKind: string): string {
    const configs: Record<string, { label: string; bg: string; text: string }> = {
      participant: { label: 'Participant', bg: 'bg-blue-100', text: 'text-blue-700' },
      agreement: { label: 'Agreement', bg: 'bg-purple-100', text: 'text-purple-700' },
      field_definition: { label: 'Field Definition', bg: 'bg-teal-100', text: 'text-teal-700' },
    };
    const config = configs[entityKind] || { label: entityKind, bg: 'bg-gray-100', text: 'text-gray-700' };
    return `<span class="px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}">${config.label}</span>`;
  }

  /**
   * Load conflicts from API
   */
  async loadConflicts(): Promise<void> {
    this.showState('loading');

    try {
      const { filterStatus } = this.elements;
      const params = new URLSearchParams();
      if (filterStatus?.value) {
        params.set('status', filterStatus.value);
      }

      const response = await fetch(`${this.conflictsEndpoint}${params.toString() ? '?' + params : ''}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.conflicts = data.conflicts || [];

      // Populate provider filter
      this.populateProviderFilter();

      this.updateStats();
      this.renderConflicts();
      this.announce(`Loaded ${this.conflicts.length} conflicts`);
    } catch (error) {
      console.error('Error loading conflicts:', error);
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
    const providers = [...new Set(this.conflicts.map((c) => c.provider).filter(Boolean))];

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
    const { statPending, statResolved, statIgnored } = this.elements;

    const pending = this.conflicts.filter((c) => c.status === 'pending').length;
    const resolved = this.conflicts.filter((c) => c.status === 'resolved').length;
    const ignored = this.conflicts.filter((c) => c.status === 'ignored').length;

    if (statPending) statPending.textContent = String(pending);
    if (statResolved) statResolved.textContent = String(resolved);
    if (statIgnored) statIgnored.textContent = String(ignored);
  }

  /**
   * Render conflicts list with filters applied
   */
  private renderConflicts(): void {
    const { conflictsList, filterStatus, filterProvider, filterEntity } = this.elements;
    if (!conflictsList) return;

    const statusFilter = filterStatus?.value || '';
    const providerFilter = filterProvider?.value || '';
    const entityFilter = filterEntity?.value || '';

    const filtered = this.conflicts.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (providerFilter && c.provider !== providerFilter) return false;
      if (entityFilter && c.entity_kind !== entityFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      this.showState('empty');
      return;
    }

    conflictsList.innerHTML = filtered
      .map(
        (conflict) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(conflict.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${conflict.status === 'pending' ? 'bg-amber-100' : conflict.status === 'resolved' ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center">
                <svg class="w-5 h-5 ${conflict.status === 'pending' ? 'text-amber-600' : conflict.status === 'resolved' ? 'text-green-600' : 'text-gray-500'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(conflict.reason || 'Data conflict')}</span>
                  ${this.getEntityBadge(conflict.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(conflict.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((conflict.external_id || '').slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(conflict.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(conflict.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    this.showState('list');

    // Attach click listeners
    conflictsList.querySelectorAll<HTMLElement>('.conflict-card').forEach((card) => {
      card.addEventListener('click', () => this.openConflictDetail(card.dataset.id || ''));
    });
  }

  /**
   * Open conflict detail modal
   */
  private openConflictDetail(conflictId: string): void {
    this.currentConflictId = conflictId;
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    const {
      conflictDetailModal,
      detailReason,
      detailEntityType,
      detailStatusBadge,
      detailProvider,
      detailExternalId,
      detailInternalId,
      detailBindingId,
      detailConflictId,
      detailRunId,
      detailCreatedAt,
      detailVersion,
      detailPayload,
      resolutionSection,
      actionButtons,
      detailResolvedAt,
      detailResolvedBy,
      detailResolution,
    } = this.elements;

    // Populate detail view
    if (detailReason) detailReason.textContent = conflict.reason || 'Data conflict';
    if (detailEntityType) detailEntityType.textContent = conflict.entity_kind || '-';
    if (detailStatusBadge) detailStatusBadge.innerHTML = this.getStatusBadge(conflict.status);
    if (detailProvider) detailProvider.textContent = conflict.provider || '-';
    if (detailExternalId) detailExternalId.textContent = conflict.external_id || '-';
    if (detailInternalId) detailInternalId.textContent = conflict.internal_id || '-';
    if (detailBindingId) detailBindingId.textContent = conflict.binding_id || '-';
    if (detailConflictId) detailConflictId.textContent = conflict.id;
    if (detailRunId) detailRunId.textContent = conflict.run_id || '-';
    if (detailCreatedAt) detailCreatedAt.textContent = this.formatDate(conflict.created_at);
    if (detailVersion) detailVersion.textContent = String(conflict.version || 1);

    // Payload
    if (detailPayload) {
      try {
        const payload = conflict.payload_json
          ? JSON.parse(conflict.payload_json)
          : conflict.payload || {};
        detailPayload.textContent = JSON.stringify(payload, null, 2);
      } catch {
        detailPayload.textContent = conflict.payload_json || '{}';
      }
    }

    // Resolution section
    if (conflict.status === 'resolved' || conflict.status === 'ignored') {
      show(resolutionSection);
      hide(actionButtons);

      if (detailResolvedAt) {
        detailResolvedAt.textContent = conflict.resolved_at ? this.formatDate(conflict.resolved_at) : '';
      }
      if (detailResolvedBy) {
        detailResolvedBy.textContent = conflict.resolved_by_user_id
          ? `By user ${conflict.resolved_by_user_id}`
          : '-';
      }
      if (detailResolution) {
        try {
          const resolution = conflict.resolution_json
            ? JSON.parse(conflict.resolution_json)
            : conflict.resolution || {};
          detailResolution.textContent = JSON.stringify(resolution, null, 2);
        } catch {
          detailResolution.textContent = conflict.resolution_json || '{}';
        }
      }
    } else {
      hide(resolutionSection);
      show(actionButtons);
    }

    show(conflictDetailModal);
  }

  /**
   * Close conflict detail modal
   */
  private closeConflictDetail(): void {
    hide(this.elements.conflictDetailModal);
    this.currentConflictId = null;
  }

  /**
   * Open resolve modal
   */
  private openResolveModal(presetStatus: 'resolved' | 'ignored' = 'resolved'): void {
    const { resolveModal, resolveForm, resolutionAction } = this.elements;

    resolveForm?.reset();
    if (resolutionAction) resolutionAction.value = presetStatus;

    show(resolveModal);
  }

  /**
   * Close resolve modal
   */
  private closeResolveModal(): void {
    hide(this.elements.resolveModal);
  }

  /**
   * Submit resolution
   */
  private async submitResolution(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.currentConflictId) return;

    const { resolveForm, submitResolveBtn } = this.elements;
    if (!resolveForm || !submitResolveBtn) return;

    const formData = new FormData(resolveForm);
    let resolution: Record<string, unknown> = {};

    const resolutionData = formData.get('resolution') as string;
    if (resolutionData) {
      try {
        resolution = JSON.parse(resolutionData);
      } catch {
        resolution = { raw: resolutionData };
      }
    }

    const notes = formData.get('notes') as string;
    if (notes) {
      resolution.notes = notes;
    }

    const payload = {
      status: formData.get('status'),
      resolution,
    };

    submitResolveBtn.setAttribute('disabled', 'true');
    submitResolveBtn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...`;

    try {
      const response = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': `resolve-${this.currentConflictId}-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      this.showToast('Conflict resolved', 'success');
      this.announce('Conflict resolved');
      this.closeResolveModal();
      this.closeConflictDetail();
      await this.loadConflicts();
    } catch (error) {
      console.error('Resolution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed: ${message}`, 'error');
    } finally {
      submitResolveBtn.removeAttribute('disabled');
      submitResolveBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution`;
    }
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    const win = window as unknown as Record<string, unknown>;
    const toastManager = win.toastManager as
      | { success: (msg: string) => void; error: (msg: string) => void }
      | undefined;

    if (toastManager) {
      if (type === 'success') {
        toastManager.success(message);
      } else {
        toastManager.error(message);
      }
    }
  }
}

/**
 * Initialize integration conflicts page from config
 */
export function initIntegrationConflicts(
  config: IntegrationConflictsConfig
): IntegrationConflictsController {
  const controller = new IntegrationConflictsController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap integration conflicts page from template context
 */
export function bootstrapIntegrationConflicts(config: {
  basePath: string;
  apiBasePath?: string;
}): void {
  const pageConfig: IntegrationConflictsConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
  };

  const controller = new IntegrationConflictsController(pageConfig);
  onReady(() => controller.init());

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignIntegrationConflictsController = controller;
  }
}

/**
 * Agreement Detail Page Controller
 *
 * Main controller for the agreement detail page. Handles:
 * - Timeline bootstrap and rendering
 * - Timestamp formatting
 * - Collapsible section wiring
 * - Review workspace hydration and actor rendering
 * - Command runtime refresh hooks
 * - Asset download handling
 * - Action execution
 *
 * @module esign/pages/agreement-detail
 */

import type {
  AgreementDetailPageConfig,
  AgreementReviewParticipant,
  AgreementTimelineBootstrap,
  AgreementReviewBootstrap,
  TimelineParticipant,
  TimelineActor,
} from '../types.js';

import {
  TimelineController,
  parseMergedTimelineBootstrap,
  formatTimestamp as timelineFormatTimestamp,
  formatRelativeTime as timelineFormatRelativeTime,
  looksLikeUUID,
  humanizeActorRole,
  getActorColor,
  getActorInitials,
} from '../timeline/index.js';
import {
  initCommandRuntime,
  type CommandRuntimeController,
} from '../../services/index.js';
import {
  executeActionRequest,
  formatStructuredErrorForDisplay,
} from '../../toast/error-helpers.js';

// =============================================================================
// Types
// =============================================================================

interface ScopeParams {
  tenantId: string;
  orgId: string;
}

// =============================================================================
// UUID Detection (re-exported for use in review workspace)
// =============================================================================

export { looksLikeUUID } from '../timeline/index.js';

// =============================================================================
// Timestamp Formatting
// =============================================================================

/**
 * Format a timestamp for display
 */
export function formatTimestamp(ts: string): string {
  return timelineFormatTimestamp(ts);
}

/**
 * Format a relative time for display
 */
export function formatRelativeTime(ts: string): string {
  return timelineFormatRelativeTime(ts);
}

/**
 * Format all timestamp nodes in the DOM
 */
export function formatTimestampNodes(root: Document | HTMLElement = document): void {
  root.querySelectorAll('[data-timestamp]').forEach((el) => {
    if (el.classList.contains('recipient-timestamp')) {
      return;
    }
    const ts = el.getAttribute('data-timestamp');
    if (ts) {
      el.textContent = formatTimestamp(ts);
    }
  });

  root.querySelectorAll('.recipient-timestamp').forEach((el) => {
    const ts = el.getAttribute('data-timestamp');
    if (ts) {
      el.textContent = formatRelativeTime(ts);
    }
  });
}

// =============================================================================
// Collapsible Sections
// =============================================================================

/**
 * Wire up collapsible section triggers
 */
export function wireCollapsibleSections(root: Document | HTMLElement = document): void {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest('.collapsible-trigger');
    if (!trigger) {
      return;
    }

    const targetId = trigger.getAttribute('aria-controls');
    const content = targetId ? document.getElementById(targetId) : null;
    if (!content) {
      return;
    }

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isExpanded));
    content.classList.toggle('expanded', !isExpanded);
  });
}

// =============================================================================
// Review Actor Resolution
// =============================================================================

/**
 * Build an actor map key from type and ID
 */
export function reviewActorKey(actorType: string, actorId: string): string {
  const normalizedActorType = String(actorType || '').trim();
  const normalizedActorId = String(actorId || '').trim();
  if (!normalizedActorType || !normalizedActorId) {
    return '';
  }
  return `${normalizedActorType}:${normalizedActorId}`;
}

/**
 * Find participant by ID in bootstrap data
 */
export function findParticipantById(
  participants: TimelineParticipant[],
  actorId: string
): TimelineParticipant | null {
  if (!actorId) {
    return null;
  }
  const normalizedId = String(actorId).trim();
  return participants.find((p) => {
    const pId = String(p.id || '').trim();
    const pRecipientId = String(p.recipient_id || '').trim();
    return pId === normalizedId || pRecipientId === normalizedId;
  }) || null;
}

/**
 * Resolve actor display info using review bootstrap data
 */
export function reviewActorInfo(
  actorType: string,
  actorId: string,
  bootstrap: AgreementReviewBootstrap
): { name: string; role: string; actor_type: string } {
  const actorMap = bootstrap.actor_map && typeof bootstrap.actor_map === 'object'
    ? bootstrap.actor_map
    : {};
  const participants = Array.isArray(bootstrap.participants) ? bootstrap.participants : [];

  const normalizedActorType = String(actorType || '').trim();
  const normalizedActorId = String(actorId || '').trim();

  // Build alias keys to check in actor_map
  const aliases: string[] = [];
  if (normalizedActorType === 'recipient' || normalizedActorType === 'signer') {
    aliases.push(reviewActorKey('recipient', actorId), reviewActorKey('signer', actorId));
  } else if (normalizedActorType === 'user' || normalizedActorType === 'sender') {
    aliases.push(reviewActorKey('user', actorId), reviewActorKey('sender', actorId));
  } else if (normalizedActorType === 'reviewer' || normalizedActorType === 'external') {
    aliases.push(reviewActorKey('reviewer', actorId), reviewActorKey('external', actorId));
  } else {
    aliases.push(reviewActorKey(normalizedActorType, actorId));
  }

  // Step 1 & 2: Check actor_map for name/email
  const actor = aliases.map((key) => actorMap[key]).find(Boolean) || ({} as TimelineActor);
  const actorName = String(actor.display_name || actor.name || '').trim();
  const actorEmail = String(actor.email || '').trim();

  // Step 3: Check bootstrap participants for display_name/email
  const participant = findParticipantById(participants, normalizedActorId);
  const participantDisplayName = participant
    ? String(participant.display_name || participant.name || '').trim()
    : '';
  const participantEmail = participant ? String(participant.email || '').trim() : '';

  // Step 4: Humanized role label
  const roleLabel = humanizeActorRole(actor.role || actor.actor_type || normalizedActorType);

  // Determine the best display name using fallback chain (never show UUID)
  let resolvedName = '';
  if (actorName && !looksLikeUUID(actorName)) {
    resolvedName = actorName;
  } else if (actorEmail && !looksLikeUUID(actorEmail)) {
    resolvedName = actorEmail;
  } else if (participantDisplayName && !looksLikeUUID(participantDisplayName)) {
    resolvedName = participantDisplayName;
  } else if (participantEmail && !looksLikeUUID(participantEmail)) {
    resolvedName = participantEmail;
  } else if (roleLabel) {
    resolvedName = roleLabel;
  } else {
    resolvedName = 'Unknown User';
  }

  return {
    name: resolvedName,
    role: String(actor.role || actor.actor_type || normalizedActorType || 'participant').trim() || 'participant',
    actor_type: String(actor.actor_type || normalizedActorType).trim(),
  };
}

/**
 * Apply actor metadata to review workspace DOM elements
 */
export function applyReviewActorMetadata(bootstrap: AgreementReviewBootstrap): void {
  document.querySelectorAll('[data-review-actor-avatar]').forEach((node) => {
    const actorType = node.getAttribute('data-actor-type') || '';
    const actorId = node.getAttribute('data-actor-id') || '';
    const actor = reviewActorInfo(actorType, actorId, bootstrap);
    const color = getActorColor(actor.actor_type);
    const initials = getActorInitials(actor.name, actor.role);

    node.textContent = initials;
    (node as HTMLElement).style.backgroundColor = color;
    (node as HTMLElement).style.color = '#ffffff';
  });

  document.querySelectorAll('[data-review-actor-name]').forEach((node) => {
    const actorType = node.getAttribute('data-actor-type') || '';
    const actorId = node.getAttribute('data-actor-id') || '';
    const actor = reviewActorInfo(actorType, actorId, bootstrap);
    node.textContent = actor.name;
  });

  document.querySelectorAll('[data-review-actor-role]').forEach((node) => {
    const actorType = node.getAttribute('data-actor-type') || '';
    const actorId = node.getAttribute('data-actor-id') || '';
    const actor = reviewActorInfo(actorType, actorId, bootstrap);
    node.textContent = humanizeActorRole(actor.role || actor.actor_type);
  });
}

// =============================================================================
// JSON Bootstrap Parsing
// =============================================================================

/**
 * Safely parse a JSON script element
 */
export function safeParseJSONScript<T>(
  id: string,
  fallback: T,
  root: Document | HTMLElement = document
): T {
  const node = root.querySelector(`#${id}`) as HTMLScriptElement | null;
  if (!node?.textContent) {
    return fallback;
  }
  try {
    return JSON.parse(node.textContent) as T;
  } catch (error) {
    console.warn(`Unable to parse ${id}`, error);
    return fallback;
  }
}

// =============================================================================
// Agreement Detail Page Controller
// =============================================================================

const DEFAULT_REVIEW_BOOTSTRAP: AgreementReviewBootstrap = {
  status: 'none',
  gate: 'approve_before_send',
  comments_enabled: false,
  review_id: '',
  override_active: false,
  override_reason: '',
  override_by_user_id: '',
  override_by_display_name: '',
  override_at: '',
  actor_map: {},
  participants: [],
};

/**
 * Agreement detail page controller
 */
export class AgreementDetailPageController {
  private readonly config: AgreementDetailPageConfig;
  private timelineController: TimelineController | null = null;
  private commandRuntimeController: CommandRuntimeController | null = null;
  private reviewBootstrap: AgreementReviewBootstrap;
  private initialized = false;
  private readonly clickHandler = (event: Event) => {
    void this.handleDocumentClick(event);
  };
  private readonly changeHandler = (event: Event) => {
    this.handleDocumentChange(event);
  };

  constructor(config: AgreementDetailPageConfig) {
    this.config = config;
    this.reviewBootstrap = { ...DEFAULT_REVIEW_BOOTSTRAP };
  }

  /**
   * Initialize the page controller
   */
  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Hydrate review bootstrap
    this.hydrateReviewBootstrap();

    // Format timestamps
    formatTimestampNodes();

    // Wire collapsible sections
    wireCollapsibleSections();

    // Apply review actor metadata
    applyReviewActorMetadata(this.reviewBootstrap);

    this.initializeReviewWorkspace();
    this.syncAgreementThreadAnchorFields();
    this.initializeDeliveryState();
    this.initCommandRuntime();
    document.addEventListener('click', this.clickHandler);
    document.addEventListener('change', this.changeHandler);

    // Initialize timeline
    this.initTimeline();
  }

  /**
   * Initialize the timeline controller
   */
  private initTimeline(): void {
    const timelineBootstrap = parseMergedTimelineBootstrap(
      'agreement-timeline-bootstrap',
      'agreement-review-bootstrap',
      {
        agreement_id: this.config.agreementId,
      }
    );

    // Create timeline controller
    this.timelineController = new TimelineController({
      containerId: 'agreement-timeline',
      refreshButtonId: 'timeline-refresh',
      viewToggleId: 'timeline-view-toggle',
      bootstrap: timelineBootstrap,
      basePath: this.config.basePath,
      apiBasePath: this.config.apiBasePath,
      agreementId: this.config.agreementId,
      panelName: this.config.panelName,
    });

    this.timelineController.init();
  }

  /**
   * Hydrate review bootstrap from JSON script
   */
  hydrateReviewBootstrap(root: Document | HTMLElement = document): void {
    const nextValue = safeParseJSONScript<AgreementReviewBootstrap>(
      'agreement-review-bootstrap',
      DEFAULT_REVIEW_BOOTSTRAP,
      root
    );

    // Clear and update
    Object.keys(this.reviewBootstrap).forEach((key) => {
      delete (this.reviewBootstrap as any)[key];
    });
    Object.assign(this.reviewBootstrap, nextValue);
  }

  /**
   * Get the current review bootstrap
   */
  getReviewBootstrap(): AgreementReviewBootstrap {
    return this.reviewBootstrap;
  }

  /**
   * Refresh after command runtime update
   */
  onCommandRuntimeRefresh(root: Document | HTMLElement = document): void {
    // Re-hydrate review bootstrap
    this.hydrateReviewBootstrap(root);

    this.initializeReviewWorkspace();

    // Re-apply actor metadata
    applyReviewActorMetadata(this.reviewBootstrap);

    // Format timestamps
    formatTimestampNodes(root);
    this.syncAgreementThreadAnchorFields();

    // Refresh timeline if the response includes new timeline data
    const newTimelineScript = root.querySelector('#agreement-timeline-bootstrap');
    if (newTimelineScript?.textContent && this.timelineController) {
      try {
        const newBootstrap = parseMergedTimelineBootstrap(
          'agreement-timeline-bootstrap',
          'agreement-review-bootstrap',
          { agreement_id: this.config.agreementId },
          root
        ) as AgreementTimelineBootstrap;
        this.timelineController.updateBootstrap(newBootstrap);
      } catch {
        // Timeline refresh will happen on next page load
      }
    }
  }

  /**
   * Get scope params from URL and resource
   */
  resolveScopeParams(): ScopeParams {
    const current = new URLSearchParams(window.location.search || '');
    const tenantId = (this.config.tenantId || current.get('tenant_id') || '').trim();
    const orgId = (this.config.orgId || current.get('org_id') || '').trim();
    return { tenantId, orgId };
  }

  /**
   * Build a scoped URL with tenant/org params
   */
  buildScopedURL(pathname: string): string {
    const urlObj = new URL(pathname, window.location.origin);
    const { tenantId, orgId } = this.resolveScopeParams();
    if (tenantId) {
      urlObj.searchParams.set('tenant_id', tenantId);
    }
    if (orgId) {
      urlObj.searchParams.set('org_id', orgId);
    }
    return urlObj.toString();
  }

  /**
   * Build asset download URL
   */
  buildAssetDownloadURL(assetType: string): string {
    const panelName = this.config.panelName || 'esign_agreements';
    const endpoint = new URL(
      `${this.config.apiBasePath}/panels/${panelName}/${this.config.agreementId}/artifact/${assetType}`,
      window.location.origin
    );
    const { tenantId, orgId } = this.resolveScopeParams();
    if (tenantId) {
      endpoint.searchParams.set('tenant_id', tenantId);
    }
    if (orgId) {
      endpoint.searchParams.set('org_id', orgId);
    }
    endpoint.searchParams.set('disposition', 'attachment');
    return endpoint.toString();
  }

  /**
   * Refresh the timeline
   */
  async refreshTimeline(): Promise<void> {
    if (this.timelineController) {
      await this.timelineController.refresh();
    }
  }

  private get panelName(): string {
    return this.config.panelName || 'esign_agreements';
  }

  private notifySuccess(message: string): void {
    const notifier = (window as typeof window & {
      toastManager?: { success?: (value: string) => void };
    }).toastManager;
    if (notifier?.success) {
      notifier.success(message);
    }
  }

  private notifyError(message: string): void {
    const notifier = (window as typeof window & {
      toastManager?: { error?: (value: string) => void };
    }).toastManager;
    if (notifier?.error) {
      notifier.error(message);
      return;
    }
    window.alert(message);
  }

  private getReviewRecipientRows(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-review-recipient-row]'));
  }

  private getExternalReviewersContainer(): HTMLElement | null {
    return document.getElementById('agreement-external-reviewers');
  }

  private normalizeParticipantType(value: unknown): string {
    return String(value || '').trim().toLowerCase();
  }

  private normalizeRecipientParticipant(row: HTMLElement): Record<string, unknown> | null {
    const enabled = row.querySelector<HTMLInputElement>('[data-review-recipient-enabled]');
    if (!enabled?.checked) {
      return null;
    }
    const recipientId = String(row.getAttribute('data-recipient-id') || '').trim();
    if (!recipientId) {
      return null;
    }
    return {
      participant_type: 'recipient',
      recipient_id: recipientId,
      can_comment: row.querySelector<HTMLInputElement>('[data-review-recipient-comment]')?.checked ?? true,
      can_approve: row.querySelector<HTMLInputElement>('[data-review-recipient-approve]')?.checked ?? true,
    };
  }

  private collectReviewParticipants(): Record<string, unknown>[] {
    const participants: Record<string, unknown>[] = [];

    this.getReviewRecipientRows().forEach((row) => {
      const participant = this.normalizeRecipientParticipant(row);
      if (participant) {
        participants.push(participant);
      }
    });

    const externalRows = Array.from(
      document.querySelectorAll<HTMLElement>('[data-review-external-row]')
    );
    externalRows.forEach((row) => {
      const email = String(
        row.querySelector<HTMLInputElement>('[data-review-external-email]')?.value || ''
      ).trim();
      if (!email) {
        return;
      }
      participants.push({
        participant_type: 'external',
        email,
        display_name: String(
          row.querySelector<HTMLInputElement>('[data-review-external-name]')?.value || ''
        ).trim(),
        can_comment: row.querySelector<HTMLInputElement>('[data-review-external-comment]')?.checked ?? true,
        can_approve: row.querySelector<HTMLInputElement>('[data-review-external-approve]')?.checked ?? true,
      });
    });

    return participants;
  }

  private syncExternalReviewersEmptyState(): void {
    const emptyState = document.getElementById('agreement-external-reviewers-empty');
    const container = this.getExternalReviewersContainer();
    if (!emptyState) {
      return;
    }
    const hasRows = Boolean(container?.querySelector('[data-review-external-row]'));
    emptyState.classList.toggle('hidden', hasRows);
  }

  private resetExternalReviewerRows(): void {
    const container = this.getExternalReviewersContainer();
    if (!container) {
      return;
    }
    container.innerHTML = '';
    this.syncExternalReviewersEmptyState();
  }

  private appendExternalReviewerRow(participant: Record<string, unknown> = {}): void {
    const container = this.getExternalReviewersContainer();
    const template = document.getElementById('agreement-external-reviewer-template') as HTMLTemplateElement | null;
    if (!container || !template?.content) {
      return;
    }

    const fragment = document.importNode(template.content, true);
    const row = fragment.querySelector<HTMLElement>('[data-review-external-row]');
    if (!row) {
      return;
    }

    const nameInput = row.querySelector<HTMLInputElement>('[data-review-external-name]');
    const emailInput = row.querySelector<HTMLInputElement>('[data-review-external-email]');
    const commentInput = row.querySelector<HTMLInputElement>('[data-review-external-comment]');
    const approveInput = row.querySelector<HTMLInputElement>('[data-review-external-approve]');

    if (nameInput) {
      nameInput.value = String(participant.display_name || participant.name || '').trim();
    }
    if (emailInput) {
      emailInput.value = String(participant.email || '').trim();
    }
    if (commentInput) {
      commentInput.checked = participant.can_comment !== false;
    }
    if (approveInput) {
      approveInput.checked = participant.can_approve !== false;
    }

    container.appendChild(fragment);
    this.syncExternalReviewersEmptyState();
  }

  private initializeReviewWorkspace(): void {
    const reviewGateSelect = document.getElementById('agreement-review-gate') as HTMLSelectElement | null;
    const commentsEnabledInput = document.getElementById('agreement-review-comments-enabled') as HTMLInputElement | null;

    if (reviewGateSelect) {
      reviewGateSelect.value = String(this.reviewBootstrap.gate || 'approve_before_send').trim() || 'approve_before_send';
    }
    if (commentsEnabledInput) {
      commentsEnabledInput.checked = Boolean(this.reviewBootstrap.comments_enabled);
    }

    const existingParticipants: AgreementReviewParticipant[] = Array.isArray(this.reviewBootstrap.participants)
      ? this.reviewBootstrap.participants
      : [];

    this.resetExternalReviewerRows();

    this.getReviewRecipientRows().forEach((row) => {
      const recipientId = String(row.getAttribute('data-recipient-id') || '').trim();
      const enabled = row.querySelector<HTMLInputElement>('[data-review-recipient-enabled]');
      const canComment = row.querySelector<HTMLInputElement>('[data-review-recipient-comment]');
      const canApprove = row.querySelector<HTMLInputElement>('[data-review-recipient-approve]');
      const match = existingParticipants.find((participant) =>
        this.normalizeParticipantType(participant?.participant_type) === 'recipient' &&
        String(participant?.recipient_id || '').trim() === recipientId
      );

      if (enabled) {
        enabled.checked = Boolean(match);
      }
      if (canComment) {
        canComment.checked = match ? Boolean(match.can_comment) : true;
      }
      if (canApprove) {
        canApprove.checked = match ? Boolean(match.can_approve) : true;
      }
    });

    existingParticipants
      .filter((participant) => this.normalizeParticipantType(participant?.participant_type) === 'external')
      .forEach((participant) => this.appendExternalReviewerRow(participant as unknown as Record<string, unknown>));

    this.syncExternalReviewersEmptyState();
  }

  private syncAgreementThreadAnchorFields(): void {
    const anchorType = String(
      (document.getElementById('agreement-thread-anchor-type') as HTMLSelectElement | null)?.value || 'agreement'
    ).trim() || 'agreement';
    document.getElementById('agreement-thread-page-wrap')?.classList.toggle('hidden', anchorType !== 'page');
    document.getElementById('agreement-thread-field-wrap')?.classList.toggle('hidden', anchorType !== 'field');
  }

  private syncBootstrapScriptContent(scriptId: string, sourceDocument: Document): void {
    const current = document.getElementById(scriptId);
    const incoming = sourceDocument.getElementById(scriptId);
    if (current && incoming) {
      current.textContent = incoming.textContent || '';
    }
  }

  private initCommandRuntime(): void {
    const mount = document.getElementById('agreement-review-command-region');
    if (!mount) {
      return;
    }
    this.commandRuntimeController?.destroy();
    this.commandRuntimeController = initCommandRuntime({
      mount,
      apiBasePath: this.config.apiBasePath,
      panelName: this.panelName,
      recordId: this.config.agreementId,
      rpcEndpoint: `${this.config.apiBasePath}/rpc`,
      tenantId: this.config.tenantId,
      orgId: this.config.orgId,
      onAfterRefresh: ({ sourceDocument }) => {
        this.syncBootstrapScriptContent('agreement-review-bootstrap', sourceDocument);
        this.syncBootstrapScriptContent('agreement-timeline-bootstrap', sourceDocument);
        this.onCommandRuntimeRefresh(document);
      },
    });
  }

  private async executeAction(action: string, payload: Record<string, unknown> = {}): Promise<void> {
    const endpoint = this.buildScopedURL(
      `${this.config.apiBasePath}/panels/${this.panelName}/actions/${action}`
    );

    const result = await executeActionRequest(
      endpoint,
      { id: this.config.agreementId, ...payload },
      { credentials: 'same-origin' }
    );

    if (!result.success || result.error) {
      const message = formatStructuredErrorForDisplay(result.error || {
        textCode: null,
        message: `${action} failed`,
        metadata: null,
        fields: null,
        validationErrors: null,
      }, `${action} failed`);
      throw new Error(message);
    }
  }

  private async executeActionAndReload(
    action: string,
    payload: Record<string, unknown> = {},
    successMessage = `${action} completed successfully`
  ): Promise<void> {
    await this.executeAction(action, payload);
    this.notifySuccess(successMessage);
    window.location.reload();
  }

  private setElementBusy(node: HTMLElement | null, busy: boolean): void {
    if (!node) {
      return;
    }
    if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement) {
      node.disabled = busy;
    }
    if (busy) {
      node.setAttribute('aria-busy', 'true');
    } else {
      node.removeAttribute('aria-busy');
    }
  }

  private async submitAgreementReview(trigger: HTMLElement | null): Promise<void> {
    if (trigger?.getAttribute('aria-busy') === 'true') {
      return;
    }
    const reviewGateSelect = document.getElementById('agreement-review-gate') as HTMLSelectElement | null;
    const commentsEnabledInput = document.getElementById('agreement-review-comments-enabled') as HTMLInputElement | null;
    const payload = {
      gate: String(reviewGateSelect?.value || 'approve_before_send').trim() || 'approve_before_send',
      comments_enabled: commentsEnabledInput?.checked ?? false,
      review_participants: this.collectReviewParticipants(),
    };
    const normalizedStatus = String(this.reviewBootstrap.status || '').trim().toLowerCase();
    const action = normalizedStatus && normalizedStatus !== 'none' && normalizedStatus !== 'in_review'
      ? 'reopen_review'
      : 'request_review';

    this.setElementBusy(trigger, true);
    try {
      await this.executeActionAndReload(action, payload, action === 'reopen_review' ? 'Review reopened' : 'Review requested');
    } catch (error) {
      this.notifyError(error instanceof Error ? error.message : 'Unable to submit review');
    } finally {
      this.setElementBusy(trigger, false);
    }
  }

  private resolveDownloadFilename(response: Response, fallback: string): string {
    const contentDisposition = response.headers.get('content-disposition') || '';
    const simple = contentDisposition.match(/filename="?([^"]+)"?/i);
    return simple?.[1] || fallback;
  }

  private showDownloadNotice(message: string, level: 'warning' | 'success' = 'warning'): void {
    const dynamicNotice = document.getElementById('download-status-notice-dynamic');
    if (!dynamicNotice) {
      return;
    }
    document.getElementById('download-status-notice-static')?.classList.add('hidden');
    dynamicNotice.className = `mx-6 mt-6 rounded-lg border p-4 text-sm ${
      level === 'success'
        ? 'border-green-200 bg-green-50 text-green-900'
        : 'border-amber-200 bg-amber-50 text-amber-900'
    }`;
    dynamicNotice.textContent = message;
    dynamicNotice.classList.remove('hidden');
  }

  private getExecutedDownloadButtons(): HTMLButtonElement[] {
    return Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-action="download-executed"]')
    );
  }

  private markExecutedDownloadUnavailable(message: string): void {
    const icon = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    this.getExecutedDownloadButtons().forEach((button) => {
      button.dataset.downloadState = 'unavailable';
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.classList.remove('btn-primary');
      button.classList.add('btn-warning');
      button.innerHTML = `${icon}Unable To Download Package`;
      button.setAttribute('title', message);
      button.setAttribute('aria-label', 'Executed completion package is unavailable');
    });
    if (message) {
      this.showDownloadNotice(message, 'warning');
    }
  }

  private setExecutedDownloadLoading(loading: boolean): void {
    const icon = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    const defaultHtml = '<svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Download Completion Package';
    this.getExecutedDownloadButtons().forEach((button) => {
      if ((button.dataset.downloadState || '').toLowerCase() === 'unavailable') {
        return;
      }
      button.disabled = loading;
      button.innerHTML = loading
        ? `${icon}Preparing package...`
        : defaultHtml;
    });
  }

  private initializeDeliveryState(): void {
    if (
      this.config.delivery?.executed_applicable &&
      String(this.config.agreementStatus || '').toLowerCase() === 'completed' &&
      String(this.config.delivery.executed_status || '').toLowerCase() !== 'ready' &&
      !String(this.config.delivery.executed_object_key || '').trim()
    ) {
      this.markExecutedDownloadUnavailable(
        'Executed completion package is still unavailable for this agreement. Artifact generation may still be running.'
      );
    }
  }

  private async fetchAndDownloadAsset(
    assetType: string,
    fallbackFilename: string,
    assetLabel: string
  ): Promise<void> {
    const response = await fetch(this.buildAssetDownloadURL(assetType), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/pdf',
      },
    });
    if (!response.ok) {
      throw new Error(`${assetLabel} is not available (HTTP ${response.status}). Refresh delivery status and try again.`);
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/pdf')) {
      throw new Error(`${assetLabel} is unavailable because the response is not a PDF.`);
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error(`${assetLabel} is unavailable because the file is empty.`);
    }
    const filename = this.resolveDownloadFilename(response, fallbackFilename);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  private async handleDocumentClick(event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const addExternalReviewerBtn = target.closest<HTMLElement>('#agreement-add-external-reviewer-btn');
    if (addExternalReviewerBtn) {
      event.preventDefault();
      this.appendExternalReviewerRow();
      return;
    }

    const removeExternalReviewerBtn = target.closest<HTMLElement>('[data-review-external-remove]');
    if (removeExternalReviewerBtn) {
      event.preventDefault();
      removeExternalReviewerBtn.closest('[data-review-external-row]')?.remove();
      this.syncExternalReviewersEmptyState();
      return;
    }

    const submitReviewBtn = target.closest<HTMLElement>('#agreement-submit-review-btn');
    if (submitReviewBtn) {
      event.preventDefault();
      await this.submitAgreementReview(submitReviewBtn);
      return;
    }

    const resendBtn = target.closest<HTMLElement>('[data-action="resend-recipient"], [data-action="resend-participant"]');
    if (resendBtn) {
      event.preventDefault();
      const recipientId = resendBtn.getAttribute('data-recipient-id') || resendBtn.getAttribute('data-participant-id');
      if (!recipientId) {
        this.notifyError('Recipient ID is missing');
        return;
      }
      try {
        await this.executeActionAndReload('resend', { recipient_id: recipientId }, 'Recipient notification resent');
      } catch (error) {
        this.notifyError(error instanceof Error ? error.message : 'Unable to resend recipient notification');
      }
      return;
    }

    const rotateTokenBtn = target.closest<HTMLElement>('[data-action="rotate-token"]');
    if (rotateTokenBtn) {
      event.preventDefault();
      const recipientId = rotateTokenBtn.getAttribute('data-recipient-id') || rotateTokenBtn.getAttribute('data-participant-id');
      if (!recipientId) {
        this.notifyError('Recipient ID is missing');
        return;
      }
      try {
        await this.executeActionAndReload('rotate_token', { recipient_id: recipientId }, 'Recipient token rotated');
      } catch (error) {
        this.notifyError(error instanceof Error ? error.message : 'Unable to rotate token');
      }
      return;
    }

    const downloadExecutedBtn = target.closest<HTMLButtonElement>('[data-action="download-executed"]');
    if (downloadExecutedBtn) {
      event.preventDefault();
      if ((downloadExecutedBtn.dataset.downloadState || '').toLowerCase() === 'unavailable') {
        this.showDownloadNotice(
          'Executed completion package is still unavailable for this agreement. Refresh delivery status and try again.',
          'warning'
        );
        return;
      }
      this.setExecutedDownloadLoading(true);
      try {
        await this.fetchAndDownloadAsset(
          'executed',
          `${this.config.agreementId}-executed.pdf`,
          'Executed completion package'
        );
        this.showDownloadNotice('Executed completion package downloaded successfully.', 'success');
      } catch (error) {
        this.markExecutedDownloadUnavailable(
          error instanceof Error ? error.message : 'Unable To Download Package'
        );
      } finally {
        this.setExecutedDownloadLoading(false);
      }
      return;
    }

    const downloadCertificateBtn = target.closest<HTMLButtonElement>('[data-action="download-certificate"]');
    if (downloadCertificateBtn) {
      event.preventDefault();
      const originalHtml = downloadCertificateBtn.innerHTML;
      downloadCertificateBtn.disabled = true;
      downloadCertificateBtn.innerHTML = '<svg class="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Preparing...';
      try {
        await this.fetchAndDownloadAsset(
          'certificate',
          `${this.config.agreementId}-certificate.pdf`,
          'Standalone audit certificate'
        );
        this.showDownloadNotice('Standalone audit certificate downloaded successfully.', 'success');
      } catch (error) {
        this.showDownloadNotice(
          error instanceof Error ? error.message : 'Unable to download standalone audit certificate.',
          'warning'
        );
      } finally {
        downloadCertificateBtn.disabled = false;
        downloadCertificateBtn.innerHTML = originalHtml;
      }
      return;
    }

    const retryEmailBtn = target.closest<HTMLButtonElement>('[data-action="retry-email"]');
    if (retryEmailBtn) {
      event.preventDefault();
      const originalHtml = retryEmailBtn.innerHTML;
      retryEmailBtn.disabled = true;
      retryEmailBtn.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.executeActionAndReload('retry_email', {
          email_id: retryEmailBtn.getAttribute('data-email-id') || '',
          recipient_id: retryEmailBtn.getAttribute('data-recipient-id') || '',
        }, 'Email retry queued');
      } catch (error) {
        retryEmailBtn.disabled = false;
        retryEmailBtn.innerHTML = originalHtml;
        this.notifyError(error instanceof Error ? error.message : 'Unable to retry email');
      }
      return;
    }

    const retryJobBtn = target.closest<HTMLButtonElement>('[data-action="retry-job"]');
    if (retryJobBtn) {
      event.preventDefault();
      const originalHtml = retryJobBtn.innerHTML;
      retryJobBtn.disabled = true;
      retryJobBtn.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.executeActionAndReload('retry_job', {
          job_id: retryJobBtn.getAttribute('data-job-id') || '',
          job_type: retryJobBtn.getAttribute('data-job-type') || '',
        }, 'Job retry queued');
      } catch (error) {
        retryJobBtn.disabled = false;
        retryJobBtn.innerHTML = originalHtml;
        this.notifyError(error instanceof Error ? error.message : 'Unable to retry job');
      }
      return;
    }

    const retryArtifactBtn = target.closest<HTMLButtonElement>('[data-action="retry-artifact"]');
    if (retryArtifactBtn) {
      event.preventDefault();
      const originalHtml = retryArtifactBtn.innerHTML;
      retryArtifactBtn.disabled = true;
      retryArtifactBtn.innerHTML = '<svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Retrying...';
      try {
        await this.executeActionAndReload('retry_artifact', {
          artifact_type: retryArtifactBtn.getAttribute('data-artifact-type') || '',
        }, 'Artifact retry queued');
      } catch (error) {
        retryArtifactBtn.disabled = false;
        retryArtifactBtn.innerHTML = originalHtml;
        this.notifyError(error instanceof Error ? error.message : 'Unable to retry artifact generation');
      }
      return;
    }

    const deliveryRefreshBtn = target.closest<HTMLElement>('#delivery-refresh');
    if (deliveryRefreshBtn) {
      event.preventDefault();
      window.location.reload();
    }
  }

  private handleDocumentChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.id === 'agreement-thread-anchor-type') {
      this.syncAgreementThreadAnchorFields();
    }
  }

  /**
   * Dispose the controller
   */
  dispose(): void {
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('change', this.changeHandler);
    this.commandRuntimeController?.destroy();
    this.commandRuntimeController = null;
    if (this.timelineController) {
      this.timelineController.dispose();
      this.timelineController = null;
    }
    this.initialized = false;
  }
}

// =============================================================================
// Bootstrap Functions
// =============================================================================

/**
 * Initialize the agreement detail page from page config
 */
export function initAgreementDetailPage(
  config?: AgreementDetailPageConfig
): AgreementDetailPageController | null {
  if (!config) {
    console.warn('Agreement detail page config not provided');
    return null;
  }

  const controller = new AgreementDetailPageController(config);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init());
  } else {
    controller.init();
  }

  return controller;
}

/**
 * Bootstrap the agreement detail page from inline config
 */
export function bootstrapAgreementDetailPage(config: AgreementDetailPageConfig): void {
  const controller = new AgreementDetailPageController(config);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init());
  } else {
    controller.init();
  }

  // Store controller globally for command runtime integration
  (window as any).__agreementDetailController = controller;
}

/**
 * Get the current page controller instance (if any)
 */
export function getAgreementDetailController(): AgreementDetailPageController | null {
  return (window as any).__agreementDetailController || null;
}

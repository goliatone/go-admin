import {
  extractStructuredError,
  formatStructuredErrorForDisplay,
  parseActionResponse,
  type StructuredError,
} from '../toast/error-helpers.js';
import { FallbackNotifier } from '../toast/toast-manager.js';
import type { ToastNotifier } from '../toast/types.js';
import { readHTTPJSONValue } from '../shared/transport/http-client.js';

export type CommandTransport = 'action' | 'rpc';

export interface CommandDispatchReceipt {
  accepted?: boolean;
  mode?: string;
  commandId?: string;
  dispatchId?: string;
  enqueuedAt?: string;
  correlationId?: string;
}

export interface CommandFeedbackEvent {
  type: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  orgId?: string;
  correlationId?: string;
  status?: string;
  message?: string;
  sections?: string[];
  metadata?: Record<string, unknown>;
  reason?: string;
  lastEventId?: string;
  requiresGapReconcile?: boolean;
}

export interface CommandFeedbackAdapter {
  subscribe(listener: (event: CommandFeedbackEvent) => void): () => void;
}

/**
 * Inline status states for command feedback display
 */
export type InlineStatusState =
  | 'submitting'
  | 'accepted'
  | 'completed'
  | 'failed'
  | 'stale'
  | 'retry_scheduled';

/**
 * Inline status entry for tracking command progress
 */
export interface InlineStatusEntry {
  correlationId: string;
  commandName: string;
  state: InlineStatusState;
  message?: string;
  section?: string;
  targetSelector?: string;
  participantId?: string;
  timestamp: number;
}

/**
 * Inline status change event
 */
export interface InlineStatusChangeEvent {
  entry: InlineStatusEntry;
  previousState: InlineStatusState | null;
}

/**
 * Inline status listener callback
 */
export type InlineStatusListener = (event: InlineStatusChangeEvent) => void;

export interface CommandFeedbackPendingDetail {
  correlationId: string;
  commandName: string;
  transport: CommandTransport;
  responseMode?: string;
  receipt?: CommandDispatchReceipt;
  refreshSelectors: string[];
  trigger: HTMLElement;
  section?: string;
  participantId?: string;
}

export interface CommandFeedbackReconcileDetail {
  controller: CommandRuntimeController;
  event: CommandFeedbackEvent;
  pending: CommandFeedbackPendingDetail | null;
}

export interface CommandFeedbackConfig {
  adapter: CommandFeedbackAdapter;
  onEvent?: (detail: CommandFeedbackReconcileDetail) => void | Promise<void>;
  onStreamGap?: (detail: CommandFeedbackReconcileDetail) => void | Promise<void>;
}

export interface CommandRuntimeMountConfig {
  mount: HTMLElement;
  apiBasePath: string;
  panelName?: string;
  recordId?: string;
  rpcEndpoint?: string;
  tenantId?: string;
  orgId?: string;
  notifier?: ToastNotifier;
  fetchImpl?: typeof fetch;
  defaultRefreshSelectors?: string[];
  feedback?: CommandFeedbackConfig;
  onBeforeDispatch?: (detail: CommandDispatchDetail) => void;
  onAfterDispatch?: (detail: CommandDispatchDetail) => void;
  onAfterRefresh?: (detail: CommandRefreshDetail) => void;
}

export interface CommandDispatchDetail {
  trigger: HTMLElement;
  form: HTMLFormElement | null;
  commandName: string;
  transport: CommandTransport;
  payload: Record<string, unknown>;
  correlationId: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
  receipt?: CommandDispatchReceipt;
  responseMode?: string;
}

export interface CommandRefreshDetail {
  mount: HTMLElement;
  trigger: HTMLElement;
  selectors: string[];
  sourceDocument: Document;
}

export interface CommandManualDispatchConfig {
  trigger?: HTMLElement | null;
  form?: HTMLFormElement | null;
  submitter?: HTMLElement | null;
  commandName: string;
  dispatchName?: string;
  transport?: CommandTransport;
  payload?: Record<string, unknown>;
  successMessage?: string;
  fallbackMessage?: string;
  refreshSelectors?: string[];
  confirmMessage?: string;
  confirmTitle?: string;
  reasonTitle?: string;
  reasonSubject?: string;
  busyTarget?: HTMLElement | null;
  section?: string;
  participantId?: string;
}

interface CommandSpec {
  trigger: HTMLElement;
  form: HTMLFormElement | null;
  commandName: string;
  dispatchName: string;
  transport: CommandTransport;
  payload: Record<string, unknown>;
  successMessage: string;
  fallbackMessage: string;
  refreshSelectors: string[];
  confirmMessage: string;
  confirmTitle: string;
  reasonTitle: string;
  reasonSubject: string;
  busyTarget: HTMLElement | null;
  submitter: HTMLElement | null;
}

interface TransportResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
  correlationId?: string;
  receipt?: CommandDispatchReceipt;
  responseMode?: string;
}

function resolveDefaultNotifier(): ToastNotifier {
  const maybeWindow = globalThis.window as ({ toastManager?: ToastNotifier } | undefined);
  if (maybeWindow?.toastManager) {
    return maybeWindow.toastManager;
  }
  return new FallbackNotifier();
}

function trimDatasetValue(value: string | undefined): string {
  return String(value || '').trim();
}

function kebabToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).replace(/^-+/, '');
}

function attributeSuffixToPayloadKey(value: string): string {
  return kebabToSnake(value).replace(/-/g, '_');
}

function csvToList(value: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMode(value: unknown): string | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || undefined;
}

function generateCorrelationId(): string {
  const cryptoAPI = globalThis.crypto as ({ randomUUID?: () => string } | undefined);
  if (cryptoAPI?.randomUUID) {
    return cryptoAPI.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `cmd_${timestamp}_${random}`;
}

function resolveCorrelationId(payload: Record<string, unknown>): string {
  const existing = String(payload.correlation_id || '').trim();
  if (existing) {
    return existing;
  }
  const generated = generateCorrelationId();
  payload.correlation_id = generated;
  return generated;
}

function normalizeStructuredError(error: unknown, fallbackMessage: string): StructuredError {
  if (error && typeof error === 'object') {
    const maybe = error as StructuredError;
    if (typeof maybe.message === 'string') {
      return {
        textCode: typeof maybe.textCode === 'string' ? maybe.textCode : null,
        message: maybe.message || fallbackMessage,
        metadata: maybe.metadata && typeof maybe.metadata === 'object' ? maybe.metadata : null,
        fields: maybe.fields && typeof maybe.fields === 'object' ? maybe.fields : null,
        validationErrors: Array.isArray(maybe.validationErrors) ? maybe.validationErrors : null,
      };
    }
  }
  return {
    textCode: null,
    message: fallbackMessage,
    metadata: null,
    fields: null,
    validationErrors: null,
  };
}

function parseResponseEnvelope(data: unknown, fallbackMessage: string): TransportResult {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: normalizeStructuredError(null, fallbackMessage),
    };
  }

  const parsed = parseActionResponse(data);
  if (parsed.success) {
    return {
      success: true,
      data: parsed.data,
    };
  }
  return {
    success: false,
    error: parsed.error || normalizeStructuredError(null, fallbackMessage),
  };
}

async function readCommandResponseBody(response: Response): Promise<unknown> {
  return readHTTPJSONValue<unknown>(response, null);
}

function collectStaticPayload(node: HTMLElement): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const attribute of Array.from(node.attributes)) {
    if (!attribute.name.startsWith('data-command-payload-')) {
      continue;
    }
    const suffix = attribute.name.slice('data-command-payload-'.length);
    const key = attributeSuffixToPayloadKey(suffix);
    payload[key] = attribute.value;
  }
  return payload;
}

function appendPayloadValue(payload: Record<string, unknown>, key: string, value: FormDataEntryValue): void {
  if (!key) {
    return;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (payload[key] === undefined) {
      payload[key] = trimmed;
      return;
    }
    if (Array.isArray(payload[key])) {
      (payload[key] as unknown[]).push(trimmed);
      return;
    }
    payload[key] = [payload[key], trimmed];
    return;
  }
  payload[key] = value;
}

function collectFormPayload(form: HTMLFormElement | null): Record<string, unknown> {
  if (!form) {
    return {};
  }
  const payload: Record<string, unknown> = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    appendPayloadValue(payload, key, value);
  });
  return payload;
}

function resolveBusyTarget(trigger: HTMLElement): HTMLElement | null {
  const busyTargetSelector = trimDatasetValue(trigger.dataset.commandBusyTarget);
  if (busyTargetSelector) {
    return document.querySelector<HTMLElement>(busyTargetSelector);
  }
  const busyClosestSelector = trimDatasetValue(trigger.dataset.commandBusyClosest);
  if (busyClosestSelector) {
    return trigger.closest<HTMLElement>(busyClosestSelector);
  }
  return null;
}

function setElementBusy(node: HTMLElement | null, busy: boolean): void {
  if (!node) {
    return;
  }
  if (
    node instanceof HTMLButtonElement ||
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  ) {
    node.disabled = busy;
  }
  if (busy) {
    node.setAttribute('aria-busy', 'true');
  } else {
    node.removeAttribute('aria-busy');
  }
}

function setContainerBusy(node: HTMLElement | null, busy: boolean): void {
  if (!node) {
    return;
  }
  if (busy) {
    node.setAttribute('aria-busy', 'true');
  } else {
    node.removeAttribute('aria-busy');
  }
  node.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.disabled = busy;
    if (busy) {
      button.setAttribute('aria-busy', 'true');
    } else {
      button.removeAttribute('aria-busy');
    }
  });
}

function captureCollapsibleState(root: Element): Map<string, boolean> {
  const state = new Map<string, boolean>();
  root.querySelectorAll<HTMLElement>('.collapsible-trigger[aria-controls]').forEach((trigger) => {
    const targetId = trimDatasetValue(trigger.getAttribute('aria-controls') || undefined);
    if (!targetId) {
      return;
    }
    state.set(targetId, trigger.getAttribute('aria-expanded') === 'true');
  });
  return state;
}

function applyCollapsibleState(root: Element, state: Map<string, boolean>): void {
  state.forEach((expanded, targetId) => {
    const trigger = root.querySelector<HTMLElement>(`.collapsible-trigger[aria-controls="${targetId}"]`);
    const content = document.getElementById(targetId);
    if (!trigger || !content) {
      return;
    }
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    content.classList.toggle('expanded', expanded);
  });
}

function toCommandDispatchReceipt(value: unknown): CommandDispatchReceipt | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const receipt = value as Record<string, unknown>;
  const accepted = typeof receipt.accepted === 'boolean' ? receipt.accepted : undefined;
  const mode = normalizeMode(receipt.mode);
  const commandId = String(receipt.command_id || receipt.commandId || '').trim() || undefined;
  const dispatchId = String(receipt.dispatch_id || receipt.dispatchId || '').trim() || undefined;
  const correlationId = String(receipt.correlation_id || receipt.correlationId || '').trim() || undefined;
  const rawEnqueuedAt = receipt.enqueued_at || receipt.enqueuedAt;
  const enqueuedAt = rawEnqueuedAt == null ? undefined : String(rawEnqueuedAt).trim() || undefined;
  if (
    accepted === undefined &&
    !mode &&
    !commandId &&
    !dispatchId &&
    !correlationId &&
    !enqueuedAt
  ) {
    return undefined;
  }
  return {
    accepted,
    mode,
    commandId,
    dispatchId,
    correlationId,
    enqueuedAt,
  };
}

export class CommandRuntimeController {
  private readonly mount: HTMLElement;
  private readonly apiBasePath: string;
  private readonly panelName: string;
  private readonly recordId: string;
  private readonly rpcEndpoint: string;
  private readonly tenantId: string;
  private readonly orgId: string;
  private readonly notifier: ToastNotifier;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultRefreshSelectors: string[];
  private readonly feedback?: CommandFeedbackConfig;
  private readonly onBeforeDispatch?: (detail: CommandDispatchDetail) => void;
  private readonly onAfterDispatch?: (detail: CommandDispatchDetail) => void;
  private readonly onAfterRefresh?: (detail: CommandRefreshDetail) => void;
  private submitHandler: ((event: Event) => void) | null = null;
  private clickHandler: ((event: Event) => void) | null = null;
  private feedbackUnsubscribe: (() => void) | null = null;
  private readonly pendingFeedback = new Map<string, CommandFeedbackPendingDetail>();
  private readonly inlineStatus = new Map<string, InlineStatusEntry>();
  private readonly inlineStatusListeners = new Set<InlineStatusListener>();

  constructor(config: CommandRuntimeMountConfig) {
    this.mount = config.mount;
    this.apiBasePath = String(config.apiBasePath || '').trim().replace(/\/$/, '');
    this.panelName = String(config.panelName || '').trim();
    this.recordId = String(config.recordId || '').trim();
    this.rpcEndpoint = String(config.rpcEndpoint || '').trim() || `${this.apiBasePath}/rpc`;
    this.tenantId = String(config.tenantId || '').trim();
    this.orgId = String(config.orgId || '').trim();
    this.notifier = config.notifier || resolveDefaultNotifier();
    this.fetchImpl = config.fetchImpl || fetch.bind(globalThis);
    this.defaultRefreshSelectors = Array.isArray(config.defaultRefreshSelectors)
      ? config.defaultRefreshSelectors.filter(Boolean)
      : [];
    this.feedback = config.feedback;
    this.onBeforeDispatch = config.onBeforeDispatch;
    this.onAfterDispatch = config.onAfterDispatch;
    this.onAfterRefresh = config.onAfterRefresh;
  }

  init(): void {
    if (!this.mount) {
      return;
    }
    this.submitHandler = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || !this.mount.contains(target)) {
        return;
      }
      if (!target.matches('form[data-command-name]')) {
        return;
      }
      event.preventDefault();
      const submitter = event instanceof SubmitEvent && event.submitter instanceof HTMLElement
        ? event.submitter
        : null;
      void this.handleCommand(target, target, submitter);
    };
    this.clickHandler = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const trigger = target.closest<HTMLElement>('[data-command-name]:not(form)');
      if (!trigger || !this.mount.contains(trigger)) {
        return;
      }
      event.preventDefault();
      void this.handleCommand(trigger, null, trigger);
    };
    document.addEventListener('submit', this.submitHandler);
    document.addEventListener('click', this.clickHandler);
    if (this.feedback?.adapter && !this.feedbackUnsubscribe) {
      this.feedbackUnsubscribe = this.feedback.adapter.subscribe((event) => {
        void this.handleFeedbackEvent(event);
      });
    }
  }

  destroy(): void {
    if (this.submitHandler) {
      document.removeEventListener('submit', this.submitHandler);
      this.submitHandler = null;
    }
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.feedbackUnsubscribe) {
      this.feedbackUnsubscribe();
      this.feedbackUnsubscribe = null;
    }
    this.pendingFeedback.clear();
    this.inlineStatus.clear();
    this.inlineStatusListeners.clear();
  }

  /**
   * Subscribe to inline status changes.
   * Returns an unsubscribe function.
   */
  subscribeToInlineStatus(listener: InlineStatusListener): () => void {
    this.inlineStatusListeners.add(listener);
    return () => {
      this.inlineStatusListeners.delete(listener);
    };
  }

  /**
   * Get current inline status for a correlation ID
   */
  getInlineStatus(correlationId: string): InlineStatusEntry | null {
    return this.inlineStatus.get(correlationId) || null;
  }

  /**
   * Get all current inline status entries
   */
  getAllInlineStatus(): InlineStatusEntry[] {
    return Array.from(this.inlineStatus.values());
  }

  /**
   * Clear inline status for a correlation ID
   */
  clearInlineStatus(correlationId: string): void {
    this.inlineStatus.delete(correlationId);
  }

  /**
   * Clear all inline statuses
   */
  clearAllInlineStatus(): void {
    this.inlineStatus.clear();
  }

  /**
   * Mark stale statuses (e.g., after stream gap)
   */
  markStaleStatuses(): void {
    const now = Date.now();
    this.inlineStatus.forEach((entry, correlationId) => {
      if (entry.state !== 'completed' && entry.state !== 'failed') {
        this.setInlineStatus(correlationId, {
          ...entry,
          state: 'stale',
          message: 'Refreshing status...',
          timestamp: now,
        });
      }
    });
  }

  private setInlineStatus(correlationId: string, entry: InlineStatusEntry): void {
    const previous = this.inlineStatus.get(correlationId) || null;
    const previousState = previous?.state || null;
    this.inlineStatus.set(correlationId, entry);
    this.emitInlineStatusChange({ entry, previousState });
  }

  private emitInlineStatusChange(event: InlineStatusChangeEvent): void {
    this.inlineStatusListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Inline status listener error:', error);
      }
    });
  }

  private updateInlineStatusFromDispatch(
    correlationId: string,
    commandName: string,
    state: InlineStatusState,
    options: { message?: string; section?: string; participantId?: string } = {}
  ): void {
    this.setInlineStatus(correlationId, {
      correlationId,
      commandName,
      state,
      message: options.message,
      section: options.section,
      participantId: options.participantId,
      timestamp: Date.now(),
    });
  }

  private resolveSection(trigger: HTMLElement): string | undefined {
    const section = trigger.closest('[data-live-status-section]');
    return section?.getAttribute('data-live-status-section') || undefined;
  }

  private resolveParticipantId(trigger: HTMLElement, payload: Record<string, unknown>): string | undefined {
    const participantId = String(payload.participant_id || payload.recipient_id || '').trim();
    if (participantId) {
      return participantId;
    }
    const card = trigger.closest('[data-participant-id]');
    return card?.getAttribute('data-participant-id') || undefined;
  }

  private scopePayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (this.tenantId) {
      payload.tenant_id = this.tenantId;
    }
    if (this.orgId) {
      payload.org_id = this.orgId;
    }
    return payload;
  }

  private buildSpec(trigger: HTMLElement, form: HTMLFormElement | null, submitter: HTMLElement | null): CommandSpec {
    const commandName = trimDatasetValue(trigger.dataset.commandName || form?.dataset.commandName);
    const transport = (trimDatasetValue(trigger.dataset.commandTransport || form?.dataset.commandTransport) || 'action') as CommandTransport;
    const dispatchName = trimDatasetValue(trigger.dataset.commandDispatch || form?.dataset.commandDispatch) || commandName;
    const formPayload = collectFormPayload(form);
    const triggerPayload = collectStaticPayload(trigger);
    const formStaticPayload = form ? collectStaticPayload(form) : {};
    const payload = {
      ...this.scopePayload(),
      ...formPayload,
      ...formStaticPayload,
      ...triggerPayload,
    };
    const refreshSelectors = csvToList(trigger.dataset.commandRefresh || form?.dataset.commandRefresh || '').length > 0
      ? csvToList(trigger.dataset.commandRefresh || form?.dataset.commandRefresh || '')
      : this.defaultRefreshSelectors;
    return {
      trigger,
      form,
      commandName,
      dispatchName,
      transport,
      payload,
      successMessage: trimDatasetValue(trigger.dataset.commandSuccess || form?.dataset.commandSuccess) || `${commandName} completed successfully`,
      fallbackMessage: trimDatasetValue(trigger.dataset.commandFailure || form?.dataset.commandFailure) || `${commandName} failed`,
      refreshSelectors,
      confirmMessage: trimDatasetValue(trigger.dataset.commandConfirm || form?.dataset.commandConfirm),
      confirmTitle: trimDatasetValue(trigger.dataset.commandConfirmTitle || form?.dataset.commandConfirmTitle),
      reasonTitle: trimDatasetValue(trigger.dataset.commandReasonTitle || form?.dataset.commandReasonTitle),
      reasonSubject: trimDatasetValue(trigger.dataset.commandReasonSubject || form?.dataset.commandReasonSubject),
      busyTarget: resolveBusyTarget(trigger) || (form ? resolveBusyTarget(form) : null),
      submitter,
    };
  }

  private buildManualSpec(config: CommandManualDispatchConfig): CommandSpec {
    const trigger = config.trigger || this.mount;
    const payload = {
      ...this.scopePayload(),
      ...(config.payload || {}),
    };
    const refreshSelectors = Array.isArray(config.refreshSelectors) && config.refreshSelectors.length > 0
      ? config.refreshSelectors.filter(Boolean)
      : this.defaultRefreshSelectors;
    return {
      trigger,
      form: config.form || null,
      commandName: String(config.commandName || '').trim(),
      dispatchName: String(config.dispatchName || config.commandName || '').trim(),
      transport: (config.transport || 'action') as CommandTransport,
      payload,
      successMessage: String(config.successMessage || '').trim() || `${String(config.commandName || '').trim()} completed successfully`,
      fallbackMessage: String(config.fallbackMessage || '').trim() || `${String(config.commandName || '').trim()} failed`,
      refreshSelectors,
      confirmMessage: String(config.confirmMessage || '').trim(),
      confirmTitle: String(config.confirmTitle || '').trim(),
      reasonTitle: String(config.reasonTitle || '').trim(),
      reasonSubject: String(config.reasonSubject || '').trim(),
      busyTarget: config.busyTarget || null,
      submitter: config.submitter || null,
    };
  }

  async dispatch(config: CommandManualDispatchConfig): Promise<CommandDispatchDetail> {
    return this.executeSpec(this.buildManualSpec(config));
  }

  private async handleCommand(trigger: HTMLElement, form: HTMLFormElement | null, submitter: HTMLElement | null): Promise<void> {
    const spec = this.buildSpec(trigger, form, submitter);
    if (!spec.commandName || !spec.dispatchName) {
      return;
    }
    await this.executeSpec(spec);
  }

  private async executeSpec(spec: CommandSpec): Promise<CommandDispatchDetail> {
    const emptyDetail = (): CommandDispatchDetail => ({
      trigger: spec.trigger,
      form: spec.form,
      commandName: spec.commandName,
      transport: spec.transport,
      payload: { ...spec.payload },
      correlationId: String(spec.payload.correlation_id || '').trim(),
      success: false,
    });

    if (spec.submitter && spec.submitter.getAttribute('aria-busy') === 'true') {
      return emptyDetail();
    }

    if (spec.confirmMessage) {
      const confirmed = await this.notifier.confirm(spec.confirmMessage, {
        title: spec.confirmTitle || undefined,
      });
      if (!confirmed) {
        return emptyDetail();
      }
    }

    if (spec.reasonTitle) {
      const promptLabel = spec.reasonSubject
        ? `${spec.reasonTitle}\n\n${spec.reasonSubject}\n\nEnter a reason:`
        : `${spec.reasonTitle}\n\nEnter a reason:`;
      const value = globalThis.window?.prompt(promptLabel, '') ?? null;
      if (value === null) {
        return emptyDetail();
      }
      const reason = String(value || '').trim();
      if (!reason) {
        this.notifier.error('A reason is required.');
        return emptyDetail();
      }
      spec.payload.reason = reason;
    }

    const correlationId = resolveCorrelationId(spec.payload);
    const section = this.resolveSection(spec.trigger);
    const participantId = this.resolveParticipantId(spec.trigger, spec.payload);
    const pendingDetail: CommandDispatchDetail = {
      trigger: spec.trigger,
      form: spec.form,
      commandName: spec.commandName,
      transport: spec.transport,
      payload: { ...spec.payload },
      correlationId,
      success: false,
    };
    this.onBeforeDispatch?.(pendingDetail);

    setElementBusy(spec.submitter, true);
    setContainerBusy(spec.busyTarget, true);

    // Set submitting state
    this.updateInlineStatusFromDispatch(correlationId, spec.commandName, 'submitting', {
      message: 'Sending...',
      section,
      participantId,
    });

    try {
      const result = spec.transport === 'rpc'
        ? await this.dispatchRPC(spec)
        : await this.dispatchAction(spec);

      const detail: CommandDispatchDetail = {
        ...pendingDetail,
        success: result.success,
        data: result.data,
        error: result.error,
        correlationId: result.correlationId || correlationId,
        receipt: result.receipt,
        responseMode: result.responseMode,
      };

      if (!result.success || result.error) {
        const message = formatStructuredErrorForDisplay(
          result.error || normalizeStructuredError(null, spec.fallbackMessage),
          spec.fallbackMessage,
        );
        this.notifier.error(message);
        // Update inline status to failed
        this.updateInlineStatusFromDispatch(correlationId, spec.commandName, 'failed', {
          message: message || 'Failed',
          section,
          participantId,
        });
        this.onAfterDispatch?.(detail);
        return detail;
      }

      this.notifier.success(spec.successMessage);
      if (this.shouldWaitForFeedback(detail)) {
        // Async/queued mode - set to accepted and wait for SSE feedback
        this.updateInlineStatusFromDispatch(correlationId, spec.commandName, 'accepted', {
          message: 'Queued...',
          section,
          participantId,
        });
        this.pendingFeedback.set(detail.correlationId, {
          correlationId: detail.correlationId,
          commandName: detail.commandName,
          transport: detail.transport,
          responseMode: detail.responseMode,
          receipt: detail.receipt,
          refreshSelectors: [...spec.refreshSelectors],
          trigger: spec.trigger,
          section,
          participantId,
        });
      } else {
        // Sync mode - immediately completed
        this.updateInlineStatusFromDispatch(correlationId, spec.commandName, 'completed', {
          message: spec.successMessage || 'Done',
          section,
          participantId,
        });
        if (spec.refreshSelectors.length > 0) {
          await this.refreshSelectors(spec.refreshSelectors, spec.trigger);
        }
      }
      this.onAfterDispatch?.(detail);
      return detail;
    } catch (error) {
      const structured = normalizeStructuredError(error, spec.fallbackMessage);
      const detail: CommandDispatchDetail = {
        ...pendingDetail,
        success: false,
        error: structured,
      };
      this.notifier.error(formatStructuredErrorForDisplay(structured, spec.fallbackMessage));
      // Update inline status to failed
      this.updateInlineStatusFromDispatch(correlationId, spec.commandName, 'failed', {
        message: structured.message || 'Failed',
        section,
        participantId,
      });
      this.onAfterDispatch?.(detail);
      return detail;
    } finally {
      setElementBusy(spec.submitter, false);
      setContainerBusy(spec.busyTarget, false);
    }
  }

  private shouldWaitForFeedback(detail: CommandDispatchDetail): boolean {
    if (!this.feedback?.adapter) {
      return false;
    }
    const mode = normalizeMode(detail.responseMode || detail.receipt?.mode);
    return mode === 'queued';
  }

  private async handleFeedbackEvent(event: CommandFeedbackEvent): Promise<void> {
    const correlationId = String(event.correlationId || '').trim();
    const pending = correlationId ? this.pendingFeedback.get(correlationId) || null : null;
    if (pending) {
      this.pendingFeedback.delete(correlationId);
    }
    const detail: CommandFeedbackReconcileDetail = {
      controller: this,
      event,
      pending,
    };

    // Handle stream gap - mark pending statuses as stale
    if (event.type === 'stream_gap') {
      this.markStaleStatuses();
      await this.feedback?.onStreamGap?.(detail);
      return;
    }

    // Update inline status based on feedback event
    if (correlationId) {
      const status = String(event.status || '').toLowerCase();
      const sections = Array.isArray(event.sections) ? event.sections : [];
      const section = sections[0] || pending?.section;
      const participantId = pending?.participantId;
      const commandName = pending?.commandName || '';

      if (status === 'completed' || status === 'success') {
        this.updateInlineStatusFromDispatch(correlationId, commandName, 'completed', {
          message: event.message || 'Done',
          section,
          participantId,
        });
      } else if (status === 'failed' || status === 'error') {
        this.updateInlineStatusFromDispatch(correlationId, commandName, 'failed', {
          message: event.message || 'Failed',
          section,
          participantId,
        });
      } else if (status === 'retry' || status === 'retry_scheduled' || status === 'retrying') {
        this.updateInlineStatusFromDispatch(correlationId, commandName, 'retry_scheduled', {
          message: event.message || 'Retry scheduled...',
          section,
          participantId,
        });
      } else if (status === 'accepted' || status === 'queued' || status === 'processing') {
        this.updateInlineStatusFromDispatch(correlationId, commandName, 'accepted', {
          message: event.message || 'Processing...',
          section,
          participantId,
        });
      }
    }

    await this.feedback?.onEvent?.(detail);
  }

  private async dispatchAction(spec: CommandSpec): Promise<TransportResult> {
    if (!this.apiBasePath || !this.panelName) {
      return {
        success: false,
        error: normalizeStructuredError(null, 'Action transport is not configured'),
      };
    }
    const endpoint = `${this.apiBasePath}/panels/${encodeURIComponent(this.panelName)}/actions/${encodeURIComponent(spec.commandName)}`;
    const payload = {
      id: this.recordId,
      ...spec.payload,
    };
    const response = await this.fetchImpl(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        error: await extractStructuredError(response),
      };
    }

    const body = await readCommandResponseBody(response);
    return {
      ...parseResponseEnvelope(body, spec.fallbackMessage),
      correlationId: String(spec.payload.correlation_id || '').trim() || undefined,
    };
  }

  private async dispatchRPC(spec: CommandSpec): Promise<TransportResult> {
    const correlationId = String(spec.payload.correlation_id || '').trim() || undefined;
    const payload = {
      method: 'admin.commands.dispatch',
      params: {
        data: {
          name: spec.dispatchName,
          ids: this.recordId ? [this.recordId] : [],
          payload: spec.payload,
          options: {
            correlation_id: correlationId,
            metadata: {
              correlation_id: correlationId,
            },
          },
        },
      },
    };
    const response = await this.fetchImpl(this.rpcEndpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        error: await extractStructuredError(response),
        correlationId,
      };
    }

    const body = await readCommandResponseBody(response);
    if (body && typeof body === 'object' && 'error' in body) {
      return {
        ...parseResponseEnvelope(body, spec.fallbackMessage),
        correlationId,
      };
    }
    if (body && typeof body === 'object' && 'data' in body && typeof (body as Record<string, unknown>).data === 'object') {
      const data = (body as Record<string, unknown>).data as Record<string, unknown>;
      const receipt = toCommandDispatchReceipt(data.receipt);
      return {
        success: true,
        data,
        correlationId: receipt?.correlationId || correlationId,
        receipt,
        responseMode: normalizeMode(data.response_mode || receipt?.mode),
      };
    }
    return {
      success: true,
      data: body && typeof body === 'object' ? body as Record<string, unknown> : undefined,
      correlationId,
    };
  }

  async refreshSelectors(selectors: string[], trigger: HTMLElement | null = null): Promise<Document | null> {
    const sourceDocument = await this.refreshFragments(selectors);
    if (sourceDocument) {
      this.onAfterRefresh?.({
        mount: this.mount,
        trigger: trigger || this.mount,
        selectors,
        sourceDocument,
      });
    }
    return sourceDocument;
  }

  private async refreshFragments(selectors: string[]): Promise<Document | null> {
    const response = await this.fetchImpl(globalThis.window?.location?.href || '', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
        'X-Requested-With': 'go-admin-command-runtime',
      },
    });
    if (!response.ok) {
      return null;
    }
    const markup = await response.text();
    if (!markup.trim()) {
      return null;
    }
    const sourceDocument = new DOMParser().parseFromString(markup, 'text/html');
    selectors.forEach((selector) => {
      this.replaceFragment(selector, sourceDocument);
    });
    return sourceDocument;
  }

  private replaceFragment(selector: string, sourceDocument: Document): void {
    const current = document.querySelector(selector);
    const incoming = sourceDocument.querySelector(selector);
    if (!current && !incoming) {
      return;
    }
    if (current && !incoming) {
      current.remove();
      return;
    }
    if (!current || !incoming) {
      return;
    }
    const collapsibleState = captureCollapsibleState(current);
    const nextNode = document.importNode(incoming, true);
    current.replaceWith(nextNode);
    if (nextNode instanceof Element) {
      applyCollapsibleState(nextNode, collapsibleState);
    }
  }
}

export function initCommandRuntime(config: CommandRuntimeMountConfig): CommandRuntimeController | null {
  if (!config.mount) {
    return null;
  }
  const controller = new CommandRuntimeController(config);
  controller.init();
  return controller;
}

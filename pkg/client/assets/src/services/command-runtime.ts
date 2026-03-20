import {
  extractStructuredError,
  formatStructuredErrorForDisplay,
  parseActionResponse,
  type StructuredError,
} from '../toast/error-helpers.js';
import { FallbackNotifier } from '../toast/toast-manager.js';
import type { ToastNotifier } from '../toast/types.js';

export type CommandTransport = 'action' | 'rpc';

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
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
}

export interface CommandRefreshDetail {
  mount: HTMLElement;
  trigger: HTMLElement;
  selectors: string[];
  sourceDocument: Document;
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
  if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
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
  private readonly onBeforeDispatch?: (detail: CommandDispatchDetail) => void;
  private readonly onAfterDispatch?: (detail: CommandDispatchDetail) => void;
  private readonly onAfterRefresh?: (detail: CommandRefreshDetail) => void;
  private submitHandler: ((event: Event) => void) | null = null;
  private clickHandler: ((event: Event) => void) | null = null;

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

  private async handleCommand(trigger: HTMLElement, form: HTMLFormElement | null, submitter: HTMLElement | null): Promise<void> {
    const spec = this.buildSpec(trigger, form, submitter);
    if (!spec.commandName || !spec.dispatchName) {
      return;
    }

    if (spec.submitter && spec.submitter.getAttribute('aria-busy') === 'true') {
      return;
    }

    if (spec.confirmMessage) {
      const confirmed = await this.notifier.confirm(spec.confirmMessage, {
        title: spec.confirmTitle || undefined,
      });
      if (!confirmed) {
        return;
      }
    }

    if (spec.reasonTitle) {
      const promptLabel = spec.reasonSubject
        ? `${spec.reasonTitle}\n\n${spec.reasonSubject}\n\nEnter a reason:`
        : `${spec.reasonTitle}\n\nEnter a reason:`;
      const value = globalThis.window?.prompt(promptLabel, '') ?? null;
      if (value === null) {
        return;
      }
      const reason = String(value || '').trim();
      if (!reason) {
        this.notifier.error('A reason is required.');
        return;
      }
      spec.payload.reason = reason;
    }

    const pendingDetail: CommandDispatchDetail = {
      trigger: spec.trigger,
      form: spec.form,
      commandName: spec.commandName,
      transport: spec.transport,
      payload: { ...spec.payload },
      success: false,
    };
    this.onBeforeDispatch?.(pendingDetail);

    setElementBusy(spec.submitter, true);
    setContainerBusy(spec.busyTarget, true);

    try {
      const result = spec.transport === 'rpc'
        ? await this.dispatchRPC(spec)
        : await this.dispatchAction(spec);

      const detail: CommandDispatchDetail = {
        ...pendingDetail,
        success: result.success,
        data: result.data,
        error: result.error,
      };

      if (!result.success || result.error) {
        const message = formatStructuredErrorForDisplay(
          result.error || normalizeStructuredError(null, spec.fallbackMessage),
          spec.fallbackMessage,
        );
        this.notifier.error(message);
        this.onAfterDispatch?.(detail);
        return;
      }

      this.notifier.success(spec.successMessage);
      if (spec.refreshSelectors.length > 0) {
        const sourceDocument = await this.refreshFragments(spec.refreshSelectors);
        if (sourceDocument) {
          this.onAfterRefresh?.({
            mount: this.mount,
            trigger: spec.trigger,
            selectors: spec.refreshSelectors,
            sourceDocument,
          });
        }
      }
      this.onAfterDispatch?.(detail);
    } catch (error) {
      const structured = normalizeStructuredError(error, spec.fallbackMessage);
      this.notifier.error(formatStructuredErrorForDisplay(structured, spec.fallbackMessage));
      this.onAfterDispatch?.({
        ...pendingDetail,
        success: false,
        error: structured,
      });
    } finally {
      setElementBusy(spec.submitter, false);
      setContainerBusy(spec.busyTarget, false);
    }
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

    const body = await response.json().catch(() => null);
    return parseResponseEnvelope(body, spec.fallbackMessage);
  }

  private async dispatchRPC(spec: CommandSpec): Promise<TransportResult> {
    const payload = {
      method: 'admin.commands.dispatch',
      params: {
        data: {
          name: spec.dispatchName,
          ids: this.recordId ? [this.recordId] : [],
          payload: spec.payload,
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
      };
    }

    const body = await response.json().catch(() => null);
    if (body && typeof body === 'object' && 'error' in body) {
      return parseResponseEnvelope(body, spec.fallbackMessage);
    }
    if (body && typeof body === 'object' && 'data' in body && typeof (body as Record<string, unknown>).data === 'object') {
      return {
        success: true,
        data: (body as Record<string, unknown>).data as Record<string, unknown>,
      };
    }
    return {
      success: true,
      data: body && typeof body === 'object' ? body as Record<string, unknown> : undefined,
    };
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

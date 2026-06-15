import { initActionMenus } from '../shared/action-menu.js';
import { asString } from '../shared/coercion.js';
import {
  getStringSearchParam,
  readLocationSearchParams,
} from '../shared/query-state/url-state.js';
import { httpRequest, readHTTPError } from '../shared/transport/http-client.js';

export type AssignmentSSRRowActionName = 'claim' | 'release' | 'approve' | 'reject' | 'archive';

export interface AssignmentSSRRowActionOptions {
  endpoint?: string;
  initializeMenus?: boolean;
}

export interface AssignmentSSRRowActionRequest {
  expected_version: number;
  idempotency_key?: string;
  reason?: string;
  channel?: string;
}

export function buildAssignmentActionURL(
  endpoint: string,
  assignmentId: string,
  action: AssignmentSSRRowActionName,
): string {
  const trimmed = endpoint.trim();
  if (!trimmed || !assignmentId || !action) {
    return '';
  }
  const absolute = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  const resolved = new URL(trimmed, absolute ? undefined : 'http://localhost');
  resolved.pathname = `${resolved.pathname.replace(/\/+$/, '')}/${encodeURIComponent(assignmentId)}/actions/${encodeURIComponent(action)}`;
  return absolute ? resolved.toString() : `${resolved.pathname}${resolved.search}`;
}

function createAssignmentActionIdempotencyKey(assignmentId: string, action: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }
  return `${assignmentId}:${action}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

function isSupportedSSRRowAction(action: string): action is 'claim' | 'release' {
  return action === 'claim' || action === 'release';
}

async function postAssignmentSSRRowAction(
  endpoint: string,
  assignmentId: string,
  action: AssignmentSSRRowActionName,
  request: AssignmentSSRRowActionRequest,
): Promise<void> {
  const payload: AssignmentSSRRowActionRequest = {
    expected_version: request.expected_version,
  };
  if (request.idempotency_key) {
    payload.idempotency_key = request.idempotency_key;
  }
  if (request.reason) {
    payload.reason = request.reason;
  }
  if (request.channel) {
    payload.channel = request.channel;
  }

  const response = await httpRequest(buildAssignmentActionURL(endpoint, assignmentId, action), {
    method: 'POST',
    json: payload,
  });
  if (!response.ok) {
    throw new Error(await readHTTPError(response, `Failed to ${action} assignment`));
  }
}

function readSSRRowActionEndpoint(container: HTMLElement, options: AssignmentSSRRowActionOptions): string {
  return options.endpoint
    || container.dataset.actionEndpoint
    || container.dataset.assignmentActionEndpoint
    || '';
}

function readSSRRowActionChannel(container: HTMLElement): string {
  return asString(container.dataset.channel)
    || (typeof window !== 'undefined'
      ? getStringSearchParam(readLocationSearchParams(window.location) ?? new URLSearchParams(), 'channel') || ''
      : '');
}

function initSSRRowActionMenus(container: HTMLElement, options: AssignmentSSRRowActionOptions): void {
  if (options.initializeMenus === false || container.dataset.assignmentActionMenusEnhanced === 'true') {
    return;
  }
  container.dataset.assignmentActionMenusEnhanced = 'true';
  initActionMenus(container, {
    containerSelector: '[data-action-menu]',
    triggerSelector: '[data-action-menu-trigger]',
    menuSelector: '[data-action-menu-content]',
    itemSelector: '[data-action-menu-item], [role="menuitem"], .action-item',
  });
}

export function initAssignmentSSRRowActions(
  container: HTMLElement,
  options: AssignmentSSRRowActionOptions = {},
): void {
  if (!container) {
    return;
  }
  initSSRRowActionMenus(container, options);
  if (container.dataset.assignmentActionsEnhanced === 'true') {
    return;
  }

  const endpoint = readSSRRowActionEndpoint(container, options);
  if (!endpoint) {
    return;
  }

  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-translation-action]'))
    .filter((button) => isSupportedSSRRowAction(asString(button.dataset.translationAction)));
  if (buttons.length === 0) {
    return;
  }
  container.dataset.assignmentActionsEnhanced = 'true';

  buttons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      const action = asString(button.dataset.translationAction);
      if (!isSupportedSSRRowAction(action)) {
        return;
      }
      event.preventDefault();
      const assignmentId = asString(button.dataset.assignmentId);
      const parsedVersion = Number.parseInt(asString(button.dataset.rowVersion), 10);
      const expectedVersion = Number.isFinite(parsedVersion) ? parsedVersion : 0;
      const channel = readSSRRowActionChannel(container);
      if (!assignmentId) {
        return;
      }
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
        return;
      }
      button.disabled = true;
      try {
        await postAssignmentSSRRowAction(endpoint, assignmentId, action, {
          expected_version: expectedVersion,
          idempotency_key: createAssignmentActionIdempotencyKey(assignmentId, action),
          ...(channel ? { channel } : {}),
        });
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (error) {
        button.disabled = false;
        console.error(error);
      }
    });
  });
}
